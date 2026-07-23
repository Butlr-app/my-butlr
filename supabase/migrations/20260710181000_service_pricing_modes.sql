-- Service pricing modes and provider offer details.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'fixed'
    CHECK (pricing_mode IN ('fixed', 'per_person', 'quote')),
  ADD COLUMN IF NOT EXISTS provider_name text,
  ADD COLUMN IF NOT EXISTS includes_text text;

ALTER TABLE public.property_services
  ADD COLUMN IF NOT EXISTS pricing_mode text
    CHECK (pricing_mode IS NULL OR pricing_mode IN ('fixed', 'per_person', 'quote')),
  ADD COLUMN IF NOT EXISTS provider_name text,
  ADD COLUMN IF NOT EXISTS includes_text text,
  ADD COLUMN IF NOT EXISTS offer_title text;

COMMENT ON COLUMN public.services.pricing_mode IS 'fixed | per_person | quote';
COMMENT ON COLUMN public.property_services.offer_title IS 'Property-specific offer title, e.g. Repas asiatique';
