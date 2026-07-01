/**
 * AI Service Layer for My Butlr
 *
 * Mock implementation that simulates AI responses.
 * Replace with real API calls (OpenAI, Anthropic, etc.) via Supabase Edge Functions.
 *
 * To connect a real LLM:
 * 1. Create a Supabase Edge Function (e.g. `supabase/functions/ai-assistant`)
 * 2. Set OPENAI_API_KEY in the Edge Function secrets
 * 3. Replace the mock functions below with fetch calls to your Edge Function
 */

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface AiSuggestion {
  id: string
  type: 'task' | 'reply' | 'insight' | 'service'
  title: string
  description: string
  confidence: number
  action?: () => void
}

export interface AiInsight {
  id: string
  category: 'revenue' | 'occupancy' | 'guest' | 'maintenance' | 'opportunity'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  actionLabel?: string
  actionRoute?: string
}

// Simulated delay to mimic API call
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Generate a unique ID
function uid(): string {
  return `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * AI Assistant - General chat
 */
export async function chatWithAssistant(
  messages: AiMessage[],
  _context?: { properties?: string[]; role?: string }
): Promise<string> {
  await delay(800 + Math.random() * 1200)

  const lastMsg = messages[messages.length - 1]?.content.toLowerCase() ?? ''

  if (lastMsg.includes('arrivée') || lastMsg.includes('arrival') || lastMsg.includes('check-in')) {
    return "Pour préparer l'arrivée du guest, je vous recommande de :\n\n1. Vérifier que le ménage est planifié la veille\n2. Préparer le welcome pack (fleurs, bouteille, carte de bienvenue)\n3. Envoyer les instructions d'accès 24h avant\n4. Confirmer le transfert aéroport si réservé\n\nVoulez-vous que je crée ces tâches automatiquement ?"
  }

  if (lastMsg.includes('service') || lastMsg.includes('prestation')) {
    return "Basé sur le profil du guest et la saison, je suggère de proposer :\n\n• **Chef privé** — très demandé en haute saison\n• **Yacht charter** — si la propriété est côtière\n• **Massage/Spa** — taux d'acceptation de 65%\n• **Transfert aéroport** — quasi systématique\n\nJe peux pré-remplir une proposition de services personnalisée."
  }

  if (lastMsg.includes('tâche') || lastMsg.includes('task') || lastMsg.includes('todo')) {
    return "Voici les tâches prioritaires que je détecte :\n\n🔴 **Urgent** : Départ demain Villa Paradiso — ménage à planifier\n🟡 **Aujourd'hui** : Check-in 16h — préparer clés + welcome pack\n🟢 **Cette semaine** : Maintenance piscine programmée jeudi\n\nJe peux créer ces tâches et les assigner automatiquement."
  }

  if (lastMsg.includes('revenu') || lastMsg.includes('revenue') || lastMsg.includes('argent') || lastMsg.includes('money')) {
    return "Analyse de vos revenus :\n\n📈 **+12%** vs mois dernier\n💰 **Revenu moyen/nuit** : 850€\n🏆 **Meilleure propriété** : Villa Azure (taux d'occupation 89%)\n\n**Recommandation** : Augmenter le tarif de 10% sur les weekends de juillet — la demande est forte et vous êtes en dessous du marché."
  }

  if (lastMsg.includes('message') || lastMsg.includes('répondre') || lastMsg.includes('reply')) {
    return "Je peux vous aider à rédiger des réponses professionnelles et chaleureuses. Envoyez-moi le message du guest et je vous proposerai une réponse adaptée à votre style de communication luxe."
  }

  if (lastMsg.includes('contrat') || lastMsg.includes('contract')) {
    return "Je peux vous aider avec les contrats :\n\n• **Générer** un contrat pré-rempli basé sur la réservation\n• **Vérifier** les clauses manquantes\n• **Suggérer** des conditions spéciales selon le type de séjour\n\nQuel type de contrat souhaitez-vous préparer ?"
  }

  return "Je suis votre assistant IA Butlr. Je peux vous aider avec :\n\n• 📋 **Gestion des tâches** — suggestions et automatisation\n• 💬 **Messages** — rédaction de réponses guests\n• 📊 **Analyses** — insights revenus et occupation\n• 🛎️ **Services** — recommandations personnalisées\n• 📄 **Contrats** — génération et vérification\n\nQue puis-je faire pour vous ?"
}

/**
 * Generate smart reply suggestions for guest messages
 */
export async function generateReplySuggestions(
  guestMessage: string,
  context?: { guestName?: string; propertyName?: string; role?: string }
): Promise<string[]> {
  await delay(600 + Math.random() * 800)

  const msg = guestMessage.toLowerCase()
  const name = context?.guestName ?? 'Guest'

  if (msg.includes('heure') || msg.includes('time') || msg.includes('check-in') || msg.includes('arrivée')) {
    return [
      `Bonjour ${name}, le check-in est prévu à partir de 16h. Si vous souhaitez arriver plus tôt, n'hésitez pas à me le faire savoir et je ferai mon possible pour vous accueillir.`,
      `Cher ${name}, vous êtes attendu(e) à partir de 16h. Un transfert depuis l'aéroport peut être organisé si nécessaire. À bientôt !`,
      `${name}, bienvenue ! L'accès est possible dès 16h. Je vous enverrai les codes et instructions d'accès la veille de votre arrivée.`,
    ]
  }

  if (msg.includes('restaurant') || msg.includes('manger') || msg.includes('dîner') || msg.includes('dinner')) {
    return [
      `${name}, je vous recommande Le Petit Nice pour la gastronomie méditerranéenne ou La Vague d'Or pour une expérience étoilée. Souhaitez-vous que je réserve une table ?`,
      `Avec plaisir ! Je peux également organiser un chef privé directement dans votre villa pour une expérience plus intimiste. Qu'est-ce qui vous ferait plaisir ?`,
      `Je vous prépare une sélection de restaurants selon vos préférences. Cuisine française, italienne, ou fruits de mer ? Et pour combien de personnes ?`,
    ]
  }

  if (msg.includes('problème') || msg.includes('problem') || msg.includes('panne') || msg.includes('broken')) {
    return [
      `${name}, je suis navré(e) pour ce désagrément. Notre équipe technique est prévenue et interviendra dans l'heure. Puis-je faire autre chose pour vous ?`,
      `Merci de nous avoir signalé ce problème, ${name}. Je dispatche immédiatement un technicien. En attendant, n'hésitez pas à me contacter pour quoi que ce soit.`,
      `${name}, toutes mes excuses pour cette gêne. Je prends en charge la résolution immédiatement et vous tiendrai informé(e) de l'avancement.`,
    ]
  }

  if (msg.includes('merci') || msg.includes('thank') || msg.includes('parfait') || msg.includes('super')) {
    return [
      `C'est un plaisir, ${name} ! N'hésitez pas si vous avez besoin de quoi que ce soit d'autre. Profitez bien de votre séjour.`,
      `Ravi(e) que tout vous convienne, ${name}. Je reste disponible 24/7 pour rendre votre séjour encore plus agréable.`,
      `Merci à vous, ${name} ! Si vous souhaitez découvrir nos services premium (spa, yacht, chef privé), je serai heureux(se) de vous renseigner.`,
    ]
  }

  return [
    `Bonjour ${name}, merci pour votre message. Je m'en occupe immédiatement et reviens vers vous dans les plus brefs délais.`,
    `${name}, bien reçu ! Je me renseigne et vous donne une réponse complète très rapidement.`,
    `Cher ${name}, avec plaisir. Laissez-moi vérifier cela et je vous recontacte dans l'heure.`,
  ]
}

