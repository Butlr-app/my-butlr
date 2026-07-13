-- Durcissement sécurité du portail voyageur
--   1. Fenêtre de validité du token (blocage après le départ + délai de grâce)
--   2. Enforcement serveur du flag `enabled` (pas de wifi/guides si portail coupé)
--   3. Catalogue boutique voyageur accessible uniquement via token (anti-IDOR)
--   4. Autorisation manquante sur quote_store_order_item (accès propriété)
--   5. Écritures catalogue global réservées aux propriétaires / équipes

-- ─── 1. Résolution du token avec fenêtre de validité ────────────────────────
-- 14 jours de grâce après le départ pour laisser le temps aux remboursements /
-- consultations de fin de séjour, puis le lien cesse de fonctionner.
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

-- ─── 2. get_guest_stay_portal : ne rien exposer si le portail est désactivé ──
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
    'max_guests', prop.max_guests
  );

  -- Portail désactivé : on renvoie le strict minimum (aucune donnée sensible
  -- comme le mot de passe wifi, les guides ou la réserve).
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

-- ─── 3. Catalogue boutique voyageur via token uniquement ────────────────────
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
  IF NOT FOUND THEN
    RETURN jsonb_build_object('categories', '[]'::jsonb, 'items', '[]'::jsonb);
  END IF;
  RETURN public.get_property_boutique_catalog(res.property_id);
END;
$$;

-- Le catalogue par property_id n'est plus exposé à l'anon (IDOR) : réservé aux
-- sessions authentifiées (aperçu propriétaire, back-office).
REVOKE EXECUTE ON FUNCTION public.get_property_boutique_catalog(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_guest_boutique_catalog(uuid) TO anon, authenticated;

-- ─── 4. quote_store_order_item : contrôle d'accès propriété ─────────────────
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

-- ─── 5. Écritures catalogue global : propriétaires / équipes uniquement ─────
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

DROP POLICY IF EXISTS "Catalog categories admin write" ON public.catalog_categories;
CREATE POLICY "Catalog categories admin write"
ON public.catalog_categories FOR ALL TO authenticated
USING (public._can_manage_catalog())
WITH CHECK (public._can_manage_catalog());

DROP POLICY IF EXISTS "Catalog items admin write" ON public.catalog_items;
CREATE POLICY "Catalog items admin write"
ON public.catalog_items FOR ALL TO authenticated
USING (public._can_manage_catalog())
WITH CHECK (public._can_manage_catalog());
