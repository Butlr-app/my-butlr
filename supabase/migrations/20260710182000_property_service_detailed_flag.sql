-- Per-property service display mode: simple card vs detailed page content.

ALTER TABLE public.property_services
  ADD COLUMN IF NOT EXISTS is_detailed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.property_services.is_detailed IS 'When true, show rich description in guest portal';
