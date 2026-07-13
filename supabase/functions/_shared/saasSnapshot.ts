// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface SaasSnapshot {
  generatedAt: string
  properties: {
    count: number
    names: string[]
  }
  reservations: {
    total: number
    inHouse: number
    arrivingThisWeek: number
    departingThisWeek: number
    pending: number
    awaitingContract: number
    nextArrivals: Array<{
      guestName: string
      propertyName: string | null
      arrival: string
      departure: string
    }>
  }
  stayReserve: {
    activeWallets: number
    totalBalance: number
    currency: string
  }
  concierge: {
    pendingQuotes: number
    openRequests: number
  }
  boutique: {
    activeOrders: number
    pendingQuotes: number
  }
  messaging: {
    openConversations: number
    unreadFromGuests: number
  }
  tasks: {
    open: number
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

async function getAccessiblePropertyIds(admin: SupabaseClient, userId: string): Promise<string[]> {
  const [{ data: owned }, { data: assigned }] = await Promise.all([
    admin.from('properties').select('id').eq('owner_id', userId),
    admin.from('role_assignments').select('property_id').eq('user_id', userId),
  ])
  const ids = new Set<string>()
  for (const row of owned ?? []) ids.add(row.id)
  for (const row of assigned ?? []) ids.add(row.property_id)
  return [...ids]
}

const emptySnapshot = (): SaasSnapshot => ({
  generatedAt: new Date().toISOString(),
  properties: { count: 0, names: [] },
  reservations: {
    total: 0,
    inHouse: 0,
    arrivingThisWeek: 0,
    departingThisWeek: 0,
    pending: 0,
    awaitingContract: 0,
    nextArrivals: [],
  },
  stayReserve: { activeWallets: 0, totalBalance: 0, currency: 'EUR' },
  concierge: { pendingQuotes: 0, openRequests: 0 },
  boutique: { activeOrders: 0, pendingQuotes: 0 },
  messaging: { openConversations: 0, unreadFromGuests: 0 },
  tasks: { open: 0 },
})

export function needsLiveData(message: string): boolean {
  return /combien|nombre|total|stat|résumé|resume|summary|cette semaine|aujourd'hui|aujourdhui|en cours|arriv|départ|depart|devis|commande|message|non.?lu|solde|propriét|propriet|villa|attente|pending|semaine|données|donnees|chiffre|combien/i
    .test(message)
}

export function formatSnapshotForPrompt(snapshot: SaasSnapshot): string {
  const lines = [
    `Données live (${snapshot.generatedAt.slice(0, 16).replace('T', ' ')} UTC) :`,
    `- Propriétés : ${snapshot.properties.count}${snapshot.properties.names.length ? ` (${snapshot.properties.names.slice(0, 5).join(', ')}${snapshot.properties.names.length > 5 ? '…' : ''})` : ''}`,
    `- Réservations totales (hors annulées) : ${snapshot.reservations.total}`,
    `- En villa aujourd'hui : ${snapshot.reservations.inHouse}`,
    `- Arrivées cette semaine (7 j) : ${snapshot.reservations.arrivingThisWeek}`,
    `- Départs cette semaine (7 j) : ${snapshot.reservations.departingThisWeek}`,
    `- Réservations en attente : ${snapshot.reservations.pending}`,
    `- Contrats en attente de signature : ${snapshot.reservations.awaitingContract}`,
  ]

  if (snapshot.reservations.nextArrivals.length > 0) {
    lines.push('- Prochaines arrivées :')
    for (const r of snapshot.reservations.nextArrivals) {
      lines.push(`  · ${r.guestName} — ${r.propertyName ?? 'Propriété'} (${r.arrival} → ${r.departure})`)
    }
  }

  lines.push(
    `- Réserve séjour : ${snapshot.stayReserve.activeWallets} wallet(s), solde cumulé ${snapshot.stayReserve.totalBalance.toFixed(0)} ${snapshot.stayReserve.currency}`,
    `- Conciergerie : ${snapshot.concierge.pendingQuotes} devis à valider, ${snapshot.concierge.openRequests} demandes ouvertes`,
    `- Boutique : ${snapshot.boutique.activeOrders} commande(s) actives, ${snapshot.boutique.pendingQuotes} devis en attente`,
    `- Messages : ${snapshot.messaging.openConversations} conversation(s), ${snapshot.messaging.unreadFromGuests} message(s) voyageur non lu(s)`,
    `- Tâches ouvertes : ${snapshot.tasks.open}`,
  )

  return lines.join('\n')
}

export async function fetchSaasSnapshot(
  admin: SupabaseClient,
  userId: string,
): Promise<SaasSnapshot> {
  const propertyIds = await getAccessiblePropertyIds(admin, userId)
  if (propertyIds.length === 0) return emptySnapshot()

  const today = todayIso()
  const weekEnd = addDays(today, 6)

  const [
    propertiesResult,
    reservationsResult,
    nextArrivalsResult,
    reservesResult,
    serviceRequestsResult,
    storeOrdersResult,
    conversationsResult,
    tasksResult,
  ] = await Promise.all([
    admin.from('properties').select('name').in('id', propertyIds),
    admin.from('reservations')
      .select('id, status, arrival, departure, contract_status, booking_kind')
      .in('property_id', propertyIds)
      .neq('status', 'cancelled')
      .neq('booking_kind', 'blocked_dates'),
    admin.from('reservations')
      .select('guest_name, arrival, departure, properties(name)')
      .in('property_id', propertyIds)
      .neq('status', 'cancelled')
      .gte('arrival', today)
      .order('arrival', { ascending: true })
      .limit(5),
    admin.from('stay_reserves')
      .select('current_balance, currency, status')
      .in('property_id', propertyIds)
      .not('status', 'in', '("cancelled","closed","refunded")')
      .gt('current_balance', 0),
    admin.from('stay_service_requests')
      .select('id, status')
      .in('property_id', propertyIds),
    admin.from('store_orders')
      .select('id, status')
      .in('property_id', propertyIds)
      .not('status', 'in', '("completed","cancelled","refunded")'),
    admin.from('stay_conversations')
      .select('id')
      .in('property_id', propertyIds)
      .eq('status', 'open'),
    admin.from('tasks')
      .select('id, status')
      .in('property_id', propertyIds)
      .in('status', ['todo', 'in_progress', 'waiting']),
  ])

  const conversationIds = (conversationsResult.data ?? []).map((c: { id: string }) => c.id)
  const storeOrderIds = (storeOrdersResult.data ?? []).map((o: { id: string }) => o.id)

  let unreadFromGuests = 0
  let boutiquePendingQuotes = 0

  if (conversationIds.length > 0) {
    const { count } = await admin
      .from('stay_messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('sender_type', 'guest')
      .is('read_at', null)
    unreadFromGuests = count ?? 0
  }

  if (storeOrderIds.length > 0) {
    const { count } = await admin
      .from('store_order_items')
      .select('id', { count: 'exact', head: true })
      .in('order_id', storeOrderIds)
      .eq('status', 'waiting_client_approval')
    boutiquePendingQuotes = count ?? 0
  }

  const reservations = reservationsResult.data ?? []
  const inHouse = reservations.filter(
    r => r.arrival <= today && r.departure >= today,
  ).length
  const arrivingThisWeek = reservations.filter(
    r => r.arrival >= today && r.arrival <= weekEnd,
  ).length
  const departingThisWeek = reservations.filter(
    r => r.departure >= today && r.departure <= weekEnd,
  ).length
  const pending = reservations.filter(r => r.status === 'pending').length
  const awaitingContract = reservations.filter(r => r.contract_status === 'sent').length

  const reserves = reservesResult.data ?? []
  const totalBalance = reserves.reduce((sum, r) => sum + Number(r.current_balance ?? 0), 0)
  const currency = reserves[0]?.currency ?? 'EUR'

  const serviceRequests = serviceRequestsResult.data ?? []
  const pendingQuotes = serviceRequests.filter(r => r.status === 'waiting_client_approval').length
  const openRequests = serviceRequests.filter(
    r => !['completed', 'cancelled', 'disputed'].includes(r.status),
  ).length

  const storeOrders = storeOrdersResult.data ?? []

  const nextArrivals = (nextArrivalsResult.data ?? []).map((r: any) => ({
    guestName: r.guest_name as string,
    propertyName: r.properties?.name ?? null,
    arrival: r.arrival as string,
    departure: r.departure as string,
  }))

  return {
    generatedAt: new Date().toISOString(),
    properties: {
      count: propertyIds.length,
      names: (propertiesResult.data ?? []).map((p: any) => p.name as string).filter(Boolean),
    },
    reservations: {
      total: reservations.length,
      inHouse,
      arrivingThisWeek,
      departingThisWeek,
      pending,
      awaitingContract,
      nextArrivals,
    },
    stayReserve: {
      activeWallets: reserves.length,
      totalBalance,
      currency,
    },
    concierge: {
      pendingQuotes,
      openRequests,
    },
    boutique: {
      activeOrders: storeOrders.length,
      pendingQuotes: boutiquePendingQuotes,
    },
    messaging: {
      openConversations: conversationsResult.data?.length ?? 0,
      unreadFromGuests,
    },
    tasks: {
      open: tasksResult.data?.length ?? 0,
    },
  }
}

export function dataKeywordFallback(
  message: string,
  snapshot: SaasSnapshot,
  currentPath?: string,
): AssistantResponse | null {
  const q = message.toLowerCase()

  if (/résumé|resume|summary|tableau de bord|situation|état|etat/.test(q)) {
    return {
      reply: [
        `Voici votre situation : ${snapshot.properties.count} propriété(s), ${snapshot.reservations.inHouse} séjour(s) en cours, ${snapshot.reservations.arrivingThisWeek} arrivée(s) cette semaine.`,
        snapshot.concierge.pendingQuotes + snapshot.boutique.pendingQuotes > 0
          ? `${snapshot.concierge.pendingQuotes + snapshot.boutique.pendingQuotes} devis attendent une validation voyageur.`
          : 'Aucun devis en attente côté voyageur.',
        snapshot.messaging.unreadFromGuests > 0
          ? `${snapshot.messaging.unreadFromGuests} message(s) voyageur non lu(s).`
          : 'Messagerie à jour.',
      ].join(' '),
      quickReplies: ['Arrivées cette semaine', 'Messages non lus', 'Devis en attente'],
      actions: [
        { type: 'navigate', path: '/app', label: 'Tableau de bord' },
        { type: 'navigate', path: '/app/reservations', label: 'Réservations' },
      ],
    }
  }

  if (/réservation|reservation|arriv|séjour|sejour|semaine/.test(q)) {
    const next = snapshot.reservations.nextArrivals[0]
    const nextLine = next
      ? ` Prochaine arrivée : ${next.guestName} (${next.arrival}).`
      : ''
    return {
      reply: `${snapshot.reservations.total} réservation(s) au total. ${snapshot.reservations.inHouse} en villa aujourd'hui, ${snapshot.reservations.arrivingThisWeek} arrivée(s) et ${snapshot.reservations.departingThisWeek} départ(s) sur les 7 prochains jours.${nextLine}`,
      quickReplies: ['Voir le calendrier', 'Contrats en attente', 'Résumé complet'],
      actions: [{ type: 'navigate', path: '/app/reservations', label: 'Voir les réservations' }],
    }
  }

  if (/message|messagerie|non.?lu/.test(q)) {
    return {
      reply: snapshot.messaging.unreadFromGuests > 0
        ? `${snapshot.messaging.unreadFromGuests} message(s) voyageur non lu(s) sur ${snapshot.messaging.openConversations} conversation(s) ouverte(s).`
        : `Aucun message voyageur en attente. ${snapshot.messaging.openConversations} conversation(s) ouverte(s).`,
      quickReplies: ['Répondre aux messages', 'Configurer la messagerie', 'Résumé'],
      actions: [{ type: 'navigate', path: '/app/messages', label: 'Ouvrir les messages' }],
    }
  }

  if (/devis|commande|boutique|conciergerie|prestation/.test(q)) {
    return {
      reply: `Boutique : ${snapshot.boutique.activeOrders} commande(s) active(s), ${snapshot.boutique.pendingQuotes} devis à valider. Conciergerie : ${snapshot.concierge.pendingQuotes} devis voyageur en attente, ${snapshot.concierge.openRequests} demande(s) ouverte(s).`,
      quickReplies: ['Commandes boutique', 'Demandes conciergerie', 'Résumé'],
      actions: [
        { type: 'navigate', path: '/app/boutique', label: 'Commandes boutique' },
        { type: 'navigate', path: '/app/stay-reserves', label: 'Suivi conciergerie' },
      ],
    }
  }

  if (/réserve|reserve|solde|wallet/.test(q)) {
    return {
      reply: `${snapshot.stayReserve.activeWallets} Réserve(s) séjour active(s), solde cumulé ${snapshot.stayReserve.totalBalance.toFixed(0)} ${snapshot.stayReserve.currency}.`,
      quickReplies: ['Réservations', 'Paiements', 'Résumé'],
      actions: [{ type: 'navigate', path: '/app/stay-reserves', label: 'Réserve séjour' }],
    }
  }

  if (/propriét|propriet|villa/.test(q)) {
    return {
      reply: `Vous gérez ${snapshot.properties.count} propriété(s)${snapshot.properties.names.length ? ` : ${snapshot.properties.names.join(', ')}` : ''}.`,
      quickReplies: ['Arrivées cette semaine', 'Portail voyageur', 'Résumé'],
      actions: [{ type: 'navigate', path: '/app/properties', label: 'Mes propriétés' }],
    }
  }

  if (/tâche|tache|task/.test(q)) {
    return {
      reply: `${snapshot.tasks.open} tâche(s) ouverte(s) sur vos propriétés.`,
      quickReplies: ['Résumé', 'Réservations', 'Calendrier'],
      actions: [{ type: 'navigate', path: '/app/tasks', label: 'Voir les tâches' }],
    }
  }

  if (/contrat|signature/.test(q)) {
    return {
      reply: `${snapshot.reservations.awaitingContract} contrat(s) en attente de signature voyageur.`,
      quickReplies: ['Voir les contrats', 'Réservations', 'Résumé'],
      actions: [{ type: 'navigate', path: '/app/contracts', label: 'Contrats' }],
    }
  }

  if (needsLiveData(message)) {
    return {
      reply: `Sur vos ${snapshot.properties.count} propriété(s) : ${snapshot.reservations.inHouse} séjour(s) en cours, ${snapshot.reservations.arrivingThisWeek} arrivée(s) cette semaine, ${snapshot.messaging.unreadFromGuests} message(s) non lu(s), ${snapshot.concierge.pendingQuotes + snapshot.boutique.pendingQuotes} devis en attente.`,
      quickReplies: ['Résumé détaillé', 'Messages', 'Réservations'],
      actions: [{ type: 'navigate', path: '/app/reservations', label: 'Réservations' }],
    }
  }

  return null
}

interface AssistantResponse {
  reply: string
  quickReplies?: string[]
  actions?: Array<{ type: 'navigate'; path: string; label: string }>
}
