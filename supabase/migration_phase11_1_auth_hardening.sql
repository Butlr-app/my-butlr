-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 11.1 — Auth hardening + residual RLS (services, images, checkins, guides)
-- See docs/audit-produit.md and docs/MIGRATIONS.md
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Signup: ignore client-supplied elevated roles ────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  requested_role TEXT;
BEGIN
  requested_role := lower(coalesce(new.raw_user_meta_data->>'role', 'owner'));
  IF requested_role IS DISTINCT FROM 'owner' THEN
    requested_role := 'owner';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    requested_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── 2. Block profile.role changes from authenticated clients ────────────────
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow only service_role (dashboard / admin SQL) to change roles
    IF coalesce(auth.jwt() ->> 'role', '') = 'service_role' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Role changes are not allowed from the client';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
  BEFORE UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- ─── 3. Residual RLS: services (catalog read, owner write) ───────────────────
DROP POLICY IF EXISTS "Authenticated read services" ON services;
DROP POLICY IF EXISTS "Authenticated manage services" ON services;
DROP POLICY IF EXISTS "Authenticated users can view services" ON services;

CREATE POLICY "Authenticated read services"
  ON services FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Owner manage services"
  ON services FOR ALL TO authenticated
  USING (public.is_app_owner())
  WITH CHECK (public.is_app_owner());

-- ─── 4. property_amenities / property_rooms via property access ──────────────
DROP POLICY IF EXISTS "Authenticated manage property_amenities" ON property_amenities;
DROP POLICY IF EXISTS "Authenticated manage property_rooms" ON property_rooms;

CREATE POLICY "Staff read property_amenities"
  ON property_amenities FOR SELECT TO authenticated
  USING (public.can_access_property(property_id));

CREATE POLICY "Staff manage property_amenities"
  ON property_amenities FOR ALL TO authenticated
  USING (public.can_access_property(property_id))
  WITH CHECK (public.can_access_property(property_id));

CREATE POLICY "Staff read property_rooms"
  ON property_rooms FOR SELECT TO authenticated
  USING (public.can_access_property(property_id));

CREATE POLICY "Staff manage property_rooms"
  ON property_rooms FOR ALL TO authenticated
  USING (public.can_access_property(property_id))
  WITH CHECK (public.can_access_property(property_id));

-- ─── 5. property_images ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated manage property_images" ON property_images;
DROP POLICY IF EXISTS "Authenticated read property_images" ON property_images;
DROP POLICY IF EXISTS "Public read property_images" ON property_images;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_images') THEN
    EXECUTE $p$
      CREATE POLICY "Staff read property_images"
        ON property_images FOR SELECT TO authenticated
        USING (public.can_access_property(property_id))
    $p$;
    EXECUTE $p$
      CREATE POLICY "Staff manage property_images"
        ON property_images FOR ALL TO authenticated
        USING (public.can_access_property(property_id))
        WITH CHECK (public.can_access_property(property_id))
    $p$;
  END IF;
END $$;

-- ─── 6. checkins via reservation access ──────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checkins') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated manage checkins" ON checkins';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated read checkins" ON checkins';
    EXECUTE $p$
      CREATE POLICY "Staff or guest read checkins"
        ON checkins FOR SELECT TO authenticated
        USING (
          public.can_access_reservation(reservation_id)
          OR EXISTS (
            SELECT 1 FROM reservations r
            WHERE r.id = checkins.reservation_id
              AND lower(r.guest_email) = lower(auth.jwt() ->> 'email')
          )
        )
    $p$;
    EXECUTE $p$
      CREATE POLICY "Staff or guest write checkins"
        ON checkins FOR ALL TO authenticated
        USING (
          public.can_access_reservation(reservation_id)
          OR EXISTS (
            SELECT 1 FROM reservations r
            WHERE r.id = checkins.reservation_id
              AND lower(r.guest_email) = lower(auth.jwt() ->> 'email')
          )
        )
        WITH CHECK (
          public.can_access_reservation(reservation_id)
          OR EXISTS (
            SELECT 1 FROM reservations r
            WHERE r.id = checkins.reservation_id
              AND lower(r.guest_email) = lower(auth.jwt() ->> 'email')
          )
        )
    $p$;
  END IF;
END $$;

-- ─── 7. guides scoped to property ────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guides') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated manage guides" ON guides';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated read guides" ON guides';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated insert guides" ON guides';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated update guides" ON guides';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated delete guides" ON guides';
    EXECUTE $p$
      CREATE POLICY "Staff or published guides read"
        ON guides FOR SELECT TO authenticated
        USING (
          public.can_access_property(property_id)
          OR (published = true AND property_id IS NOT NULL)
        )
    $p$;
    EXECUTE $p$
      CREATE POLICY "Staff manage guides"
        ON guides FOR ALL TO authenticated
        USING (public.can_access_property(property_id) OR public.is_app_owner())
        WITH CHECK (public.can_access_property(property_id) OR public.is_app_owner())
    $p$;
  END IF;
END $$;
