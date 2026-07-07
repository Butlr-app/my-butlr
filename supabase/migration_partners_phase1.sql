-- ═══════════════════════════════════════════════════════════════════════════════
-- Partners Phase 1 — Data foundations & security for the prestataire feature
-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Link a partner account (auth.users) to its `partners` row (user_id).
-- 2. Add `updated_at` to partners (parity with service_providers).
-- 3. Add `partner_id` to payments so APA payouts match by id, not by name.
-- 4. Replace the permissive USING(true) policies on partners / service_providers
--    / service_requests with role-aware policies:
--      * staff (owner/agency/house_manager/concierge) → full directory access
--      * partner → only their own partner row + service_requests assigned to them
--      * only owner/agency may create/delete partners
-- Relies on public.app_role() introduced in migration_phase1_2_rls.sql.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Schema changes ──────────────────────────────────────────────────────────

ALTER TABLE partners ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS partners_user_id_key ON partners(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

-- ─── Helper functions ────────────────────────────────────────────────────────

-- Staff = any non-partner, non-guest operational role.
CREATE OR REPLACE FUNCTION public.is_app_staff()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.app_role() IN ('owner', 'agency', 'house_manager', 'concierge'), false);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Only owner/agency may create or remove partners.
CREATE OR REPLACE FUNCTION public.can_manage_partners()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.app_role() IN ('owner', 'agency'), false);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Resolve the partners.id owned by the current user. SECURITY DEFINER so it
-- bypasses partners RLS (avoids recursion inside partner policies).
CREATE OR REPLACE FUNCTION public.current_partner_id()
RETURNS UUID AS $$
  SELECT id FROM public.partners WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ─── partners ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated read partners" ON partners;
DROP POLICY IF EXISTS "Authenticated manage partners" ON partners;

CREATE POLICY "Staff or own partner reads partners"
  ON partners FOR SELECT TO authenticated
  USING (is_app_staff() OR user_id = auth.uid());

CREATE POLICY "Owner or agency inserts partners"
  ON partners FOR INSERT TO authenticated
  WITH CHECK (can_manage_partners());

-- Owner/agency edit any partner; a partner may edit only their own row.
CREATE POLICY "Manager or own partner updates partners"
  ON partners FOR UPDATE TO authenticated
  USING (can_manage_partners() OR user_id = auth.uid())
  WITH CHECK (can_manage_partners() OR user_id = auth.uid());

CREATE POLICY "Owner or agency deletes partners"
  ON partners FOR DELETE TO authenticated
  USING (can_manage_partners());

-- ─── service_providers ───────────────────────────────────────────────────────
-- Internal operational directory: staff only, never exposed to partner/guest.

DROP POLICY IF EXISTS "Authenticated read service_providers" ON service_providers;
DROP POLICY IF EXISTS "Authenticated manage service_providers" ON service_providers;
-- Legacy per-action policy names created outside schema.sql:
DROP POLICY IF EXISTS "Authenticated users can view service providers" ON service_providers;
DROP POLICY IF EXISTS "Authenticated users can insert service providers" ON service_providers;
DROP POLICY IF EXISTS "Authenticated users can update service providers" ON service_providers;
DROP POLICY IF EXISTS "Authenticated users can delete service providers" ON service_providers;

CREATE POLICY "Staff read service_providers"
  ON service_providers FOR SELECT TO authenticated
  USING (is_app_staff());

CREATE POLICY "Staff manage service_providers"
  ON service_providers FOR ALL TO authenticated
  USING (is_app_staff())
  WITH CHECK (is_app_staff());

-- ─── service_requests ────────────────────────────────────────────────────────
-- Staff manage all; a partner sees/updates only requests assigned to them;
-- a guest sees only their own requests.

DROP POLICY IF EXISTS "Authenticated manage service_requests" ON service_requests;

CREATE POLICY "Staff partner or guest reads service_requests"
  ON service_requests FOR SELECT TO authenticated
  USING (
    is_app_staff()
    OR guest_user_id = auth.uid()
    OR partner_id = current_partner_id()
  );

CREATE POLICY "Staff manage service_requests"
  ON service_requests FOR ALL TO authenticated
  USING (is_app_staff())
  WITH CHECK (is_app_staff());

-- A partner may update only the requests assigned to them (accept / quote).
CREATE POLICY "Assigned partner updates service_requests"
  ON service_requests FOR UPDATE TO authenticated
  USING (partner_id = current_partner_id())
  WITH CHECK (partner_id = current_partner_id());

-- A guest may create a request for themselves.
CREATE POLICY "Guest inserts own service_requests"
  ON service_requests FOR INSERT TO authenticated
  WITH CHECK (guest_user_id = auth.uid() OR is_app_staff());

-- ─── payments ────────────────────────────────────────────────────────────────
-- Extend the Phase 1.2 policies so a partner can read their own commission
-- payments (needed by the partner portal earnings view).

DROP POLICY IF EXISTS "Owner or assigned staff read payments" ON payments;
DROP POLICY IF EXISTS "Owner or assigned staff manage payments" ON payments;

CREATE POLICY "Owner staff or partner read payments"
  ON payments FOR SELECT TO authenticated
  USING (
    is_app_owner()
    OR can_access_reservation(reservation_id)
    OR partner_id = current_partner_id()
  );

CREATE POLICY "Owner or assigned staff manage payments"
  ON payments FOR ALL TO authenticated
  USING (is_app_owner() OR can_access_reservation(reservation_id))
  WITH CHECK (is_app_owner() OR can_access_reservation(reservation_id));

-- ─── keep partners.updated_at fresh ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_partners_updated_at ON partners;
CREATE TRIGGER trg_touch_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION public.touch_partners_updated_at();
