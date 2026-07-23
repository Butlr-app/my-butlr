-- Données d'exemple portail voyageur — Villa The French Way - St Tropez

-- Étendre les catégories guides pour le portail voyageur
ALTER TABLE public.guides DROP CONSTRAINT IF EXISTS guides_category_check;

ALTER TABLE public.guides
  ADD CONSTRAINT guides_category_check
  CHECK (category IN (
    'general', 'spa', 'home_automation', 'entertainment', 'security',
    'kitchen', 'pool', 'heating_cooling', 'wifi_tech', 'outdoor',
    'keys_access', 'cleaning',
    'access', 'wifi', 'house_rules', 'local', 'parking',
    'emergency', 'services', 'other'
  ));

DO $$
DECLARE
  v_property_id uuid := '6a6286aa-381f-48c3-87cc-cab3a2994f86';
BEGIN
  INSERT INTO public.property_guest_portal_settings (
    property_id,
    enabled,
    welcome_title,
    welcome_message,
    wifi_name,
    wifi_password,
    check_in_instructions,
    check_out_instructions,
    house_rules,
    emergency_contact,
    require_online_checkin,
    show_services,
    updated_at
  ) VALUES (
    v_property_id,
    true,
    'Bienvenue en Provence',
    'Nous avons hâte de vous accueillir à Villa The French Way. Votre conciergerie est disponible 24/7 pour un séjour d''exception.',
    'VillaFrenchWay_Guest',
    'StTropez2026!',
    $checkin${"v":1,"blocks":[{"id":"ci-text-1","type":"text","text":"Arrivée à partir de 16h. Merci de nous communiquer votre heure d''arrivée au moins 24h à l''avance."},{"id":"ci-steps-1","type":"steps","items":[{"id":"ci-s1","title":"Entrée du domaine","description":"Composez 4829# sur le digicode du portail principal (Route des Plages)."},{"id":"ci-s2","title":"Parking","description":"Place n°3, allée de gauche après la fontaine. Ne bloquez pas le portillon technique."},{"id":"ci-s3","title":"Accès villa","description":"Les clés sont dans la boîte sécurisée à droite de la porte d''entrée. Code : 7391."},{"id":"ci-s4","title":"Conciergerie","description":"Sophie vous accueillera sur place si vous arrivez avant 20h. Sinon, check-in autonome."}]}]}$checkin$,
    $checkout${"v":1,"blocks":[{"id":"co-text-1","type":"text","text":"Départ avant 11h. Un late check-out peut être demandé 48h à l''avance (sous réserve de disponibilité)."},{"id":"co-list-1","type":"list","ordered":true,"items":["Rassembler serviettes de bain dans la salle de bain principale","Vider le réfrigérateur et lancer un cycle lave-vaisselle","Fermer volets, fenêtres et baies vitrées","Couper climatisation et lumières extérieures","Déposer les clés dans la boîte sécurisée (code 7391)","Envoyer un SMS à la conciergerie une fois parti"]}]}$checkout$,
    $rules${"v":1,"blocks":[{"id":"hr-text-1","type":"text","text":"Merci de respecter ces règles pour le confort de tous."},{"id":"hr-list-1","type":"list","ordered":false,"items":["Pas de fête ni événement sans autorisation écrite","Animaux non admis","Calme garanti après 22h","Piscine chauffée de 8h à 20h — enfants sous surveillance adulte","Fumeurs : terrasses et jardin uniquement","Invités extérieurs : merci de prévenir la conciergerie"]}]}$rules$,
    $emergency${"v":1,"contacts":[{"id":"ec-1","label":"Conciergerie My Butlr","role":"concierge","phone":"+33 6 12 34 56 78","email":"concierge@mybutlr.com","notes":"Disponible 24/7 — urgence villa, accès, prestataires.","available247":true},{"id":"ec-2","label":"Sophie Martin — House Manager","role":"manager","phone":"+33 6 98 76 54 32","email":"sophie.martin@mybutlr.com","notes":"Sur place du lundi au samedi, 9h-19h.","available247":false},{"id":"ec-3","label":"Dr. Laurent — Médecin de garde","role":"medical","phone":"+33 4 94 55 12 00","email":"","notes":"Cabinet médical Grimaud, sur rendez-vous.","available247":false},{"id":"ec-4","label":"SAMU","role":"medical","phone":"15","email":"","notes":"","available247":true},{"id":"ec-5","label":"Pompiers","role":"fire","phone":"18","email":"","notes":"","available247":true},{"id":"ec-6","label":"Police","role":"police","phone":"17","email":"","notes":"","available247":true}],"instructions":"{\"v\":1,\"blocks\":[{\"id\":\"ei-1\",\"type\":\"text\",\"text\":\"Coupure électrique : tableau dans le local technique (portillon gauche du parking). Remettez le différentiel en position ON.\"},{\"id\":\"ei-2\",\"type\":\"text\",\"text\":\"Fuite d''eau : robinet d''arrêt général sous l''évier de la cuisine. Contactez immédiatement la conciergerie.\"}]}"}$emergency$,
    true,
    true,
    now()
  )
  ON CONFLICT (property_id) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    welcome_title = EXCLUDED.welcome_title,
    welcome_message = EXCLUDED.welcome_message,
    wifi_name = EXCLUDED.wifi_name,
    wifi_password = EXCLUDED.wifi_password,
    check_in_instructions = EXCLUDED.check_in_instructions,
    check_out_instructions = EXCLUDED.check_out_instructions,
    house_rules = EXCLUDED.house_rules,
    emergency_contact = EXCLUDED.emergency_contact,
    require_online_checkin = EXCLUDED.require_online_checkin,
    show_services = EXCLUDED.show_services,
    updated_at = now();

  INSERT INTO public.guides (id, property_id, title, category, content, icon, published, sort_order, updated_at)
  VALUES
    (
      'f1000001-0000-4000-8000-000000000001',
      v_property_id,
      'Accès & codes',
      'access',
      $guide1${"v":1,"blocks":[{"id":"g1-t","type":"text","text":"Tous les codes d''accès pour votre séjour."},{"id":"g1-l","type":"list","ordered":false,"items":["Portail domaine : 4829#","Boîte à clés villa : 7391","Portillon piscine : 1256","Garage vélo : 8844"]}]}$guide1$,
      null,
      true,
      1,
      now()
    ),
    (
      'f1000001-0000-4000-8000-000000000002',
      v_property_id,
      'Wi-Fi & domotique',
      'wifi',
      $guide2${"v":1,"blocks":[{"id":"g2-t","type":"text","text":"Réseau principal : VillaFrenchWay_Guest — Mot de passe : StTropez2026!"},{"id":"g2-s","type":"steps","items":[{"id":"g2-s1","title":"Sonos","description":"Application Sonos — connectez-vous au Wi-Fi invité puis recherchez « Villa French Way »."},{"id":"g2-s2","title":"Climatisation","description":"Télécommandes dans le salon. Mode nuit recommandé à 22°C."},{"id":"g2-s3","title":"TV","description":"Netflix et Disney+ pré-configurés. Compte invité actif."}]}]}$guide2$,
      null,
      true,
      2,
      now()
    ),
    (
      'f1000001-0000-4000-8000-000000000003',
      v_property_id,
      'Piscine & spa',
      'pool',
      $guide3${"v":1,"blocks":[{"id":"g3-t","type":"text","text":"Piscine à débordement 12×5 m, chauffée à 28°C (avril–octobre)."},{"id":"g3-l","type":"list","ordered":false,"items":["Serviettes piscine dans le pool house","Douche extérieure obligatoire avant baignade","Spa 6 places — bouton ON/OFF sous le couvercle","Pas de verre au bord de la piscine"]}]}$guide3$,
      null,
      true,
      3,
      now()
    ),
    (
      'f1000001-0000-4000-8000-000000000004',
      v_property_id,
      'Bonnes adresses',
      'local',
      $guide4${"v":1,"blocks":[{"id":"g4-t","type":"text","text":"Nos recommandations à Grimaud et Saint-Tropez."},{"id":"g4-l","type":"list","ordered":false,"items":["La Vague d''Or — gastronomie (réservation via conciergerie)","Club 55 — déjeuner plage Pampelonne","Marché de Saint-Tropez — mardi & samedi matin","Pharmacie du Port — Grimaud, ouvert 7j/7"]}]}$guide4$,
      null,
      true,
      4,
      now()
    ),
    (
      'f1000001-0000-4000-8000-000000000005',
      v_property_id,
      'Parking & véhicules',
      'parking',
      $guide5${"v":1,"blocks":[{"id":"g5-t","type":"text","text":"2 places couvertes + 1 place visiteur."},{"id":"g5-s","type":"steps","items":[{"id":"g5-s1","title":"Voiture de location","description":"Livraison possible sur place. Prestataire : Azur VTC & Mobility."},{"id":"g5-s2","title":"Recharge électrique","description":"Borne Type 2 — place n°3. Badge dans le tiroir cuisine."}]}]}$guide5$,
      null,
      true,
      5,
      now()
    )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    content = EXCLUDED.content,
    published = EXCLUDED.published,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

  INSERT INTO public.property_services (
    id,
    property_id,
    service_id,
    enabled,
    sort_order,
    custom_price,
    custom_description,
    pricing_mode,
    provider_name,
    includes_text,
    offer_title,
    is_detailed,
    offer_mode,
    general_note,
    updated_at
  ) VALUES
    (
      'f2000001-0000-4000-8000-000000000001',
      v_property_id,
      '1146e652-5ece-4391-b67a-eed065ab4eef',
      true,
      1,
      280,
      null,
      'fixed',
      'Azur VTC — Prestataire local',
      'Mercedes Classe V, eau & rafraîchissements',
      'Transfert aéroport Nice ↔ Villa',
      false,
      'specific',
      null,
      now()
    ),
    (
      'f2000001-0000-4000-8000-000000000002',
      v_property_id,
      '6de9297d-da40-46be-a8dc-8ce1adf194b5',
      true,
      2,
      95,
      $chef${"v":1,"blocks":[{"id":"chef-t","type":"text","text":"Chef Marco Rossi — cuisine méditerranéenne raffinée, produits du marché de Saint-Tropez."},{"id":"chef-l","type":"list","ordered":false,"items":["Menu 4 services ou sur-mesure","Adaptation allergies & régimes","Service et dressage inclus","Nettoyage cuisine inclus"]},{"id":"chef-s","type":"steps","items":[{"id":"chef-s1","title":"Réservation","description":"Minimum 48h à l''avance via la conciergerie."},{"id":"chef-s2","title":"Jour J","description":"Arrivée du chef à 17h, dîner servi à 20h."}]}]}$chef$,
      'per_person',
      'Chef Marco Rossi — Gastronomie privée',
      'Menu 4 services, vin non inclus',
      'Chef privé à domicile',
      true,
      'specific',
      null,
      now()
    ),
    (
      'f2000001-0000-4000-8000-000000000003',
      v_property_id,
      '2c38b453-adee-49eb-966c-cc49b8993a1b',
      true,
      3,
      220,
      null,
      'fixed',
      'Spa Côte d''Azur Mobile',
      'Table, huiles bio, 60 min',
      'Massage suédois in-villa',
      false,
      'specific',
      null,
      now()
    ),
    (
      'f2000001-0000-4000-8000-000000000004',
      v_property_id,
      'c6479455-6763-4a1a-a08b-aff8aa5b2f36',
      true,
      4,
      null,
      null,
      'quote',
      null,
      null,
      'Location bateau & yacht',
      false,
      'general',
      'Votre conciergerie vous proposera les meilleures options (day boat, yacht avec skipper) selon la météo et vos dates.',
      now()
    ),
    (
      'f2000001-0000-4000-8000-000000000005',
      v_property_id,
      'b57f71a5-8d37-49d6-8b31-98799b4fd952',
      true,
      5,
      null,
      null,
      'quote',
      'Heli Sud — Prestataire certifié',
      'Vol panoramique 30 min',
      'Survol Saint-Tropez & Pampelonne',
      false,
      'specific',
      null,
      now()
    ),
    (
      'f2000001-0000-4000-8000-000000000006',
      v_property_id,
      '3c751591-b753-48d9-b6c3-ac0a2edb67af',
      true,
      6,
      420,
      null,
      'fixed',
      'Maison Gabriel — Caviste partenaire',
      'Dégustation 6 vins + fromages locaux',
      'Dégustation vin & fromages',
      false,
      'specific',
      null,
      now()
    ),
    (
      'f2000001-0000-4000-8000-000000000007',
      v_property_id,
      '931dabd5-d864-4986-ae83-2d998450fbe7',
      true,
      7,
      180,
      null,
      'fixed',
      'Kids & Co — Garde d''enfants',
      'Baby-sitter certifiée, francophone',
      'Garde d''enfants à la villa',
      false,
      'specific',
      null,
      now()
    ),
    (
      'f2000001-0000-4000-8000-000000000008',
      v_property_id,
      'c5b77acc-2954-42cc-a260-04285488dc8b',
      true,
      8,
      150,
      null,
      'fixed',
      'Coach Alex — Fitness & yoga',
      'Séance 1h, matériel fourni',
      'Coach sportif privé',
      false,
      'specific',
      null,
      now()
    )
  ON CONFLICT (property_id, service_id) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    sort_order = EXCLUDED.sort_order,
    custom_price = EXCLUDED.custom_price,
    custom_description = EXCLUDED.custom_description,
    pricing_mode = EXCLUDED.pricing_mode,
    provider_name = EXCLUDED.provider_name,
    includes_text = EXCLUDED.includes_text,
    offer_title = EXCLUDED.offer_title,
    is_detailed = EXCLUDED.is_detailed,
    offer_mode = EXCLUDED.offer_mode,
    general_note = EXCLUDED.general_note,
    updated_at = now();
END $$;