/**
 * Generate AI task suggestions based on reservations
 */
export async function generateTaskSuggestions(
  reservations: Array<{ guest_name: string; arrival: string; departure: string; property_name?: string; status: string }>,
  existingTasks: Array<{ title: string; status: string }>
): Promise<AiSuggestion[]> {
  await delay(500 + Math.random() * 700)

  const suggestions: AiSuggestion[] = []
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const inThreeDays = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]

  for (const res of reservations) {
    if (res.status === 'cancelled') continue
    const propName = res.property_name ?? 'la propriété'

    // Arrival tomorrow - prepare check-in
    if (res.arrival === tomorrow) {
      const taskExists = existingTasks.some(t =>
        t.title.toLowerCase().includes('check-in') && t.title.includes(res.guest_name)
      )
      if (!taskExists) {
        suggestions.push({
          id: uid(),
          type: 'task',
          title: `Préparer check-in ${res.guest_name}`,
          description: `Arrivée demain à ${propName}. Préparer welcome pack, vérifier ménage, envoyer instructions d'accès.`,
          confidence: 0.95,
        })
      }
    }

    // Departure today - schedule cleaning
    if (res.departure === today) {
      const taskExists = existingTasks.some(t =>
        t.title.toLowerCase().includes('ménage') && t.title.includes(res.guest_name)
      )
      if (!taskExists) {
        suggestions.push({
          id: uid(),
          type: 'task',
          title: `Ménage départ ${res.guest_name}`,
          description: `Départ aujourd'hui de ${propName}. Planifier ménage complet + inventaire.`,
          confidence: 0.98,
        })
      }
    }

    // Arrival in 3 days - send pre-arrival info
    if (res.arrival === inThreeDays) {
      suggestions.push({
        id: uid(),
        type: 'task',
        title: `Envoyer infos pré-séjour à ${res.guest_name}`,
        description: `Arrivée dans 3 jours. Envoyer guide de la propriété, recommandations locales et proposer services additionnels.`,
        confidence: 0.85,
      })
    }
  }

  // Generic suggestions if no specific ones
  if (suggestions.length === 0) {
    suggestions.push({
      id: uid(),
      type: 'task',
      title: 'Vérification hebdomadaire des propriétés',
      description: 'Contrôle routine : piscine, jardins, stocks consommables, état général.',
      confidence: 0.7,
    })
  }

  return suggestions
}

