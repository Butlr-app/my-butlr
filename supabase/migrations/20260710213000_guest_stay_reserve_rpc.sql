-- Guest stay portal RPCs + seed Réserve séjour (Villa St Tropez)

GRANT EXECUTE ON FUNCTION public.refresh_stay_reserve_status(uuid) TO authenticated;

-- Helper: resolve reservation from portal token
CREATE OR REPLACE FUNCTION public._resolve_guest_reservation(p_token uuid)
RETURNS public.reservations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM public.reservations r
  WHERE r.portal_access_token = p_token
    AND r.booking_kind = 'guest'
    AND r.status <> 'cancelled'
  LIMIT 1;
$$;

-- Full guest portal payload (settings, guides, services, reserve, requests, transactions)
CREATE OR REPLACE FUNCTION public.get_guest_stay_portal(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
  prop record;
  portal_settings jsonb;
  guides_json jsonb;
  services_json jsonb;
  reserve record;
  requests_json jsonb;
  transactions_json jsonb;
  nights integer;
  recommended numeric;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT p.id, p.name, p.image_url, p.type, p.max_guests
  INTO prop
  FROM public.properties p
  WHERE p.id = res.property_id;

  SELECT to_jsonb(s.*) INTO portal_settings
  FROM public.property_guest_portal_settings s
  WHERE s.property_id = res.property_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(g.*) ORDER BY g.sort_order, g.title), '[]'::jsonb)
  INTO guides_json
  FROM public.guides g
  WHERE g.property_id = res.property_id AND g.published = true;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'enabled', ps.enabled,
        'assignment', to_jsonb(ps),
        'service', to_jsonb(s)
      ) ORDER BY ps.sort_order
    ),
    '[]'::jsonb
  )
  INTO services_json
  FROM public.property_services ps
  JOIN public.services s ON s.id = ps.service_id
  WHERE ps.property_id = res.property_id AND ps.enabled = true;

  SELECT * INTO reserve FROM public.stay_reserves WHERE reservation_id = res.id;

  IF reserve.id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(r.*) ORDER BY r.created_at DESC), '[]'::jsonb)
    INTO requests_json
    FROM public.stay_service_requests r
    WHERE r.stay_reserve_id = reserve.id;

    SELECT COALESCE(jsonb_agg(to_jsonb(t.*) ORDER BY t.created_at DESC), '[]'::jsonb)
    INTO transactions_json
    FROM public.reserve_transactions t
    WHERE t.stay_reserve_id = reserve.id;
  ELSE
    requests_json := '[]'::jsonb;
    transactions_json := '[]'::jsonb;
  END IF;

  nights := GREATEST(1, (res.departure - res.arrival));
  recommended := public.recommend_stay_reserve_amount(nights, prop.max_guests, prop.type);

  RETURN jsonb_build_object(
    'reservation', jsonb_build_object(
      'id', res.id,
      'guest_name', res.guest_name,
      'arrival', res.arrival,
      'departure', res.departure,
      'guests_count', res.guests_count,
      'property_id', res.property_id,
      'property_name', prop.name,
      'property_image_url', prop.image_url,
      'property_type', prop.type,
      'max_guests', prop.max_guests
    ),
    'settings', COALESCE(portal_settings, jsonb_build_object('property_id', res.property_id, 'enabled', true)),
    'guides', guides_json,
    'property_services', services_json,
    'reserve', CASE WHEN reserve.id IS NULL THEN NULL ELSE to_jsonb(reserve) END,
    'service_requests', requests_json,
    'transactions', transactions_json,
    'recommended_amount', recommended
  );
END;
$$;

