-- Multi-tenant + role security hardening (P0).
-- 1) Signup roles  2) Scoped ownership policies  3) Legacy open tables
-- 4) Agency lifecycle/DELETE  5) Revoke private guest RPCs  6) Storage reads

-- ---------------------------------------------------------------------------
-- 1. Signup: honor allowlisted metadata role + apply pending team invitations
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requested_role text;
  assigned_role text;
  invitation record;
BEGIN
  requested_role := lower(coalesce(new.raw_user_meta_data->>'role', 'owner'));
  IF requested_role NOT IN ('owner', 'partner', 'agency', 'house_manager', 'concierge', 'guest') THEN
    requested_role := 'owner';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    requested_role
  );

  -- Accept pending property-team invitations for this email.
  FOR invitation IN
    SELECT *
    FROM public.property_team_invitations
    WHERE status = 'pending'
      AND lower(email) = lower(new.email)
      AND (expires_at IS NULL OR expires_at > now())
  LOOP
    INSERT INTO public.role_assignments (user_id, property_id, role)
    VALUES (new.id, invitation.property_id, invitation.role)
    ON CONFLICT (user_id, property_id, role) DO NOTHING;

    UPDATE public.property_team_invitations
    SET status = 'accepted',
        accepted_at = now()
    WHERE id = invitation.id;

    -- Promote non-owner profiles to the invited team role.
    IF requested_role <> 'owner' THEN
      assigned_role := CASE invitation.role
        WHEN 'house_manager' THEN 'house_manager'
        WHEN 'concierge' THEN 'concierge'
        WHEN 'agency' THEN 'agency'
        ELSE 'partner'
      END;
      UPDATE public.profiles
      SET role = assigned_role
      WHERE id = new.id
        AND role IS DISTINCT FROM 'owner';
    END IF;
  END LOOP;

  RETURN new;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Replace global is_app_owner() data policies with property-scoped ones
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owner deletes reservations" ON public.reservations;
CREATE POLICY "Owner deletes reservations"
ON public.reservations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.properties property
    WHERE property.id = reservations.property_id
      AND property.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owner or assigned staff manage payments" ON public.payments;
DROP POLICY IF EXISTS "Owner staff or partner read payments" ON public.payments;
-- Keep Payment access by reservation property (scoped). Add partner read.
CREATE POLICY "Partner read own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (partner_id = public.current_partner_id());

DROP POLICY IF EXISTS "Owner or assigned staff manage contracts" ON public.contracts;
DROP POLICY IF EXISTS "Owner or assigned staff read contracts" ON public.contracts;
-- Keep Contract access by reservation property (scoped).

-- ---------------------------------------------------------------------------
-- 3. Prevent property ownership takeover via staff UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_property_owner_takeover()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id AND OLD.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Seul le propriétaire peut transférer la propriété'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_property_owner_takeover_trigger ON public.properties;
CREATE TRIGGER prevent_property_owner_takeover_trigger
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_property_owner_takeover();

DROP POLICY IF EXISTS "Owner or assigned staff update properties" ON public.properties;
CREATE POLICY "Owner or assigned staff update properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (public.can_access_property(id))
WITH CHECK (public.can_access_property(id));
-- owner_id immutability for non-owners is enforced by prevent_property_owner_takeover_trigger

-- ---------------------------------------------------------------------------
-- 4. Close legacy FOR ALL USING (true) tables
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated manage property_amenities" ON public.property_amenities;
CREATE POLICY "Property amenities by property access"
ON public.property_amenities
FOR ALL
TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Authenticated manage property_images" ON public.property_images;
CREATE POLICY "Property images by property access"
ON public.property_images
FOR ALL
TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Authenticated manage property_rooms" ON public.property_rooms;
CREATE POLICY "Property rooms by property access"
ON public.property_rooms
FOR ALL
TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Authenticated manage checkins" ON public.checkins;
CREATE POLICY "Checkins by reservation property access"
ON public.checkins
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.reservations reservation
    WHERE reservation.id = checkins.reservation_id
      AND public.can_access_property(reservation.property_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.reservations reservation
    WHERE reservation.id = checkins.reservation_id
      AND public.can_access_property(reservation.property_id)
  )
);

DROP POLICY IF EXISTS "Authenticated manage payouts" ON public.payouts;
CREATE POLICY "Payouts owner only"
ON public.payouts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles profile
    WHERE profile.id = auth.uid() AND profile.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles profile
    WHERE profile.id = auth.uid() AND profile.role = 'owner'
  )
);

DROP POLICY IF EXISTS "Anyone can insert role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Anyone can read role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Anyone can update role_permissions" ON public.role_permissions;
CREATE POLICY "Role permissions owner read"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles profile
    WHERE profile.id = auth.uid() AND profile.role = 'owner'
  )
);

