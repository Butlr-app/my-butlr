-- Partner portal: profile fields, calendar days, RLS for marketplace partners

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS service_areas text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

UPDATE public.partners
SET onboarding_completed = true
WHERE source = 'marketplace'
  AND category IS NOT NULL
  AND NULLIF(trim(category), '') IS NOT NULL
  AND phone IS NOT NULL
  AND NULLIF(trim(phone), '') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.my_marketplace_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.partners
  WHERE profile_id = auth.uid()
    AND source = 'marketplace'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_marketplace_partner_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_marketplace_partner_id() TO authenticated;

DROP POLICY IF EXISTS "Partners update own marketplace" ON public.partners;
CREATE POLICY "Partners update own marketplace"
ON public.partners
FOR UPDATE
TO authenticated
USING (source = 'marketplace' AND profile_id = auth.uid())
WITH CHECK (source = 'marketplace' AND profile_id = auth.uid());

DROP POLICY IF EXISTS "Partners select own marketplace" ON public.partners;
CREATE POLICY "Partners select own marketplace"
ON public.partners
FOR SELECT
TO authenticated
USING (source = 'marketplace' AND profile_id = auth.uid());

DROP POLICY IF EXISTS "Tasks read by assigned partner" ON public.tasks;
CREATE POLICY "Tasks read by assigned partner"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  partner_id IS NOT NULL
  AND partner_id = public.my_marketplace_partner_id()
);

DROP POLICY IF EXISTS "Tasks update by assigned partner" ON public.tasks;
CREATE POLICY "Tasks update by assigned partner"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  partner_id IS NOT NULL
  AND partner_id = public.my_marketplace_partner_id()
)
WITH CHECK (
  partner_id IS NOT NULL
  AND partner_id = public.my_marketplace_partner_id()
);

CREATE TABLE IF NOT EXISTS public.partner_calendar_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  day date NOT NULL,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'busy', 'blocked')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, day)
);

CREATE INDEX IF NOT EXISTS partner_calendar_days_partner_day_idx
  ON public.partner_calendar_days (partner_id, day);

ALTER TABLE public.partner_calendar_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partner calendar own CRUD" ON public.partner_calendar_days;
CREATE POLICY "Partner calendar own CRUD"
ON public.partner_calendar_days
FOR ALL
TO authenticated
USING (partner_id = public.my_marketplace_partner_id())
WITH CHECK (partner_id = public.my_marketplace_partner_id());

DROP POLICY IF EXISTS "Partner calendar read by owners" ON public.partner_calendar_days;
CREATE POLICY "Partner calendar read by owners"
ON public.partner_calendar_days
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_calendar_days.partner_id
      AND p.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.partner_id = partner_calendar_days.partner_id
      AND t.property_id IS NOT NULL
      AND public.can_access_property(t.property_id)
  )
);

DROP POLICY IF EXISTS "Provider invoices read by partner" ON public.provider_invoices;
CREATE POLICY "Provider invoices read by partner"
ON public.provider_invoices
FOR SELECT
TO authenticated
USING (partner_id = public.my_marketplace_partner_id());

-- NOTE: column refs inside EXISTS must be table-qualified (provider_invoices.*)
-- or Postgres resolves them to the inner table and the check becomes a tautology.
DROP POLICY IF EXISTS "Provider invoices insert by partner" ON public.provider_invoices;
CREATE POLICY "Provider invoices insert by partner"
ON public.provider_invoices
FOR INSERT
TO authenticated
WITH CHECK (
  provider_invoices.partner_id = public.my_marketplace_partner_id()
  AND provider_invoices.status = 'received'
  AND provider_invoices.task_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.properties prop
    WHERE prop.id = provider_invoices.property_id
      AND prop.owner_id = provider_invoices.owner_id
  )
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = provider_invoices.task_id
      AND t.partner_id = provider_invoices.partner_id
      AND t.property_id = provider_invoices.property_id
      AND t.status = 'done'
  )
);

DROP POLICY IF EXISTS "Provider invoice files read by partner" ON storage.objects;
CREATE POLICY "Provider invoice files read by partner"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-invoices'
  AND EXISTS (
    SELECT 1 FROM public.provider_invoices invoice
    WHERE invoice.storage_path = name
      AND invoice.partner_id = public.my_marketplace_partner_id()
  )
);

COMMENT ON TABLE public.partner_calendar_days IS
  'Partner portal date-based availability (available/busy/blocked).';
