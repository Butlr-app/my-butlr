-- Concierge services: optional direct purchase (like boutique), default remains quote.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS booking_mode text NOT NULL DEFAULT 'quote';

ALTER TABLE public.property_services
  ADD COLUMN IF NOT EXISTS booking_mode text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_booking_mode_check'
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_booking_mode_check
      CHECK (booking_mode IN ('quote', 'direct'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'property_services_booking_mode_check'
  ) THEN
    ALTER TABLE public.property_services
      ADD CONSTRAINT property_services_booking_mode_check
      CHECK (booking_mode IS NULL OR booking_mode IN ('quote', 'direct'));
  END IF;
END $$;

COMMENT ON COLUMN public.services.booking_mode IS
  'quote = request then staff quote; direct = guest pays from stay reserve immediately when price is fixed/per_person';
COMMENT ON COLUMN public.property_services.booking_mode IS
  'Optional override of services.booking_mode; NULL inherits catalog default';

CREATE OR REPLACE FUNCTION private.guest_book_concierge_service(
  p_token uuid,
  p_property_service_id uuid,
  p_quantity integer DEFAULT 1,
  p_requested_date date DEFAULT NULL,
  p_client_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
  reserve_row public.stay_reserves;
  ps public.property_services;
  svc public.services;
  pricing_mode text;
  booking_mode text;
  unit_price numeric;
  quantity integer;
  amount numeric;
  request_row public.stay_service_requests;
  title text;
  category text;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF res.id IS NULL THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF NOT public._guest_portal_flag(res.property_id, 'show_services') THEN
    RETURN jsonb_build_object('error', 'portal_disabled');
  END IF;

  SELECT * INTO reserve_row FROM public.stay_reserves WHERE reservation_id = res.id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'no_reserve'); END IF;
  IF reserve_row.status IN ('closed', 'refunded', 'cancelled') THEN
    RETURN jsonb_build_object('error', 'reserve_closed');
  END IF;

  SELECT * INTO ps
  FROM public.property_services
  WHERE id = p_property_service_id
    AND property_id = res.property_id
    AND enabled = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'invalid_service'); END IF;

  SELECT * INTO svc FROM public.services WHERE id = ps.service_id AND available = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'invalid_service'); END IF;

  IF COALESCE(ps.offer_mode, 'specific') = 'general' THEN
    RETURN jsonb_build_object('error', 'quote_only');
  END IF;

  pricing_mode := COALESCE(ps.pricing_mode, svc.pricing_mode, 'fixed');
  booking_mode := COALESCE(ps.booking_mode, svc.booking_mode, 'quote');

  IF pricing_mode = 'quote' OR booking_mode <> 'direct' THEN
    RETURN jsonb_build_object('error', 'quote_only');
  END IF;

  unit_price := COALESCE(ps.custom_price, svc.starting_price);
  IF unit_price IS NULL OR unit_price <= 0 THEN
    RETURN jsonb_build_object('error', 'invalid_price');
  END IF;

  quantity := GREATEST(1, COALESCE(p_quantity, 1));
  IF pricing_mode = 'per_person' THEN
    amount := unit_price * quantity;
  ELSE
    amount := unit_price;
  END IF;

  IF reserve_row.current_balance < amount THEN
    RETURN jsonb_build_object('error', 'insufficient_balance');
  END IF;

  title := COALESCE(NULLIF(trim(ps.offer_title), ''), svc.name);
  category := COALESCE(NULLIF(trim(svc.category), ''), 'other');

  INSERT INTO public.stay_service_requests (
    reservation_id,
    stay_reserve_id,
    property_id,
    category,
    title,
    description,
    requested_date,
    estimated_amount,
    final_amount,
    property_service_id,
    provider_name,
    status,
    approved_at
  ) VALUES (
    res.id,
    reserve_row.id,
    res.property_id,
    category,
    title,
    NULLIF(trim(p_client_notes), ''),
    p_requested_date,
    amount,
    amount,
    ps.id,
    COALESCE(NULLIF(trim(ps.provider_name), ''), NULLIF(trim(svc.provider_name), '')),
    'approved',
    now()
  ) RETURNING * INTO request_row;

  UPDATE public.stay_reserves
  SET current_balance = current_balance - amount,
      pending_amount = pending_amount + amount,
      updated_at = now()
  WHERE id = reserve_row.id;

  INSERT INTO public.reserve_transactions (
    stay_reserve_id, service_request_id, type, amount, currency, status, description
  ) VALUES (
    reserve_row.id,
    request_row.id,
    'authorization',
    amount,
    COALESCE(reserve_row.currency, 'EUR'),
    'completed',
    'Achat direct — ' || title
  );

  PERFORM public.refresh_stay_reserve_status(reserve_row.id);

  SELECT * INTO reserve_row FROM public.stay_reserves WHERE id = reserve_row.id;

  RETURN jsonb_build_object(
    'request', to_jsonb(request_row),
    'reserve', to_jsonb(reserve_row)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_book_concierge_service(
  p_token uuid,
  p_property_service_id uuid,
  p_quantity integer DEFAULT 1,
  p_requested_date date DEFAULT NULL,
  p_client_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF NOT private.guest_stay_is_open(p_token) THEN
    RETURN jsonb_build_object('error', 'stay_finished');
  END IF;
  RETURN private.guest_book_concierge_service(
    p_token, p_property_service_id, p_quantity, p_requested_date, p_client_notes
  );
END;
$$;

REVOKE ALL ON FUNCTION private.guest_book_concierge_service(uuid, uuid, integer, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.guest_book_concierge_service(uuid, uuid, integer, date, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.guest_book_concierge_service(uuid, uuid, integer, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_book_concierge_service(uuid, uuid, integer, date, text) TO anon, authenticated;
