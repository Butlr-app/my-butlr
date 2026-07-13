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

/** Cash-like payment lines (excludes the auto-synced booking total row). */
export function isCashPaymentType(type: string): boolean {
  return type !== 'booking'
}

/**
 * Sum actually collected amounts without double-counting the booking reference line.
 * Versements/acomptes take priority; booking is only counted when it is the sole paid line.
 */
export function computePaidTotal(
  payments: Array<Pick<ReservationPayment, 'type' | 'amount' | 'status'>>,
): number {
  const paid = payments.filter(payment => payment.status === 'paid')
  const cashPaid = paid
    .filter(payment => isCashPaymentType(payment.type))
    .reduce((sum, payment) => sum + Number(payment.amount), 0)

  if (cashPaid > 0) return cashPaid

  const booking = paid.find(payment => payment.type === 'booking')
  return booking ? Number(booking.amount) : 0
}

/** Aggregate collected amounts across reservations without cross-reservation booking bleed. */
export function computeOwnerCollectedTotal(
  payments: Array<
    Pick<ReservationPayment, 'id' | 'type' | 'amount' | 'status'>
    & { reservation_id?: string | null }
  >,
): number {
  const groups = new Map<string, typeof payments>()

  for (const payment of payments) {
    const key = payment.reservation_id ?? `orphan:${payment.id}`
    const group = groups.get(key) ?? []
    group.push(payment)
    groups.set(key, group)
  }

  let total = 0
  for (const group of groups.values()) {
    total += computePaidTotal(group)
  }
  return total
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
  const booking = payments.find(payment => payment.type === 'booking')
  const paidFromCash = payments
    .filter(payment => payment.status === 'paid' && isCashPaymentType(payment.type))
    .reduce((sum, payment) => sum + Number(payment.amount), 0)
  const totalAmount = Number(reservation.total_amount)
  const remaining = computeRemainingAmount(paidFromCash, totalAmount)

  if (remaining > 0) {
    const singleShotViaBooking = booking
      && booking.status !== 'paid'
      && paidFromCash === 0
      && Number(booking.amount) >= totalAmount

    if (singleShotViaBooking) {
      const { error: bookingError } = await supabase
        .from('payments')
        .update({ status: 'paid', date })
        .eq('id', booking.id)
      if (bookingError) throw bookingError
    } else {
      await insertPaidPayment({
        reservation,
        amount: remaining,
        date,
        kind: 'balance',
        notes: 'Solde final',
      }, 'installment')
    }
  }

  let { data: refreshedPayments, error: refreshError } = await fetchReservationPayments(reservation.id)
  if (refreshError) throw refreshError

  let paymentsAfterUpdate = (refreshedPayments ?? []) as ReservationPayment[]
  const bookingRow = paymentsAfterUpdate.find(payment => payment.type === 'booking')
  const paidTotal = computePaidTotal(paymentsAfterUpdate)

  if (bookingRow && bookingRow.status !== 'paid' && paidTotal >= totalAmount) {
    const { error: bookingError } = await supabase
      .from('payments')
      .update({ status: 'paid', date })
      .eq('id', bookingRow.id)
    if (bookingError) throw bookingError

    const refreshed = await fetchReservationPayments(reservation.id)
    if (refreshed.error) throw refreshed.error
    paymentsAfterUpdate = (refreshed.data ?? []) as ReservationPayment[]
  }

  const syncedReservation = await syncReservationPaymentStatus(
    reservation,
    paymentsAfterUpdate,
  )

  return {
    reservation: syncedReservation,
    payments: paymentsAfterUpdate,
  }
}
