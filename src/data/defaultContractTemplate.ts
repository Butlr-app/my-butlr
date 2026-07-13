export type ContractArticleKind = 'generic' | 'stay' | 'payment' | 'deposit' | 'checkinout'

export interface ContractArticle {
  id: string
  number: number
  title: string
  content: string
  enabled: boolean
  isHighlighted: boolean
  highlightLabel?: string
  /** Controls special PDF layout boxes. Prefer this over hardcoded article numbers. */
  kind?: ContractArticleKind
}

export interface ContractTemplate {
  id: string
  name: string
  description: string
  version: string
  articles: ContractArticle[]
  bailleur: {
    company: string
    representative: string
    address: string
    rcs: string
    siret: string
    phone: string
    email: string
  }
  propertyDefaults: {
    name: string
    address: string
    rent: number
    deposit: number
    maxGuests: number
    surface: number
    bedrooms: number
    checkinTime: string
    checkoutTime: string
  }
}

export const DEFAULT_BAILLEUR = {
  company: 'SAS EBSCOPAL',
  representative: 'M. Emmanuel Beguier',
  address: '65 rue de la Garriguette, 34130 Saint-Aunes (France)',
  rcs: '901 449 405',
  siret: '901 449 405 00025',
  phone: '+33 7 81 62 23 97',
  email: 'contact@frenchw.com',
}

export const DEFAULT_PROPERTY = {
  name: 'Villa The French Way',
  address: '3 corniche de Bartole, 83310 Grimaud, Var (France)',
  rent: 60000,
  deposit: 30000,
  maxGuests: 16,
  surface: 980,
  bedrooms: 8,
  checkinTime: '14h00',
  checkoutTime: '11h00',
}

function uid() {
  return crypto.randomUUID()
}

