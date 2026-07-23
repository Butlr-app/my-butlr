-- Boutique (Store) V1 — catalogue, commandes, lien Réserve séjour

ALTER TABLE public.property_guest_portal_settings
  ADD COLUMN IF NOT EXISTS show_boutique boolean NOT NULL DEFAULT true;

ALTER TABLE public.property_guest_portal_settings
  ADD COLUMN IF NOT EXISTS boutique_welcome_text text;

-- ─── Categories ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.catalog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Global catalog ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'product'
    CHECK (type IN ('product', 'service', 'experience', 'custom_request')),
  category_id uuid NOT NULL REFERENCES public.catalog_categories(id) ON DELETE RESTRICT,
  title text NOT NULL,
  short_description text,
  long_description text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  base_price numeric(12,2),
  price_type text NOT NULL DEFAULT 'fixed_price'
    CHECK (price_type IN (
      'fixed_price', 'starting_from', 'per_person', 'per_hour',
      'per_day', 'custom_quote', 'market_price'
    )),
  currency text NOT NULL DEFAULT 'EUR',
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  provider_name text,
  destination_slug text,
  availability_status text NOT NULL DEFAULT 'available'
    CHECK (availability_status IN ('available', 'unavailable', 'on_request')),
  minimum_notice_hours integer NOT NULL DEFAULT 0,
  duration_minutes integer,
  max_quantity integer NOT NULL DEFAULT 99,
  requires_quote boolean NOT NULL DEFAULT false,
  requires_approval boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  cancellation_policy text,
  terms text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catalog_items_category_id_idx ON public.catalog_items (category_id);
CREATE INDEX IF NOT EXISTS catalog_items_type_idx ON public.catalog_items (type);

-- ─── Property visibility ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.property_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  catalog_item_id uuid NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  custom_price numeric(12,2),
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, catalog_item_id)
);

CREATE INDEX IF NOT EXISTS property_catalog_items_property_id_idx
  ON public.property_catalog_items (property_id);

-- ─── Orders ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  stay_reserve_id uuid REFERENCES public.stay_reserves(id) ON DELETE SET NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  client_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'pending_payment', 'paid', 'pending_quote', 'quoted',
      'waiting_client_approval', 'approved', 'assigned_to_provider',
      'preparing', 'scheduled', 'in_progress', 'delivered', 'completed',
      'cancelled', 'refunded', 'disputed'
    )),
  payment_method text NOT NULL DEFAULT 'stay_reserve'
    CHECK (payment_method IN ('stay_reserve', 'card', 'mixed')),
  subtotal_amount numeric(12,2) NOT NULL DEFAULT 0,
  fees_amount numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  refunded_amount numeric(12,2) NOT NULL DEFAULT 0,
  client_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

CREATE INDEX IF NOT EXISTS store_orders_reservation_id_idx ON public.store_orders (reservation_id);
CREATE INDEX IF NOT EXISTS store_orders_property_id_idx ON public.store_orders (property_id);
CREATE INDEX IF NOT EXISTS store_orders_status_idx ON public.store_orders (status);

CREATE TABLE IF NOT EXISTS public.store_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  catalog_item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  type text NOT NULL,
  title_snapshot text NOT NULL,
  description_snapshot text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12,2),
  total_price numeric(12,2),
  price_type text NOT NULL,
  provider_name text,
  scheduled_date date,
  scheduled_time time,
  duration_minutes integer,
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment', 'paid', 'pending_quote', 'quoted',
      'waiting_client_approval', 'approved', 'assigned_to_provider',
      'preparing', 'scheduled', 'in_progress', 'delivered', 'completed',
      'cancelled', 'refunded'
    )),
  requires_quote boolean NOT NULL DEFAULT false,
  requires_approval boolean NOT NULL DEFAULT false,
  client_notes text,
  internal_notes text,
  quoted_amount numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_order_items_order_id_idx ON public.store_order_items (order_id);

CREATE TABLE IF NOT EXISTS public.store_revenue_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.store_order_items(id) ON DELETE SET NULL,
  total_amount numeric(12,2) NOT NULL,
  provider_amount numeric(12,2) NOT NULL DEFAULT 0,
  platform_commission numeric(12,2) NOT NULL DEFAULT 0,
  villa_amount numeric(12,2) NOT NULL DEFAULT 0,
  concierge_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_fees numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.catalog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_revenue_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Catalog categories read all authenticated" ON public.catalog_categories;
