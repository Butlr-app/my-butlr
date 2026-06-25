-- ═══════════════════════════════════════════════════════════════════════════════
-- My Butlr — Strict RLS Policies for Production
-- ═══════════════════════════════════════════════════════════════════════════════
-- These policies replace the permissive USING(true) prototype policies.
-- Apply after thorough testing in a staging environment.
--
-- Prerequisites:
--   1. A helper function to check property ownership
--   2. A helper function to check manager assignment (future)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Helper function: check if current user owns a property ──────────────────

-- CREATE OR REPLACE FUNCTION public.is_property_owner(p_id UUID)
-- RETURNS BOOLEAN AS $$
--   SELECT EXISTS (
--     SELECT 1 FROM properties WHERE id = p_id AND owner_id = auth.uid()
--   );
-- $$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- Already correct: users can only access their own profile

-- ─── Properties ──────────────────────────────────────────────────────────────

-- DROP POLICY IF EXISTS "Authenticated users can view properties" ON properties;
-- DROP POLICY IF EXISTS "Authenticated manage properties" ON properties;
-- DROP POLICY IF EXISTS "Owners can manage properties" ON properties;

-- SELECT: owner can see own properties
-- CREATE POLICY "Owner reads own properties"
--   ON properties FOR SELECT
--   TO authenticated
--   USING (owner_id = auth.uid());

-- INSERT: owner_id must match auth.uid()
-- CREATE POLICY "Owner inserts own properties"
--   ON properties FOR INSERT
--   TO authenticated
--   WITH CHECK (owner_id = auth.uid());

-- UPDATE: only property owner
-- CREATE POLICY "Owner updates own properties"
--   ON properties FOR UPDATE
--   TO authenticated
--   USING (owner_id = auth.uid());

-- DELETE: only property owner
-- CREATE POLICY "Owner deletes own properties"
--   ON properties FOR DELETE
--   TO authenticated
--   USING (owner_id = auth.uid());

-- ─── Reservations ────────────────────────────────────────────────────────────
-- Access via property ownership chain

-- DROP POLICY IF EXISTS "Authenticated read reservations" ON reservations;
-- DROP POLICY IF EXISTS "Authenticated insert reservations" ON reservations;
-- DROP POLICY IF EXISTS "Authenticated update reservations" ON reservations;

-- CREATE POLICY "Owner reads reservations via property"
--   ON reservations FOR SELECT
--   TO authenticated
--   USING (
--     property_id IS NULL
--     OR EXISTS (
--       SELECT 1 FROM properties WHERE id = reservations.property_id AND owner_id = auth.uid()
--     )
--   );

-- CREATE POLICY "Owner inserts reservations via property"
--   ON reservations FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     property_id IS NULL
--     OR EXISTS (
--       SELECT 1 FROM properties WHERE id = reservations.property_id AND owner_id = auth.uid()
--     )
--   );

-- CREATE POLICY "Owner updates reservations via property"
--   ON reservations FOR UPDATE
--   TO authenticated
--   USING (
--     property_id IS NULL
--     OR EXISTS (
--       SELECT 1 FROM properties WHERE id = reservations.property_id AND owner_id = auth.uid()
--     )
--   );

-- ─── Payments ────────────────────────────────────────────────────────────────
-- Access via reservation → property ownership chain

-- DROP POLICY IF EXISTS "Authenticated read payments" ON payments;
-- DROP POLICY IF EXISTS "Authenticated manage payments" ON payments;

-- CREATE POLICY "Owner reads payments via reservation"
--   ON payments FOR SELECT
--   TO authenticated
--   USING (
--     reservation_id IS NULL
--     OR EXISTS (
--       SELECT 1 FROM reservations r
--       JOIN properties p ON p.id = r.property_id
--       WHERE r.id = payments.reservation_id AND p.owner_id = auth.uid()
--     )
--   );