export function createDefaultArticles(): ContractArticle[] {
  return [
    {
      id: uid(),
      number: 1,
      kind: 'generic',
      title: 'Parties au contrat',
      content: `Le présent contrat est conclu entre le Bailleur, la {bailleur_company} représentée par {bailleur_representative}, et le Locataire identifié au préambule des présentes. Le contrat est conclu intuitu personae avec le Locataire signataire.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 2,
      kind: 'stay',
      title: 'Le séjour',
      content: `Le Bailleur donne en location saisonnière la villa de prestige désignée ci-après, pour la durée et aux conditions définies au présent contrat.

La location est consentie pour {max_guests} personnes maximum. Le groupe de voyageurs ne pourra en aucun cas dépasser la capacité d'accueil prévue sans accord écrit préalable du Bailleur.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 3,
      kind: 'payment',
      title: 'Montant et modalités de paiement',
      content: `Le présent accord de réservation est conditionné à la réception de l'intégralité des paiements. Le Locataire sera notifié dès leur réception et la réservation sera alors confirmée.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 4,
      kind: 'deposit',
      title: 'Dépôt de garantie',
      content: `La caution sera encaissée à l'arrivée et conservée sous séquestre pendant une durée maximale de sept (7) jours après le départ.

Elle sera restituée sous sept (7) jours maximum, sous réserve d'un état des lieux de sortie conforme. En cas de dégradation, casse ou perte imputable au Locataire ou à ses invités, le Bailleur pourra prélever les montants correspondants sur le dépôt de garantie, au coût réel et sur présentation des justificatifs (facture du professionnel). Si le dépôt s'avère insuffisant, le Locataire s'engage à régler le solde sur présentation des justificatifs.`,
      enabled: true,
      isHighlighted: true,
      highlightLabel: 'Dépôt de garantie',
    },
    {
      id: uid(),
      number: 5,
      kind: 'generic',
      title: 'Détails de la propriété',
      content: `Superficie : environ {surface} m² de surface habitable.
Capacité d'accueil : jusqu'à {max_guests} personnes ({bedrooms} chambres doubles, chacune pourvue de sa salle de bain attenante).
Équipements principaux : piscine extérieure à débordement, piscine intérieure chauffée, salle de sport, salle de jeux, salle de cinéma, salon TV, hammam, jacuzzi, sauna, climatisation intégrale été/hiver, Wi-Fi haut débit et autres équipements haut de gamme assurant un séjour de luxe.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 6,
      kind: 'generic',
      title: 'Services inclus',
      content: `Petit-déjeuner à la française tous les jours de 8h à 11h, sous forme de buffet.
Ménage courant quotidien inclus (4 heures par jour selon le nombre d'intervenants).
Changement des draps et serviettes une fois par semaine.
House manager disponible sur place.
Cocktail d'arrivée de bienvenue.
Fonds de cuisine et produits de toilette inclus.
Service Butler : en supplément, nous consulter.

Toute heure de service supplémentaire demandée sera facturée directement sur place par le prestataire, en accord avec le Locataire. Toute demande de changement de draps ou de serviettes supplémentaire sera facturée sur place.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 7,
      kind: 'generic',
      title: 'Règles de comportement et usage des lieux',
      content: `Le Locataire (et ses occupants) est responsable de tous les dommages, pertes ou troubles causés par lui-même ou par les personnes hébergées sous sa responsabilité, tant à l'intérieur de la villa qu'au sein de la propriété (jardin, piscines, dépendances). Le Locataire est invité à signaler sans délai au Bailleur ou à son représentant sur place tout dommage constaté afin de convenir des mesures à prendre.

Fêtes et événements : toute fête ou événement doit être autorisé au préalable et par écrit par le Bailleur.
Respect des lieux : la villa devra être restituée dans son état initial. Le Locataire s'engage à utiliser le bien de manière paisible et respectueuse.
Nuisances : en cas de nuisance excessive ou de non-respect du règlement de la maison et du voisinage, le Bailleur ou son représentant se réserve le droit d'intervenir, voire de mettre fin à la location de manière anticipée sans remboursement.
Tabac : il est strictement interdit de fumer à l'intérieur de la villa (sauf espace fumeur désigné).
Drogues et stupéfiants : toute consommation, détention ou usage de drogue et de stupéfiants est strictement interdit dans la villa et au sein de la propriété.
Musique extérieure : la diffusion de musique à fort volume en extérieur est autorisée jusqu'à 22h00 maximum, dans le respect du voisinage.
Capacité : le nombre d'occupants ne peut dépasser {max_guests} personnes sans accord écrit préalable.`,
      enabled: true,
      isHighlighted: true,
      highlightLabel: 'Règles de comportement',
    },
    {
      id: uid(),
      number: 8,
      kind: 'generic',
      title: 'Sécurité et usage des installations',
      content: `Le Locataire est pleinement responsable de la sécurité des occupants au sein de la propriété. La villa disposant d'une piscine extérieure et d'une piscine intérieure, une surveillance accrue des enfants et des personnes vulnérables est obligatoire aux abords des bassins et dans les zones à risque.

Le Locataire reconnaît avoir été informé des consignes d'utilisation des piscines (absence de plongeon depuis les bords, interdiction d'accès non surveillé pour les mineurs, utilisation des alarmes ou barrières de sécurité lorsqu'elles sont installées) et plus généralement des équipements (hammam, jacuzzi, salle de sport). L'utilisation de ces installations se fait aux risques et périls des occupants. Le Bailleur décline toute responsabilité en cas d'accident dû à une négligence du Locataire.

Il est strictement interdit d'utiliser les équipements de façon non prévue. Le non-respect de ces règles engagera la responsabilité du Locataire.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 9,
      kind: 'generic',
      title: "Conditions d'annulation et remboursement",
      content: `Annulation du fait du Locataire : toutes les sommes déjà versées (acompte et paiements intermédiaires) restent acquises au Bailleur et ne seront pas remboursées. Aucune annulation ne donnera lieu à restitution, sauf accord écrit exceptionnel du Bailleur (par exemple en cas de relocation réussie de la villa aux mêmes dates, ou de relogement du Locataire dans des conditions acceptées par les deux parties).

Annulation du fait du Bailleur (hors force majeure) : le Bailleur s'engage à rembourser l'intégralité des sommes versées par le Locataire.

Toute demande d'annulation devra être formulée par écrit.`,
      enabled: true,
      isHighlighted: true,
      highlightLabel: 'Annulation & remboursement',
    },
    {
      id: uid(),
      number: 10,
      kind: 'checkinout',
      title: 'Check-in / Check-out',
      content: `Le late check-out sera facturé en supplément, selon la disponibilité de la villa et au prorata temporis.

Un état des lieux d'entrée et de sortie sera réalisé en présence du house manager ou du représentant du Bailleur. La remise des clés et l'accès à la villa sont conditionnés à la confirmation de la réservation et au règlement intégral du séjour et du dépôt de garantie.`,
      enabled: true,
      isHighlighted: true,
      highlightLabel: 'Check-in / Check-out',
    },
    {
      id: uid(),
      number: 11,
      kind: 'generic',
      title: 'Sous-location et cession',
      content: `Le Locataire n'a pas le droit de sous-louer la villa, ni d'en céder le bénéfice à un tiers, même à titre gratuit, sans l'accord écrit préalable du Bailleur. Le contrat de location est conclu intuitu personae avec le Locataire signataire et ne peut être transféré. Toute violation de cette clause pourra entraîner la résiliation immédiate du contrat aux torts exclusifs du Locataire, le montant total du loyer restant dû au Bailleur.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 12,
      kind: 'generic',
      title: 'Force majeure',
      content: `Les parties ne pourront être tenues responsables de l'inexécution de tout ou partie de leurs obligations en cas de force majeure, au sens de l'article 1218 du Code civil : tout événement extérieur, imprévisible et irrésistible rendant impossible l'exécution du contrat (catastrophe naturelle, pandémie, acte de gouvernement, guerre, menace terroriste, ou tout événement indépendant de la volonté des parties).

En cas de force majeure dûment reconnue : si l'empêchement est temporaire, l'exécution du contrat est suspendue pendant sa durée ; si l'empêchement rend le séjour impossible, le contrat pourra être résilié de plein droit sans indemnité. Les sommes versées seront remboursées ou le séjour pourra être reprogrammé à des dates ultérieures, selon un accord amiable.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 13,
      kind: 'generic',
      title: 'Confidentialité',
      content: `Le Locataire et le Bailleur conviennent de garder strictement confidentielles les informations réciproques obtenues dans le cadre de la présente location. Les termes du contrat (prix de location, coordonnées des parties, détails spécifiques convenus) ne devront pas être divulgués à des tiers, sauf accord écrit préalable de l'autre partie ou obligation légale.

Le Locataire s'engage à respecter la vie privée du voisinage et à n'organiser aucune visite de la propriété à des fins médiatiques ou commerciales sans autorisation. Cette clause de confidentialité est primordiale compte tenu de la nature exclusive et haut de gamme de la location.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 14,
      kind: 'generic',
      title: 'Prises de vue et usage commercial',
      content: `Toute prise de vue, captation vidéo, tournage ou production photographique à des fins commerciales, promotionnelles, publicitaires ou éditoriales réalisée dans les espaces de la villa doit faire l'objet d'un accord écrit préalable du Bailleur.

En cas d'autorisation expresse, le Locataire s'engage à mentionner explicitement le nom du bien ainsi que sa localisation dans toute diffusion publique des contenus produits. Le non-respect de cette clause pourra entraîner des poursuites pour atteinte aux droits patrimoniaux liés à l'image du bien, ainsi qu'un recours en indemnisation.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 15,
      kind: 'generic',
      title: 'Droit applicable et juridiction',
      content: `Le présent contrat est soumis au droit français, tant pour son interprétation que pour son exécution. En cas de litige non résolu à l'amiable, les tribunaux du ressort de Draguignan (France) seront seuls compétents. Cette attribution de juridiction s'applique y compris en cas de référé, de pluralité de défendeurs ou d'appel en garantie, et nonobstant toute clause contraire du Locataire si celui-ci contracte en tant que consommateur non-résident.`,
      enabled: true,
      isHighlighted: false,
    },
  ]
}

export function createDefaultTemplate(): ContractTemplate {
  return {
    id: 'default',
    name: 'Contrat de location saisonnière — The French Way',
    description: 'Contrat de location saisonnière de prestige pour villas et propriétés haut de gamme',
    version: '2026.07.1',
    articles: createDefaultArticles(),
    bailleur: { ...DEFAULT_BAILLEUR },
    propertyDefaults: { ...DEFAULT_PROPERTY },
  }
}

/** Resolve PDF layout kind with backward compatibility for old saved templates. */
export function resolveArticleKind(article: ContractArticle): ContractArticleKind {
  if (article.kind) return article.kind
  if (article.number === 2) return 'stay'
  if (article.number === 3) return 'payment'
  if (article.number === 4) return 'deposit'
  if (article.number === 10) return 'checkinout'
  return 'generic'
}