-- ---------------------------------------------------------------------------
-- 5. Agency: lifecycle must not auto-confirm pending requests
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_reservation_lifecycle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  started_count integer := 0;
  archived_count integer := 0;
  closed_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  WITH started AS (
    UPDATE public.reservations reservation
    SET
      status = 'in_progress',
      updated_at = now()
    WHERE public.can_access_property(reservation.property_id)
      AND reservation.arrival <= CURRENT_DATE
      AND reservation.departure > CURRENT_DATE
      AND reservation.status = 'confirmed'
    RETURNING reservation.id
  )
  SELECT count(*) INTO started_count FROM started;

  WITH archived AS (
    UPDATE public.reservations reservation
    SET
      status = 'completed',
      archived_at = COALESCE(reservation.archived_at, now()),
      updated_at = now()
    WHERE public.can_access_property(reservation.property_id)
      AND reservation.departure < CURRENT_DATE
      AND reservation.status IN ('confirmed', 'in_progress')
    RETURNING reservation.id
  )
  SELECT count(*) INTO archived_count FROM archived;

  WITH closed AS (
    UPDATE public.stay_conversations conversation
    SET
      status = 'closed',
      updated_at = now()
    FROM public.reservations reservation
    WHERE conversation.reservation_id = reservation.id
      AND reservation.status = 'completed'
      AND conversation.status = 'open'
      AND public.can_access_property(reservation.property_id)
    RETURNING conversation.id
  )
  SELECT count(*) INTO closed_count FROM closed;

  RETURN jsonb_build_object(
    'started', started_count,
    'archived', archived_count,
    'conversations_closed', closed_count
  );
END;
$$;

-- Agency cannot DELETE reservations
CREATE OR REPLACE FUNCTION public.enforce_agency_reservation_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_role text;
BEGIN
  SELECT profile.role
  INTO actor_role
  FROM public.profiles profile
  WHERE profile.id = auth.uid();

  IF actor_role IS DISTINCT FROM 'agency' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Une agence ne peut pas supprimer une réservation'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'Les demandes agence doivent être en statut pending'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.booking_kind IS DISTINCT FROM 'guest' THEN
      RAISE EXCEPTION 'Les demandes agence doivent concerner un séjour client'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.contract_mode = 'none' THEN
      RAISE EXCEPTION 'Les demandes agence ne peuvent pas bloquer le calendrier'
        USING ERRCODE = '42501';
    END IF;

    NEW.requested_by := auth.uid();
    NEW.status := 'pending';
    NEW.booking_kind := 'guest';
    NEW.total_amount := COALESCE(NEW.total_amount, 0);
    IF NEW.total_amount < 0 THEN
      NEW.total_amount := 0;
    END IF;
    NEW.payment_status := 'pending';
    IF NEW.contract_mode IS NULL OR NEW.contract_mode = 'none' THEN
      NEW.contract_mode := 'to_prepare';
    END IF;
    IF NEW.contract_status IS NULL OR NEW.contract_status = 'none' THEN
      NEW.contract_status := 'draft';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.requested_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Une agence ne peut modifier que ses propres demandes'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Une agence ne peut modifier qu’une demande en attente'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status NOT IN ('pending', 'cancelled') THEN
    RAISE EXCEPTION 'Une agence ne peut pas confirmer une réservation'
      USING ERRCODE = '42501';
  END IF;

  NEW.requested_by := OLD.requested_by;
  NEW.property_id := OLD.property_id;
  NEW.total_amount := OLD.total_amount;
  NEW.payment_status := OLD.payment_status;
  NEW.contract_status := OLD.contract_status;
  NEW.contract_mode := OLD.contract_mode;
  NEW.booking_kind := OLD.booking_kind;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_agency_reservation_limits_trigger ON public.reservations;
CREATE TRIGGER enforce_agency_reservation_limits_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_agency_reservation_limits();

-- Split reservation FOR ALL so agency DELETE is blocked by trigger + owner-only delete policy.
-- Keep property-scoped ALL for non-agency (trigger no-ops). Owner delete policy remains.

-- ---------------------------------------------------------------------------
-- 6. Revoke direct EXECUTE on private.guest_* from clients
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private'
      AND p.proname LIKE 'guest_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Tighten storage SELECT on signed-contracts / chat-attachments
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated read signed contracts" ON storage.objects;
CREATE POLICY "Signed contracts read by property access"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'signed-contracts'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.contracts contract
      JOIN public.reservations reservation ON reservation.id = contract.reservation_id
      WHERE public.can_access_property(reservation.property_id)
        AND (
          name ILIKE '%' || contract.id::text || '%'
          OR name ILIKE '%' || reservation.id::text || '%'
        )
    )
  )
);

DROP POLICY IF EXISTS "Authenticated read chat attachments" ON storage.objects;
CREATE POLICY "Chat attachments read by property access"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.stay_messages message
      JOIN public.stay_conversations conversation ON conversation.id = message.conversation_id
      WHERE public.can_access_property(conversation.property_id)
        AND (
          message.payload->>'storage_path' = name
          OR message.payload->>'path' = name
          OR name ILIKE '%' || conversation.id::text || '%'
        )
    )
  )
);