CREATE POLICY "Catalog categories read all authenticated"
ON public.catalog_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Catalog categories admin write" ON public.catalog_categories;
CREATE POLICY "Catalog categories admin write"
ON public.catalog_categories FOR ALL TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Catalog items read authenticated" ON public.catalog_items;
CREATE POLICY "Catalog items read authenticated"
ON public.catalog_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Catalog items admin write" ON public.catalog_items;
CREATE POLICY "Catalog items admin write"
ON public.catalog_items FOR ALL TO authenticated
USING (true) WITH CHECK (true);

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

-- ─── Guest boutique payload helper ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_property_boutique_catalog(p_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  categories_json jsonb;
  items_json jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(c.*) ORDER BY c.sort_order, c.name), '[]'::jsonb)
  INTO categories_json
  FROM public.catalog_categories c
  WHERE c.is_active = true;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'assignment', to_jsonb(pci),
        'item', to_jsonb(ci),
        'category', to_jsonb(cat)
      ) ORDER BY pci.sort_order, pci.is_featured DESC, ci.title
    ),
    '[]'::jsonb
  )
  INTO items_json
  FROM public.property_catalog_items pci
  JOIN public.catalog_items ci ON ci.id = pci.catalog_item_id
  JOIN public.catalog_categories cat ON cat.id = ci.category_id
  WHERE pci.property_id = p_property_id
    AND pci.enabled = true
    AND ci.is_active = true
    AND ci.availability_status <> 'unavailable';

  RETURN jsonb_build_object(
    'categories', categories_json,
    'items', items_json
  );
END;
$$;

