export interface ContractArticle {
  id: string
  number: number
  title: string
  content: string
  enabled: boolean
  isHighlighted: boolean
  highlightLabel?: string
}

export interface ContractTemplate {
  id: string
  name: string
  description: string
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
      title: 'Parties au contrat',
      content: `Le present contrat est conclu entre le Bailleur, la {bailleur_company} representee par {bailleur_representative}, et le Locataire identifie au preambule des presentes. Le contrat est conclu intuitu personae avec le Locataire signataire.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 2,
      title: 'Le sejour',
      content: `Le Bailleur donne en location saisonniere la villa de prestige designee ci-apres, pour la duree et aux conditions definies au present contrat.

La location est consentie pour {max_guests} personnes maximum. Le groupe de voyageurs ne pourra en aucun cas depasser la capacite d'accueil prevue sans accord ecrit prealable du Bailleur.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 3,
      title: 'Montant et modalites de paiement',
      content: `Le present accord de reservation est conditionne a la reception de l'integralite des paiements. Le Locataire sera notifie des leur reception et la reservation sera alors confirmee.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 4,
      title: 'Depot de garantie',
      content: `La caution sera encaissee a l'arrivee et conservee sous sequestre pendant une duree maximale de sept (7) jours apres le depart.

Elle sera restituee sous sept (7) jours maximum, sous reserve d'un etat des lieux de sortie conforme. En cas de degradation, casse ou perte imputable au Locataire ou a ses invites, le Bailleur pourra prelever les montants correspondants sur le depot de garantie, au cout reel et sur presentation des justificatifs (facture du professionnel). Si le depot s'avere insuffisant, le Locataire s'engage a regler le solde sur presentation des justificatifs.`,
      enabled: true,
      isHighlighted: true,
      highlightLabel: 'Depot de garantie',
    },
    {
      id: uid(),
      number: 5,
      title: 'Details de la propriete',
      content: `Superficie : environ {surface} m2 de surface habitable.
Capacite d'accueil : jusqu'a {max_guests} personnes ({bedrooms} chambres doubles, chacune pourvue de sa salle de bain attenante).
Equipements principaux : piscine exterieure a debordement, piscine interieure chauffee, salle de sport, salle de jeux, salle de cinema, salon TV, hammam, jacuzzi, sauna, climatisation integrale ete/hiver, Wi-Fi haut debit et autres equipements haut de gamme assurant un sejour de luxe.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 6,
      title: 'Services inclus',
      content: `Petit-dejeuner a la francaise tous les jours de 8h a 11h, sous forme de buffet.
Menage courant quotidien inclus (4 heures par jour selon le nombre d'intervenants).
Changement des draps et serviettes une fois par semaine.
House manager disponible sur place.
Cocktail d'arrivee de bienvenue.
Fonds de cuisine et produits de toilette inclus.
Service Butler : en supplement, nous consulter.

Toute heure de service supplementaire demandee sera facturee directement sur place par le prestataire, en accord avec le Locataire. Toute demande de changement de draps ou de serviettes supplementaire sera facturee sur place.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 7,
      title: 'Regles de comportement et usage des lieux',
      content: `Le Locataire (et ses occupants) est responsable de tous les dommages, pertes ou troubles causes par lui-meme ou par les personnes hebergees sous sa responsabilite, tant a l'interieur de la villa qu'au sein de la propriete (jardin, piscines, dependances). Le Locataire est invite a signaler sans delai au Bailleur ou a son representant sur place tout dommage constate afin de convenir des mesures a prendre.

Fetes et evenements : toute fete ou evenement doit etre autorise au prealable et par ecrit par le Bailleur.
Respect des lieux : la villa devra etre restituee dans son etat initial. Le Locataire s'engage a utiliser le bien de maniere paisible et respectueuse.
Nuisances : en cas de nuisance excessive ou de non-respect du reglement de la maison et du voisinage, le Bailleur ou son representant se reserve le droit d'intervenir, voire de mettre fin a la location de maniere anticipee sans remboursement.
Tabac : il est strictement interdit de fumer a l'interieur de la villa (sauf espace fumeur designe).
Drogues et stupefiants : toute consommation, detention ou usage de drogue et de stupefiants est strictement interdit dans la villa et au sein de la propriete.
Musique exterieure : la diffusion de musique a fort volume en exterieur est autorisee jusqu'a 22h00 maximum, dans le respect du voisinage.
Capacite : le nombre d'occupants ne peut depasser {max_guests} personnes sans accord ecrit prealable.`,
      enabled: true,
      isHighlighted: true,
      highlightLabel: 'Regles de comportement',
    },
    {
      id: uid(),
      number: 8,
      title: 'Securite et usage des installations',
      content: `Le Locataire est pleinement responsable de la securite des occupants au sein de la propriete. La villa disposant d'une piscine exterieure et d'une piscine interieure, une surveillance accrue des enfants et des personnes vulnerables est obligatoire aux abords des bassins et dans les zones a risque.

Le Locataire reconnait avoir ete informe des consignes d'utilisation des piscines (absence de plongeon depuis les bords, interdiction d'acces non surveille pour les mineurs, utilisation des alarmes ou barrieres de securite lorsqu'elles sont installees) et plus generalement des equipements (hammam, jacuzzi, salle de sport). L'utilisation de ces installations se fait aux risques et perils des occupants. Le Bailleur decline toute responsabilite en cas d'accident du a une negligence du Locataire.

Il est strictement interdit d'utiliser les equipements de facon non prevue. Le non-respect de ces regles engagera la responsabilite du Locataire.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 9,
      title: "Conditions d'annulation et remboursement",
      content: `Annulation du fait du Locataire : toutes les sommes deja versees (acompte et paiements intermediaires) restent acquises au Bailleur et ne seront pas remboursees. Aucune annulation ne donnera lieu a restitution, sauf accord ecrit exceptionnel du Bailleur (par exemple en cas de relocation reussie de la villa aux memes dates, ou de relogement du Locataire dans des conditions acceptees par les deux parties).

Annulation du fait du Bailleur (hors force majeure) : le Bailleur s'engage a rembourser l'integralite des sommes versees par le Locataire.

Toute demande d'annulation devra etre formulee par ecrit.`,
      enabled: true,
      isHighlighted: true,
      highlightLabel: 'Annulation & remboursement',
    },
    {
      id: uid(),
      number: 10,
      title: 'Check-in / Check-out',
      content: `Le late check-out sera facture en supplement, selon la disponibilite de la villa et au prorata temporis.

Un etat des lieux d'entree et de sortie sera realise en presence du house manager ou du representant du Bailleur. La remise des cles et l'acces a la villa sont conditionnes a la confirmation de la reservation et au reglement integral du sejour et du depot de garantie.`,
      enabled: true,
      isHighlighted: true,
      highlightLabel: 'Check-in / Check-out',
    },
    {
      id: uid(),
      number: 11,
      title: 'Sous-location et cession',
      content: `Le Locataire n'a pas le droit de sous-louer la villa, ni d'en ceder le benefice a un tiers, meme a titre gratuit, sans l'accord ecrit prealable du Bailleur. Le contrat de location est conclu intuitu personae avec le Locataire signataire et ne peut etre transfere. Toute violation de cette clause pourra entrainer la resiliation immediate du contrat aux torts exclusifs du Locataire, le montant total du loyer restant du au Bailleur.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 12,
      title: 'Force majeure',
      content: `Les parties ne pourront etre tenues responsables de l'inexecution de tout ou partie de leurs obligations en cas de force majeure, au sens de l'article 1218 du Code civil : tout evenement exterieur, imprevisible et irresistible rendant impossible l'execution du contrat (catastrophe naturelle, pandemie, acte de gouvernement, guerre, menace terroriste, ou tout evenement independant de la volonte des parties).

En cas de force majeure dument reconnue : si l'empechement est temporaire, l'execution du contrat est suspendue pendant sa duree ; si l'empechement rend le sejour impossible, le contrat pourra etre resilie de plein droit sans indemnite. Les sommes versees seront remboursees ou le sejour pourra etre reprogramme a des dates ulterieures, selon un accord amiable.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 13,
      title: 'Confidentialite',
      content: `Le Locataire et le Bailleur conviennent de garder strictement confidentielles les informations reciproques obtenues dans le cadre de la presente location. Les termes du contrat (prix de location, coordonnees des parties, details specifiques convenus) ne devront pas etre divulgues a des tiers, sauf accord ecrit prealable de l'autre partie ou obligation legale.

Le Locataire s'engage a respecter la vie privee du voisinage et a n'organiser aucune visite de la propriete a des fins mediatiques ou commerciales sans autorisation. Cette clause de confidentialite est primordiale compte tenu de la nature exclusive et haut de gamme de la location.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 14,
      title: 'Prises de vue et usage commercial',
      content: `Toute prise de vue, captation video, tournage ou production photographique a des fins commerciales, promotionnelles, publicitaires ou editoriales realisee dans les espaces de la villa doit faire l'objet d'un accord ecrit prealable du Bailleur.

En cas d'autorisation expresse, le Locataire s'engage a mentionner explicitement le nom du bien ainsi que sa localisation dans toute diffusion publique des contenus produits. Le non-respect de cette clause pourra entrainer des poursuites pour atteinte aux droits patrimoniaux lies a l'image du bien, ainsi qu'un recours en indemnisation.`,
      enabled: true,
      isHighlighted: false,
    },
    {
      id: uid(),
      number: 15,
      title: 'Droit applicable et juridiction',
      content: `Le present contrat est soumis au droit francais, tant pour son interpretation que pour son execution. En cas de litige non resolu a l'amiable, les tribunaux du ressort de Draguignan (France) seront seuls competents. Cette attribution de juridiction s'applique y compris en cas de refere, de pluralite de defendeurs ou d'appel en garantie, et nonobstant toute clause contraire du Locataire si celui-ci contracte en tant que consommateur non-resident.`,
      enabled: true,
      isHighlighted: false,
    },
  ]
}

export function createDefaultTemplate(): ContractTemplate {
  return {
    id: 'default',
    name: 'Contrat de location saisonniere — The French Way',
    description: 'Contrat de location saisonniere de prestige pour villas et proprietes haut de gamme',
    articles: createDefaultArticles(),
    bailleur: { ...DEFAULT_BAILLEUR },
    propertyDefaults: { ...DEFAULT_PROPERTY },
  }
}
