import { useCallback, useEffect, useState } from 'react'
import {
  approveStayServiceRequest,
  createStayServiceRequest,
  ensureStayReserve,
  fetchReserveTransactions,
  fetchStayReserveByReservation,
  fetchStayServiceRequests,
  nightsBetween,
  recommendStayReserveAmount,
  topUpStayReserve,
  type ReserveTransaction,
  type StayReserve,
  type StayServiceRequest,
} from '@/lib/stayReserve'
import { supabase } from '@/lib/supabase'

interface UseGuestStayReserveOptions {
  reservationId?: string | null
  propertyId?: string | null
  arrival?: string | null
  departure?: string | null
  maxGuests?: number
  propertyType?: string
  enabled?: boolean
}

export function useGuestStayReserve({
  reservationId,
  propertyId,
  arrival,
  departure,
  maxGuests,
  propertyType,
  enabled = true,
}: UseGuestStayReserveOptions) {
  const [loading, setLoading] = useState(Boolean(enabled && reservationId))
  const [reserve, setReserve] = useState<StayReserve | null>(null)
  const [requests, setRequests] = useState<StayServiceRequest[]>([])
  const [transactions, setTransactions] = useState<ReserveTransaction[]>([])

  const recommendedAmount = arrival && departure
    ? recommendStayReserveAmount({
      nights: nightsBetween(arrival, departure),
      maxGuests,
      propertyType,
    })
    : 3000

  const reload = useCallback(async (reserveId: string) => {
    const [requestsResult, txResult] = await Promise.all([
      fetchStayServiceRequests(reserveId),
      fetchReserveTransactions(reserveId),
    ])
    setRequests((requestsResult.data ?? []) as StayServiceRequest[])
    setTransactions((txResult.data ?? []) as ReserveTransaction[])
  }, [])

  const load = useCallback(async () => {
    if (!enabled || !reservationId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await fetchStayReserveByReservation(reservationId)
    if (error) {
      setLoading(false)
      return
    }

    const reserveData = data as StayReserve | null
    setReserve(reserveData)
    if (reserveData?.id) {
      await reload(reserveData.id)
    } else {
      setRequests([])
      setTransactions([])
    }
    setLoading(false)
  }, [enabled, reservationId, reload])

  useEffect(() => {
    load()
  }, [load])

  const createReserve = async (amount: number) => {
    if (!reservationId || !propertyId) throw new Error('Séjour non disponible.')
    const { data, error } = await ensureStayReserve({
      reservationId,
      propertyId,
      recommendedAmount: amount,
    })
    if (error || !data) throw new Error(error?.message ?? 'Impossible de créer la réserve.')
    const { data: funded, error: fundError } = await topUpStayReserve(data.id, amount)
    if (fundError || !funded) throw new Error(fundError?.message ?? 'Versement impossible.')
    setReserve(funded as StayReserve)
    await reload(funded.id)
  }

  const topUp = async (amount: number) => {
    if (!reserve) throw new Error('Réserve séjour inactive.')
    const { data, error } = await topUpStayReserve(reserve.id, amount)
    if (error || !data) throw new Error(error?.message ?? 'Versement impossible.')
    setReserve(data as StayReserve)
    await reload(data.id)
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
    if (!reserve || !reservationId || !propertyId) {
      throw new Error('Activez d’abord votre Réserve séjour.')
    }
    const { data, error } = await createStayServiceRequest({
      reservationId,
      stayReserveId: reserve.id,
      propertyId,
      category: input.category,
      title: input.title,
      description: input.description,
      requestedDate: input.requestedDate,
      estimatedAmount: input.estimatedAmount,
      propertyServiceId: input.propertyServiceId,
      providerName: input.providerName,
    })
    if (error || !data) throw new Error(error?.message ?? 'Demande impossible.')
    await reload(reserve.id)
  }

  const approveRequest = async (requestId: string) => {
    if (!reserve) throw new Error('Réserve séjour inactive.')
    const request = requests.find(item => item.id === requestId)
    if (!request) throw new Error('Demande introuvable.')
    const { data, error } = await approveStayServiceRequest(request, reserve)
    if (error || !data) throw new Error(error?.message ?? 'Validation impossible.')
    setReserve(data.reserve)
    await reload(data.reserve.id)
  }

  return {
    loading,
    reserve,
    requests,
    transactions,
    recommendedAmount,
    createReserve,
    topUp,
    createRequest,
    bookDirectService: undefined as undefined | ((input: {
      propertyServiceId: string
      quantity?: number
      requestedDate?: string
      clientNotes?: string
      selectedOptions?: Record<string, string>
    }) => Promise<void>),
    approveRequest,
    reload: load,
  }
}

export async function fetchReservationPortalToken(reservationId: string) {
  return supabase
    .from('reservations')
    .select('portal_access_token')
    .eq('id', reservationId)
    .maybeSingle()
}