-- ─── Guest checkout ─────────────────────────────────────────────────────────

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
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('error', 'empty_cart');
  END IF;

  SELECT * INTO reserve_row FROM public.stay_reserves WHERE reservation_id = res.id;

  IF p_payment_method = 'stay_reserve' AND NOT FOUND THEN
    RETURN jsonb_build_object('error', 'no_reserve');
  END IF;

  -- Pre-calculate totals
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT ci.* INTO cat_item
    FROM public.catalog_items ci
    JOIN public.property_catalog_items pci ON pci.catalog_item_id = ci.id
    WHERE ci.id = (item->>'catalog_item_id')::uuid
      AND pci.property_id = res.property_id
      AND pci.enabled = true
      AND ci.is_active = true;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'invalid_item', 'item_id', item->>'catalog_item_id');
    END IF;

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

  IF p_payment_method = 'stay_reserve' AND payable > 0 THEN
    IF reserve_row.current_balance < payable THEN
      RETURN jsonb_build_object('error', 'insufficient_balance', 'required', payable, 'available', reserve_row.current_balance);
    END IF;
  END IF;

  IF has_quote AND payable = 0 THEN
    order_status := 'pending_quote';
  ELSIF has_quote THEN
    order_status := 'pending_quote';
  END IF;

  INSERT INTO public.store_orders (
    reservation_id, stay_reserve_id, property_id, status, payment_method,
    subtotal_amount, total_amount, paid_amount, client_notes
  ) VALUES (
    res.id, reserve_row.id, res.property_id, order_status, p_payment_method,
    subtotal, subtotal, CASE WHEN order_status = 'paid' THEN subtotal ELSE 0 END,
    NULLIF(trim(p_client_notes), '')
  )
  RETURNING * INTO order_row;

  order_id := order_row.id;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT ci.* INTO cat_item
    FROM public.catalog_items ci
    WHERE ci.id = (item->>'catalog_item_id')::uuid;

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
      order_id, catalog_item_id, type, title_snapshot, description_snapshot,
      quantity, unit_price, total_price, price_type, provider_name,
      scheduled_date, status, requires_quote, requires_approval, client_notes
    ) VALUES (
      order_id, cat_item.id, cat_item.type, cat_item.title,
      COALESCE(cat_item.short_description, cat_item.long_description),
      GREATEST(1, COALESCE((item->>'quantity')::integer, 1)),
      unit_price, line_total, cat_item.price_type, cat_item.provider_name,
      NULLIF(item->>'scheduled_date', '')::date,
      item_status, cat_item.requires_quote, cat_item.requires_approval,
      NULLIF(trim(item->>'client_notes'), '')
    );
  END LOOP;

  IF payable > 0 AND p_payment_method = 'stay_reserve' THEN
    UPDATE public.stay_reserves
    SET
      current_balance = current_balance - payable,
      spent_amount = spent_amount + payable,
      updated_at = now()
    WHERE id = reserve_row.id;

    INSERT INTO public.reserve_transactions (
      stay_reserve_id, type, amount, currency, status, description
    ) VALUES (
      reserve_row.id, 'capture', payable, 'EUR', 'completed',
      'Commande Boutique — ' || order_id::text
    );

    PERFORM public.refresh_stay_reserve_status(reserve_row.id);
  END IF;

  IF payable > 0 AND order_status = 'paid' THEN
    SELECT * INTO split FROM public.compute_revenue_split_row(payable);
    INSERT INTO public.store_revenue_splits (
      order_id, total_amount, provider_amount, platform_commission,
      villa_amount, concierge_amount, currency, status
    ) VALUES (
      order_id, payable, split.provider_amount, split.platform_commission,
      split.villa_amount, split.concierge_amount, 'EUR', 'confirmed'
    );
  END IF;

  SELECT * INTO reserve_row FROM public.stay_reserves WHERE reservation_id = res.id;

  RETURN jsonb_build_object(
    'order', to_jsonb(order_row),
    'reserve', CASE WHEN reserve_row.id IS NULL THEN NULL ELSE to_jsonb(reserve_row) END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_revenue_split_row(p_amount numeric)
RETURNS TABLE (
  provider_amount numeric,
  platform_commission numeric,
  villa_amount numeric,
  concierge_amount numeric
)
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    round(p_amount * 0.75, 2),
    round(p_amount * 0.15, 2),
    round(p_amount * 0.10, 2),
    0::numeric;
$$;

-- Quote a store order item (staff)
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
  SELECT * INTO oi FROM public.store_order_items WHERE id = p_order_item_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  SELECT * INTO ord FROM public.store_orders WHERE id = oi.order_id;

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

-- Guest approve quoted boutique item
CREATE OR REPLACE FUNCTION public.guest_approve_store_quote(
  p_token uuid,
  p_order_item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
  reserve_row public.stay_reserves;
  oi public.store_order_items;
  ord public.store_orders;
  amount numeric;
  split record;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  SELECT oi.* INTO oi
  FROM public.store_order_items oi
  JOIN public.store_orders o ON o.id = oi.order_id
  WHERE oi.id = p_order_item_id AND o.reservation_id = res.id;

  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF oi.status <> 'waiting_client_approval' THEN
    RETURN jsonb_build_object('error', 'invalid_status');
  END IF;

  amount := COALESCE(oi.quoted_amount, oi.total_price, 0);
  IF amount <= 0 THEN RETURN jsonb_build_object('error', 'invalid_amount'); END IF;

  SELECT * INTO reserve_row FROM public.stay_reserves WHERE reservation_id = res.id;
  IF NOT FOUND OR reserve_row.current_balance < amount THEN
    RETURN jsonb_build_object('error', 'insufficient_balance');
  END IF;

  UPDATE public.stay_reserves
  SET current_balance = current_balance - amount, spent_amount = spent_amount + amount, updated_at = now()
  WHERE id = reserve_row.id;

  UPDATE public.store_order_items
  SET status = 'paid', total_price = amount, updated_at = now()
  WHERE id = p_order_item_id;

  UPDATE public.store_orders o
  SET paid_amount = paid_amount + amount, total_amount = total_amount + amount,
      status = 'paid', updated_at = now()
  WHERE id = oi.order_id;

  INSERT INTO public.reserve_transactions (
    stay_reserve_id, type, amount, currency, status, description
  ) VALUES (
    reserve_row.id, 'capture', amount, 'EUR', 'completed',
    'Boutique — ' || oi.title_snapshot
  );

  SELECT * INTO split FROM public.compute_revenue_split_row(amount);
  INSERT INTO public.store_revenue_splits (
    order_id, order_item_id, total_amount, provider_amount, platform_commission,
    villa_amount, concierge_amount, currency, status
  ) VALUES (
    oi.order_id, oi.id, amount, split.provider_amount, split.platform_commission,
    split.villa_amount, split.concierge_amount, 'EUR', 'confirmed'
  );

  PERFORM public.refresh_stay_reserve_status(reserve_row.id);

  SELECT * INTO reserve_row FROM public.stay_reserves WHERE id = reserve_row.id;
  SELECT * INTO oi FROM public.store_order_items WHERE id = p_order_item_id;

  RETURN jsonb_build_object('item', to_jsonb(oi), 'reserve', to_jsonb(reserve_row));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_property_boutique_catalog(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_checkout_boutique(uuid, jsonb, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_approve_store_quote(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quote_store_order_item(uuid, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.guest_get_store_orders(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
  orders_json jsonb;
  items_json jsonb;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(o.*) ORDER BY o.created_at DESC), '[]'::jsonb)
  INTO orders_json
  FROM public.store_orders o
  WHERE o.reservation_id = res.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(oi.*) ORDER BY oi.created_at DESC), '[]'::jsonb)
  INTO items_json
  FROM public.store_order_items oi
  JOIN public.store_orders o ON o.id = oi.order_id
  WHERE o.reservation_id = res.id;

  RETURN jsonb_build_object('store_orders', orders_json, 'store_order_items', items_json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_get_store_orders(uuid) TO anon, authenticated;

-- Extend get_guest_stay_portal with boutique data
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
  boutique_json jsonb;
  orders_json jsonb;
  order_items_json jsonb;
  reserve record;
  requests_json jsonb;
  transactions_json jsonb;
  nights integer;
  recommended numeric;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  SELECT p.id, p.name, p.image_url, p.type, p.max_guests
  INTO prop FROM public.properties p WHERE p.id = res.property_id;

  SELECT to_jsonb(s.*) INTO portal_settings
  FROM public.property_guest_portal_settings s WHERE s.property_id = res.property_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(g.*) ORDER BY g.sort_order, g.title), '[]'::jsonb)
  INTO guides_json FROM public.guides g
  WHERE g.property_id = res.property_id AND g.published = true;

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('enabled', ps.enabled, 'assignment', to_jsonb(ps), 'service', to_jsonb(s)) ORDER BY ps.sort_order),
    '[]'::jsonb
  )
  INTO services_json
  FROM public.property_services ps
  JOIN public.services s ON s.id = ps.service_id
  WHERE ps.property_id = res.property_id AND ps.enabled = true;

  boutique_json := public.get_property_boutique_catalog(res.property_id);

  SELECT COALESCE(jsonb_agg(to_jsonb(o.*) ORDER BY o.created_at DESC), '[]'::jsonb)
  INTO orders_json
  FROM public.store_orders o WHERE o.reservation_id = res.id;

  SELECT COALESCE(jsonb_agg(to_jsonb(oi.*) ORDER BY oi.created_at DESC), '[]'::jsonb)
  INTO order_items_json
  FROM public.store_order_items oi
  JOIN public.store_orders o ON o.id = oi.order_id
  WHERE o.reservation_id = res.id;

  SELECT * INTO reserve FROM public.stay_reserves WHERE reservation_id = res.id;

  IF reserve.id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(r.*) ORDER BY r.created_at DESC), '[]'::jsonb)
    INTO requests_json FROM public.stay_service_requests r WHERE r.stay_reserve_id = reserve.id;
    SELECT COALESCE(jsonb_agg(to_jsonb(t.*) ORDER BY t.created_at DESC), '[]'::jsonb)
    INTO transactions_json FROM public.reserve_transactions t WHERE t.stay_reserve_id = reserve.id;
  ELSE
    requests_json := '[]'::jsonb;
    transactions_json := '[]'::jsonb;
  END IF;

  nights := GREATEST(1, (res.departure - res.arrival));
  recommended := public.recommend_stay_reserve_amount(nights, prop.max_guests, prop.type);

  RETURN jsonb_build_object(
    'reservation', jsonb_build_object(
      'id', res.id, 'guest_name', res.guest_name, 'arrival', res.arrival,
      'departure', res.departure, 'guests_count', res.guests_count,
      'property_id', res.property_id, 'property_name', prop.name,
      'property_image_url', prop.image_url, 'property_type', prop.type,
      'max_guests', prop.max_guests
    ),
    'settings', COALESCE(portal_settings, jsonb_build_object('property_id', res.property_id, 'enabled', true)),
    'guides', guides_json,
    'property_services', services_json,
    'boutique', boutique_json,
    'store_orders', orders_json,
    'store_order_items', order_items_json,
    'reserve', CASE WHEN reserve.id IS NULL THEN NULL ELSE to_jsonb(reserve) END,
    'service_requests', requests_json,
    'transactions', transactions_json,
    'recommended_amount', recommended
  );
