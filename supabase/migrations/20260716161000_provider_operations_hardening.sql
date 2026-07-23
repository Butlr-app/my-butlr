-- Harden provider operations before real invoice data is stored.

-- A provider task must always identify the villa where the work occurs.
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_link_consistency_check,
  ADD CONSTRAINT tasks_link_consistency_check CHECK (
    (
      link_type = 'property'
      AND property_id IS NOT NULL
      AND reservation_id IS NULL
      AND partner_id IS NULL
    )
    OR (
      link_type = 'client'
      AND reservation_id IS NOT NULL
      AND partner_id IS NULL
    )
    OR (
      link_type = 'partner'
      AND partner_id IS NOT NULL
      AND property_id IS NOT NULL
      AND reservation_id IS NULL
    )
  );

-- Remove permissive legacy policies. PostgreSQL ORs permissive policies,
-- which allowed the old assigned_to rule to bypass the new context checks.
DROP POLICY IF EXISTS "Staff or assignee manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Staff or assignee read tasks" ON public.tasks;

-- Preserve financial history when a user, provider, or property is removed.
ALTER TABLE public.provider_invoices
  DROP CONSTRAINT IF EXISTS provider_invoices_owner_id_fkey,
  DROP CONSTRAINT IF EXISTS provider_invoices_partner_id_fkey,
  DROP CONSTRAINT IF EXISTS provider_invoices_property_id_fkey;

ALTER TABLE public.provider_invoices
  ADD CONSTRAINT provider_invoices_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT provider_invoices_partner_id_fkey
    FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE RESTRICT,
  ADD CONSTRAINT provider_invoices_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS public.provider_invoice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.provider_invoices(id) ON DELETE CASCADE,
  previous_status text CHECK (
    previous_status IS NULL
    OR previous_status IN ('received', 'approved', 'paid', 'rejected')
  ),
  new_status text NOT NULL CHECK (
    new_status IN ('received', 'approved', 'paid', 'rejected')
  ),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_invoice_events_invoice_idx
  ON public.provider_invoice_events (invoice_id, created_at DESC);

ALTER TABLE public.provider_invoice_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Provider invoice events read by property access"
  ON public.provider_invoice_events;
CREATE POLICY "Provider invoice events read by property access"
ON public.provider_invoice_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.provider_invoices invoice
    WHERE invoice.id = provider_invoice_events.invoice_id
      AND (
        invoice.owner_id = auth.uid()
        OR public.can_access_property(invoice.property_id)
      )
  )
);

INSERT INTO public.provider_invoice_events (
  invoice_id,
  previous_status,
  new_status,
  actor_id,
  note,
  created_at
)
SELECT
  invoice.id,
  NULL,
  invoice.status,
  invoice.owner_id,
  'État initial importé',
  invoice.created_at
FROM public.provider_invoices invoice
WHERE NOT EXISTS (
  SELECT 1
  FROM public.provider_invoice_events event
  WHERE event.invoice_id = invoice.id
);

-- Status changes are only allowed through the validated transition function.
DROP POLICY IF EXISTS "Provider invoices update by property access"
  ON public.provider_invoices;

-- Only draft-like invoices may be discarded, and only by their owner.
DROP POLICY IF EXISTS "Provider invoices delete by property access"
  ON public.provider_invoices;
CREATE POLICY "Provider invoices delete draft by owner"
ON public.provider_invoices
FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid()
  AND status IN ('received', 'rejected')
);

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.log_provider_invoice_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  INSERT INTO public.provider_invoice_events (
    invoice_id,
    previous_status,
    new_status,
    actor_id,
    note,
    created_at
  )
  VALUES (
    NEW.id,
    NULL,
    NEW.status,
    auth.uid(),
    'Facture ajoutée',
    NEW.created_at
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS provider_invoice_created_event_trigger
  ON public.provider_invoices;
CREATE TRIGGER provider_invoice_created_event_trigger
AFTER INSERT ON public.provider_invoices
FOR EACH ROW
EXECUTE FUNCTION private.log_provider_invoice_created();

CREATE OR REPLACE FUNCTION private.transition_provider_invoice(
  p_invoice_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_invoice public.provider_invoices%ROWTYPE;
  v_actor uuid := auth.uid();
  v_previous_status text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_status NOT IN ('received', 'approved', 'paid', 'rejected') THEN
    RAISE EXCEPTION 'Invalid invoice status';
  END IF;

  SELECT *
  INTO v_invoice
  FROM public.provider_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF NOT (
    v_invoice.owner_id = v_actor
    OR public.can_access_property(v_invoice.property_id)
  ) THEN
    RAISE EXCEPTION 'Invoice access denied';
  END IF;

  IF v_invoice.status = p_status THEN
    RETURN to_jsonb(v_invoice);
  END IF;

  IF NOT (
    (v_invoice.status = 'received' AND p_status IN ('approved', 'rejected'))
    OR (v_invoice.status = 'approved' AND p_status IN ('paid', 'rejected'))
    OR (v_invoice.status = 'rejected' AND p_status = 'received')
  ) THEN
    RAISE EXCEPTION 'Invalid invoice status transition: % -> %',
      v_invoice.status,
      p_status;
  END IF;

  IF p_status = 'rejected' AND NULLIF(trim(p_note), '') IS NULL THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;

  v_previous_status := v_invoice.status;

  UPDATE public.provider_invoices
  SET
    status = p_status,
    paid_at = CASE WHEN p_status = 'paid' THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_invoice_id
  RETURNING * INTO v_invoice;

  INSERT INTO public.provider_invoice_events (
    invoice_id,
    previous_status,
    new_status,
    actor_id,
    note
  )
  VALUES (
    p_invoice_id,
    v_previous_status,
    p_status,
    v_actor,
    NULLIF(trim(p_note), '')
  );

  RETURN to_jsonb(v_invoice);
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_provider_invoice(
  p_invoice_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
  SELECT private.transition_provider_invoice(p_invoice_id, p_status, p_note);
$$;

REVOKE ALL ON FUNCTION private.transition_provider_invoice(uuid, text, text)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_provider_invoice(uuid, text, text)
  FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.transition_provider_invoice(uuid, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_provider_invoice(uuid, text, text)
  TO authenticated;

-- Once the SQL row has been deleted, its owner can still remove the object.
DROP POLICY IF EXISTS "Provider invoice files delete" ON storage.objects;
CREATE POLICY "Provider invoice files delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'provider-invoices'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.provider_invoices invoice
      WHERE invoice.storage_path = name
        AND (
          invoice.owner_id = auth.uid()
          OR public.can_access_property(invoice.property_id)
        )
    )
  )
);
