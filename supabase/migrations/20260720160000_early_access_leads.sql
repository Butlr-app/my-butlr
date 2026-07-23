-- Early access lead capture (public form submissions).

CREATE TABLE IF NOT EXISTS public.early_access_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text NOT NULL,
  company text,
  phone text,
  role text,
  properties_count int,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS early_access_leads_created_at_idx
  ON public.early_access_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS early_access_leads_email_idx
  ON public.early_access_leads (lower(email));

ALTER TABLE public.early_access_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit early access leads"
  ON public.early_access_leads;

CREATE POLICY "Anyone can submit early access leads"
ON public.early_access_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "App owners read early access leads"
  ON public.early_access_leads;

CREATE POLICY "App owners read early access leads"
ON public.early_access_leads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'owner'
  )
);
