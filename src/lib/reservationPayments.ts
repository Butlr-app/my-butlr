import { supabase } from './supabase'
import type { PaymentStatus } from './reservationWorkflow'
import type { Payment, Reservation } from './types'

export type ReservationPaymentKind = 'deposit' | 'installment' | 'balance'

export interface ReservationPayment extends Payment {
  reservation_id: string | null
  notes: string | null
}

export interface AddReservationPaymentInput {
  reservation: Reservation
  amount: number
  date: string
  kind: ReservationPaymentKind
  notes?: string
}

const paymentKindLabels: Record<ReservationPaymentKind, string> = {
  deposit: 'Acompte',
  installment: 'Versement',
  balance: 'Solde',
}

export function paymentTypeLabel(type: string) {
  if (type === 'booking') return 'Montant total'
  if (type in paymentKindLabels) return paymentKindLabels[type as ReservationPaymentKind]
  return type
}

export function paymentStatusLabel(status: PaymentStatus | string) {
  switch (status) {
    case 'paid': return 'Payé'
    case 'partial': return 'Partiel'
    case 'pending': return 'En attente'
    case 'refunded': return 'Remboursé'
    case 'not_applicable': return 'Non applicable'
    default: return status
  }
}

export function computePaidTotal(payments: ReservationPayment[]): number {
  return payments
    .filter(payment => payment.status === 'paid')
    .reduce((sum, payment) => sum + Number(payment.amount), 0)
}

export function derivePaymentStatus(
  paidTotal: number,
  totalAmount: number,
): PaymentStatus {
  if (totalAmount <= 0) return 'not_applicable'
  if (paidTotal <= 0) return 'pending'
  if (paidTotal >= totalAmount) return 'paid'
  return 'partial'
}

export function computeRemainingAmount(paidTotal: number, totalAmount: number) {
  return Math.max(0, totalAmount - paidTotal)
}

export async function fetchReservationPayments(reservationId: string) {
  return supabase
    .from('payments')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function syncReservationPaymentStatus(
  reservation: Reservation,
  payments: ReservationPayment[],
) {
  const paidTotal = computePaidTotal(payments)
  const paymentStatus = derivePaymentStatus(paidTotal, Number(reservation.total_amount))
  if (paymentStatus === reservation.payment_status) return reservation

  const { data, error } = await supabase
    .from('reservations')
    .update({ payment_status: paymentStatus })
    .eq('id', reservation.id)
    .select('*')
    .single()

  if (error || !data) throw error ?? new Error('Impossible de mettre à jour le statut de paiement.')
  return data as Reservation
}

async function insertPaidPayment(input: AddReservationPaymentInput, type: string) {
  const propertyName = input.reservation.properties?.name ?? null
  const { data, error } = await supabase
    .from('payments')
    .insert({
      reservation_id: input.reservation.id,
      guest_name: input.reservation.guest_name,
      property_name: propertyName,
      type,
      amount: input.amount,
      status: 'paid',
      date: input.date,
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single()

  if (error || !data) throw error ?? new Error('Impossible d’enregistrer le paiement.')
  return data as ReservationPayment
}

export async function addReservationPayment(input: AddReservationPaymentInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Le montant doit être supérieur à 0.')
  }
  if (!input.date) throw new Error('Indiquez la date du paiement.')

  const paymentType = input.kind === 'deposit' ? 'deposit' : 'installment'
  const payment = await insertPaidPayment(input, paymentType)
  const { data: payments, error } = await fetchReservationPayments(input.reservation.id)
  if (error) throw error

  const updatedReservation = await syncReservationPaymentStatus(
    input.reservation,
    (payments ?? []) as ReservationPayment[],
  )

  return { payment, payments: (payments ?? []) as ReservationPayment[], reservation: updatedReservation }
}

export async function markReservationFullyPaid(
  reservation: Reservation,
  date: string,
) {
  if (!date) throw new Error('Indiquez la date du paiement.')

  const { data: existingPayments, error: fetchError } = await fetchReservationPayments(reservation.id)
  if (fetchError) throw fetchError

  const payments = (existingPayments ?? []) as ReservationPayment[]
  const paidTotal = computePaidTotal(payments)
  const totalAmount = Number(reservation.total_amount)
  const remaining = computeRemainingAmount(paidTotal, totalAmount)

  if (remaining > 0) {
    await insertPaidPayment({
      reservation,
      amount: remaining,
      date,
      kind: 'balance',
      notes: 'Solde final',
    }, 'installment')
  }

  const booking = payments.find(payment => payment.type === 'booking')
  if (booking) {
    const { error: bookingError } = await supabase
      .from('payments')
      .update({ status: 'paid', date })
      .eq('id', booking.id)
    if (bookingError) throw bookingError
  }

  const { data, error } = await supabase
    .from('reservations')
    .update({ payment_status: 'paid' })
    .eq('id', reservation.id)
    .select('*')
    .single()

  if (error || !data) throw error ?? new Error('Impossible de marquer la réservation comme payée.')

  const { data: refreshedPayments, error: refreshError } = await fetchReservationPayments(reservation.id)
  if (refreshError) throw refreshError

  return {
    reservation: data as Reservation,
    payments: (refreshedPayments ?? []) as ReservationPayment[],
  }
}
