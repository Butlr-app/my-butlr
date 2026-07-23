-- Diverse boutique products with images for Villa The French Way

DO $$
DECLARE
  v_property_id uuid := '6a6286aa-381f-48c3-87cc-cab3a2994f86';
BEGIN
  -- Images on existing seed products
  UPDATE public.catalog_items SET images = '["/boutique-products/pack-arrivee.png"]'::jsonb, updated_at = now()
  WHERE id = 'd1000001-0000-4000-8000-000000000001';

  UPDATE public.catalog_items SET images = '["/boutique-products/champagne-petit-dejeuner.png"]'::jsonb, updated_at = now()
  WHERE id = 'd1000001-0000-4000-8000-000000000002';

  UPDATE public.catalog_items SET images = '["/boutique-products/panier-fruits.png"]'::jsonb, updated_at = now()
  WHERE id = 'd1000001-0000-4000-8000-000000000003';

  UPDATE public.catalog_items SET images = '["/boutique-products/fleurs-fraiches.png"]'::jsonb, updated_at = now()
  WHERE id = 'd1000001-0000-4000-8000-000000000007';

  INSERT INTO public.catalog_items (
    id, type, category_id, title, short_description, long_description,
    images, base_price, price_type, requires_quote, provider_name,
    is_featured, is_active, max_quantity, minimum_notice_hours
  ) VALUES
    (
      'd1000001-0000-4000-8000-000000000010', 'product',
      'c1000001-0000-4000-8000-000000000001',
      'Huile d''olive AOP Provence',
      'Bouteille 75 cl, producteurs locaux sélectionnés',
      'Huile extra vierge, récolte récente, parfaite pour vos salades et cuisine méditerranéenne.',
      '["/boutique-products/olive-oil-aop.png"]'::jsonb,
      45, 'fixed_price', false, NULL, false, true, 10, 24
    ),
    (
      'd1000001-0000-4000-8000-000000000011', 'product',
      'c1000001-0000-4000-8000-000000000001',
      'Plateau fromages locaux',
      'Sélection de 5 fromages AOP et accompagnements',
      'Fromages de chèvre, brebis et vache, confiture de figues, noix et pain artisanal.',
      '["/boutique-products/fromages-locaux.png"]'::jsonb,
      120, 'fixed_price', false, NULL, true, true, 5, 24
    ),
    (
      'd1000001-0000-4000-8000-000000000012', 'product',
      'c1000001-0000-4000-8000-000000000001',
      'Pack apéritif sunset',
      'Chips artisanales, olives, dips et crackers',
      'Idéal pour un apéritif au bord de la piscine au coucher du soleil.',
      '["/boutique-products/pack-aperitif.png"]'::jsonb,
      145, 'fixed_price', false, NULL, true, true, 8, 12
    ),
    (
      'd1000001-0000-4000-8000-000000000013', 'product',
      'c1000001-0000-4000-8000-000000000006',
      'Linge de lit premium',
      'Draps et taies en coton percale 400 fils',
      'Parure complète pour lit king size, blanc ou sable, livrée pliée sur le lit.',
      '["/boutique-products/linge-premium.png"]'::jsonb,
      180, 'fixed_price', false, NULL, false, true, 3, 48
    ),
    (
      'd1000001-0000-4000-8000-000000000014', 'product',
      'c1000001-0000-4000-8000-000000000006',
      'Bougies parfumées artisanal',
      'Trio de bougies parfum figuier, lavande, citron',
      'Cires végétales, parfums de Grasse, combustion 40 h chacune.',
      '["/boutique-products/bougies-parfumees.png"]'::jsonb,
      65, 'fixed_price', false, NULL, false, true, 12, 24
    ),
    (
      'd1000001-0000-4000-8000-000000000015', 'product',
      'c1000001-0000-4000-8000-000000000006',
      'Kit fraîcheur piscine',
      'Serviettes rafraîchissantes, brumisateur et boissons',
      'Serviettes glacées, eaux aromatisées et fruits pour vos journées au soleil.',
      '["/boutique-products/kit-piscine.png"]'::jsonb,
      75, 'fixed_price', false, NULL, true, true, 10, 6
    ),
    (
      'd1000001-0000-4000-8000-000000000016', 'product',
      'c1000001-0000-4000-8000-000000000008',
      'Cognac XO sélection',
      'Grande champagne, coffret cadeau 70 cl',
      'Cognac vieilli en fûts de chêne, notes de fruits secs et vanille.',
      '["/boutique-products/cognac-xo.png"]'::jsonb,
      220, 'fixed_price', false, NULL, true, true, 4, 48
    ),
    (
      'd1000001-0000-4000-8000-000000000017', 'product',
      'c1000001-0000-4000-8000-000000000008',
      'Panier gourmand Saint-Tropez',
      'Miel, confitures, tapenade et spécialités locales',
      'Coffret gourmand des producteurs du Golfe de Saint-Tropez.',
      '["/boutique-products/panier-gourmand.png"]'::jsonb,
      165, 'fixed_price', false, NULL, true, true, 6, 24
    )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    short_description = EXCLUDED.short_description,
    long_description = EXCLUDED.long_description,
    images = EXCLUDED.images,
    base_price = EXCLUDED.base_price,
    is_featured = EXCLUDED.is_featured,
    is_active = EXCLUDED.is_active,
    max_quantity = EXCLUDED.max_quantity,
    minimum_notice_hours = EXCLUDED.minimum_notice_hours,
    updated_at = now();

  IF EXISTS (SELECT 1 FROM public.properties WHERE id = v_property_id) THEN
    INSERT INTO public.property_catalog_items (property_id, catalog_item_id, enabled, is_featured, sort_order)
    SELECT
      v_property_id,
      ci.id,
      true,
      ci.is_featured,
      10 + row_number() OVER (ORDER BY ci.is_featured DESC, ci.title)
    FROM public.catalog_items ci
    WHERE ci.id::text LIKE 'd1000001%'
      AND ci.id >= 'd1000001-0000-4000-8000-000000000010'
    ON CONFLICT (property_id, catalog_item_id) DO UPDATE SET
      enabled = true,
      is_featured = EXCLUDED.is_featured,
      sort_order = EXCLUDED.sort_order;
  END IF;
END $$;
