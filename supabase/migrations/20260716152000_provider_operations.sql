-- Provider operations: property-scoped work orders and private invoice tracking.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.tasks task
SET owner_id = property.owner_id
FROM public.properties property
WHERE task.owner_id IS NULL
  AND task.property_id = property.id;

UPDATE public.tasks task
SET owner_id = property.owner_id
FROM public.reservations reservation
JOIN public.properties property ON property.id = reservation.property_id
WHERE task.owner_id IS NULL
  AND task.reservation_id = reservation.id;

UPDATE public.tasks task
SET owner_id = partner.owner_id
FROM public.partners partner
WHERE task.owner_id IS NULL
  AND task.partner_id = partner.id
  AND partner.owner_id IS NOT NULL;

ALTER TABLE public.tasks
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

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
      AND reservation_id IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS tasks_owner_id_idx ON public.tasks (owner_id);
CREATE INDEX IF NOT EXISTS tasks_partner_property_idx
  ON public.tasks (partner_id, property_id, status, due_date)
  WHERE partner_id IS NOT NULL;

DROP POLICY IF EXISTS "Tasks by accessible context" ON public.tasks;

CREATE POLICY "Tasks read by owner or property access"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR (
    property_id IS NOT NULL
    AND public.can_access_property(property_id)
  )
  OR (
    reservation_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.reservations reservation
      WHERE reservation.id = tasks.reservation_id
        AND public.can_access_property(reservation.property_id)
    )
  )
);

CREATE POLICY "Tasks insert in accessible context"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND (
    (
      link_type = 'property'
      AND property_id IS NOT NULL
      AND public.can_access_property(property_id)
      AND reservation_id IS NULL
      AND partner_id IS NULL
    )
    OR (
      link_type = 'client'
      AND reservation_id IS NOT NULL
      AND partner_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.reservations reservation
        WHERE reservation.id = reservation_id
          AND public.can_access_property(reservation.property_id)
      )
    )
    OR (
      link_type = 'partner'
      AND partner_id IS NOT NULL
      AND property_id IS NOT NULL
      AND reservation_id IS NULL
      AND public.can_access_property(property_id)
    )
  )
);

CREATE POLICY "Tasks update in accessible context"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR (property_id IS NOT NULL AND public.can_access_property(property_id))
)
WITH CHECK (
  owner_id = auth.uid()
  OR (property_id IS NOT NULL AND public.can_access_property(property_id))
);

CREATE POLICY "Tasks delete in accessible context"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid()
  OR (property_id IS NOT NULL AND public.can_access_property(property_id))
);

CREATE TABLE IF NOT EXISTS public.provider_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  invoice_number text,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0 AND amount <= 10000000),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP', 'CHF')),
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'approved', 'paid', 'rejected')),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0 AND file_size <= 15728640),
  mime_type text NOT NULL
    CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  notes text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_invoices_partner_idx
  ON public.provider_invoices (partner_id, status, issue_date DESC);
CREATE INDEX IF NOT EXISTS provider_invoices_property_idx
  ON public.provider_invoices (property_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS provider_invoices_task_idx
  ON public.provider_invoices (task_id)
  WHERE task_id IS NOT NULL;

ALTER TABLE public.provider_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider invoices read by property access"
ON public.provider_invoices
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.can_access_property(property_id)
);

CREATE POLICY "Provider invoices insert by property access"
ON public.provider_invoices
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND public.can_access_property(property_id)
  AND EXISTS (
    SELECT 1
    FROM public.partners partner
    WHERE partner.id = partner_id
      AND (
        partner.source = 'marketplace'
        OR partner.owner_id = auth.uid()
      )
  )
);

CREATE POLICY "Provider invoices update by property access"
ON public.provider_invoices
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.can_access_property(property_id)
)
WITH CHECK (
  owner_id = auth.uid()
  OR public.can_access_property(property_id)
);

CREATE POLICY "Provider invoices delete by property access"
ON public.provider_invoices
FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.can_access_property(property_id)
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-invoices',
  'provider-invoices',
  false,
  15728640,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Provider invoice files read" ON storage.objects;
CREATE POLICY "Provider invoice files read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-invoices'
  AND EXISTS (
    SELECT 1
    FROM public.provider_invoices invoice
    WHERE invoice.storage_path = name
      AND (
        invoice.owner_id = auth.uid()
        OR public.can_access_property(invoice.property_id)
      )
  )
);

DROP POLICY IF EXISTS "Provider invoice files upload" ON storage.objects;
CREATE POLICY "Provider invoice files upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-invoices'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Provider invoice files delete" ON storage.objects;
CREATE POLICY "Provider invoice files delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'provider-invoices'
  AND EXISTS (
    SELECT 1
    FROM public.provider_invoices invoice
    WHERE invoice.storage_path = name
      AND (
        invoice.owner_id = auth.uid()
        OR public.can_access_property(invoice.property_id)
      )
  )
);
