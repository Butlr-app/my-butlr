export type ContractMode = 'to_prepare' | 'already_done' | 'concierge' | 'none'
export type BookingKind = 'guest' | 'owner_stay' | 'marketing_event' | 'blocked_dates' | 'other'
export type ReservationStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'not_applicable'
export type ContractStatus = 'none' | 'draft' | 'sent' | 'signed'

export const blockReasonLabels: Record<Exclude<BookingKind, 'guest'>, string> = {
  owner_stay: 'Séjour propriétaire',
  marketing_event: 'Événement marketing',
  blocked_dates: 'Dates indisponibles',
  other: 'Autre blocage',
}

export interface ReservationFormInput {
  propertyId: string
  arrival: string
  departure: string
  contractMode: ContractMode | null
  bookingKind: BookingKind
  guestName: string
  guestEmail: string
  guestPhone: string
  guestsCount: number
  totalAmount: string
  blockTitle: string
  notes: string
  propertyMaxGuests?: number | null
}

export interface ReservationInsertPayload {
  property_id: string
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  arrival: string
  departure: string
  guests_count: number
  status: ReservationStatus
  payment_status: PaymentStatus
  contract_status: ContractStatus
  total_amount: number
  notes: string | null
  contract_mode: ContractMode
  booking_kind: BookingKind
}

export function isCommercialReservation(reservation: {
  booking_kind: string
  status: string
}): boolean {
  return reservation.booking_kind === 'guest' && reservation.status !== 'cancelled'
}

export function isActiveGuestReservation(reservation: {
  booking_kind: string
  status: string
}): boolean {
  return reservation.booking_kind === 'guest'
    && (reservation.status === 'confirmed' || reservation.status === 'in_progress')
}

export function calendarEventCoversDate(event: {
  start_date: string
  end_date: string
  reservation_id?: string | null
}, date: string): boolean {
  return event.start_date <= date
    && (event.reservation_id ? event.end_date > date : event.end_date >= date)
}

export function validateReservationInput(input: ReservationFormInput): string | null {
  if (!input.propertyId || !input.arrival || !input.departure) {
    return 'Sélectionnez une propriété et les dates du séjour.'
  }

  if (input.departure <= input.arrival) {
    return 'La date de départ doit être postérieure à la date d’arrivée.'
  }

  if (!input.contractMode) {
    return 'Indiquez comment le contrat doit être géré.'
  }

  if (input.contractMode !== 'none' && !input.guestName.trim()) {
    return 'Renseignez le nom du client.'
  }

  if (input.guestsCount < 1 || input.guestsCount > 50) {
    return 'Le nombre de voyageurs doit être compris entre 1 et 50.'
  }

  if (
    input.contractMode !== 'none'
    && input.propertyMaxGuests
    && input.guestsCount > input.propertyMaxGuests
  ) {
    return `Cette propriété accepte au maximum ${input.propertyMaxGuests} voyageurs.`
  }

  if (input.totalAmount.trim()) {
    const amount = Number(input.totalAmount)
    if (!Number.isFinite(amount) || amount < 0) {
      return 'Le montant total doit être un nombre positif.'
    }
  }

  return null
}

export function buildReservationInsertPayload(
  input: ReservationFormInput,
): ReservationInsertPayload {
  if (!input.contractMode) {
    throw new Error('Le mode de contrat est requis.')
  }

  const isDateBlock = input.contractMode === 'none'
  const bookingKind = isDateBlock
    ? input.bookingKind === 'guest' ? 'blocked_dates' : input.bookingKind
    : 'guest'
  const fallbackBlockLabel = bookingKind === 'guest'
    ? 'Dates bloquées'
    : blockReasonLabels[bookingKind]

  const contractStatus: ContractStatus = input.contractMode === 'already_done'
    ? 'signed'
    : isDateBlock
      ? 'none'
      : 'draft'

  return {
    property_id: input.propertyId,
    guest_name: isDateBlock
      ? input.blockTitle.trim() || fallbackBlockLabel
      : input.guestName.trim(),
    guest_email: isDateBlock ? null : input.guestEmail.trim() || null,
    guest_phone: isDateBlock ? null : input.guestPhone.trim() || null,
    arrival: input.arrival,
    departure: input.departure,
    guests_count: isDateBlock ? 1 : input.guestsCount,
    status: 'confirmed',
    payment_status: isDateBlock ? 'not_applicable' : 'pending',
    contract_status: contractStatus,
    total_amount: isDateBlock ? 0 : Number(input.totalAmount) || 0,
    notes: input.notes.trim() || null,
    contract_mode: input.contractMode,
    booking_kind: bookingKind,
  }
}

export interface ReservationUpdateInput {
  guestName: string
  guestEmail: string
  guestPhone: string
  arrival: string
  departure: string
  guestsCount: number
  totalAmount: string
  notes: string
  status: ReservationStatus
  propertyMaxGuests?: number | null
}

export function validateReservationUpdate(
  input: ReservationUpdateInput,
  isGuestBooking: boolean,
): string | null {
  if (!input.arrival || !input.departure) {
    return 'Les dates du séjour sont obligatoires.'
  }

  if (input.departure <= input.arrival) {
    return 'La date de départ doit être postérieure à la date d’arrivée.'
  }

  if (!input.guestName.trim()) {
    return isGuestBooking ? 'Renseignez le nom du client.' : 'Renseignez un libellé pour le blocage.'
  }

  if (isGuestBooking) {
    if (input.guestsCount < 1 || input.guestsCount > 50) {
      return 'Le nombre de voyageurs doit être compris entre 1 et 50.'
    }

    if (input.propertyMaxGuests && input.guestsCount > input.propertyMaxGuests) {
      return `Cette propriété accepte au maximum ${input.propertyMaxGuests} voyageurs.`
    }

    if (input.totalAmount.trim()) {
      const amount = Number(input.totalAmount)
      if (!Number.isFinite(amount) || amount < 0) {
        return 'Le montant total doit être un nombre positif.'
      }
    }
  }

  return null
}

export function buildReservationUpdatePayload(
  input: ReservationUpdateInput,
  isGuestBooking: boolean,
) {
  return {
    guest_name: input.guestName.trim(),
    guest_email: isGuestBooking ? input.guestEmail.trim() || null : null,
    guest_phone: isGuestBooking ? input.guestPhone.trim() || null : null,
    arrival: input.arrival,
    departure: input.departure,
    guests_count: isGuestBooking ? input.guestsCount : 1,
    total_amount: isGuestBooking ? Number(input.totalAmount) || 0 : 0,
    notes: input.notes.trim() || null,
    status: input.status,
  }
}

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
}
