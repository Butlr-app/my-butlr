import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  cartEstimatedTotal,
  fetchPropertyBoutiqueCatalog,
  type BoutiqueCartLine,
  type BoutiqueCatalogEntry,
  type CatalogCategory,
  type StoreOrder,
  type StoreOrderItem,
} from '@/lib/boutique'
import type { ReserveTransaction, StayReserve, StayServiceRequest } from '@/lib/stayReserve'
import type { StayMessage, StayMessageInput, StayMessagingPayload } from '@/lib/stayMessaging'

const PREVIEW_RESERVATION_ID = 'preview-reservation'
const PREVIEW_RECOMMENDED_AMOUNT = 3000

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Simulation locale (aucun appel réseau d'écriture) permettant à l'owner de
 * cliquer à travers le portail voyageur en aperçu : activation de la Réserve
 * séjour, panier boutique, demandes conciergerie et messagerie.
 */
export function useGuestPortalPreviewSimulation(propertyId?: string | null) {
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [catalog, setCatalog] = useState<BoutiqueCatalogEntry[]>([])
  const [catalogLoading, setCatalogLoading] = useState(Boolean(propertyId))

  useEffect(() => {
    if (!propertyId) {
      setCatalogLoading(false)
      return
    }
    let cancelled = false
    setCatalogLoading(true)
    fetchPropertyBoutiqueCatalog(propertyId).then(({ data }) => {
      if (cancelled) return
      setCategories(data.categories)
      setCatalog(data.items)
      setCatalogLoading(false)
    })
    return () => { cancelled = true }
  }, [propertyId])

  const [reserve, setReserve] = useState<StayReserve | null>(null)
  const [requests, setRequests] = useState<StayServiceRequest[]>([])
  const [transactions, setTransactions] = useState<ReserveTransaction[]>([])
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([])
  const [storeOrderItems, setStoreOrderItems] = useState<StoreOrderItem[]>([])
  const [messages, setMessages] = useState<StayMessage[]>([])

  const makeReserve = useCallback((amount: number): StayReserve => ({
    id: makeId('preview-reserve'),
    reservation_id: PREVIEW_RESERVATION_ID,
    property_id: propertyId ?? '',
    client_id: null,
    currency: 'EUR',
    recommended_amount: PREVIEW_RECOMMENDED_AMOUNT,
    initial_amount: amount,
    current_balance: amount,
    spent_amount: 0,
    pending_amount: 0,
    status: 'funded',
    approval_mode: 'auto_under_limit',
    auto_approval_limit: 300,
    notification_before_spending: true,
    created_at: nowIso(),
    updated_at: nowIso(),
    closed_at: null,
  }), [propertyId])

  const createReserve = useCallback(async (amount: number) => {
    setReserve(makeReserve(amount))
  }, [makeReserve])

  const topUp = useCallback(async (amount: number) => {
    setReserve(current => current ? {
      ...current,
      initial_amount: current.initial_amount + amount,
      current_balance: current.current_balance + amount,
      status: 'funded',
      updated_at: nowIso(),
    } : makeReserve(amount))
    setTransactions(current => [{
      id: makeId('preview-tx'),
      stay_reserve_id: reserve?.id ?? 'preview-reserve',
      service_request_id: null,
      type: 'top_up',
      amount,
      currency: 'EUR',
      status: 'completed',
      description: 'Versement (aperçu)',
      created_at: nowIso(),
    }, ...current])
  }, [makeReserve, reserve?.id])

  const createRequest = useCallback(async (input: {
    category: string
    title: string
    description: string
    requestedDate?: string
    estimatedAmount?: number
    propertyServiceId?: string
    providerName?: string
  }) => {
    const request: StayServiceRequest = {
      id: makeId('preview-request'),
      reservation_id: PREVIEW_RESERVATION_ID,
      stay_reserve_id: reserve?.id ?? 'preview-reserve',
      property_id: propertyId ?? '',
      category: input.category,
      title: input.title,
      description: input.description || null,
      requested_date: input.requestedDate ?? null,
      urgency: 'normal',
      status: 'waiting_client_approval',
      estimated_amount: input.estimatedAmount ?? null,
      final_amount: input.estimatedAmount ?? null,
      provider_name: input.providerName ?? null,
      property_service_id: input.propertyServiceId ?? null,
      approved_at: null,
      completed_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    setRequests(current => [request, ...current])
  }, [propertyId, reserve?.id])

  const bookDirectService = useCallback(async (input: {
    propertyServiceId: string
    quantity?: number
    requestedDate?: string
    clientNotes?: string
    selectedOptions?: Record<string, string>
  }) => {
    const selectedEntries = Object.entries(input.selectedOptions ?? {})
    const optionExtra = selectedEntries.length * 0
    const amount = (120 + optionExtra) * Math.max(1, input.quantity ?? 1)
    if (!reserve || Number(reserve.current_balance) < amount) {
      throw new Error('Solde insuffisant sur votre Réserve séjour.')
    }
    const optionsSummary = selectedEntries
      .map(([groupId, choiceId]) => `${groupId} : ${choiceId}`)
      .join('\n')
    const description = [input.clientNotes?.trim(), optionsSummary]
      .filter(Boolean)
      .join('\n\n') || null
    const nextBalance = Number(reserve.current_balance) - amount
    setReserve(current => current ? {
      ...current,
      current_balance: nextBalance,
      pending_amount: Number(current.pending_amount) + amount,
      updated_at: nowIso(),
    } : current)
    setRequests(current => [{
      id: makeId('preview-direct'),
      reservation_id: PREVIEW_RESERVATION_ID,
      stay_reserve_id: reserve.id,
      property_id: propertyId ?? '',
      category: 'special',
      title: 'Prestation (aperçu achat direct)',
      description,
      requested_date: input.requestedDate ?? null,
      urgency: 'normal',
      status: 'approved',
      estimated_amount: amount,
      final_amount: amount,
      provider_name: null,
      property_service_id: input.propertyServiceId,
      selected_options: Object.fromEntries(
        selectedEntries.map(([groupId, choiceId]) => [
          groupId,
          { id: choiceId, label: choiceId, group_label: groupId, price: 0 },
        ]),
      ),
      approved_at: nowIso(),
      completed_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    }, ...current])
    setTransactions(current => [{
      id: makeId('preview-tx'),
      stay_reserve_id: reserve.id,
      service_request_id: null,
      type: 'authorization',
      amount,
      currency: 'EUR',
      status: 'completed',
      description: 'Achat direct (aperçu)',
      created_at: nowIso(),
    }, ...current])
  }, [propertyId, reserve])

  const approveRequest = useCallback(async (requestId: string) => {
    setRequests(current => current.map(request =>
      request.id === requestId
        ? { ...request, status: 'approved', approved_at: nowIso(), updated_at: nowIso() }
        : request,
    ))
    const request = requests.find(r => r.id === requestId)
    const amount = Number(request?.final_amount ?? request?.estimated_amount ?? 0)
    if (amount > 0) {
      setReserve(current => current ? {
        ...current,
        current_balance: Math.max(0, current.current_balance - amount),
        pending_amount: current.pending_amount + amount,
        updated_at: nowIso(),
      } : current)
    }
  }, [requests])

  const checkout = useCallback(async (
    lines: BoutiqueCartLine[],
    _paymentMethod: 'stay_reserve' | 'card',
    notes?: string,
  ) => {
    const { total } = cartEstimatedTotal(lines, catalog)
    const orderId = makeId('preview-order')
    const order: StoreOrder = {
      id: orderId,
      reservation_id: PREVIEW_RESERVATION_ID,
      stay_reserve_id: reserve?.id ?? null,
      property_id: propertyId ?? '',
      status: 'paid',
      payment_method: 'stay_reserve',
      subtotal_amount: total,
      total_amount: total,
      paid_amount: total,
      currency: 'EUR',
      client_notes: notes ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
      completed_at: null,
    }
    const items: StoreOrderItem[] = lines.map(line => {
      const entry = catalog.find(e => e.item.id === line.catalogItemId)
      const unitPrice = entry?.assignment.custom_price ?? entry?.item.base_price ?? 0
      return {
        id: makeId('preview-order-item'),
        order_id: orderId,
        catalog_item_id: line.catalogItemId,
        type: 'product',
        title_snapshot: entry?.item.title ?? 'Article',
        description_snapshot: entry?.item.short_description ?? null,
        quantity: line.quantity,
        unit_price: unitPrice,
        total_price: unitPrice * line.quantity,
        price_type: 'fixed_price',
        provider_name: null,
        scheduled_date: null,
        status: 'paid',
        requires_quote: false,
        client_notes: line.clientNotes ?? null,
        quoted_amount: null,
        created_at: nowIso(),
      }
    })
    setStoreOrders(current => [order, ...current])
    setStoreOrderItems(current => [...items, ...current])
    setReserve(current => current ? {
      ...current,
      current_balance: Math.max(0, current.current_balance - total),
      spent_amount: current.spent_amount + total,
      updated_at: nowIso(),
    } : current)
  }, [catalog, propertyId, reserve?.id])

  const approveQuote = useCallback(async (orderItemId: string) => {
    setStoreOrderItems(current => current.map(item =>
      item.id === orderItemId ? { ...item, status: 'approved' } : item,
    ))
  }, [])

  const messaging: StayMessagingPayload = useMemo(() => ({
    enabled: true,
    conversation: null,
    contact: { role: 'house_manager', full_name: 'Camille (aperçu)', email: null, phone: null, avatar_url: null },
    messages,
    unreadCount: 0,
  }), [messages])

  const onSend = useCallback(async (input: StayMessageInput) => {
    const guestMessage: StayMessage = {
      id: makeId('preview-message'),
      conversation_id: 'preview-conversation',
      sender_type: 'guest',
      sender_user_id: null,
      body: input.body ?? null,
      message_type: input.messageType ?? 'text',
      payload: input.payload ?? {},
      read_at: nowIso(),
      created_at: nowIso(),
    }
    setMessages(current => [...current, guestMessage])
    window.setTimeout(() => {
      setMessages(current => [...current, {
        id: makeId('preview-reply'),
        conversation_id: 'preview-conversation',
        sender_type: 'staff',
        sender_user_id: null,
        body: 'Message reçu — ceci est un aperçu, aucune notification n\u2019est envoyée.',
        message_type: 'text',
        payload: {},
        read_at: null,
        created_at: nowIso(),
      }])
    }, 600)
  }, [])

  return {
    reservationContext: {
      reservationId: PREVIEW_RESERVATION_ID,
      propertyId: propertyId ?? '',
      arrival: toDateOnly(new Date()),
      departure: toDateOnly(new Date(Date.now() + 7 * 86_400_000)),
      interactive: true,
    },
    boutiqueOverride: {
      categories,
      catalog,
      orders: storeOrders,
      orderItems: storeOrderItems,
      loading: catalogLoading,
      checkout,
      approveQuote,
    },
    stayReserveOverride: {
      reserve,
      requests,
      transactions,
      recommendedAmount: PREVIEW_RECOMMENDED_AMOUNT,
      loading: false,
      createReserve,
      topUp,
      createRequest,
      bookDirectService,
      approveRequest,
    },
    messagingOverride: {
      messaging,
      loading: false,
      onSend,
      onMarkRead: () => {},
    },
  }
}
