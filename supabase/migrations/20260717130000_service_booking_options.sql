-- Configurable options per concierge service (airport, car model, etc.)

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.property_services
  ADD COLUMN IF NOT EXISTS options jsonb;

ALTER TABLE public.stay_service_requests
  ADD COLUMN IF NOT EXISTS selected_options jsonb;

COMMENT ON COLUMN public.services.options IS
  'Array of option groups: [{id,label,required,choices:[{id,label,price}]}]. Prices are additive to base price.';
COMMENT ON COLUMN public.property_services.options IS
  'Optional override of services.options; NULL inherits catalog options.';
COMMENT ON COLUMN public.stay_service_requests.selected_options IS
  'Guest selections: {group_id: {id,label,price}, ...}';

CREATE OR REPLACE FUNCTION private.guest_book_concierge_service(
  p_token uuid,
  p_property_service_id uuid,
  p_quantity integer DEFAULT 1,
  p_requested_date date DEFAULT NULL,
  p_client_notes text DEFAULT NULL,
  p_selected_options jsonb DEFAULT '{}'::jsonb
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
  options_json jsonb;
  group_item jsonb;
  choice_item jsonb;
  choice_id text;
  choice_price numeric;
  options_total numeric := 0;
  selected_snapshot jsonb := '{}'::jsonb;
  options_summary text := '';
  description_text text;
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

  options_json := COALESCE(ps.options, svc.options, '[]'::jsonb);
  IF jsonb_typeof(options_json) <> 'array' THEN
    options_json := '[]'::jsonb;
  END IF;

  FOR group_item IN SELECT * FROM jsonb_array_elements(options_json)
  LOOP
    choice_id := NULLIF(trim(COALESCE(p_selected_options ->> (group_item->>'id'), '')), '');

    IF COALESCE((group_item->>'required')::boolean, true) AND choice_id IS NULL THEN
      RETURN jsonb_build_object('error', 'missing_options');
    END IF;

    IF choice_id IS NULL THEN
      CONTINUE;
    END IF;

    choice_item := NULL;
    SELECT c INTO choice_item
    FROM jsonb_array_elements(COALESCE(group_item->'choices', '[]'::jsonb)) AS c
    WHERE c->>'id' = choice_id
    LIMIT 1;

    IF choice_item IS NULL THEN
      RETURN jsonb_build_object('error', 'invalid_options');
    END IF;

    choice_price := COALESCE((choice_item->>'price')::numeric, 0);
    options_total := options_total + choice_price;
    selected_snapshot := selected_snapshot || jsonb_build_object(
      group_item->>'id',
      jsonb_build_object(
        'id', choice_item->>'id',
        'label', choice_item->>'label',
        'group_label', group_item->>'label',
        'price', choice_price
      )
    );
    options_summary := options_summary
      || CASE WHEN options_summary = '' THEN '' ELSE E'\n' END
      || COALESCE(group_item->>'label', 'Option') || ' : '
      || COALESCE(choice_item->>'label', choice_id);
  END LOOP;

  unit_price := COALESCE(ps.custom_price, svc.starting_price, 0) + options_total;
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
  description_text := NULLIF(trim(concat_ws(
    E'\n\n',
    NULLIF(trim(COALESCE(p_client_notes, '')), ''),
    NULLIF(options_summary, '')
  )), '');

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
    approved_at,
    selected_options
  ) VALUES (
    res.id,
    reserve_row.id,
    res.property_id,
    category,
    title,
    description_text,
    p_requested_date,
    amount,
    amount,
    ps.id,
    COALESCE(NULLIF(trim(ps.provider_name), ''), NULLIF(trim(svc.provider_name), '')),
    'approved',
    now(),
    NULLIF(selected_snapshot, '{}'::jsonb)
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
  p_client_notes text DEFAULT NULL,
  p_selected_options jsonb DEFAULT '{}'::jsonb
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
    p_token, p_property_service_id, p_quantity, p_requested_date, p_client_notes, p_selected_options
  );
END;
$$;

DROP FUNCTION IF EXISTS private.guest_book_concierge_service(uuid, uuid, integer, date, text);
DROP FUNCTION IF EXISTS public.guest_book_concierge_service(uuid, uuid, integer, date, text);

REVOKE ALL ON FUNCTION private.guest_book_concierge_service(uuid, uuid, integer, date, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.guest_book_concierge_service(uuid, uuid, integer, date, text, jsonb) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.guest_book_concierge_service(uuid, uuid, integer, date, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_book_concierge_service(uuid, uuid, integer, date, text, jsonb) TO anon, authenticated;
