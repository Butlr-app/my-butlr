-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 1.2 — Role-based RLS: restrict staff to their role_assignments
-- ═══════════════════════════════════════════════════════════════════════════════
-- Replaces the permissive USING(true) policies on the core operational tables
-- (properties, reservations, tasks, payments, contracts, invoices,
-- calendar_events, role_assignments) with role-aware policies:
--   * owner (profiles.role = 'owner')      → full access
--   * assigned staff (role_assignments)    → access limited to their properties
--   * guests                               → read own reservations (by email)
-- Public token-based contract signing policies are left untouched.

-- ─── Helper functions ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.app_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_app_owner()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.app_role() = 'owner', false);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_assigned_to_property(p_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_assignments
    WHERE user_id = auth.uid() AND property_id = p_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Owner → everything; staff → only assigned properties.
CREATE OR REPLACE FUNCTION public.can_access_property(p_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.is_app_owner()
    OR (p_id IS NOT NULL AND public.is_assigned_to_property(p_id));
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_access_reservation(r_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.is_app_owner()
    OR EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = r_id AND public.is_assigned_to_property(r.property_id)
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ─── properties ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can view properties" ON properties;
DROP POLICY IF EXISTS "Authenticated manage properties" ON properties;
DROP POLICY IF EXISTS "Owners can manage properties" ON properties;

-- owner_id is checked directly (in addition to can_access_property) so that
-- INSERT ... RETURNING succeeds: the SECURITY DEFINER function cannot see the
-- just-inserted row within the same statement snapshot, but the row's own
-- owner_id column is available on the returned tuple.
CREATE POLICY "Owner or assigned staff read properties"
  ON properties FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR can_access_property(id));

CREATE POLICY "Owner inserts properties"
  ON properties FOR INSERT TO authenticated
  WITH CHECK (is_app_owner());

CREATE POLICY "Owner or assigned staff update properties"
  ON properties FOR UPDATE TO authenticated
  USING (can_access_property(id));

CREATE POLICY "Owner deletes properties"
  ON properties FOR DELETE TO authenticated
  USING (is_app_owner());

-- ─── reservations ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated read reservations" ON reservations;
DROP POLICY IF EXISTS "Authenticated insert reservations" ON reservations;
DROP POLICY IF EXISTS "Authenticated update reservations" ON reservations;

CREATE POLICY "Staff or guest read reservations"
  ON reservations FOR SELECT TO authenticated
  USING (
    can_access_property(property_id)
    OR lower(guest_email) = lower(auth.jwt() ->> 'email')
  );

CREATE POLICY "Staff insert reservations"
  ON reservations FOR INSERT TO authenticated
  WITH CHECK (can_access_property(property_id));

CREATE POLICY "Staff update reservations"
  ON reservations FOR UPDATE TO authenticated
  USING (can_access_property(property_id));

CREATE POLICY "Owner deletes reservations"
  ON reservations FOR DELETE TO authenticated
  USING (is_app_owner());

-- ─── tasks ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated read tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated manage tasks" ON tasks;

CREATE POLICY "Staff or assignee read tasks"
  ON tasks FOR SELECT TO authenticated
  USING (can_access_property(property_id) OR assigned_to = auth.uid());

CREATE POLICY "Staff or assignee manage tasks"
  ON tasks FOR ALL TO authenticated
  USING (can_access_property(property_id) OR assigned_to = auth.uid())
  WITH CHECK (can_access_property(property_id) OR assigned_to = auth.uid());

-- ─── payments ────────────────────────────────────────────────────────────────
-- Payments link to properties via reservation_id; rows without a reservation
-- are owner-only financial data.

DROP POLICY IF EXISTS "Authenticated read payments" ON payments;
DROP POLICY IF EXISTS "Authenticated manage payments" ON payments;

CREATE POLICY "Owner or assigned staff read payments"
  ON payments FOR SELECT TO authenticated
  USING (is_app_owner() OR can_access_reservation(reservation_id));

CREATE POLICY "Owner or assigned staff manage payments"
  ON payments FOR ALL TO authenticated
  USING (is_app_owner() OR can_access_reservation(reservation_id))
  WITH CHECK (is_app_owner() OR can_access_reservation(reservation_id));

-- ─── contracts ───────────────────────────────────────────────────────────────
-- Public token-based signing policies are preserved.

DROP POLICY IF EXISTS "Authenticated read contracts" ON contracts;
DROP POLICY IF EXISTS "Authenticated manage contracts" ON contracts;

CREATE POLICY "Owner or assigned staff read contracts"
  ON contracts FOR SELECT TO authenticated
  USING (is_app_owner() OR can_access_reservation(reservation_id));

CREATE POLICY "Owner or assigned staff manage contracts"
  ON contracts FOR ALL TO authenticated
  USING (is_app_owner() OR can_access_reservation(reservation_id))
  WITH CHECK (is_app_owner() OR can_access_reservation(reservation_id));

-- ─── invoices ────────────────────────────────────────────────────────────────
-- Scoped to their creator; owners keep full visibility.

DROP POLICY IF EXISTS "Authenticated read invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated manage invoices" ON invoices;

CREATE POLICY "Creator or owner reads invoices"
  ON invoices FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_app_owner());

CREATE POLICY "Creator or owner manages invoices"
  ON invoices FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_app_owner())
  WITH CHECK (user_id = auth.uid() OR is_app_owner());

-- ─── calendar_events ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated read calendar" ON calendar_events;
DROP POLICY IF EXISTS "Authenticated manage calendar" ON calendar_events;

CREATE POLICY "Owner or assigned staff read calendar"
  ON calendar_events FOR SELECT TO authenticated
  USING (can_access_property(property_id));

CREATE POLICY "Owner or assigned staff manage calendar"
  ON calendar_events FOR ALL TO authenticated
  USING (can_access_property(property_id))
  WITH CHECK (can_access_property(property_id));

-- ─── role_assignments ────────────────────────────────────────────────────────
-- Staff can read their own assignments; only owners can grant/revoke them
-- (previously USING(true): staff could assign themselves to any property).

DROP POLICY IF EXISTS "Authenticated manage role_assignments" ON role_assignments;

CREATE POLICY "Read own assignments or owner reads all"
  ON role_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_app_owner());

CREATE POLICY "Owner manages role_assignments"
  ON role_assignments FOR ALL TO authenticated
  USING (is_app_owner())
  WITH CHECK (is_app_owner());
