CREATE TABLE IF NOT EXISTS public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.contract_templates
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_file_path text,
  ADD COLUMN IF NOT EXISTS source_file_name text,
  ADD COLUMN IF NOT EXISTS source_mime_type text,
  ADD COLUMN IF NOT EXISTS import_status text NOT NULL DEFAULT 'not_imported',
  ADD COLUMN IF NOT EXISTS import_error text,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.contract_templates
SET blocks = template_data->'blocks'
WHERE jsonb_typeof(template_data->'blocks') = 'array'
  AND blocks = '[]'::jsonb;

UPDATE public.contract_templates template
SET blocks = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', COALESCE(article->>'id', gen_random_uuid()::text),
      'type', CASE
        WHEN COALESCE((article->>'isHighlighted')::boolean, false) THEN 'callout'
        ELSE 'article'
      END,
      'title', concat(
        'Article ',
        COALESCE(article->>'number', ordinal::text),
        ' — ',
        COALESCE(article->>'title', 'Clause importée')
      ),
      'content', COALESCE(article->>'content', ''),
      'required', COALESCE((article->>'enabled')::boolean, true)
    )
    ORDER BY COALESCE((article->>'number')::integer, 999)
  )
  FROM jsonb_array_elements(template.template_data->'articles')
    WITH ORDINALITY AS items(article, ordinal)
)
WHERE template.blocks = '[]'::jsonb
  AND jsonb_typeof(template.template_data->'articles') = 'array';

ALTER TABLE public.contract_templates
  DROP CONSTRAINT IF EXISTS contract_templates_blocks_array_check,
  ADD CONSTRAINT contract_templates_blocks_array_check
    CHECK (jsonb_typeof(blocks) = 'array'),
  DROP CONSTRAINT IF EXISTS contract_templates_import_status_check,
  ADD CONSTRAINT contract_templates_import_status_check
    CHECK (import_status IN ('not_imported', 'processing', 'completed', 'failed')),
  DROP CONSTRAINT IF EXISTS contract_templates_version_check,
  ADD CONSTRAINT contract_templates_version_check
    CHECK (version >= 1),
  DROP CONSTRAINT IF EXISTS contract_templates_name_length_check,
  ADD CONSTRAINT contract_templates_name_length_check
    CHECK (char_length(trim(name)) BETWEEN 1 AND 160);

CREATE INDEX IF NOT EXISTS contract_templates_user_idx
  ON public.contract_templates (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS contract_templates_property_idx
  ON public.contract_templates (property_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS contract_templates_default_owner_idx
  ON public.contract_templates (user_id)
  WHERE is_default AND property_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS contract_templates_default_property_idx
  ON public.contract_templates (user_id, property_id)
  WHERE is_default AND property_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_contract_template()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF ROW(NEW.name, NEW.description, NEW.blocks, NEW.property_id)
    IS DISTINCT FROM
    ROW(OLD.name, OLD.description, OLD.blocks, OLD.property_id) THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contract_templates_touch_updated_at ON public.contract_templates;
CREATE TRIGGER contract_templates_touch_updated_at
BEFORE UPDATE ON public.contract_templates
FOR EACH ROW EXECUTE FUNCTION public.touch_contract_template();

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage own contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Owners insert own contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Owners update own contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Owners delete own contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Property members read contract templates" ON public.contract_templates;

CREATE POLICY "Property members read contract templates"
ON public.contract_templates
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    property_id IS NOT NULL
    AND public.can_access_property(property_id)
  )
  OR (
    property_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.properties property
      WHERE property.owner_id = contract_templates.user_id
        AND public.can_access_property(property.id)
    )
  )
);

CREATE POLICY "Owners insert own contract templates"
ON public.contract_templates
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND created_by = auth.uid());

CREATE POLICY "Owners update own contract templates"
ON public.contract_templates
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners delete own contract templates"
ON public.contract_templates
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS contract_template_id uuid
    REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_snapshot jsonb;

