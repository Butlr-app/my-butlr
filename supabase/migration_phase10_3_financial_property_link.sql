-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 10.3 — Direct property link for payments & contracts
-- ═══════════════════════════════════════════════════════════════════════════════
-- Problem: the strict RLS on `payments` and `contracts` scopes access ONLY through
-- the reservation → property ownership chain. Rows that are not tied to a
-- reservation (reservation_id IS NULL) are therefore invisible to everyone,
-- including the legitimate property owner/manager. Most seeded financial rows are
-- denormalized (they carry `property_name` text but no reservation), so revenue
-- and contracts show as empty even though the data exists.
--
-- Fix: add a direct `property_id` foreign key, backfill it from the reservation
-- chain and from the denormalized `property_name`, and extend the RLS policies to
-- honor the direct link. Rows with neither a property nor a reservation link stay
-- hidden (correct — they have no ownership chain).
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_property_id ON public.payments(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_property_id ON public.contracts(property_id);

-- ─── Backfill ────────────────────────────────────────────────────────────────
-- Prefer the reservation chain when present, otherwise match on property_name.
UPDATE public.payments p
  SET property_id = r.property_id
  FROM public.reservations r
  WHERE p.property_id IS NULL AND p.reservation_id = r.id;

UPDATE public.payments p
  SET property_id = pr.id
  FROM public.properties pr
  WHERE p.property_id IS NULL AND p.property_name = pr.name;

UPDATE public.contracts c
  SET property_id = r.property_id
  FROM public.reservations r
  WHERE c.property_id IS NULL AND c.reservation_id = r.id;

UPDATE public.contracts c
  SET property_id = pr.id
  FROM public.properties pr
  WHERE c.property_id IS NULL AND c.property_name = pr.name;

-- ─── Payments RLS ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Payment access by reservation property" ON public.payments;

CREATE POLICY "Payment access by property or reservation"
  ON public.payments FOR ALL
  TO authenticated
  USING (
    (property_id IS NOT NULL AND public.can_access_property(property_id))
    OR EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = payments.reservation_id
        AND public.can_access_property(r.property_id)
    )
  )
  WITH CHECK (
    (property_id IS NOT NULL AND public.can_access_property(property_id))
    OR EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = payments.reservation_id
        AND public.can_access_property(r.property_id)
    )
  );

-- ─── Contracts RLS ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Contract access by reservation property" ON public.contracts;

CREATE POLICY "Contract access by property or reservation"
  ON public.contracts FOR ALL
  TO authenticated
  USING (
    (property_id IS NOT NULL AND public.can_access_property(property_id))
    OR EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = contracts.reservation_id
        AND public.can_access_property(r.property_id)
    )
  )
  WITH CHECK (
    (property_id IS NOT NULL AND public.can_access_property(property_id))
    OR EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = contracts.reservation_id
        AND public.can_access_property(r.property_id)
    )
  );
