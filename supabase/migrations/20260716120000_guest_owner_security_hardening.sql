-- Confinement sécurité portail voyageur + isolation owner (P0/P1 audit)
-- Corrige : token fantôme, fenêtre post-départ, catalogue guest, RLS boutique,
-- quote RPC, flags portail, grants PUBLIC, escalade de rôle, annuaire équipe.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Résolution token + helpers portail
-- ═══════════════════════════════════════════════════════════════════════════

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
    AND r.departure >= (current_date - interval '14 days')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._guest_portal_is_enabled(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT s.enabled
      FROM public.property_guest_portal_settings s
      WHERE s.property_id = p_property_id
    ),
    true
  );
$$;

CREATE OR REPLACE FUNCTION public._guest_portal_flag(p_property_id uuid, p_flag text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings public.property_guest_portal_settings;
BEGIN
  IF p_property_id IS NULL THEN
    RETURN false;
  END IF;
  IF NOT public._guest_portal_is_enabled(p_property_id) THEN
    RETURN false;
  END IF;
  SELECT * INTO settings
  FROM public.property_guest_portal_settings s
  WHERE s.property_id = p_property_id;
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  IF p_flag = 'show_boutique' THEN
    RETURN COALESCE(settings.show_boutique, true);
  ELSIF p_flag = 'show_services' THEN
    RETURN COALESCE(settings.show_services, true);
  ELSIF p_flag = 'show_messaging' THEN
    RETURN COALESCE(settings.show_messaging, true);
  END IF;
  RETURN true;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. get_guest_stay_portal : garde res.id + guest_language
-- ═══════════════════════════════════════════════════════════════════════════

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
  reservation_json jsonb;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF res.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT p.id, p.name, p.image_url, p.type, p.max_guests
  INTO prop
  FROM public.properties p
  WHERE p.id = res.property_id;

  SELECT to_jsonb(s.*) INTO portal_settings
  FROM public.property_guest_portal_settings s
  WHERE s.property_id = res.property_id;

  reservation_json := jsonb_build_object(
    'id', res.id,
    'guest_name', res.guest_name,
    'arrival', res.arrival,
    'departure', res.departure,
    'guests_count', res.guests_count,
    'property_id', res.property_id,
    'property_name', prop.name,
    'property_image_url', prop.image_url,
    'property_type', prop.type,
    'max_guests', prop.max_guests,
    'guest_language', res.guest_language
  );

  IF portal_settings IS NOT NULL
     AND COALESCE((portal_settings->>'enabled')::boolean, true) = false THEN
    RETURN jsonb_build_object(
      'reservation', reservation_json,
      'settings', jsonb_build_object('property_id', res.property_id, 'enabled', false),
      'guides', '[]'::jsonb,
      'property_services', '[]'::jsonb,
      'reserve', NULL,
      'service_requests', '[]'::jsonb,
      'transactions', '[]'::jsonb,
      'recommended_amount', 0
    );
  END IF;

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
    'reservation', reservation_json,
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

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Catalogue boutique voyageur (token) + fermeture IDOR property catalog
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_guest_boutique_catalog(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF res.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found', 'categories', '[]'::jsonb, 'items', '[]'::jsonb);
  END IF;
  IF NOT public._guest_portal_flag(res.property_id, 'show_boutique') THEN
    RETURN jsonb_build_object('categories', '[]'::jsonb, 'items', '[]'::jsonb);
  END IF;
  RETURN public.get_property_boutique_catalog(res.property_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_property_boutique_catalog(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_property_boutique_catalog(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_property_boutique_catalog(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_guest_boutique_catalog(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_boutique_catalog(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_guest_stay_portal(uuid) TO anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. quote_store_order_item + refresh_stay_reserve_status grants
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.quote_store_order_item(
  p_order_item_id uuid,
  p_quoted_amount numeric,
  p_internal_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  oi public.store_order_items;
  ord public.store_orders;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;
  IF p_quoted_amount IS NULL OR p_quoted_amount < 0 THEN
    RETURN jsonb_build_object('error', 'invalid_amount');
  END IF;

  SELECT * INTO oi FROM public.store_order_items WHERE id = p_order_item_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  SELECT * INTO ord FROM public.store_orders WHERE id = oi.order_id;
  IF NOT FOUND OR NOT public.can_access_property(ord.property_id) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  UPDATE public.store_order_items
  SET
    quoted_amount = p_quoted_amount,
    unit_price = p_quoted_amount / GREATEST(1, quantity),
    total_price = p_quoted_amount,
    status = 'waiting_client_approval',
    internal_notes = COALESCE(NULLIF(trim(p_internal_notes), ''), internal_notes),
    updated_at = now()
  WHERE id = p_order_item_id
  RETURNING * INTO oi;

  UPDATE public.store_orders
  SET status = 'waiting_client_approval', updated_at = now()
  WHERE id = ord.id;

  RETURN jsonb_build_object('item', to_jsonb(oi));
END;
$$;

REVOKE ALL ON FUNCTION public.quote_store_order_item(uuid, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.quote_store_order_item(uuid, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.quote_store_order_item(uuid, numeric, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_stay_reserve_status(p_reserve_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.stay_reserves%ROWTYPE;
  low_threshold numeric := 500;
BEGIN
  SELECT * INTO r FROM public.stay_reserves WHERE id = p_reserve_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF r.status IN ('closed', 'refunded', 'cancelled') THEN RETURN; END IF;
  IF r.current_balance <= 0 AND r.initial_amount > 0 THEN
    UPDATE public.stay_reserves SET status = 'exhausted', updated_at = now() WHERE id = p_reserve_id;
  ELSIF r.current_balance > 0 AND r.current_balance < low_threshold AND r.spent_amount > 0 THEN
    UPDATE public.stay_reserves SET status = 'low_balance', updated_at = now() WHERE id = p_reserve_id;
  ELSIF r.spent_amount > 0 AND r.current_balance > 0 THEN
    UPDATE public.stay_reserves SET status = 'partially_used', updated_at = now() WHERE id = p_reserve_id;
  ELSIF r.current_balance > 0 AND r.initial_amount > 0 THEN
    UPDATE public.stay_reserves SET status = 'funded', updated_at = now() WHERE id = p_reserve_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_stay_reserve_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_stay_reserve_status(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.refresh_stay_reserve_status(uuid) TO authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Mutations guest : portail enabled + flags + garde res.id
-- ═══════════════════════════════════════════════════════════════════════════

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
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RETURN jsonb_build_object('error', 'invalid_amount');
  END IF;

  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF res.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;
  IF NOT public._guest_portal_is_enabled(res.property_id) THEN
    RETURN jsonb_build_object('error', 'portal_disabled');
  END IF;

  SELECT id INTO reserve_id FROM public.stay_reserves WHERE reservation_id = res.id;

  IF reserve_id IS NULL THEN
    INSERT INTO public.stay_reserves (
      reservation_id, property_id, recommended_amount, initial_amount, current_balance,
      status, approval_mode, auto_approval_limit
    ) VALUES (
      res.id, res.property_id, p_amount, p_amount, p_amount,
      'funded', 'auto_under_limit', 300
    ) RETURNING id INTO reserve_id;

    INSERT INTO public.reserve_transactions (stay_reserve_id, type, amount, currency, status, description)
    VALUES (reserve_id, 'top_up', p_amount, 'EUR', 'completed', 'Crédit Réserve séjour (suivi villa)');
  ELSE
    UPDATE public.stay_reserves
    SET
      initial_amount = initial_amount + p_amount,
      current_balance = current_balance + p_amount,
      status = 'funded',
      updated_at = now()
    WHERE id = reserve_id;

    INSERT INTO public.reserve_transactions (stay_reserve_id, type, amount, currency, status, description)
    VALUES (reserve_id, 'top_up', p_amount, 'EUR', 'completed', 'Crédit Réserve séjour (suivi villa)');
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

CREATE OR REPLACE FUNCTION public.guest_checkout_boutique(
  p_token uuid,
  p_items jsonb,
  p_payment_method text DEFAULT 'stay_reserve',
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
  order_row public.store_orders;
  item jsonb;
  cat_item public.catalog_items;
  pci public.property_catalog_items;
  unit_price numeric;
  line_total numeric;
  subtotal numeric := 0;
  payable numeric := 0;
  has_quote boolean := false;
  order_id uuid;
  order_status text := 'paid';
  item_status text;
  split record;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF res.id IS NULL THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF NOT public._guest_portal_flag(res.property_id, 'show_boutique') THEN
    RETURN jsonb_build_object('error', 'portal_disabled');
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('error', 'empty_cart');
  END IF;
  IF p_payment_method IS DISTINCT FROM 'stay_reserve' THEN
    RETURN jsonb_build_object('error', 'invalid_payment_method');
  END IF;

  SELECT * INTO reserve_row FROM public.stay_reserves WHERE reservation_id = res.id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'no_reserve'); END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT ci.* INTO cat_item
    FROM public.catalog_items ci
    JOIN public.property_catalog_items pci ON pci.catalog_item_id = ci.id
    WHERE ci.id = (item->>'catalog_item_id')::uuid
      AND pci.property_id = res.property_id
      AND pci.enabled = true
      AND ci.is_active = true
      AND ci.type = 'product';
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'invalid_item'); END IF;

    SELECT * INTO pci FROM public.property_catalog_items
    WHERE property_id = res.property_id AND catalog_item_id = cat_item.id;

    unit_price := COALESCE(pci.custom_price, cat_item.base_price);
    IF cat_item.requires_quote OR cat_item.price_type = 'custom_quote' OR unit_price IS NULL THEN
      has_quote := true;
    ELSE
      line_total := unit_price * GREATEST(1, COALESCE((item->>'quantity')::integer, 1));
      subtotal := subtotal + line_total;
      payable := payable + line_total;
    END IF;
  END LOOP;

  IF payable > 0 AND reserve_row.current_balance < payable THEN
    RETURN jsonb_build_object('error', 'insufficient_balance');
  END IF;
  IF has_quote THEN order_status := 'pending_quote'; END IF;

  INSERT INTO public.store_orders (
    reservation_id, stay_reserve_id, property_id, status, payment_method,
    subtotal_amount, total_amount, paid_amount, client_notes
  ) VALUES (
    res.id, reserve_row.id, res.property_id, order_status, 'stay_reserve',
    subtotal, subtotal,
    CASE WHEN order_status = 'paid' THEN subtotal ELSE 0 END,
    NULLIF(trim(p_client_notes), '')
  ) RETURNING * INTO order_row;
  order_id := order_row.id;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT ci.* INTO cat_item FROM public.catalog_items ci WHERE ci.id = (item->>'catalog_item_id')::uuid;
    SELECT * INTO pci FROM public.property_catalog_items
    WHERE property_id = res.property_id AND catalog_item_id = cat_item.id;
    unit_price := COALESCE(pci.custom_price, cat_item.base_price);
    IF cat_item.requires_quote OR cat_item.price_type = 'custom_quote' OR unit_price IS NULL THEN
      item_status := 'pending_quote';
      line_total := NULL;
    ELSE
      line_total := unit_price * GREATEST(1, COALESCE((item->>'quantity')::integer, 1));
      item_status := CASE WHEN order_status = 'paid' THEN 'paid' ELSE 'pending_payment' END;
    END IF;

    INSERT INTO public.store_order_items (
      order_id, catalog_item_id, type, title_snapshot, description_snapshot, quantity,
      unit_price, total_price, price_type, provider_name, scheduled_date, status,
      requires_quote, requires_approval, client_notes
    ) VALUES (
      order_id, cat_item.id, cat_item.type, cat_item.title,
      COALESCE(cat_item.short_description, cat_item.long_description),
      GREATEST(1, COALESCE((item->>'quantity')::integer, 1)),
      unit_price, line_total, cat_item.price_type, cat_item.provider_name,
      NULLIF(item->>'scheduled_date', '')::date, item_status,
      cat_item.requires_quote, cat_item.requires_approval,
      NULLIF(trim(item->>'client_notes'), '')
    );
  END LOOP;

  IF payable > 0 THEN
    UPDATE public.stay_reserves
    SET current_balance = current_balance - payable,
        spent_amount = spent_amount + payable,
        updated_at = now()
    WHERE id = reserve_row.id;

    INSERT INTO public.reserve_transactions (stay_reserve_id, type, amount, currency, status, description)
    VALUES (reserve_row.id, 'capture', payable, 'EUR', 'completed', 'Commande Boutique');

    PERFORM public.refresh_stay_reserve_status(reserve_row.id);

    IF order_status = 'paid' THEN
      SELECT * INTO split FROM public.compute_revenue_split_row(payable);
      INSERT INTO public.store_revenue_splits (
        order_id, total_amount, provider_amount, platform_commission,
        villa_amount, concierge_amount, currency, status
      ) VALUES (
        order_id, payable, split.provider_amount, split.platform_commission,
        split.villa_amount, split.concierge_amount, 'EUR', 'confirmed'
      );
    END IF;
  END IF;

  SELECT * INTO reserve_row FROM public.stay_reserves WHERE reservation_id = res.id;
  RETURN jsonb_build_object(
    'order', to_jsonb(order_row),
    'reserve', CASE WHEN reserve_row.id IS NULL THEN NULL ELSE to_jsonb(reserve_row) END
  );
END;
$$;

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
  IF res.id IS NULL THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF NOT public._guest_portal_flag(res.property_id, 'show_services') THEN
    RETURN jsonb_build_object('error', 'portal_disabled');
  END IF;

  SELECT * INTO reserve_row FROM public.stay_reserves WHERE reservation_id = res.id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'no_reserve'); END IF;
  IF reserve_row.status IN ('closed', 'refunded', 'cancelled') THEN
    RETURN jsonb_build_object('error', 'reserve_closed');
  END IF;

  INSERT INTO public.stay_service_requests (
    reservation_id, stay_reserve_id, property_id, category, title, description,
    requested_date, estimated_amount, property_service_id, provider_name, status
  ) VALUES (
    res.id, reserve_row.id, res.property_id,
    COALESCE(NULLIF(trim(p_category), ''), 'other'),
    trim(p_title),
    NULLIF(trim(p_description), ''),
    p_requested_date,
    p_estimated_amount,
    p_property_service_id,
    NULLIF(trim(p_provider_name), ''),
    'submitted'
  ) RETURNING * INTO request_row;

  RETURN jsonb_build_object('request', to_jsonb(request_row));
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_send_stay_message(
  p_token uuid,
  p_body text DEFAULT NULL,
  p_message_type text DEFAULT 'text',
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv public.stay_conversations;
  msg public.stay_messages;
  trimmed text;
  safe_payload jsonb;
  image_path text;
  res public.reservations;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF res.id IS NULL THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF NOT public._guest_portal_flag(res.property_id, 'show_messaging') THEN
    RETURN jsonb_build_object('error', 'portal_disabled');
  END IF;

  trimmed := nullif(trim(coalesce(p_body, '')), '');
  safe_payload := coalesce(p_payload, '{}'::jsonb);
  IF p_message_type NOT IN ('text', 'image') THEN
    RETURN jsonb_build_object('error', 'invalid_message');
  END IF;

  conv := public._ensure_stay_conversation(p_token);
  IF conv.id IS NULL THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  IF p_message_type = 'image' THEN
    image_path := safe_payload->>'storage_path';
    IF image_path IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.stay_message_upload_tokens token
      JOIN storage.objects object
        ON object.bucket_id = 'stay-messages' AND object.name = token.storage_path
      WHERE token.reservation_id = conv.reservation_id
        AND token.storage_path = image_path
        AND token.expires_at > now()
    ) THEN
      RETURN jsonb_build_object('error', 'invalid_message');
    END IF;
    safe_payload := jsonb_build_object('storage_path', image_path);
  ELSIF NOT public._validate_stay_message(p_message_type, trimmed, safe_payload) THEN
    RETURN jsonb_build_object('error', 'invalid_message');
  END IF;

  INSERT INTO public.stay_messages (conversation_id, sender_type, body, message_type, payload)
  VALUES (conv.id, 'guest', trimmed, p_message_type, safe_payload)
  RETURNING * INTO msg;

  IF p_message_type = 'image' THEN
    DELETE FROM public.stay_message_upload_tokens WHERE storage_path = image_path;
  END IF;

  UPDATE public.stay_conversations
  SET last_message_at = msg.created_at, updated_at = now()
  WHERE id = conv.id;

  RETURN jsonb_build_object('message', to_jsonb(msg));
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. RLS boutique / store (réactivation + révocation anon)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public._can_manage_catalog()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.properties p WHERE p.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.role_assignments ra WHERE ra.user_id = auth.uid());
$$;

ALTER TABLE public.catalog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_revenue_splits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.catalog_categories FROM anon;
REVOKE ALL ON TABLE public.catalog_items FROM anon;
REVOKE ALL ON TABLE public.property_catalog_items FROM anon;
REVOKE ALL ON TABLE public.store_orders FROM anon;
REVOKE ALL ON TABLE public.store_order_items FROM anon;
REVOKE ALL ON TABLE public.store_revenue_splits FROM anon;

GRANT SELECT ON TABLE public.catalog_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.catalog_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.catalog_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.property_catalog_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_revenue_splits TO authenticated;

DROP POLICY IF EXISTS "Catalog categories read all authenticated" ON public.catalog_categories;
CREATE POLICY "Catalog categories read all authenticated"
ON public.catalog_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Catalog categories admin write" ON public.catalog_categories;
CREATE POLICY "Catalog categories admin write"
ON public.catalog_categories FOR ALL TO authenticated
USING (public._can_manage_catalog())
WITH CHECK (public._can_manage_catalog());

DROP POLICY IF EXISTS "Catalog items read authenticated" ON public.catalog_items;
CREATE POLICY "Catalog items read authenticated"
ON public.catalog_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Catalog items admin write" ON public.catalog_items;
CREATE POLICY "Catalog items admin write"
ON public.catalog_items FOR ALL TO authenticated
USING (public._can_manage_catalog())
WITH CHECK (public._can_manage_catalog());

DROP POLICY IF EXISTS "Property catalog by property access" ON public.property_catalog_items;
CREATE POLICY "Property catalog by property access"
ON public.property_catalog_items FOR ALL TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Store orders by property access" ON public.store_orders;
CREATE POLICY "Store orders by property access"
ON public.store_orders FOR ALL TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Store order items by property access" ON public.store_order_items;
CREATE POLICY "Store order items by property access"
ON public.store_order_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.store_orders o
    WHERE o.id = order_id AND public.can_access_property(o.property_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_orders o
    WHERE o.id = order_id AND public.can_access_property(o.property_id)
  )
);

DROP POLICY IF EXISTS "Store revenue splits by property access" ON public.store_revenue_splits;
CREATE POLICY "Store revenue splits by property access"
ON public.store_revenue_splits FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.store_orders o
    WHERE o.id = order_id AND public.can_access_property(o.property_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_orders o
    WHERE o.id = order_id AND public.can_access_property(o.property_id)
  )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Guides : plus de CRUD global authentifié
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Authenticated users can read all guides" ON public.guides;
DROP POLICY IF EXISTS "Authenticated users can insert guides" ON public.guides;
DROP POLICY IF EXISTS "Authenticated users can update guides" ON public.guides;
DROP POLICY IF EXISTS "Authenticated users can delete guides" ON public.guides;

DROP POLICY IF EXISTS "Property staff manage guides" ON public.guides;
CREATE POLICY "Property staff manage guides"
ON public.guides FOR ALL TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));

-- Anon published guides remain (policy already exists)

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Partenaires legacy null owner + tâches partenaire
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Partners manage manual owned" ON public.partners;
CREATE POLICY "Partners manage manual owned"
ON public.partners
FOR ALL
TO authenticated
USING (source = 'manual' AND owner_id = auth.uid())
WITH CHECK (source = 'manual' AND owner_id = auth.uid());

DROP POLICY IF EXISTS "Partners read by source" ON public.partners;
CREATE POLICY "Partners read by source"
ON public.partners
FOR SELECT
TO authenticated
USING (
  source = 'marketplace'
  OR owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Tasks by accessible context" ON public.tasks;
CREATE POLICY "Tasks by accessible context"
ON public.tasks
FOR ALL
TO authenticated
USING (
  (
    property_id IS NOT NULL
    AND public.can_access_property(property_id)
  )
  OR (
    reservation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.reservations reservation
      WHERE reservation.id = tasks.reservation_id
        AND public.can_access_property(reservation.property_id)
    )
  )
  OR (
    link_type = 'partner'
    AND partner_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.partners partner
      WHERE partner.id = tasks.partner_id
        AND (
          partner.owner_id = auth.uid()
          OR partner.source = 'marketplace'
          OR public.can_manage_partners()
        )
    )
  )
)
WITH CHECK (
  (
    link_type = 'property'
    AND property_id IS NOT NULL
    AND public.can_access_property(property_id)
    AND reservation_id IS NULL
    AND partner_id IS NULL
  )
  OR (
    link_type = 'client'
    AND reservation_id IS NOT NULL
    AND partner_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.reservations reservation
      WHERE reservation.id = tasks.reservation_id
        AND public.can_access_property(reservation.property_id)
    )
  )
  OR (
    link_type = 'partner'
    AND partner_id IS NOT NULL
    AND reservation_id IS NULL
    AND property_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.partners partner
      WHERE partner.id = tasks.partner_id
        AND (
          partner.owner_id = auth.uid()
          OR public.can_manage_partners()
        )
    )
  )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. Escalade de rôle profil + signup
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF auth.uid() = OLD.id THEN
      RAISE EXCEPTION 'Cannot change own role'
        USING ERRCODE = '42501';
    END IF;
    IF NOT public.is_app_owner() THEN
      RAISE EXCEPTION 'Forbidden role change'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    'owner'
  );
  RETURN new;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. Annuaire équipe : plus d'accès anon / PUBLIC
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_team_members()
RETURNS TABLE(id uuid, full_name text, email text, role text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_app_staff() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.role
  FROM public.profiles p
  WHERE p.role IN ('owner', 'house_manager', 'concierge', 'agency')
    AND (
      p.id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.properties owned
        JOIN public.role_assignments ra ON ra.property_id = owned.id
        WHERE owned.owner_id = auth.uid()
          AND ra.user_id = p.id
      )
      OR EXISTS (
        SELECT 1
        FROM public.role_assignments my_ra
        JOIN public.role_assignments their_ra ON their_ra.property_id = my_ra.property_id
        WHERE my_ra.user_id = auth.uid()
          AND their_ra.user_id = p.id
      )
      OR EXISTS (
        SELECT 1 FROM public.properties owned
        WHERE owned.owner_id = auth.uid()
          AND p.id = owned.owner_id
      )
      OR (
        public.is_app_owner()
        AND EXISTS (
          SELECT 1 FROM public.properties owned WHERE owned.owner_id = p.id
        )
      )
    )
  ORDER BY p.full_name NULLS LAST, p.email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_members() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_team_members() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_team_members() TO authenticated, service_role;

-- Helpers guest resolve : ne pas exposer à anon en direct
REVOKE ALL ON FUNCTION public._resolve_guest_reservation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._resolve_guest_reservation(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public._resolve_guest_reservation(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.staff_send_stay_message(uuid, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_send_stay_message(uuid, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.staff_send_stay_message(uuid, text, text, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.staff_mark_stay_messages_read(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_mark_stay_messages_read(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.staff_mark_stay_messages_read(uuid) TO authenticated, service_role;

-- Rattache les partenaires manuels orphelins au premier owner (données legacy).
UPDATE public.partners p
SET owner_id = owner.id
FROM (
  SELECT id FROM public.profiles WHERE role = 'owner' ORDER BY created_at NULLS LAST LIMIT 1
) AS owner
WHERE p.source = 'manual' AND p.owner_id IS NULL;