-- Guest: activate reserve + initial top-up
CREATE OR REPLACE FUNCTION public.guest_activate_stay_reserve(p_token uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
  reserve_id uuid;
  reserve_row public.stay_reserves;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'invalid_amount');
  END IF;

  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  SELECT id INTO reserve_id FROM public.stay_reserves WHERE reservation_id = res.id;

  IF reserve_id IS NULL THEN
    INSERT INTO public.stay_reserves (
      reservation_id, property_id, recommended_amount, initial_amount,
      current_balance, status, approval_mode, auto_approval_limit
    ) VALUES (
      res.id, res.property_id, p_amount, p_amount, p_amount, 'funded', 'auto_under_limit', 300
    )
    RETURNING id INTO reserve_id;

    INSERT INTO public.reserve_transactions (
      stay_reserve_id, type, amount, currency, status, description
    ) VALUES (
      reserve_id, 'top_up', p_amount, 'EUR', 'completed', 'Versement Réserve séjour'
    );
  ELSE
    UPDATE public.stay_reserves
    SET
      initial_amount = initial_amount + p_amount,
      current_balance = current_balance + p_amount,
      status = 'funded',
      updated_at = now()
    WHERE id = reserve_id;

    INSERT INTO public.reserve_transactions (
      stay_reserve_id, type, amount, currency, status, description
    ) VALUES (
      reserve_id, 'top_up', p_amount, 'EUR', 'completed', 'Versement Réserve séjour'
    );
  END IF;

  PERFORM public.refresh_stay_reserve_status(reserve_id);
  SELECT * INTO reserve_row FROM public.stay_reserves WHERE id = reserve_id;
  RETURN jsonb_build_object('reserve', to_jsonb(reserve_row));
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_top_up_stay_reserve(p_token uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.guest_activate_stay_reserve(p_token, p_amount);
END;
$$;

-- Guest: create service request
CREATE OR REPLACE FUNCTION public.guest_create_stay_service_request(
  p_token uuid,
  p_category text,
  p_title text,
  p_description text DEFAULT NULL,
  p_requested_date date DEFAULT NULL,
  p_estimated_amount numeric DEFAULT NULL,
  p_property_service_id uuid DEFAULT NULL,
  p_provider_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
  reserve_row public.stay_reserves;
  request_row public.stay_service_requests;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  SELECT * INTO reserve_row FROM public.stay_reserves WHERE reservation_id = res.id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'no_reserve'); END IF;
  IF reserve_row.status IN ('closed', 'refunded', 'cancelled') THEN
    RETURN jsonb_build_object('error', 'reserve_closed');
  END IF;

  INSERT INTO public.stay_service_requests (
    reservation_id, stay_reserve_id, property_id, category, title, description,
    requested_date, estimated_amount, property_service_id, provider_name, status
  ) VALUES (
    res.id, reserve_row.id, res.property_id, COALESCE(NULLIF(trim(p_category), ''), 'other'),
    trim(p_title), NULLIF(trim(p_description), ''), p_requested_date, p_estimated_amount,
    p_property_service_id, NULLIF(trim(p_provider_name), ''), 'submitted'
  )
  RETURNING * INTO request_row;

  RETURN jsonb_build_object('request', to_jsonb(request_row));
END;
$$;

-- Guest: approve service request (debit reserve)
CREATE OR REPLACE FUNCTION public.guest_approve_stay_service_request(p_token uuid, p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
  reserve_row public.stay_reserves;
  request_row public.stay_service_requests;
  amount numeric;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  SELECT * INTO reserve_row FROM public.stay_reserves WHERE reservation_id = res.id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'no_reserve'); END IF;

  SELECT * INTO request_row
  FROM public.stay_service_requests
  WHERE id = p_request_id AND stay_reserve_id = reserve_row.id;

  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'request_not_found'); END IF;
  IF request_row.status <> 'waiting_client_approval' THEN
    RETURN jsonb_build_object('error', 'invalid_status');
  END IF;

  amount := COALESCE(request_row.final_amount, request_row.estimated_amount, 0);
  IF amount <= 0 THEN RETURN jsonb_build_object('error', 'invalid_amount'); END IF;
  IF reserve_row.current_balance < amount THEN RETURN jsonb_build_object('error', 'insufficient_balance'); END IF;

  UPDATE public.stay_reserves
  SET
    current_balance = current_balance - amount,
    pending_amount = pending_amount + amount,
    updated_at = now()
  WHERE id = reserve_row.id;

  UPDATE public.stay_service_requests
  SET status = 'approved', approved_at = now(), updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.reserve_transactions (
    stay_reserve_id, service_request_id, type, amount, currency, status, description
  ) VALUES (
    reserve_row.id, p_request_id, 'authorization', amount, reserve_row.currency,
    'completed', 'Réservation — ' || request_row.title
  );

  PERFORM public.refresh_stay_reserve_status(reserve_row.id);

  SELECT * INTO reserve_row FROM public.stay_reserves WHERE id = reserve_row.id;
  SELECT * INTO request_row FROM public.stay_service_requests WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'reserve', to_jsonb(reserve_row),
    'request', to_jsonb(request_row)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_stay_portal(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_activate_stay_reserve(uuid, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_top_up_stay_reserve(uuid, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_create_stay_service_request(uuid, text, text, text, date, numeric, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_approve_stay_service_request(uuid, uuid) TO anon, authenticated;

-- Seed Réserve séjour + demandes exemple (Villa St Tropez)
DO $$
DECLARE
  v_reservation_id uuid := '9a09a3a1-cecc-46b0-8686-1028135d70d9';
  v_property_id uuid := '6a6286aa-381f-48c3-87cc-cab3a2994f86';
  v_reserve_id uuid;
  v_req_chef uuid;
  v_req_chauffeur uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.reservations WHERE id = v_reservation_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.stay_reserves (
    id, reservation_id, property_id, recommended_amount,
    initial_amount, current_balance, spent_amount, pending_amount,
    status, approval_mode, auto_approval_limit
  ) VALUES (
    'a1000001-0000-4000-8000-000000000001',
    v_reservation_id, v_property_id, 7500,
    7500, 5200, 1800, 500,
    'partially_used', 'auto_under_limit', 300
  )
  ON CONFLICT (reservation_id) DO UPDATE SET
    recommended_amount = EXCLUDED.recommended_amount,
    initial_amount = EXCLUDED.initial_amount,
    current_balance = EXCLUDED.current_balance,
    spent_amount = EXCLUDED.spent_amount,
    pending_amount = EXCLUDED.pending_amount,
    status = EXCLUDED.status,
    updated_at = now()
  RETURNING id INTO v_reserve_id;

  IF v_reserve_id IS NULL THEN
    SELECT id INTO v_reserve_id FROM public.stay_reserves WHERE reservation_id = v_reservation_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.reserve_transactions
    WHERE stay_reserve_id = v_reserve_id AND description = 'Versement initial Réserve séjour'
  ) THEN
    INSERT INTO public.reserve_transactions (stay_reserve_id, type, amount, currency, status, description)
    VALUES
      (v_reserve_id, 'top_up', 7500, 'EUR', 'completed', 'Versement initial Réserve séjour'),
      (v_reserve_id, 'capture', 180, 'EUR', 'completed', 'Service confirmé — Courses premium'),
      (v_reserve_id, 'capture', 420, 'EUR', 'completed', 'Service confirmé — Massage à domicile'),
      (v_reserve_id, 'capture', 1200, 'EUR', 'completed', 'Service confirmé — Chef privé dîner');
  END IF;

  INSERT INTO public.stay_service_requests (
    id, reservation_id, stay_reserve_id, property_id, category, title, description,
    requested_date, status, estimated_amount, final_amount, provider_name, completed_at
  ) VALUES (
    'b1000001-0000-4000-8000-000000000001',
    v_reservation_id, v_reserve_id, v_property_id,
    'dining', 'Chef privé — dîner gastronomique', 'Menu 7 services pour 12 convives, vendredi soir.',
    CURRENT_DATE + 1, 'completed', 1200, 1200, 'Chef Antoine Dubois', now() - interval '2 days'
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_req_chef;

  INSERT INTO public.stay_service_requests (
    id, reservation_id, stay_reserve_id, property_id, category, title, description,
    requested_date, status, estimated_amount, final_amount, provider_name, approved_at
  ) VALUES (
    'b1000001-0000-4000-8000-000000000002',
    v_reservation_id, v_reserve_id, v_property_id,
    'transport', 'Chauffeur aéroport Nice', 'Transfert Nice Côte d''Azur → villa, 4 véhicules.',
    CURRENT_DATE + 3, 'waiting_client_approval', 650, 650, 'Elite Riviera Transfers', NULL
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_req_chauffeur;

  IF NOT EXISTS (
    SELECT 1 FROM public.stay_service_requests
    WHERE stay_reserve_id = v_reserve_id AND title = 'Location bateau journée'
  ) THEN
    INSERT INTO public.stay_service_requests (
      reservation_id, stay_reserve_id, property_id, category, title, description,
      requested_date, status, estimated_amount, provider_name
    ) VALUES (
      v_reservation_id, v_reserve_id, v_property_id,
      'activities', 'Location bateau journée', 'Catamaran 12 pax, capitaine inclus, départ Port Grimaud.',
      CURRENT_DATE + 5, 'reviewing', 2800, 'Azur Yachting'
    );
  END IF;
END $$;
