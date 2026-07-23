-- Reservation integrity, tenant isolation, overlap protection and cross-module sync.

UPDATE public.reservations
SET
  booking_kind = CASE WHEN contract_mode = 'none' THEN 'blocked_dates' ELSE 'guest' END,
  contract_status = CASE
    WHEN contract_mode = 'none' THEN 'none'
    WHEN contract_mode = 'already_done' THEN 'signed'
    WHEN contract_status = 'none' THEN 'draft'
    ELSE contract_status
  END,
  payment_status = CASE WHEN contract_mode = 'none' THEN 'not_applicable' ELSE payment_status END,
  total_amount = CASE WHEN contract_mode = 'none' THEN 0 ELSE GREATEST(total_amount, 0) END,
  guests_count = GREATEST(1, LEAST(guests_count, 50));

ALTER TABLE public.reservations
  ALTER COLUMN property_id SET NOT NULL,
  ALTER COLUMN arrival SET NOT NULL,
  ALTER COLUMN departure SET NOT NULL,
  ALTER COLUMN guests_count SET NOT NULL,
  ALTER COLUMN total_amount SET NOT NULL,
  DROP CONSTRAINT IF EXISTS reservations_dates_check,
  ADD CONSTRAINT reservations_dates_check CHECK (arrival < departure),
  DROP CONSTRAINT IF EXISTS reservations_guests_count_check,
  ADD CONSTRAINT reservations_guests_count_check CHECK (guests_count BETWEEN 1 AND 50),
  DROP CONSTRAINT IF EXISTS reservations_total_amount_check,
  ADD CONSTRAINT reservations_total_amount_check CHECK (total_amount >= 0),
  DROP CONSTRAINT IF EXISTS reservations_workflow_consistency_check,
  ADD CONSTRAINT reservations_workflow_consistency_check CHECK (
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

CREATE OR REPLACE FUNCTION public.validate_reservation_capacity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  property_capacity integer;
BEGIN
  -- Serialize date validation per property to avoid concurrent double bookings.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.property_id::text, 0)
  );

  IF NEW.status <> 'cancelled' AND EXISTS (
    SELECT 1
    FROM public.reservations reservation
    WHERE reservation.property_id = NEW.property_id
      AND reservation.id <> NEW.id
      AND reservation.status <> 'cancelled'
      AND daterange(reservation.arrival, reservation.departure, '[)')
        && daterange(NEW.arrival, NEW.departure, '[)')
  ) THEN
    RAISE EXCEPTION 'Reservation dates overlap an existing reservation'
      USING ERRCODE = '23P01';
  END IF;

  IF NEW.contract_mode = 'none' THEN
    RETURN NEW;
  END IF;

  SELECT max_guests
  INTO property_capacity
  FROM public.properties
  WHERE id = NEW.property_id;

  IF property_capacity IS NOT NULL AND NEW.guests_count > property_capacity THEN
    RAISE EXCEPTION 'Reservation exceeds property capacity of % guests', property_capacity
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_reservation_capacity_trigger ON public.reservations;
CREATE TRIGGER validate_reservation_capacity_trigger
BEFORE INSERT OR UPDATE OF property_id, arrival, departure, status, guests_count, contract_mode
ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.validate_reservation_capacity();

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE;

ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_type_check,
  ADD CONSTRAINT calendar_events_type_check CHECK (
    type IN ('reservation', 'maintenance', 'cleaning', 'service', 'owner', 'marketing', 'blocked')
  );

CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_reservation_id_key
  ON public.calendar_events (reservation_id)
  WHERE reservation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_reservation_type_key
  ON public.contracts (reservation_id, type)
  WHERE reservation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_reservation_type_key
  ON public.payments (reservation_id, type)
  WHERE reservation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_reservation_modules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  property_name_value text;
  event_type_value text;
