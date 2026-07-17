-- Automatic lifecycle for reservations: in_progress during stay, archive when past.

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMENT ON COLUMN public.reservations.archived_at IS
  'Timestamp when the stay was archived after departure.';

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
      AND reservation.status IN ('pending', 'confirmed')
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
      AND reservation.status NOT IN ('cancelled', 'completed')
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

REVOKE ALL ON FUNCTION public.sync_reservation_lifecycle() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_reservation_lifecycle() TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_reservation_capacity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  property_capacity integer;
  required_minimum_stay integer;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.property_id::text, 0)
  );

  IF NEW.status NOT IN ('cancelled', 'completed') AND EXISTS (
    SELECT 1
    FROM public.reservations reservation
    WHERE reservation.property_id = NEW.property_id
      AND reservation.id <> NEW.id
      AND reservation.status NOT IN ('cancelled', 'completed')
      AND daterange(reservation.arrival, reservation.departure, '[)')
        && daterange(NEW.arrival, NEW.departure, '[)')
  ) THEN
    RAISE EXCEPTION 'Reservation dates overlap an existing reservation'
      USING ERRCODE = '23P01';
  END IF;

  IF NEW.contract_mode = 'none' THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('cancelled', 'completed') AND EXISTS (
    SELECT 1
    FROM public.property_rate_overrides rate_override
    WHERE rate_override.property_id = NEW.property_id
      AND rate_override.availability = 'blocked'
      AND rate_override.date >= NEW.arrival
      AND rate_override.date < NEW.departure
  ) THEN
    RAISE EXCEPTION 'Reservation includes a blocked pricing calendar date'
      USING ERRCODE = '23P01';
  END IF;

  SELECT COALESCE(
    (
      SELECT rate_override.minimum_stay
      FROM public.property_rate_overrides rate_override
      WHERE rate_override.property_id = NEW.property_id
        AND rate_override.date = NEW.arrival
    ),
    (
      SELECT season.minimum_stay
      FROM public.property_rate_seasons season
      WHERE season.property_id = NEW.property_id
        AND season.active
        AND NEW.arrival BETWEEN season.start_date AND season.end_date
      ORDER BY season.priority DESC
      LIMIT 1
    ),
    (
      SELECT pricing.minimum_stay
      FROM public.property_pricing_settings pricing
      WHERE pricing.property_id = NEW.property_id
    ),
    1
  )
  INTO required_minimum_stay;

  IF NEW.departure - NEW.arrival < required_minimum_stay THEN
    RAISE EXCEPTION 'Reservation requires a minimum stay of % nights', required_minimum_stay
      USING ERRCODE = '23514';
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
