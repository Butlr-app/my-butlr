export interface SpeechLanguageOption {
  code: string
  label: string
}

export const GUEST_SPEECH_LANGUAGES: SpeechLanguageOption[] = [
  { code: 'fr-FR', label: 'Français' },
  { code: 'en-US', label: 'English' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Español' },
  { code: 'it-IT', label: 'Italiano' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'pt-PT', label: 'Português' },
  { code: 'nl-NL', label: 'Nederlands' },
  { code: 'ru-RU', label: 'Русский' },
  { code: 'ar-SA', label: 'العربية' },
  { code: 'zh-CN', label: '中文' },
  { code: 'ja-JP', label: '日本語' },
]

export function resolveGuestSpeechLanguage(
  guestLanguage?: string | null,
  fallback?: string | null,
): string {
  const candidate = guestLanguage?.trim() || fallback?.trim()
  if (candidate) return candidate
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language
  }
  return 'fr-FR'
}

export function speechLanguageLabel(code: string): string {
  return GUEST_SPEECH_LANGUAGES.find(option => option.code === code)?.label ?? code
}

export type GuestLocale = 'fr' | 'en'

/** Normalise un code langue (ex. "en-US", "fr_FR") vers 'fr' ou 'en'. Défaut : 'fr'. */
export function normalizeGuestLocale(guestLanguage?: string | null): GuestLocale {
  const code = guestLanguage?.trim().toLowerCase()
  if (!code) return 'fr'
  if (code.startsWith('en')) return 'en'
  if (code.startsWith('fr')) return 'fr'
  return 'fr'
}

