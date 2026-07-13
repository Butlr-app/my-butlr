-- Specific named offer vs general concierge-proposed offer.

ALTER TABLE public.property_services
  ADD COLUMN IF NOT EXISTS offer_mode text NOT NULL DEFAULT 'specific'
    CHECK (offer_mode IN ('specific', 'general')),
  ADD COLUMN IF NOT EXISTS general_note text;

COMMENT ON COLUMN public.property_services.offer_mode IS 'specific = named provider/offer; general = concierge proposes based on availability';
COMMENT ON COLUMN public.property_services.general_note IS 'Optional message for generalized offers in guest portal';
