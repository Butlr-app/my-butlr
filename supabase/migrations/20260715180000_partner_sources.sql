-- Partner sources: manual (owner's habitual providers) vs marketplace (self-registered on platform).

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.partners
SET source = 'manual'
WHERE source IS NULL OR source = '';

ALTER TABLE public.partners
  DROP CONSTRAINT IF EXISTS partners_source_check,
  ADD CONSTRAINT partners_source_check
    CHECK (source IN ('manual', 'marketplace'));

CREATE UNIQUE INDEX IF NOT EXISTS partners_profile_id_unique
  ON public.partners (profile_id)
  WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS partners_owner_id_idx ON public.partners (owner_id);
CREATE INDEX IF NOT EXISTS partners_source_idx ON public.partners (source);

-- Backfill marketplace partners from existing partner-role profiles.
INSERT INTO public.partners (
  name,
  email,
  phone,
  contact,
  source,
  profile_id,
  status,
  commission
)
SELECT
  COALESCE(p.full_name, p.email, 'Partenaire'),
  p.email,
  p.phone,
  p.full_name,
  'marketplace',
  p.id,
  'active',
  10
FROM public.profiles p
WHERE p.role = 'partner'
  AND NOT EXISTS (
    SELECT 1
    FROM public.partners existing
    WHERE existing.profile_id = p.id
  );

CREATE OR REPLACE FUNCTION public.sync_marketplace_partner_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'partner' THEN
    IF EXISTS (
      SELECT 1
      FROM public.partners existing
      WHERE existing.profile_id = NEW.id
    ) THEN
      UPDATE public.partners
      SET
        name = COALESCE(NEW.full_name, NEW.email, 'Partenaire'),
        email = NEW.email,
        phone = NEW.phone,
        contact = NEW.full_name,
        updated_at = now()
      WHERE profile_id = NEW.id;
    ELSE
      INSERT INTO public.partners (
        name,
        email,
        phone,
        contact,
        source,
        profile_id,
        status,
        commission,
        updated_at
      )
      VALUES (
        COALESCE(NEW.full_name, NEW.email, 'Partenaire'),
        NEW.email,
        NEW.phone,
        NEW.full_name,
        'marketplace',
        NEW.id,
        'active',
        10,
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_marketplace_partner_from_profile_trigger ON public.profiles;
CREATE TRIGGER sync_marketplace_partner_from_profile_trigger
AFTER INSERT OR UPDATE OF role, full_name, email, phone
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_marketplace_partner_from_profile();

DROP POLICY IF EXISTS "Authenticated read partners" ON public.partners;
DROP POLICY IF EXISTS "Authenticated manage partners" ON public.partners;

CREATE POLICY "Partners read by source"
ON public.partners
FOR SELECT
TO authenticated
USING (
  source = 'marketplace'
  OR owner_id = auth.uid()
  OR (source = 'manual' AND owner_id IS NULL)
);

CREATE POLICY "Partners manage manual owned"
ON public.partners
FOR ALL
TO authenticated
USING (
  source = 'manual'
  AND (owner_id = auth.uid() OR owner_id IS NULL)
)
WITH CHECK (
  source = 'manual'
  AND owner_id = auth.uid()
);
