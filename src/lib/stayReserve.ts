import { supabase } from './supabase'

export type StayReserveStatus =
  | 'pending_payment'
  | 'funded'
  | 'partially_used'
  | 'low_balance'
  | 'exhausted'
  | 'closed'
  | 'refunded'
  | 'cancelled'

export type StayApprovalMode = 'manual' | 'auto_under_limit'

export type StayServiceRequestStatus =
  | 'draft'
  | 'submitted'
  | 'reviewing'
  | 'quoted'
  | 'waiting_client_approval'
  | 'approved'
  | 'assigned_to_provider'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export type ReserveTransactionType =
  | 'top_up'
  | 'authorization'
  | 'capture'
  | 'refund'
  | 'release'
  | 'adjustment'
  | 'payout'
  | 'commission'

export interface StayReserve {
  id: string
  reservation_id: string
  property_id: string
  client_id: string | null
  currency: string
  recommended_amount: number | null
  initial_amount: number
  current_balance: number
  spent_amount: number
  pending_amount: number
  status: StayReserveStatus
  approval_mode: StayApprovalMode
  auto_approval_limit: number
  notification_before_spending: boolean
  created_at: string
  updated_at: string
  closed_at: string | null
}

export interface StayServiceRequest {
  id: string
  reservation_id: string
  stay_reserve_id: string
  property_id: string
  category: string
  title: string
  description: string | null
  requested_date: string | null
  urgency: 'low' | 'normal' | 'high'
  status: StayServiceRequestStatus
  estimated_amount: number | null
  final_amount: number | null
  provider_name: string | null
  property_service_id: string | null
  approved_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ReserveTransaction {
  id: string
  stay_reserve_id: string
  service_request_id: string | null
  type: ReserveTransactionType
  amount: number
  currency: string
  status: string
  description: string | null
  created_at: string
}

export interface RevenueSplitRates {
  provider: number
  villa: number
  platform: number
  concierge: number
}

export const DEFAULT_REVENUE_SPLIT: RevenueSplitRates = {
  provider: 0.75,
  villa: 0.10,
  platform: 0.15,
  concierge: 0,
}

export const stayReserveStatusLabels: Record<StayReserveStatus, string> = {
  pending_payment: 'En attente de versement',
  funded: 'Active',
  partially_used: 'Partiellement utilisée',
  low_balance: 'Solde bas',
  exhausted: 'Épuisée',
  closed: 'Clôturée',
  refunded: 'Remboursée',
  cancelled: 'Annulée',
}

export const stayServiceStatusLabels: Record<StayServiceRequestStatus, string> = {
  draft: 'Brouillon',
  submitted: 'Envoyée',
  reviewing: 'En cours d’étude',
  quoted: 'Devis en préparation',
  waiting_client_approval: 'À valider',
  approved: 'Validée',
  assigned_to_provider: 'Prestataire assigné',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
  disputed: 'Litige',
}

export const stayServiceCategories = [
  { value: 'dining', label: 'Chef & gastronomie' },
  { value: 'transport', label: 'Transport & chauffeur' },
  { value: 'wellness', label: 'Bien-être & spa' },
  { value: 'activities', label: 'Activités & loisirs' },
  { value: 'shopping', label: 'Courses & approvisionnement' },
  { value: 'lifestyle', label: 'Art de vivre' },
  { value: 'special', label: 'Demande spéciale' },
  { value: 'other', label: 'Autre' },
] as const

export interface StayServiceRequestDraft {
  category: string
  title: string
  description: string
  estimatedAmount?: number
  propertyServiceId?: string
  providerName?: string
}

export function mapCatalogCategoryToStayCategory(category: string | null | undefined): string {
  const map: Record<string, string> = {
    dining: 'dining',
    transport: 'transport',
    wellness: 'wellness',
    activities: 'activities',
    experiences: 'activities',
    lifestyle: 'lifestyle',
    family: 'special',
    shopping: 'shopping',
  }
  return map[category ?? ''] ?? 'other'
}

export function formatReserveAmount(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

export function computeRevenueSplit(
  totalAmount: number,
  rates: RevenueSplitRates = DEFAULT_REVENUE_SPLIT,
) {
  const providerAmount = Math.round(totalAmount * rates.provider * 100) / 100
  const villaAmount = Math.round(totalAmount * rates.villa * 100) / 100
  const platformCommission = Math.round(totalAmount * rates.platform * 100) / 100
  const conciergeAmount = Math.round(totalAmount * rates.concierge * 100) / 100
  return { providerAmount, villaAmount, platformCommission, conciergeAmount }
}

export function recommendStayReserveAmount(input: {
  nights: number
  maxGuests?: number
  propertyType?: string
}): number {
  const nights = Math.max(1, input.nights)
  const maxGuests = input.maxGuests ?? 4
  const type = input.propertyType ?? 'villa'

  if (maxGuests >= 12 || type === 'yacht') {
    return Math.max(7500, nights * 800)
  }
  if (maxGuests >= 8) {
    return Math.max(3000, nights * 350)
  }
  return Math.max(1500, nights * 180)
}

export function nightsBetween(arrival: string, departure: string): number {
  const start = new Date(`${arrival}T12:00:00`)
  const end = new Date(`${departure}T12:00:00`)
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
}

export function shouldAutoApprove(
  reserve: StayReserve,
  amount: number,
): boolean {
  if (reserve.approval_mode === 'manual') return false
  return amount <= Number(reserve.auto_approval_limit)
}

export async function fetchStayReserveByReservation(reservationId: string) {
  return supabase
    .from('stay_reserves')
    .select('*')
    .eq('reservation_id', reservationId)
    .maybeSingle()
}

export async function fetchStayReserve(reserveId: string) {
  return supabase.from('stay_reserves').select('*').eq('id', reserveId).maybeSingle()
}

export async function fetchOwnerStayReserves(propertyIds: string[]) {
  if (propertyIds.length === 0) return { data: [] as StayReserve[], error: null }
  return supabase
    .from('stay_reserves')
    .select('*, reservations(guest_name, arrival, departure, properties(name))')
    .in('property_id', propertyIds)
    .order('updated_at', { ascending: false })
}

export async function fetchStayServiceRequests(stayReserveId: string) {
  return supabase
    .from('stay_service_requests')
    .select('*')
    .eq('stay_reserve_id', stayReserveId)
    .order('created_at', { ascending: false })
}

export async function fetchReserveTransactions(stayReserveId: string) {
  return supabase
    .from('reserve_transactions')
    .select('*')
    .eq('stay_reserve_id', stayReserveId)
    .order('created_at', { ascending: false })
}

export async function getGuestStayPortal(portalToken: string) {
  return supabase.rpc('get_guest_stay_portal', { p_token: portalToken })
}

export async function ensureStayReserve(input: {
  reservationId: string
  propertyId: string
  recommendedAmount: number
  approvalMode?: StayApprovalMode
  autoApprovalLimit?: number
}) {
  const existing = await fetchStayReserveByReservation(input.reservationId)
  if (existing.data) return { data: existing.data as StayReserve, error: null }

  return supabase
    .from('stay_reserves')
    .insert({
      reservation_id: input.reservationId,
      property_id: input.propertyId,
      recommended_amount: input.recommendedAmount,
      approval_mode: input.approvalMode ?? 'auto_under_limit',
      auto_approval_limit: input.autoApprovalLimit ?? 300,
      status: 'pending_payment',
    })
    .select('*')
    .single()
}

export async function topUpStayReserve(reserveId: string, amount: number, description?: string) {
  const { data: reserve, error: fetchError } = await fetchStayReserve(reserveId)
  if (fetchError || !reserve) return { data: null, error: fetchError ?? new Error('Réserve introuvable.') }

  const current = reserve as StayReserve
  const newBalance = Number(current.current_balance) + amount
  const newInitial = Number(current.initial_amount) + amount

  const { data: updated, error: updateError } = await supabase
    .from('stay_reserves')
    .update({
      current_balance: newBalance,
      initial_amount: newInitial,
      status: 'funded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', reserveId)
    .select('*')
    .single()

  if (updateError || !updated) return { data: null, error: updateError }

  await supabase.from('reserve_transactions').insert({
    stay_reserve_id: reserveId,
    type: 'top_up',
    amount,
    currency: current.currency,
    status: 'completed',
    description: description ?? 'Versement Réserve séjour',
  })

  await supabase.rpc('refresh_stay_reserve_status', { p_reserve_id: reserveId })

  return { data: updated as StayReserve, error: null }
}

export async function createStayServiceRequest(input: {
  reservationId: string
  stayReserveId: string
  propertyId: string
  category: string
  title: string
  description?: string
  requestedDate?: string
  urgency?: 'low' | 'normal' | 'high'
  propertyServiceId?: string
  estimatedAmount?: number
  providerName?: string
}) {
  return supabase
    .from('stay_service_requests')
    .insert({
      reservation_id: input.reservationId,
      stay_reserve_id: input.stayReserveId,
      property_id: input.propertyId,
      category: input.category,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      requested_date: input.requestedDate || null,
      urgency: input.urgency ?? 'normal',
      property_service_id: input.propertyServiceId || null,
      estimated_amount: input.estimatedAmount ?? null,
      provider_name: input.providerName || null,
      status: 'submitted',
    })
    .select('*')
    .single()
}

export async function quoteStayServiceRequest(
  requestId: string,
  finalAmount: number,
  providerName?: string,
) {
  return supabase
    .from('stay_service_requests')
    .update({
      final_amount: finalAmount,
      estimated_amount: finalAmount,
      provider_name: providerName?.trim() || null,
      status: 'waiting_client_approval',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select('*')
    .single()
}

export async function approveStayServiceRequest(
  request: StayServiceRequest,
  reserve: StayReserve,
) {
  const amount = Number(request.final_amount ?? request.estimated_amount ?? 0)
  if (amount <= 0) {
    return { data: null, error: new Error('Montant du service invalide.') }
  }
  if (Number(reserve.current_balance) < amount) {
    return { data: null, error: new Error('Solde insuffisant sur votre Réserve séjour.') }
  }

  const newBalance = Number(reserve.current_balance) - amount
  const newPending = Number(reserve.pending_amount) + amount

  const { data: updatedReserve, error: reserveError } = await supabase
    .from('stay_reserves')
    .update({
      current_balance: newBalance,
      pending_amount: newPending,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reserve.id)
    .select('*')
    .single()

  if (reserveError || !updatedReserve) return { data: null, error: reserveError }

  const { data: updatedRequest, error: requestError } = await supabase
    .from('stay_service_requests')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id)
    .select('*')
    .single()

  if (requestError || !updatedRequest) return { data: null, error: requestError }

  await supabase.from('reserve_transactions').insert({
    stay_reserve_id: reserve.id,
    service_request_id: request.id,
    type: 'authorization',
    amount,
    currency: reserve.currency,
    status: 'completed',
    description: `Réservation — ${request.title}`,
  })

  await supabase.rpc('refresh_stay_reserve_status', { p_reserve_id: reserve.id })

  return {
    data: {
      request: updatedRequest as StayServiceRequest,
      reserve: updatedReserve as StayReserve,
    },
    error: null,
  }
}

export async function completeStayServiceRequest(
  request: StayServiceRequest,
  reserve: StayReserve,
) {
  const amount = Number(request.final_amount ?? request.estimated_amount ?? 0)

  const split = computeRevenueSplit(amount)

  const { data: updatedRequest, error: requestError } = await supabase
    .from('stay_service_requests')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id)
    .select('*')
    .single()

  if (requestError || !updatedRequest) return { data: null, error: requestError }

  const newPending = Math.max(0, Number(reserve.pending_amount) - amount)
  const newSpent = Number(reserve.spent_amount) + amount

  const { data: updatedReserve, error: reserveError } = await supabase
    .from('stay_reserves')
    .update({
      pending_amount: newPending,
      spent_amount: newSpent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reserve.id)
    .select('*')
    .single()

  if (reserveError || !updatedReserve) return { data: null, error: reserveError }

  await supabase.from('reserve_transactions').insert({
    stay_reserve_id: reserve.id,
    service_request_id: request.id,
    type: 'capture',
    amount,
    currency: reserve.currency,
    status: 'completed',
    description: `Service confirmé — ${request.title}`,
  })

  await supabase.from('service_revenue_splits').upsert({
    service_request_id: request.id,
    total_amount: amount,
    provider_amount: split.providerAmount,
    platform_commission: split.platformCommission,
    villa_amount: split.villaAmount,
    concierge_amount: split.conciergeAmount,
    currency: reserve.currency,
    status: 'confirmed',
  }, { onConflict: 'service_request_id' })

  await supabase.rpc('refresh_stay_reserve_status', { p_reserve_id: reserve.id })

  return {
    data: {
      request: updatedRequest as StayServiceRequest,
      reserve: updatedReserve as StayReserve,
    },
    error: null,
  }
}

export async function closeStayReserve(reserveId: string, refundRemaining = true) {
  const { data: reserve, error: fetchError } = await fetchStayReserve(reserveId)
  if (fetchError || !reserve) return { data: null, error: fetchError }

  const current = reserve as StayReserve
  const remaining = Number(current.current_balance)

  if (refundRemaining && remaining > 0) {
    await supabase.from('reserve_transactions').insert({
      stay_reserve_id: reserveId,
      type: 'refund',
      amount: remaining,
      currency: current.currency,
      status: 'completed',
      description: 'Remboursement solde non utilisé',
    })
  }

  const { data: statement, error: statementError } = await supabase
    .from('reserve_statements')
    .insert({
      stay_reserve_id: reserveId,
      reservation_id: current.reservation_id,
      client_id: current.client_id,
      total_funded: current.initial_amount,
      total_spent: current.spent_amount,
      total_refunded: refundRemaining ? remaining : 0,
      remaining_balance: refundRemaining ? 0 : remaining,
    })
    .select('*')
    .single()

  const { data: closed, error: closeError } = await supabase
    .from('stay_reserves')
    .update({
      current_balance: refundRemaining ? 0 : remaining,
      status: refundRemaining ? 'refunded' : 'closed',
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reserveId)
    .select('*')
    .single()

  if (closeError) return { data: null, error: closeError }

  return {
    data: {
      reserve: closed as StayReserve,
      statement,
    },
    error: statementError,
  }
}

export async function submitServiceRequestWithAutoApproval(
  request: StayServiceRequest,
  reserve: StayReserve,
) {
  if (!request.final_amount && !request.estimated_amount) {
    return quoteStayServiceRequest(
      request.id,
      Number(request.estimated_amount ?? 0),
      request.provider_name ?? undefined,
    )
  }

  const amount = Number(request.final_amount ?? request.estimated_amount ?? 0)

  if (shouldAutoApprove(reserve, amount)) {
    const quoted = await supabase
      .from('stay_service_requests')
      .update({
        final_amount: amount,
        status: 'waiting_client_approval',
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id)
      .select('*')
      .single()

    if (quoted.error || !quoted.data) return { data: null, error: quoted.error }

    return approveStayServiceRequest(quoted.data as StayServiceRequest, reserve)
  }

  return supabase
    .from('stay_service_requests')
    .update({
      final_amount: amount,
      status: 'waiting_client_approval',
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id)
    .select('*')
    .single()
}
