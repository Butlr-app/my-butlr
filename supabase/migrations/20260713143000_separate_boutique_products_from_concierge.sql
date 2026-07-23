-- Separate the two guest offers:
--   Boutique     = physical products purchased by quantity
--   Conciergerie = services, experiences and custom requests

DO $$
DECLARE
  item record;
  target_service_id uuid;
BEGIN
  FOR item IN
    SELECT
      ci.*,
      cc.slug AS category_slug
    FROM public.catalog_items ci
    JOIN public.catalog_categories cc ON cc.id = ci.category_id
    WHERE ci.type <> 'product'
  LOOP
    target_service_id := NULL;

    -- Reuse an equivalent concierge service where possible. The boat rule
    -- migrates the only historical translated duplicate without showing two
    -- boat offers to the same guest.
    SELECT s.id
    INTO target_service_id
    FROM public.services s
    WHERE lower(s.name) = lower(item.title)
       OR (
         item.category_slug = 'experiences'
         AND item.title ILIKE '%bateau%'
         AND (s.name ILIKE '%boat%' OR s.name ILIKE '%bateau%')
       )
    ORDER BY (lower(s.name) = lower(item.title)) DESC
    LIMIT 1;

    IF target_service_id IS NULL THEN
      INSERT INTO public.services (
        name,
        description,
        category,
        starting_price,
        available,
        image_url,
        pricing_mode,
        provider_name
      )
      VALUES (
        item.title,
        COALESCE(item.long_description, item.short_description),
        CASE item.category_slug
          WHEN 'chef-dining' THEN 'dining'
          WHEN 'transport' THEN 'transport'
          WHEN 'wellness' THEN 'wellness'
          WHEN 'experiences' THEN 'activities'
          WHEN 'events' THEN 'lifestyle'
          ELSE 'other'
        END,
        item.base_price,
        item.is_active,
        item.images->>0,
        CASE
          WHEN item.requires_quote OR item.price_type = 'custom_quote' THEN 'quote'
          WHEN item.price_type = 'per_person' THEN 'per_person'
          ELSE 'fixed'
        END,
        item.provider_name
      )
      RETURNING id INTO target_service_id;
    END IF;

    INSERT INTO public.property_services AS target (
      property_id,
      service_id,
      enabled,
      sort_order,
      custom_price,
      custom_description,
      pricing_mode,
      provider_name,
      offer_title,
      is_detailed,
      offer_mode
    )
    SELECT
      pci.property_id,
      target_service_id,
      pci.enabled,
      pci.sort_order,
      pci.custom_price,
      COALESCE(item.long_description, item.short_description),
      CASE
        WHEN item.requires_quote OR item.price_type = 'custom_quote' THEN 'quote'
        WHEN item.price_type = 'per_person' THEN 'per_person'
        ELSE 'fixed'
      END,
      item.provider_name,
      item.title,
      COALESCE(item.long_description, item.short_description) IS NOT NULL,
      'specific'
    FROM public.property_catalog_items pci
    WHERE pci.catalog_item_id = item.id
    ON CONFLICT (property_id, service_id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      sort_order = EXCLUDED.sort_order,
      custom_price = EXCLUDED.custom_price,
      custom_description = COALESCE(EXCLUDED.custom_description, target.custom_description),
      pricing_mode = EXCLUDED.pricing_mode,
      provider_name = COALESCE(EXCLUDED.provider_name, target.provider_name),
      offer_title = COALESCE(EXCLUDED.offer_title, target.offer_title),
      is_detailed = EXCLUDED.is_detailed,
      offer_mode = EXCLUDED.offer_mode,
      updated_at = now();
  END LOOP;
END;
$$;

-- Historical order lines retain their snapshots; the nullable catalog foreign
-- key is set to NULL automatically when a migrated service item is removed.
DELETE FROM public.catalog_items
WHERE type <> 'product';

-- Service-oriented categories must not be offered while creating a Boutique
-- product. Product categories remain available.
UPDATE public.catalog_categories
SET is_active = false
WHERE slug IN ('chef-dining', 'transport', 'wellness', 'experiences', 'events')
  AND NOT EXISTS (
    SELECT 1
    FROM public.catalog_items ci
    WHERE ci.category_id = catalog_categories.id
      AND ci.type = 'product'
  );

UPDATE public.catalog_items
SET
  type = 'product',
  requires_quote = false,
  price_type = 'fixed_price',
  provider_name = NULL,
  base_price = COALESCE(base_price, 0),
  updated_at = now();

ALTER TABLE public.catalog_items
  DROP CONSTRAINT IF EXISTS catalog_items_type_check;

ALTER TABLE public.catalog_items
  ADD CONSTRAINT catalog_items_type_check
  CHECK (type = 'product');

ALTER TABLE public.catalog_items
  DROP CONSTRAINT IF EXISTS catalog_items_boutique_product_rules_check;

ALTER TABLE public.catalog_items
  ADD CONSTRAINT catalog_items_boutique_product_rules_check
  CHECK (
    type = 'product'
    AND requires_quote = false
    AND price_type = 'fixed_price'
    AND base_price IS NOT NULL
    AND provider_name IS NULL
  );

COMMENT ON TABLE public.catalog_items IS
  'Boutique catalog: physical products only. Services and experiences belong in public.services.';

CREATE OR REPLACE FUNCTION public.get_property_boutique_catalog(p_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  categories_json jsonb;
  items_json jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(c.*) ORDER BY c.sort_order, c.name), '[]'::jsonb)
  INTO categories_json
  FROM public.catalog_categories c
  WHERE c.is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.property_catalog_items pci
      JOIN public.catalog_items ci ON ci.id = pci.catalog_item_id
      WHERE pci.property_id = p_property_id
        AND pci.enabled = true
        AND ci.category_id = c.id
        AND ci.type = 'product'
        AND ci.is_active = true
        AND ci.availability_status <> 'unavailable'
    );

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
    AND ci.type = 'product'
    AND ci.is_active = true
    AND ci.availability_status <> 'unavailable';

  RETURN jsonb_build_object(
    'categories', categories_json,
    'items', items_json
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_property_boutique_catalog(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_property_boutique_catalog(uuid) TO authenticated;