const GUEST_DICTIONARY = {
  'nav.home': { fr: 'Accueil', en: 'Home' },
  'nav.stay': { fr: 'Séjour', en: 'Stay' },
  'nav.services': { fr: 'Services', en: 'Services' },
  'nav.profile': { fr: 'Profil', en: 'Profile' },
  'nav.concierge': { fr: 'Conciergerie', en: 'Concierge' },
  'nav.boutique': { fr: 'Boutique', en: 'Shop' },
  'nav.requests': { fr: 'Suivi', en: 'Tracking' },
  'nav.messages': { fr: 'Messages', en: 'Messages' },
  'nav.reserve': { fr: 'Réserve', en: 'Wallet' },
  'nav.villa': { fr: 'Villa', en: 'Villa' },

  'portal.loading': { fr: 'Chargement de votre séjour…', en: 'Loading your stay…' },
  'portal.unavailableTitle': { fr: 'Portail indisponible', en: 'Portal unavailable' },
  'portal.unavailableBody': {
    fr: 'Ce lien n\u2019est plus valide. Contactez votre conciergerie.',
    en: 'This link is no longer valid. Please contact your concierge.',
  },
  'portal.disabledTitleLive': { fr: 'Portail momentanément indisponible', en: 'Portal temporarily unavailable' },
  'portal.disabledBodyLive': {
    fr: 'Votre espace séjour sera bientôt disponible. Contactez votre conciergerie pour toute demande.',
    en: 'Your stay space will be available shortly. Contact your concierge for any request.',
  },
  'portal.disabledTitle': { fr: 'Portail désactivé', en: 'Portal disabled' },
  'portal.disabledBody': {
    fr: 'Activez le portail voyageur pour le rendre accessible à vos clients.',
    en: 'Enable the guest portal to make it accessible to your guests.',
  },
  'portal.productNotFound': {
    fr: 'Ce produit n\u2019est plus disponible.',
    en: 'This product is no longer available.',
  },
  'portal.serviceNotFound': {
    fr: 'Cette prestation n\u2019est plus disponible.',
    en: 'This service is no longer available.',
  },

  'home.welcome': { fr: 'Bienvenue', en: 'Welcome' },
  'home.greetingFallback': { fr: 'Bonjour', en: 'Hello' },
  'home.messageFallback': {
    fr: 'Votre équipe My Butlr coordonne chaque demande pour un séjour fluide et discret.',
    en: 'Your My Butlr team coordinates every request for a smooth, discreet stay.',
  },
  'home.activateReserve': { fr: 'Activer la Réserve séjour', en: 'Activate the stay wallet' },
  'home.recommended': { fr: 'Recommandé', en: 'Recommended' },
  'home.reserveAvailable': { fr: 'Solde disponible', en: 'Available balance' },
  'home.reserveManage': { fr: 'Gérer', en: 'Manage' },
  'home.reserveStart': { fr: 'Demander', en: 'Request' },
  'home.pendingRequest': { fr: 'demande à valider', en: 'request to approve' },
  'home.pendingRequests': { fr: 'demandes à valider', en: 'requests to approve' },
  'home.pendingSubtitle': { fr: 'Devis en attente de votre confirmation', en: 'Quotes awaiting your confirmation' },
  'home.yourStay': { fr: 'Explorer', en: 'Explore' },
  'home.concierge': { fr: 'Conciergerie', en: 'Concierge' },
  'home.conciergeSubtitle': {
    fr: 'Chef, transport, bien-être et expériences sur mesure',
    en: 'Chef, transport, wellness and bespoke experiences',
  },
  'home.boutique': { fr: 'Boutique', en: 'Shop' },
  'home.boutiqueSubtitle': { fr: 'Objets physiques livrés à la villa', en: 'Physical items delivered to the villa' },
  'home.messages': { fr: 'Messages', en: 'Messages' },
  'home.messagesUnread': { fr: 'message non lu', en: 'unread message' },
  'home.messagesUnreadPlural': { fr: 'messages non lus', en: 'unread messages' },
  'home.messagesSubtitleFallback': { fr: 'Échangez avec votre équipe sur place', en: 'Chat with your on-site team' },
  'home.requests': { fr: 'Suivi', en: 'Tracking' },
  'home.requestsSubtitle': {
    fr: 'Commandes boutique et prestations conciergerie',
    en: 'Shop orders and concierge services',
  },
  'home.villa': { fr: 'Villa & guides', en: 'Villa & guides' },
  'home.villaShort': { fr: 'Villa', en: 'Villa' },
  'home.villaSubtitle': {
    fr: 'Accès, Wi-Fi, règles et informations pratiques',
    en: 'Access, Wi-Fi, house rules and practical info',
  },
  'home.reserve': { fr: 'Réserve séjour', en: 'Stay wallet' },
  'home.reserveShort': { fr: 'Réserve', en: 'Wallet' },
  'home.reserveSubtitle': { fr: 'Solde, historique et ajout de fonds', en: 'Balance, history and top-ups' },
  'home.help': { fr: 'Besoin d\u2019aide ?', en: 'Need help?' },
  'home.helpSubtitle': { fr: 'Contacts utiles et urgence 24/7', en: 'Useful contacts and 24/7 emergencies' },
  'home.checkinTitle': { fr: 'Check-in en ligne', en: 'Online check-in' },
  'home.checkinBody': {
    fr: 'Disponible prochainement. Votre équipe vous contactera pour finaliser l\u2019arrivée.',
    en: 'Available soon. Your team will contact you to finalize your arrival.',
  },

  'boutique.title': { fr: 'Boutique', en: 'Shop' },
  'boutique.loading': { fr: 'Chargement de la Boutique…', en: 'Loading the shop…' },
  'boutique.reserveAvailable': { fr: 'Solde Réserve séjour disponible', en: 'Stay wallet balance available' },
  'boutique.welcomeFallback': {
    fr: 'Commandez des produits physiques pour votre villa — paniers, boissons, fleurs, cadeaux et accessoires.',
    en: 'Order physical products for your villa — hampers, drinks, flowers, gifts and accessories.',
  },
  'boutique.search': { fr: 'Rechercher un article', en: 'Search an item' },
  'boutique.noItems': { fr: 'Aucun article disponible pour le moment.', en: 'No items available at the moment.' },
  'boutique.noItemsCategory': { fr: 'Aucun article dans cette catégorie.', en: 'No items in this category.' },
  'boutique.recommended': { fr: 'Recommandés pour vous', en: 'Recommended for you' },
  'boutique.trackOrders': { fr: 'Suivi des commandes', en: 'Order tracking' },
  'boutique.trackOrdersSubtitle': {
    fr: 'Préparation, livraison et historique',
    en: 'Preparation, delivery and history',
  },
  'boutique.cart': { fr: 'Panier', en: 'Cart' },
  'boutique.myCart': { fr: 'Mon panier', en: 'My cart' },
  'boutique.emptyCart': { fr: 'Votre panier est vide.', en: 'Your cart is empty.' },
  'boutique.item': { fr: 'article', en: 'item' },
  'boutique.items': { fr: 'articles', en: 'items' },
  'boutique.estimatedTotal': { fr: 'Total estimé', en: 'Estimated total' },
  'boutique.order': { fr: 'Acheter maintenant', en: 'Buy now' },
  'boutique.addFunds': { fr: 'Ajouter des fonds à ma Réserve séjour', en: 'Add funds to my stay wallet' },
  'boutique.confirmTitle': { fr: 'Confirmation commande', en: 'Order confirmation' },
  'boutique.confirmBody': {
    fr: 'Votre commande a été reçue !',
    en: 'Your order has been received!',
  },
  'boutique.confirmSubtitle': {
    fr: 'Merci, notre équipe va la traiter dans les plus brefs délais.',
    en: 'Thank you, our team will process it as soon as possible.',
  },
  'boutique.total': { fr: 'Total', en: 'Total' },
  'boutique.viewOrders': { fr: 'Voir mes commandes', en: 'View my orders' },
  'boutique.summary': { fr: 'Récapitulatif', en: 'Summary' },
  'boutique.quantity': { fr: 'Quantité', en: 'Quantity' },
  'boutique.debitNotice': {
    fr: 'Votre commande sera débitée de votre Réserve séjour.',
    en: 'Your order will be debited from your stay wallet.',
  },
  'boutique.addToCart': { fr: 'Ajouter au panier', en: 'Add to cart' },
  'boutique.order.step': { fr: 'Commande', en: 'Order' },
  'boutique.deliveryInstructions': { fr: 'Instructions de livraison', en: 'Delivery instructions' },
  'boutique.continue': { fr: 'Continuer', en: 'Continue' },
  'boutique.physicalNotice': {
    fr: 'Ce produit physique sera préparé puis livré à la villa. Le montant est débité de votre Réserve séjour à la commande.',
    en: 'This physical product will be prepared then delivered to the villa. The amount is debited from your stay wallet at checkout.',
  },

  'reserve.title': { fr: 'Réserve séjour', en: 'Stay wallet' },
  'reserve.loading': { fr: 'Chargement de votre Réserve séjour…', en: 'Loading your stay wallet…' },
  'reserve.subtitleSetup': { fr: 'Réglez vos services en toute simplicité', en: 'Pay for your services with ease' },
  'reserve.explainer': {
    fr: 'Votre Réserve séjour permet de régler simplement les services demandés pendant votre séjour. '
      + 'Vous gardez une visibilité complète sur les dépenses, les validations et le solde disponible. '
      + 'Le montant non utilisé peut être remboursé à la fin du séjour.',
    en: 'Your stay wallet lets you easily pay for services requested during your stay. '
      + 'You keep full visibility over spending, approvals and available balance. '
      + 'Any unused amount can be refunded at the end of your stay.',
  },
  'reserve.subtitleActive': { fr: 'Solde et dépenses de votre séjour', en: 'Balance and spending for your stay' },
  'reserve.available': { fr: 'Disponible', en: 'Available' },
  'reserve.committed': { fr: 'engagés', en: 'committed' },
  'reserve.recommendedAmount': { fr: 'Montant recommandé', en: 'Recommended amount' },
  'reserve.recommendedNotice': {
    fr: 'Courses, chef privé, chauffeur, activités et demandes spéciales — le solde non utilisé est remboursable.',
    en: 'Groceries, private chef, driver, activities and special requests — unused balance is refundable.',
  },
  'reserve.activate': { fr: 'Demander l’activation de ma Réserve', en: 'Request stay wallet activation' },
  'reserve.status': { fr: 'Statut', en: 'Status' },
  'reserve.dedicatedEnvelope': { fr: 'Enveloppe dédiée', en: 'Dedicated wallet' },
  'reserve.deposited': { fr: 'Versé', en: 'Deposited' },
  'reserve.spent': { fr: 'Dépensé', en: 'Spent' },
  'reserve.pending': { fr: 'En attente', en: 'Pending' },
  'reserve.pendingApproval': { fr: 'Devis à valider', en: 'Quotes to approve' },
  'reserve.pendingCredits': { fr: 'Crédits en attente de validation', en: 'Credits awaiting villa confirmation' },
  'reserve.pendingCreditStatus': { fr: 'Demande envoyée à la villa', en: 'Request sent to the villa' },
  'reserve.approveExpense': { fr: 'Valider cette dépense', en: 'Approve this expense' },
  'requests.approveQuote': { fr: 'Valider ce devis', en: 'Approve this quote' },
  'reserve.addFundsTitle': { fr: 'Demander des fonds', en: 'Request funds' },
  'reserve.add': { fr: 'Demander', en: 'Request' },
  'reserve.addFundsNotice': {
    fr: 'Votre demande de crédit est envoyée à la villa. Le solde n’est crédité qu’après validation.',
    en: 'Your credit request is sent to the villa. The balance is credited only after confirmation.',
  },
  'boutique.insufficientBalance': {
    fr: 'Solde insuffisant pour cette commande.',
    en: 'Insufficient balance for this order.',
  },
  'boutique.requestFunds': { fr: 'Demander des fonds', en: 'Request funds' },
  'reserve.requestConcierge': { fr: 'Demander une prestation conciergerie', en: 'Request a concierge service' },
  'reserve.requestInProgress': { fr: 'demande en cours', en: 'request in progress' },
  'reserve.requestsInProgress': { fr: 'demandes en cours', en: 'requests in progress' },
  'reserve.viewTracking': { fr: 'Voir le suivi complet', en: 'View full tracking' },
  'reserve.history': { fr: 'Historique', en: 'History' },

  'messages.loading': { fr: 'Chargement de la messagerie…', en: 'Loading messages…' },
  'messages.disabled': {
    fr: 'La messagerie n\u2019est pas disponible pour ce séjour.',
    en: 'Messaging is not available for this stay.',
  },
  'messages.startConversation': { fr: 'Démarrez la conversation', en: 'Start the conversation' },
  'messages.houseManagerReply': {
    fr: 'Votre house manager vous répond directement, 7j/7.',
    en: 'Your house manager replies directly, 7 days a week.',
  },
  'messages.conciergeReply': {
    fr: 'Votre conciergerie vous répond directement, 7j/7.',
    en: 'Your concierge replies directly, 7 days a week.',
  },
  'messages.dictationLanguage': { fr: 'Langue dictée', en: 'Dictation language' },
  'messages.placeholder': { fr: 'Votre message…', en: 'Your message…' },
  'messages.previewNotice': {
    fr: 'Aperçu — la messagerie sera active pour vos voyageurs.',
    en: 'Preview — messaging will be active for your guests.',
  },
  'messages.today': { fr: 'Aujourd\u2019hui', en: 'Today' },
  'messages.yesterday': { fr: 'Hier', en: 'Yesterday' },

  'requests.title': { fr: 'Suivi', en: 'Tracking' },
  'requests.subtitle': { fr: 'Commandes et prestations', en: 'Orders and services' },
  'requests.active': { fr: 'En cours', en: 'In progress' },
  'requests.done': { fr: 'Terminées', en: 'Completed' },
  'requests.noneActive': { fr: 'Aucune demande en cours.', en: 'No requests in progress.' },
  'requests.noneDone': { fr: 'Aucune demande terminée.', en: 'No completed requests.' },
  'requests.contactTeam': { fr: 'Contacter votre équipe', en: 'Contact your team' },
  'requests.needHelp': { fr: 'Besoin d\u2019aide ?', en: 'Need help?' },
} as const

export type GuestDictionaryKey = keyof typeof GUEST_DICTIONARY

/**
 * Traduit une clé de l'interface voyageur selon la langue du séjour
 * (`reservation.guest_language`). Retombe sur le français par défaut.
 */
export function tGuest(key: GuestDictionaryKey, guestLanguage?: string | null): string {
  const locale = normalizeGuestLocale(guestLanguage)
  const entry = GUEST_DICTIONARY[key]
  if (!entry) return key
  return entry[locale] ?? entry.fr
}
