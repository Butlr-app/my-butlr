import { useCallback, useEffect, useState } from 'react'
import {
  getGuestStayPortal,
  type ReserveTransaction,
  type StayReserve,
  type StayServiceRequest,
} from '@/lib/stayReserve'
import {
  guestApproveStoreQuote,
  guestCheckoutBoutique,
  fetchGuestBoutiqueCatalog,
  parseBoutiqueCatalog,
  type BoutiqueCartLine,
  type BoutiqueCatalogEntry,
  type CatalogCategory,
  type StoreOrder,
  type StoreOrderItem,
} from '@/lib/boutique'
import { supabase } from '@/lib/supabase'
import type { GuestGuide, GuestPortalSettings } from '@/lib/guestPortal'
import type { PropertyServiceItem } from '@/lib/propertyServices'
import { defaultGuestPortalSettings } from '@/lib/guestPortal'
import {
  guestGetStayMessages,
  guestMarkStayMessagesRead,
  guestSendStayMessage,
  parseStayMessagingPayload,
  type StayMessageInput,
  type StayMessagingPayload,
} from '@/lib/stayMessaging'
import { isGuestStayPortalPayloadValid } from '@/lib/guestPortalAccess'
import { tGuest } from '@/lib/guestLanguage'
import {
  fetchGuestRecommendedProperties,
  type RecommendedProperty,
} from '@/lib/postStayMarketplace'
import { getStayPhase } from '@/lib/guestStayPhase'

export interface GuestStayPortalData {
  reservation: {
    id: string
    guest_name: string
    arrival: string
    departure: string
    guests_count: number
    property_id: string
    property_name: string
    property_image_url: string | null
    property_type?: string
    max_guests?: number
    guest_language?: string | null
  }
  settings: GuestPortalSettings
  guides: GuestGuide[]
  propertyServices: PropertyServiceItem[]
  boutiqueCategories: CatalogCategory[]
  boutiqueCatalog: BoutiqueCatalogEntry[]
  storeOrders: StoreOrder[]
  storeOrderItems: StoreOrderItem[]
  reserve: StayReserve | null
  serviceRequests: StayServiceRequest[]
  transactions: ReserveTransaction[]
  recommendedAmount: number
  messaging: StayMessagingPayload
  recommendedProperties: RecommendedProperty[]
}