CREATE INDEX IF NOT EXISTS contracts_template_idx
  ON public.contracts (contract_template_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-template-files',
  'contract-template-files',
  false,
  15728640,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Owners upload contract template files" ON storage.objects;
CREATE POLICY "Owners upload contract template files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contract-template-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Owners read contract template files" ON storage.objects;
CREATE POLICY "Owners read contract template files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'contract-template-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Owners update contract template files" ON storage.objects;
CREATE POLICY "Owners update contract template files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contract-template-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'contract-template-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Owners delete contract template files" ON storage.objects;
CREATE POLICY "Owners delete contract template files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'contract-template-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

WITH french_way_owners AS (
  SELECT DISTINCT property.owner_id
  FROM public.properties property
  WHERE property.owner_id IS NOT NULL
    AND property.name ILIKE '%The French Way%'
)
INSERT INTO public.contract_templates (
  user_id,
  name,
  description,
  blocks,
  source_file_name,
  source_mime_type,
  import_status,
  is_default,
  created_by,
  template_data
)
SELECT
  owner_id,
  'Location saisonnière prestige — Base Pavard',
  'Modèle de 15 articles adapté du contrat Villa The French Way. Les données du locataire et du séjour sont remplacées par des variables.',
  jsonb_build_array(
    jsonb_build_object(
      'id', 'preamble',
      'type', 'preamble',
      'title', 'Parties au contrat',
      'content', $$Le présent contrat de location saisonnière est conclu entre les soussignés :

LE BAILLEUR
SAS EBSCOPAL, représentée par M. Emmanuel Béguier, dont le siège social est situé 65 rue de la Garriguette, 34130 Saint-Aunès (France), immatriculée au RCS de Montpellier sous le numéro 901 449 405 (SIRET 901 449 405 00025). Téléphone : +33 7 81 62 23 97 — Email : contact@frenchw.com. Ci-après dénommée « le Bailleur » ou « le Propriétaire ».

LE LOCATAIRE
Nom et prénom : {{tenant.name}} — Adresse : {{tenant.address}} — Téléphone : {{tenant.phone}} — Email : {{tenant.email}}. Ci-après dénommé « le Locataire ».

Le Locataire certifie l’exactitude des informations fournies et s’engage à prévenir le Bailleur de toute modification éventuelle.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-1',
      'type', 'article',
      'title', 'Article 1 — Parties au contrat',
      'content', $$Le présent contrat est conclu entre le Bailleur identifié au préambule et le Locataire {{tenant.name}}. Le contrat est conclu intuitu personae avec le Locataire signataire.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-2',
      'type', 'article',
      'title', 'Article 2 — Le séjour',
      'content', $$Le Bailleur donne en location saisonnière la villa de prestige « {{property.name}} », située {{property.address}}, du {{stay.arrival}} à {{stay.check_in_time}} au {{stay.departure}} à {{stay.check_out_time}}, soit {{stay.nights}} nuit(s).

La location est consentie pour {{property.max_guests}} personnes maximum. Le groupe de voyageurs ne pourra en aucun cas dépasser la capacité d’accueil prévue sans accord écrit préalable du Bailleur.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-3',
      'type', 'article',
      'title', 'Article 3 — Montant et modalités de paiement',
      'content', $$Le montant net de la location est fixé à {{financial.rent}}. Les taxes de séjour sont incluses sauf mention contraire.

Le présent accord de réservation est conditionné à la réception de l’intégralité des paiements. Le Locataire sera notifié dès leur réception et la réservation sera alors confirmée.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-4',
      'type', 'callout',
      'title', 'Article 4 — Dépôt de garantie',
      'content', $$Le dépôt de garantie est fixé à {{financial.deposit}}. Il sera encaissé à l’arrivée et conservé sous séquestre pendant une durée maximale de sept (7) jours après le départ.

Il sera restitué sous sept (7) jours maximum, sous réserve d’un état des lieux de sortie conforme. En cas de dégradation, casse ou perte imputable au Locataire ou à ses invités, le Bailleur pourra prélever les montants correspondants sur le dépôt de garantie, au coût réel et sur présentation des justificatifs. Si le dépôt s’avère insuffisant, le Locataire s’engage à régler le solde sur présentation des justificatifs.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-5',
      'type', 'article',
      'title', 'Article 5 — Détails de la propriété',
      'content', $$La propriété « {{property.name}} » comprend {{property.bedrooms}} chambre(s), {{property.bathrooms}} salle(s) de bain et peut accueillir jusqu’à {{property.max_guests}} personnes. Les équipements et caractéristiques détaillés sont ceux présentés au Locataire lors de la réservation et à l’état des lieux d’entrée.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-6',
      'type', 'article',
      'title', 'Article 6 — Services inclus',
      'content', $$Les services inclus sont ceux indiqués dans l’offre de réservation. Toute heure de service supplémentaire, tout changement additionnel de draps ou de serviettes et tout excès d’activité ou usage anormal des lieux donneront lieu à une facturation complémentaire, après accord du Locataire ou sur présentation de la facture du prestataire.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-7',
      'type', 'callout',
      'title', 'Article 7 — Règles de comportement et usage des lieux',
      'content', $$Le Locataire et ses occupants sont responsables de tous les dommages, pertes ou troubles causés par eux, tant à l’intérieur de la villa qu’au sein de la propriété. Tout dommage constaté doit être signalé sans délai au Bailleur ou à son représentant.

Toute fête ou tout événement doit être autorisé au préalable et par écrit par le Bailleur. La villa devra être restituée dans son état initial et utilisée de manière paisible et respectueuse. En cas de nuisance excessive ou de non-respect du règlement de la maison et du voisinage, le Bailleur pourra intervenir, voire mettre fin à la location de manière anticipée sans remboursement.

Il est interdit de fumer à l’intérieur de la villa, sauf espace désigné. Toute consommation, détention ou usage de drogues ou de stupéfiants est strictement interdit. La diffusion de musique à fort volume en extérieur est limitée à 22h00. Le nombre d’occupants ne peut dépasser {{property.max_guests}} personnes sans accord écrit préalable.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-8',
      'type', 'article',
      'title', 'Article 8 — Sécurité et usage des installations',
      'content', $$Le Locataire est pleinement responsable de la sécurité des occupants au sein de la propriété. Une surveillance accrue des enfants et des personnes vulnérables est obligatoire aux abords des piscines et dans les zones à risque.

Le Locataire reconnaît avoir été informé des consignes d’utilisation des équipements. Leur utilisation se fait aux risques et périls des occupants. Le Bailleur décline toute responsabilité en cas d’accident dû à une négligence du Locataire ou au non-respect des consignes de sécurité. Il est strictement interdit d’utiliser les équipements de façon non prévue ou de forcer les dispositifs de sécurité.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-9',
      'type', 'callout',
      'title', 'Article 9 — Conditions d’annulation et remboursement',
      'content', $$Annulation du fait du Locataire : toutes les sommes déjà versées restent acquises au Bailleur et ne seront pas remboursées, sauf accord écrit exceptionnel du Bailleur.

Annulation du fait du Bailleur, hors force majeure : le Bailleur s’engage à rembourser l’intégralité des sommes versées par le Locataire.

Toute demande d’annulation devra être formulée par écrit.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-10',
      'type', 'callout',
      'title', 'Article 10 — Check-in / Check-out',
      'content', $$L’arrivée est prévue le {{stay.arrival}} à partir de {{stay.check_in_time}}. Le départ est prévu le {{stay.departure}} au plus tard à {{stay.check_out_time}}.

Le late check-out sera facturé en supplément, selon la disponibilité de la villa et au prorata temporis. Un état des lieux d’entrée et de sortie sera réalisé en présence du house manager ou du représentant du Bailleur. La remise des clés et l’accès à la villa sont conditionnés au règlement intégral du séjour et du dépôt de garantie.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-11',
      'type', 'article',
      'title', 'Article 11 — Sous-location et cession',
      'content', $$Le Locataire n’a pas le droit de sous-louer la villa, ni d’en céder le bénéfice à un tiers, même à titre gratuit, sans l’accord écrit préalable du Bailleur. Le contrat est conclu intuitu personae avec le Locataire signataire et ne peut être transféré. Toute violation pourra entraîner la résiliation immédiate du contrat aux torts exclusifs du Locataire, le montant total du loyer restant dû au Bailleur.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-12',
      'type', 'article',
      'title', 'Article 12 — Force majeure',
      'content', $$Les parties ne pourront être tenues responsables de l’inexécution de tout ou partie de leurs obligations en cas de force majeure au sens de l’article 1218 du Code civil.

Si l’empêchement est temporaire, l’exécution du contrat est suspendue pendant sa durée. S’il rend le séjour impossible, le contrat pourra être résilié de plein droit sans indemnité. Les sommes versées seront remboursées ou le séjour pourra être reprogrammé selon un accord amiable. Aucune partie ne pourra réclamer de dommages-intérêts du simple fait de cette annulation.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-13',
      'type', 'article',
      'title', 'Article 13 — Confidentialité',
      'content', $$Le Locataire et le Bailleur conviennent de garder strictement confidentielles les informations réciproques obtenues dans le cadre de la présente location. Les termes du contrat ne devront pas être divulgués à des tiers, sauf accord écrit préalable de l’autre partie ou obligation légale.

Le Locataire s’engage à respecter la vie privée du voisinage et à n’organiser aucune visite de la propriété à des fins médiatiques ou commerciales sans autorisation.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-14',
      'type', 'article',
      'title', 'Article 14 — Prises de vue et usage commercial',
      'content', $$Toute prise de vue, captation vidéo, tournage ou production photographique à des fins commerciales, promotionnelles, publicitaires ou éditoriales dans la villa doit faire l’objet d’un accord écrit préalable du Bailleur.

En cas d’autorisation expresse, le Locataire s’engage à mentionner le nom du bien « {{property.name}} » ainsi que sa localisation dans toute diffusion publique des contenus produits.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'article-15',
      'type', 'article',
      'title', 'Article 15 — Droit applicable et juridiction',
      'content', $$Le présent contrat est soumis au droit français, tant pour son interprétation que pour son exécution. En cas de litige non résolu à l’amiable, les tribunaux territorialement compétents seront saisis conformément aux règles applicables.$$,
      'required', true
    ),
    jsonb_build_object(
      'id', 'signatures',
      'type', 'signatures',
      'title', 'Signatures des parties',
      'content', $$Fait en deux (2) exemplaires originaux, dont un remis à chaque partie, le {{contract.date}}. Les parties déclarent avoir pris connaissance du contrat et en accepter tous les termes, clauses et conditions, sans réserve ni restriction.

Mention manuscrite : « Lu et approuvé ».$$,
      'required', true
    )
  ),
  'Contrat_Location_Villa_The_French_Way_PAVARD_(1).pdf',
  'application/pdf',
  'completed',
  NOT EXISTS (
    SELECT 1
    FROM public.contract_templates existing
    WHERE existing.user_id = owner_id
      AND existing.property_id IS NULL
      AND existing.is_default
  ),
  owner_id,
  jsonb_build_object('schemaVersion', 1, 'source', 'pavard_contract')
FROM french_way_owners
WHERE NOT EXISTS (
  SELECT 1
  FROM public.contract_templates existing
  WHERE existing.user_id = french_way_owners.owner_id
    AND existing.name = 'Location saisonnière prestige — Base Pavard'
);