/**
 * Generate AI insights for the dashboard
 */
export async function generateDashboardInsights(
  data: {
    occupancyRate: number
    revenue: number
    previousRevenue: number
    upcomingArrivals: number
    pendingTasks: number
    propertiesCount: number
  }
): Promise<AiInsight[]> {
  await delay(400 + Math.random() * 600)

  const insights: AiInsight[] = []
  const revenueGrowth = data.previousRevenue > 0
    ? ((data.revenue - data.previousRevenue) / data.previousRevenue) * 100
    : 0

  if (data.occupancyRate > 80) {
    insights.push({
      id: uid(),
      category: 'revenue',
      title: 'Opportunité tarifaire détectée',
      description: `Taux d'occupation à ${data.occupancyRate}%. Envisagez une augmentation de 10-15% sur les dates à forte demande.`,
      priority: 'high',
      actionLabel: 'Voir les propriétés',
      actionRoute: '/app/properties',
    })
  }

  if (data.occupancyRate < 40) {
    insights.push({
      id: uid(),
      category: 'occupancy',
      title: 'Occupation basse détectée',
      description: `Seulement ${data.occupancyRate}% d'occupation. Considérez des promotions ou activez de nouveaux canaux de distribution.`,
      priority: 'high',
      actionLabel: 'Gérer les réservations',
      actionRoute: '/app/reservations',
    })
  }

  if (revenueGrowth > 10) {
    insights.push({
      id: uid(),
      category: 'revenue',
      title: 'Revenus en hausse',
      description: `+${revenueGrowth.toFixed(0)}% vs période précédente. La stratégie tarifaire fonctionne bien.`,
      priority: 'low',
    })
  } else if (revenueGrowth < -10) {
    insights.push({
      id: uid(),
      category: 'revenue',
      title: 'Baisse de revenus',
      description: `${revenueGrowth.toFixed(0)}% vs période précédente. Analysez les causes : saisonnalité, pricing, ou concurrence ?`,
      priority: 'high',
      actionLabel: 'Voir les rapports',
      actionRoute: '/app/reports',
    })
  }

  if (data.upcomingArrivals > 0) {
    insights.push({
      id: uid(),
      category: 'guest',
      title: `${data.upcomingArrivals} arrivée(s) cette semaine`,
      description: 'Vérifiez que les check-ins sont préparés : ménage, welcome pack, instructions d\'accès.',
      priority: 'medium',
      actionLabel: 'Voir les tâches',
      actionRoute: '/app/tasks',
    })
  }

  if (data.pendingTasks > 5) {
    insights.push({
      id: uid(),
      category: 'maintenance',
      title: `${data.pendingTasks} tâches en attente`,
      description: 'Le volume de tâches ouvertes augmente. Priorisez celles liées aux arrivées imminentes.',
      priority: 'medium',
      actionLabel: 'Gérer les tâches',
      actionRoute: '/app/tasks',
    })
  }

  // Always add a general insight
  insights.push({
    id: uid(),
    category: 'opportunity',
    title: 'Suggestion upsell',
    description: 'Les guests actuels n\'ont pas encore réservé de services premium. Envoyez-leur une proposition personnalisée (chef privé, spa, excursions).',
    priority: 'low',
    actionLabel: 'Voir les services',
    actionRoute: '/app/services',
  })

  return insights
}

/**
 * Generate a service recommendation for a specific guest
 */
export async function generateServiceRecommendations(
  guestContext: { name: string; stayDuration: number; propertyType: string }
): Promise<AiSuggestion[]> {
  await delay(500 + Math.random() * 500)

  const suggestions: AiSuggestion[] = []

  if (guestContext.stayDuration >= 7) {
    suggestions.push({
      id: uid(),
      type: 'service',
      title: 'Chef privé (dîner)',
      description: `Séjour de ${guestContext.stayDuration} nuits — proposez un dîner privé pour une expérience mémorable.`,
      confidence: 0.88,
    })
  }

  if (guestContext.propertyType === 'villa' || guestContext.propertyType === 'yacht') {
    suggestions.push({
      id: uid(),
      type: 'service',
      title: 'Service spa à domicile',
      description: 'Massage et soins directement dans la propriété — très demandé pour les villas.',
      confidence: 0.82,
    })
  }

  suggestions.push({
    id: uid(),
    type: 'service',
    title: 'Transfert aéroport VIP',
    description: 'Service de transfert avec chauffeur privé — taux de conversion de 72%.',
    confidence: 0.91,
  })

  return suggestions
}