export function useGuestStayPortal(token: string | undefined, activeTab?: string) {
  const [loading, setLoading] = useState(Boolean(token))
  const [error, setError] = useState('')
  const [data, setData] = useState<GuestStayPortalData | null>(null)

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    const { data: payload, error: rpcError } = await getGuestStayPortal(token)

    if (rpcError || !isGuestStayPortalPayloadValid(payload)) {
      const browserLang = typeof navigator !== 'undefined' ? navigator.language : null
      setError(tGuest('portal.unavailableBody', browserLang))
      setData(null)
      setLoading(false)
      return
    }

    const raw = payload as Record<string, unknown>
    const reservation = raw.reservation as GuestStayPortalData['reservation']

    const settingsRaw = raw.settings as GuestPortalSettings | null
    let boutique = { categories: [] as CatalogCategory[], items: [] as BoutiqueCatalogEntry[] }
    if (token && (settingsRaw?.show_boutique ?? true) && settingsRaw?.enabled !== false) {
      const { data: catalogData, error: catalogError } = await fetchGuestBoutiqueCatalog(token)
      if (!catalogError) boutique = catalogData
    } else {
      boutique = parseBoutiqueCatalog(raw.boutique as { categories: CatalogCategory[]; items: BoutiqueCatalogEntry[] })
    }

    let storeOrders = (raw.store_orders ?? []) as StoreOrder[]
    let storeOrderItems = (raw.store_order_items ?? []) as StoreOrderItem[]
    if (storeOrders.length === 0 && token) {
      const { data: ordersPayload } = await supabase.rpc('guest_get_store_orders', { p_token: token })
      if (ordersPayload && !(ordersPayload as { error?: string }).error) {
        const ordersRaw = ordersPayload as Record<string, unknown>
        storeOrders = (ordersRaw.store_orders ?? []) as StoreOrder[]
        storeOrderItems = (ordersRaw.store_order_items ?? []) as StoreOrderItem[]
      }
    }

    let messaging = await parseStayMessagingPayload(raw.messaging as Record<string, unknown>)
    if (token && (settingsRaw?.show_messaging ?? true)) {
      const { data: messagingData } = await guestGetStayMessages(token)
      if (messagingData.enabled) messaging = messagingData
    }

    let recommendedProperties: RecommendedProperty[] = []
    if (token && getStayPhase(reservation.arrival, reservation.departure) === 'after') {
      const recommendations = await fetchGuestRecommendedProperties(token)
      recommendedProperties = recommendations.data
    }

    setData({
      reservation,
      settings: settingsRaw ?? defaultGuestPortalSettings(reservation.property_id),
      guides: (raw.guides ?? []) as GuestGuide[],
      propertyServices: (raw.property_services ?? []) as PropertyServiceItem[],
      boutiqueCategories: boutique.categories,
      boutiqueCatalog: boutique.items,
      storeOrders,
      storeOrderItems,
      reserve: (raw.reserve as StayReserve | null) ?? null,
      serviceRequests: (raw.service_requests ?? []) as StayServiceRequest[],
      transactions: (raw.transactions ?? []) as ReserveTransaction[],
      recommendedAmount: Number(raw.recommended_amount ?? 3000),
      messaging,
      recommendedProperties,
    })
    setLoading(false)
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const refreshTracking = useCallback(async () => {
    if (!token) return
    const [{ data: ordersPayload }, { data: portalPayload, error: portalError }] = await Promise.all([
      supabase.rpc('guest_get_store_orders', { p_token: token }),
      getGuestStayPortal(token),
    ])
    if (portalError || !isGuestStayPortalPayloadValid(portalPayload)) return
    const raw = portalPayload as Record<string, unknown>

    let storeOrders = (raw.store_orders ?? []) as StoreOrder[]
    let storeOrderItems = (raw.store_order_items ?? []) as StoreOrderItem[]
    if (ordersPayload && !(ordersPayload as { error?: string }).error) {
      const ordersRaw = ordersPayload as Record<string, unknown>
      storeOrders = (ordersRaw.store_orders ?? []) as StoreOrder[]
      storeOrderItems = (ordersRaw.store_order_items ?? []) as StoreOrderItem[]
    }

    setData(prev =>
      prev
        ? {
          ...prev,
          storeOrders,
          storeOrderItems,
          reserve: (raw.reserve as StayReserve | null) ?? prev.reserve,
          serviceRequests: (raw.service_requests ?? []) as StayServiceRequest[],
          transactions: (raw.transactions ?? []) as ReserveTransaction[],
        }
        : prev,
    )
  }, [token])

  // Lightweight messaging refresh (used for polling and after sending).
  const refreshMessaging = useCallback(async () => {
    if (!token) return
    const { data: messagingData } = await guestGetStayMessages(token)
    setData(prev => (prev ? { ...prev, messaging: messagingData } : prev))
  }, [token])

  const messagingEnabled = Boolean(data?.messaging.enabled) && data?.settings.show_messaging !== false

  const messagesTabActive = activeTab === 'messages'
  const trackingTabActive = activeTab === 'requests' || activeTab === 'reserve'

  // Poll for new staff messages (guests use the anon client and cannot rely on
  // realtime, which is gated by RLS). Paused while the tab is hidden, and
  // polls faster while the guest has the Messages tab open.
  useEffect(() => {
    if (!token || !messagingEnabled) return
    const delay = messagesTabActive ? 15000 : 30000
    const tick = () => {
      if (document.hidden) return
      refreshMessaging()
    }
    const interval = window.setInterval(tick, delay)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshMessaging()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [token, messagingEnabled, messagesTabActive, refreshMessaging])

  // Poll Suivi (commandes boutique + demandes conciergerie + solde réserve).
  // Only runs while the guest is looking at Suivi/Réserve, and pauses while
  // the tab is hidden.
  useEffect(() => {
    if (!token || !trackingTabActive) return
    const tick = () => {
      if (document.hidden) return
      refreshTracking()
    }
    const interval = window.setInterval(tick, 30000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshTracking()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [token, trackingTabActive, refreshTracking])

  const markMessagesRead = useCallback(async () => {
    if (!token) return
    setData(prev =>
      prev
        ? {
          ...prev,
          messaging: {
            ...prev.messaging,
            unreadCount: 0,
            messages: prev.messaging.messages.map(m =>
              m.sender_type === 'staff' && !m.read_at
                ? { ...m, read_at: new Date().toISOString() }
                : m,
            ),
          },
        }
        : prev,
    )
    await guestMarkStayMessagesRead(token)
    await refreshMessaging()
  }, [token, refreshMessaging])

  const createReserve = async (amount: number) => {
    if (!token) throw new Error('Session invalide.')
    const { data: result, error } = await supabase.rpc('guest_activate_stay_reserve', {
      p_token: token,
      p_amount: amount,
    })
    if (error) throw new Error(error.message)
    if ((result as { error?: string })?.error) {
      throw new Error('Impossible d’envoyer la demande de crédit.')
    }
    await load()
  }

  const topUp = async (amount: number) => {
    if (!token) throw new Error('Session invalide.')
    const { data: result, error } = await supabase.rpc('guest_top_up_stay_reserve', {
      p_token: token,
      p_amount: amount,
    })
    if (error) throw new Error(error.message)
    if ((result as { error?: string })?.error) {
      throw new Error('Impossible d’envoyer la demande de crédit.')
    }
    await load()
  }

  const createRequest = async (input: {
    category: string
    title: string
    description: string
    requestedDate?: string
    estimatedAmount?: number
    propertyServiceId?: string
    providerName?: string
  }) => {
    if (!token) throw new Error('Session invalide.')
    const { error } = await supabase.rpc('guest_create_stay_service_request', {
      p_token: token,
      p_category: input.category,
      p_title: input.title,
      p_description: input.description,
      p_requested_date: input.requestedDate || null,
      p_estimated_amount: input.estimatedAmount ?? null,
      p_property_service_id: input.propertyServiceId ?? null,
      p_provider_name: input.providerName ?? null,
    })
    if (error) throw new Error(error.message)
    await load()
  }

  const bookDirectService = async (input: {
    propertyServiceId: string
    quantity?: number
    requestedDate?: string
    clientNotes?: string
    selectedOptions?: Record<string, string>
  }) => {
    if (!token) throw new Error('Session invalide.')
    const { data: result, error } = await supabase.rpc('guest_book_concierge_service', {
      p_token: token,
      p_property_service_id: input.propertyServiceId,
      p_quantity: input.quantity ?? 1,
      p_requested_date: input.requestedDate || null,
      p_client_notes: input.clientNotes || null,
      p_selected_options: input.selectedOptions ?? {},
    })
    if (error) throw new Error(error.message)
    const errCode = (result as { error?: string })?.error
    if (errCode === 'insufficient_balance') {
      throw new Error('Solde insuffisant sur votre Réserve séjour.')
    }
    if (errCode === 'quote_only') {
      throw new Error('Ce service est disponible uniquement sur devis.')
    }
    if (errCode === 'missing_options' || errCode === 'invalid_options') {
      throw new Error('Veuillez sélectionner les options du service.')
    }
    if (errCode === 'stay_finished') {
      throw new Error('Les commandes ne sont plus disponibles après le séjour.')
    }
    if (errCode) throw new Error('Commande impossible.')
    await load()
  }

  const approveRequest = async (requestId: string) => {
    if (!token) throw new Error('Session invalide.')
    const { data: result, error } = await supabase.rpc('guest_approve_stay_service_request', {
      p_token: token,
      p_request_id: requestId,
    })
    if (error) throw new Error(error.message)
    const errCode = (result as { error?: string })?.error
    if (errCode === 'insufficient_balance') {
      throw new Error('Solde insuffisant sur votre Réserve séjour.')
    }
    if (errCode) throw new Error('Validation impossible.')
    await load()
  }

  const checkoutBoutique = async (
    lines: BoutiqueCartLine[],
    paymentMethod: 'stay_reserve' | 'card' = 'stay_reserve',
    notes?: string,
  ) => {
    if (!token) throw new Error('Session invalide.')
    const { data: result, error } = await guestCheckoutBoutique(token, lines, paymentMethod, notes)
    if (error) throw new Error(error.message)
    const err = (result as { error?: string })?.error
    if (err === 'insufficient_balance') {
      throw new Error('Solde insuffisant sur votre Réserve séjour.')
    }
    if (err === 'no_reserve') {
      throw new Error('Activez d’abord votre Réserve séjour.')
    }
    if (err) throw new Error('Commande impossible.')
    await load()
  }

  const approveStoreQuote = async (orderItemId: string) => {
    if (!token) throw new Error('Session invalide.')
    const { data: result, error } = await guestApproveStoreQuote(token, orderItemId)
    if (error) throw new Error(error.message)
    const err = (result as { error?: string })?.error
    if (err === 'insufficient_balance') {
      throw new Error('Solde insuffisant sur votre Réserve séjour.')
    }
    if (err) throw new Error('Validation impossible.')
    await load()
  }

  const sendMessage = async (input: StayMessageInput) => {
    if (!token) throw new Error('Session invalide.')
    const { data: result, error } = await guestSendStayMessage(token, input)
    if (error) throw new Error(error.message)
    if ((result as { error?: string })?.error) {
      const code = (result as { error: string }).error
      if (code === 'invalid_message' || code === 'empty_body') {
        throw new Error('Message invalide.')
      }
      throw new Error('Envoi impossible.')
    }
    await refreshMessaging()
  }

  return {
    loading,
    error,
    data,
    reload: load,
    createReserve,
    topUp,
    createRequest,
    bookDirectService,
    approveRequest,
    checkoutBoutique,
    approveStoreQuote,
    sendMessage,
    markMessagesRead,
  }
}
