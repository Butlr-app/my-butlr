-- Allow multiple partial payments per reservation (installments / deposits).

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_type_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_type_check
  CHECK (type IN ('booking', 'deposit', 'service', 'commission', 'installment'));

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS notes text;

DROP INDEX IF EXISTS public.payments_reservation_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS payments_reservation_booking_type_key
  ON public.payments (reservation_id, type)
  WHERE reservation_id IS NOT NULL AND type = 'booking';

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
        WHEN 'partial' THEN 'pending'
        ELSE 'pending'
      END,
      CURRENT_DATE
    )
    ON CONFLICT (reservation_id, type) WHERE reservation_id IS NOT NULL AND type = 'booking'
    DO UPDATE SET
      guest_name = EXCLUDED.guest_name,
      property_name = EXCLUDED.property_name,
      amount = EXCLUDED.amount,
      status = EXCLUDED.status;
  END IF;

  RETURN NEW;
END;
$$;