-- CREATE POLICY "Owner manages payments via reservation"
--   ON payments FOR ALL
--   TO authenticated
--   USING (
--     reservation_id IS NULL
--     OR EXISTS (
--       SELECT 1 FROM reservations r
--       JOIN properties p ON p.id = r.property_id
--       WHERE r.id = payments.reservation_id AND p.owner_id = auth.uid()
--     )
--   );

-- ─── Tasks ───────────────────────────────────────────────────────────────────
-- Visible to assignee or property owner

-- DROP POLICY IF EXISTS "Authenticated read tasks" ON tasks;
-- DROP POLICY IF EXISTS "Authenticated manage tasks" ON tasks;

-- CREATE POLICY "Users read assigned or owned tasks"
--   ON tasks FOR SELECT
--   TO authenticated
--   USING (
--     assigned_to = auth.uid()
--     OR (
--       property_id IS NOT NULL
--       AND EXISTS (
--         SELECT 1 FROM properties WHERE id = tasks.property_id AND owner_id = auth.uid()
--       )
--     )
--   );

-- CREATE POLICY "Users manage assigned or owned tasks"
--   ON tasks FOR ALL
--   TO authenticated
--   USING (
--     assigned_to = auth.uid()
--     OR (
--       property_id IS NOT NULL
--       AND EXISTS (
--         SELECT 1 FROM properties WHERE id = tasks.property_id AND owner_id = auth.uid()
--       )
--     )
--   );

-- ─── Services ────────────────────────────────────────────────────────────────
-- Read for all authenticated, write for owners/managers only

-- DROP POLICY IF EXISTS "Authenticated read services" ON services;
-- DROP POLICY IF EXISTS "Authenticated manage services" ON services;

-- CREATE POLICY "Authenticated read services"
--   ON services FOR SELECT
--   TO authenticated
--   USING (true);

-- CREATE POLICY "Owners manage services"
--   ON services FOR ALL
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'house_manager')
--     )
--   );

-- ─── Partners ────────────────────────────────────────────────────────────────

-- DROP POLICY IF EXISTS "Authenticated read partners" ON partners;
-- DROP POLICY IF EXISTS "Authenticated manage partners" ON partners;

-- CREATE POLICY "Authenticated read partners"
--   ON partners FOR SELECT
--   TO authenticated
--   USING (true);

-- CREATE POLICY "Owners manage partners"
--   ON partners FOR ALL
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
--     )
--   );

-- ─── Contracts ───────────────────────────────────────────────────────────────

-- DROP POLICY IF EXISTS "Authenticated read contracts" ON contracts;
-- DROP POLICY IF EXISTS "Authenticated manage contracts" ON contracts;

-- CREATE POLICY "Owner reads contracts via reservation"
--   ON contracts FOR SELECT
--   TO authenticated
--   USING (
--     reservation_id IS NULL
--     OR EXISTS (
--       SELECT 1 FROM reservations r
--       JOIN properties p ON p.id = r.property_id
--       WHERE r.id = contracts.reservation_id AND p.owner_id = auth.uid()
--     )
--   );

-- ─── Calendar Events ────────────────────────────────────────────────────────

-- DROP POLICY IF EXISTS "Authenticated read calendar" ON calendar_events;
-- DROP POLICY IF EXISTS "Authenticated manage calendar" ON calendar_events;

-- CREATE POLICY "Owner reads calendar via property"
--   ON calendar_events FOR SELECT
--   TO authenticated
--   USING (
--     property_id IS NULL
--     OR EXISTS (
--       SELECT 1 FROM properties WHERE id = calendar_events.property_id AND owner_id = auth.uid()
--     )
--   );

-- ─── Contract Templates ─────────────────────────────────────────────────────

-- DROP POLICY IF EXISTS "Authenticated manage contract_templates" ON contract_templates;

-- CREATE POLICY "Users manage own templates"
--   ON contract_templates FOR ALL
--   TO authenticated
--   USING (user_id = auth.uid());
