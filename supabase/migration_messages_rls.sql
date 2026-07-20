-- Messages RLS hardening
-- Replaces the permissive "Authenticated manage messages" policy with
-- participant-scoped policies: guests only access their reservation's
-- messages; staff (property owner or assigned via role_assignments) only
-- access messages for properties they manage. Senders must be themselves.

-- Helper: true when the current user is a guest on the message's reservation.
CREATE OR REPLACE FUNCTION public.is_reservation_guest(r_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM reservations r
    JOIN auth.users u ON u.id = auth.uid()
    WHERE r.id = r_id AND lower(r.guest_email) = lower(u.email)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: true when the current user is staff (owner of the property, or
-- assigned via role_assignments) for the message's reservation.
CREATE OR REPLACE FUNCTION public.is_reservation_staff(r_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM reservations r
    JOIN properties p ON p.id = r.property_id
    WHERE r.id = r_id AND (
      p.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM role_assignments ra
        WHERE ra.property_id = p.id AND ra.user_id = auth.uid()
      )
    )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Authenticated manage messages" ON messages;

CREATE POLICY "Read messages for own reservation or managed property"
  ON messages FOR SELECT
  TO authenticated
  USING (
    is_reservation_guest(reservation_id)
    OR is_reservation_staff(reservation_id)
  );

CREATE POLICY "Send messages to own reservation or managed property"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      is_reservation_guest(reservation_id)
      OR is_reservation_staff(reservation_id)
    )
  );

CREATE POLICY "Mark read on own reservation or managed property"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    is_reservation_guest(reservation_id)
    OR is_reservation_staff(reservation_id)
  );