END;
$$;

-- ─── Seed categories + St Tropez catalog ────────────────────────────────────

INSERT INTO public.catalog_categories (id, slug, name, description, icon, sort_order) VALUES
  ('c1000001-0000-4000-8000-000000000001', 'groceries-arrival', 'Courses & arrivée', 'Préparez votre villa avant et pendant votre séjour', 'shopping-basket', 1),
  ('c1000001-0000-4000-8000-000000000002', 'chef-dining', 'Chef & restauration', 'Chef privé, menus et expériences gastronomiques', 'utensils', 2),
  ('c1000001-0000-4000-8000-000000000003', 'transport', 'Transport', 'Transferts et chauffeurs privés', 'car', 3),
  ('c1000001-0000-4000-8000-000000000004', 'wellness', 'Bien-être', 'Massages, spa et soins à domicile', 'sparkles', 4),
  ('c1000001-0000-4000-8000-000000000005', 'experiences', 'Expériences', 'Activités et moments d''exception', 'compass', 5),
  ('c1000001-0000-4000-8000-000000000006', 'home-comfort', 'Maison & confort', 'Confort, ménage et services villa', 'home', 6),
  ('c1000001-0000-4000-8000-000000000007', 'events', 'Événements', 'Célébrations et moments privés', 'party-popper', 7),
  ('c1000001-0000-4000-8000-000000000008', 'premium-shopping', 'Shopping premium', 'Sélection locale et cadeaux', 'gem', 8)
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
  v_property_id uuid := '6a6286aa-381f-48c3-87cc-cab3a2994f86';
