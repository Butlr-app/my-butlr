-- Reservation contract workflow and date-only calendar blocks

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS contract_mode TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS booking_kind TEXT NOT NULL DEFAULT 'guest';

UPDATE public.reservations
SET contract_mode = CASE
  WHEN contract_status = 'signed' THEN 'already_done'
  WHEN contract_status IN ('draft', 'sent') THEN 'to_prepare'
  ELSE 'none'
END
WHERE contract_mode = 'none'
  AND contract_status <> 'none';

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_contract_mode_check,
  ADD CONSTRAINT reservations_contract_mode_check
    CHECK (contract_mode IN ('to_prepare', 'already_done', 'concierge', 'none'));

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_booking_kind_check,
  ADD CONSTRAINT reservations_booking_kind_check
    CHECK (booking_kind IN ('guest', 'owner_stay', 'marketing_event', 'blocked_dates', 'other'));

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_payment_status_check,
  ADD CONSTRAINT reservations_payment_status_check
    CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded', 'not_applicable'));
