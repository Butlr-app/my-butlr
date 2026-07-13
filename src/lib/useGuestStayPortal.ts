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
  type StayMessagingPayload,
} from '@/lib/stayMessaging'

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
}

export function useGuestStayPortal(token: string | undefined) {
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

    if (rpcError || !payload || (payload as { error?: string }).error) {
      setError('Portail introuvable ou séjour expiré.')
      setData(null)
      setLoading(false)
      return
    }

    const raw = payload as Record<string, unknown>
    const reservation = raw.reservation as GuestStayPortalData['reservation']
    const settingsRaw = raw.settings as GuestPortalSettings | null
    let boutique = { categories: [] as CatalogCategory[], items: [] as BoutiqueCatalogEntry[] }
    if (token && (settingsRaw?.show_boutique ?? true)) {
      const { data: catalogData } = await fetchGuestBoutiqueCatalog(token)
      boutique = catalogData
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

    let messaging = parseStayMessagingPayload(raw.messaging as Record<string, unknown>)
    if (token && (settingsRaw?.show_messaging ?? true)) {
      const { data: messagingData } = await guestGetStayMessages(token)
      if (messagingData.enabled) messaging = messagingData
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
    if (portalError || !portalPayload || (portalPayload as { error?: string }).error) return

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

  // Poll for new staff messages (guests use the anon client and cannot rely on
  // realtime, which is gated by RLS). Also refresh when the tab regains focus.
  useEffect(() => {
    if (!token || !messagingEnabled) return
    const interval = window.setInterval(refreshMessaging, 15000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshMessaging()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [token, messagingEnabled, refreshMessaging])

  // Poll Suivi (commandes boutique + demandes conciergerie + solde réserve).
  useEffect(() => {
    if (!token) return
    const interval = window.setInterval(refreshTracking, 30000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshTracking()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [token, refreshTracking])

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
      throw new Error('Impossible d’activer la Réserve séjour.')
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
      throw new Error('Versement impossible.')
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

  const sendMessage = async (body: string) => {
    if (!token) throw new Error('Session invalide.')
    const { data: result, error } = await guestSendStayMessage(token, body)
    if (error) throw new Error(error.message)
    if ((result as { error?: string })?.error) {
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
    approveRequest,
    checkoutBoutique,
    approveStoreQuote,
    sendMessage,
    markMessagesRead,
  }
}
