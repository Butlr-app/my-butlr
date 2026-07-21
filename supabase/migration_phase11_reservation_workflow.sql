-- Phase 11 — Reservation workflow fields + consistency constraint
--
-- These columns and the `reservations_workflow_consistency_check` constraint
-- already exist in the live database (added during the contracts audit work)
-- but were missing from the versioned schema, which caused the app's reservation
-- creation form to insert rows that violated the constraint.
--
-- This migration documents and reproduces the production state. It is idempotent
-- and backfills existing rows to a consistent state before adding the constraint.

-- 1. Columns (no-ops if already present on live)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS booking_kind TEXT NOT NULL DEFAULT 'guest',
  ADD COLUMN IF NOT EXISTS contract_mode TEXT NOT NULL DEFAULT 'none';

-- 2. Allow 'not_applicable' payment status (used by non-guest bookings)
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_payment_status_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_payment_status_check
  CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded', 'not_applicable'));

ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_booking_kind_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_booking_kind_check
  CHECK (booking_kind IN ('guest', 'owner_stay', 'marketing_event', 'blocked_dates', 'other'));

ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_contract_mode_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_contract_mode_check
  CHECK (contract_mode IN ('to_prepare', 'already_done', 'concierge', 'none'));

-- 3. Backfill existing rows so they satisfy the workflow constraint.
--    Guest bookings need a real contract mode + applicable payment status.
UPDATE reservations
SET contract_mode = CASE
      WHEN contract_status = 'signed' THEN 'already_done'
      ELSE 'to_prepare'
    END,
    contract_status = CASE
      WHEN contract_status = 'none' THEN 'draft'
      ELSE contract_status
    END,
    payment_status = CASE
      WHEN payment_status = 'not_applicable' THEN 'pending'
      ELSE payment_status
    END
WHERE booking_kind = 'guest' AND contract_mode = 'none';

--    Non-guest bookings are non-billable holds with no contract.
UPDATE reservations
SET contract_mode = 'none',
    contract_status = 'none',
    payment_status = 'not_applicable',
    total_amount = 0
WHERE booking_kind <> 'guest';

-- 4. Workflow consistency constraint
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_workflow_consistency_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_workflow_consistency_check CHECK (
  (
    contract_mode = 'none'
    AND booking_kind <> 'guest'
    AND contract_status = 'none'
    AND payment_status = 'not_applicable'
    AND total_amount = 0
  )
  OR
  (
    contract_mode <> 'none'
    AND booking_kind = 'guest'
    AND payment_status <> 'not_applicable'
    AND (
      (contract_mode = 'already_done' AND contract_status = 'signed')
      OR
      (contract_mode IN ('to_prepare', 'concierge') AND contract_status IN ('draft', 'sent', 'signed'))
    )
  )
);