BEGIN
  INSERT INTO public.catalog_items (
    id, type, category_id, title, short_description, base_price, price_type,
    requires_quote, is_featured, provider_name
  ) VALUES
    ('d1000001-0000-4000-8000-000000000001', 'product', 'c1000001-0000-4000-8000-000000000001',
     'Pack arrivée Villa Frenchway', 'Frigo garni, eaux, fruits et essentiels pour votre arrivée', 250, 'fixed_price', false, true, NULL),
    ('d1000001-0000-4000-8000-000000000002', 'product', 'c1000001-0000-4000-8000-000000000001',
     'Champagne & petit-déjeuner', 'Champagne brut, viennoiseries et jus pressés', 180, 'fixed_price', false, true, NULL),
    ('d1000001-0000-4000-8000-000000000003', 'product', 'c1000001-0000-4000-8000-000000000001',
     'Panier fruits frais', 'Sélection de fruits de saison, livraison villa', 85, 'fixed_price', false, false, NULL),
    ('d1000001-0000-4000-8000-000000000007', 'product', 'c1000001-0000-4000-8000-000000000006',
     'Fleurs fraîches', 'Composition florale livrée à la villa', 95, 'fixed_price', false, false, NULL),
    ('d1000001-0000-4000-8000-000000000009', 'experience', 'c1000001-0000-4000-8000-000000000005',
     'Location bateau journée', 'Catamaran 12 pax, capitaine inclus', NULL, 'custom_quote', true, true, 'Azur Yachting')
  ON CONFLICT (id) DO NOTHING;
  -- Note : chef, transport, bien-être et ménage relèvent de la Conciergerie
  -- (table services / property_services), pas de la Boutique.

  IF EXISTS (SELECT 1 FROM public.properties WHERE id = v_property_id) THEN
    INSERT INTO public.property_catalog_items (property_id, catalog_item_id, enabled, is_featured, sort_order)
    SELECT v_property_id, ci.id, true, ci.is_featured, row_number() OVER (ORDER BY ci.is_featured DESC, ci.title)
    FROM public.catalog_items ci
    WHERE ci.id::text LIKE 'd1000001%'
    ON CONFLICT (property_id, catalog_item_id) DO NOTHING;

    UPDATE public.property_guest_portal_settings
    SET show_boutique = true,
        boutique_welcome_text = 'Commandez produits et packs pour votre villa — livraison et préparation avant votre arrivée. Votre équipe My Butler coordonne chaque commande avec soin.'
    WHERE property_id = v_property_id;
  END IF;
END $$;