BEGIN
  SELECT name
  INTO property_name_value
  FROM public.properties
  WHERE id = NEW.property_id;

  IF NEW.status = 'cancelled' THEN
    DELETE FROM public.calendar_events WHERE reservation_id = NEW.id;
  ELSE
    event_type_value := CASE NEW.booking_kind
      WHEN 'owner_stay' THEN 'owner'
      WHEN 'marketing_event' THEN 'marketing'
      WHEN 'blocked_dates' THEN 'blocked'
      WHEN 'other' THEN 'blocked'
      ELSE 'reservation'
    END;

    INSERT INTO public.calendar_events (
      reservation_id,
      property_id,
      title,
      type,
      start_date,
      end_date,
      notes
    )
    VALUES (
      NEW.id,
      NEW.property_id,
      NEW.guest_name,
      event_type_value,
      NEW.arrival,
      NEW.departure,
      NEW.notes
    )
    ON CONFLICT (reservation_id) WHERE reservation_id IS NOT NULL
    DO UPDATE SET
      property_id = EXCLUDED.property_id,
      title = EXCLUDED.title,
      type = EXCLUDED.type,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      notes = EXCLUDED.notes;
  END IF;

  IF NEW.contract_mode = 'none' THEN
    DELETE FROM public.contracts
    WHERE reservation_id = NEW.id AND type = 'rental';
  ELSE
    INSERT INTO public.contracts (
      reservation_id,
      guest_name,
      property_name,
      type,
      status,
      date
    )
    VALUES (
      NEW.id,
      NEW.guest_name,
      property_name_value,
      'rental',
      NEW.contract_status,
      CURRENT_DATE
    )
    ON CONFLICT (reservation_id, type) WHERE reservation_id IS NOT NULL
    DO UPDATE SET
      guest_name = EXCLUDED.guest_name,
      property_name = EXCLUDED.property_name,
      status = EXCLUDED.status;
  END IF;

  IF NEW.contract_mode = 'none' OR NEW.total_amount = 0 THEN
    DELETE FROM public.payments
    WHERE reservation_id = NEW.id AND type = 'booking';
  ELSE
    INSERT INTO public.payments (
      reservation_id,
      guest_name,
      property_name,
      type,
      amount,
      status,
      date
    )
    VALUES (
      NEW.id,
      NEW.guest_name,
      property_name_value,
      'booking',
      NEW.total_amount,
      CASE NEW.payment_status
        WHEN 'paid' THEN 'paid'
        WHEN 'refunded' THEN 'refunded'
        ELSE 'pending'
      END,
      CURRENT_DATE
    )
    ON CONFLICT (reservation_id, type) WHERE reservation_id IS NOT NULL
    DO UPDATE SET
      guest_name = EXCLUDED.guest_name,
      property_name = EXCLUDED.property_name,
      amount = EXCLUDED.amount,
      status = EXCLUDED.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_reservation_modules_trigger ON public.reservations;
CREATE TRIGGER sync_reservation_modules_trigger
AFTER INSERT OR UPDATE OF
  property_id,
  guest_name,
  arrival,
  departure,
  status,
  payment_status,
  contract_status,
  contract_mode,
  booking_kind,
  total_amount,
  notes
ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.sync_reservation_modules();

DROP POLICY IF EXISTS "Authenticated read reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated insert reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Reservation access by property" ON public.reservations;

CREATE POLICY "Reservation access by property"
ON public.reservations
FOR ALL
TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Authenticated read contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated manage contracts" ON public.contracts;
DROP POLICY IF EXISTS "Contract access by reservation property" ON public.contracts;

CREATE POLICY "Contract access by reservation property"
ON public.contracts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.reservations reservation
    WHERE reservation.id = contracts.reservation_id
      AND public.can_access_property(reservation.property_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.reservations reservation
    WHERE reservation.id = contracts.reservation_id
      AND public.can_access_property(reservation.property_id)
  )
);

DROP POLICY IF EXISTS "Authenticated read payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated manage payments" ON public.payments;
DROP POLICY IF EXISTS "Payment access by reservation property" ON public.payments;

CREATE POLICY "Payment access by reservation property"
ON public.payments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.reservations reservation
    WHERE reservation.id = payments.reservation_id
      AND public.can_access_property(reservation.property_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.reservations reservation
    WHERE reservation.id = payments.reservation_id
      AND public.can_access_property(reservation.property_id)
  )
);

DROP POLICY IF EXISTS "Authenticated read calendar" ON public.calendar_events;
DROP POLICY IF EXISTS "Authenticated manage calendar" ON public.calendar_events;
DROP POLICY IF EXISTS "Calendar access by property" ON public.calendar_events;

CREATE POLICY "Calendar access by property"
ON public.calendar_events
FOR ALL
TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));
