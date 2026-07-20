import { describe, expect, it } from 'vitest'
import {
  buildAgencyClientRequestPayload,
  buildAgencyRequestDecisionPayload,
  buildReservationInsertPayload,
  calendarEventCoversDate,
  isActiveGuestReservation,
  isActiveReservation,
  isArchivedReservation,
  isBlockingReservationStatus,
  isCommercialReservation,
  isPastStay,
  isPendingAgencyClientRequest,
  validateAgencyClientRequest,
  validateReservationInput,
  type ContractMode,
  type ReservationFormInput,
} from './reservationWorkflow'

const baseInput: ReservationFormInput = {
  propertyId: 'property-1',
  arrival: '2026-08-01',
  departure: '2026-08-08',
  contractMode: 'to_prepare',
  bookingKind: 'guest',
  guestName: '  Jeanne Martin  ',
  guestEmail: ' jeanne@example.com ',
  guestPhone: ' +33612345678 ',
  guestsCount: 3,
  totalAmount: '1250.50',
  blockTitle: '',
  notes: ' Arrivée tardive ',
  propertyMaxGuests: 4,
}

describe('validateReservationInput', () => {
  it.each([
    [{ propertyId: '' }, 'Sélectionnez une propriété et les dates du séjour.'],
    [{ arrival: '' }, 'Sélectionnez une propriété et les dates du séjour.'],
    [{ departure: '2026-08-01' }, 'La date de départ doit être postérieure à la date d’arrivée.'],
    [{ contractMode: null }, 'Indiquez comment le contrat doit être géré.'],
    [{ guestName: ' ' }, 'Renseignez le nom du client.'],
    [{ guestsCount: 0 }, 'Le nombre de voyageurs doit être compris entre 1 et 50.'],
    [{ guestsCount: 5 }, 'Cette propriété accepte au maximum 4 voyageurs.'],
    [{ totalAmount: '-1' }, 'Le montant total doit être un nombre positif.'],
    [{ totalAmount: 'abc' }, 'Le montant total doit être un nombre positif.'],
  ])('refuse une saisie invalide', (override, message) => {
    expect(validateReservationInput({ ...baseInput, ...override })).toBe(message)
  })

  it('accepte les quatre modes de contrat', () => {
    const modes: ContractMode[] = ['to_prepare', 'already_done', 'concierge', 'none']

    for (const contractMode of modes) {
      expect(validateReservationInput({
        ...baseInput,
        contractMode,
        bookingKind: contractMode === 'none' ? 'owner_stay' : 'guest',
        guestName: contractMode === 'none' ? '' : baseInput.guestName,
      })).toBeNull()
    }
  })
})

describe('buildReservationInsertPayload', () => {
  it.each([
    ['to_prepare', 'draft'],
    ['concierge', 'draft'],
    ['already_done', 'signed'],
  ] as const)('construit une réservation client %s', (contractMode, contractStatus) => {
    expect(buildReservationInsertPayload({ ...baseInput, contractMode })).toEqual({
      property_id: 'property-1',
      guest_name: 'Jeanne Martin',
      guest_email: 'jeanne@example.com',
      guest_phone: '+33612345678',
      arrival: '2026-08-01',
      departure: '2026-08-08',
      guests_count: 3,
      status: 'confirmed',
      payment_status: 'pending',
      contract_status: contractStatus,
      total_amount: 1250.5,
      notes: 'Arrivée tardive',
      contract_mode: contractMode,
      booking_kind: 'guest',
      guest_language: null,
    })
  })

  it('construit un blocage propriétaire sans données financières ni client', () => {
    expect(buildReservationInsertPayload({
      ...baseInput,
      contractMode: 'none',
      bookingKind: 'owner_stay',
      guestName: '',
      guestEmail: 'ignored@example.com',
      guestPhone: 'ignored',
      guestsCount: 7,
      totalAmount: '999',
      blockTitle: '',
    })).toMatchObject({
      guest_name: 'Séjour propriétaire',
      guest_email: null,
      guest_phone: null,
      guests_count: 1,
      total_amount: 0,
      payment_status: 'not_applicable',
      contract_status: 'none',
      contract_mode: 'none',
      booking_kind: 'owner_stay',
    })
  })

  it('enregistre la langue du voyageur si renseignée', () => {
    expect(buildReservationInsertPayload({
      ...baseInput,
      guestLanguage: ' en ',
    }).guest_language).toBe('en')
  })

  it('normalise un motif client incompatible avec un blocage', () => {
    expect(buildReservationInsertPayload({
      ...baseInput,
      contractMode: 'none',
      bookingKind: 'guest',
    }).booking_kind).toBe('blocked_dates')
  })
})

describe('effets transverses', () => {
  it('exclut les blocages et annulations des métriques commerciales', () => {
    expect(isCommercialReservation({ booking_kind: 'guest', status: 'confirmed' })).toBe(true)
    expect(isCommercialReservation({ booking_kind: 'owner_stay', status: 'confirmed' })).toBe(false)
    expect(isCommercialReservation({ booking_kind: 'guest', status: 'cancelled' })).toBe(false)
  })

  it('n’ouvre le portail invité que pour un séjour client actif', () => {
    expect(isActiveGuestReservation({ booking_kind: 'guest', status: 'in_progress' })).toBe(true)
    expect(isActiveGuestReservation({ booking_kind: 'blocked_dates', status: 'confirmed' })).toBe(false)
    expect(isActiveGuestReservation({ booking_kind: 'guest', status: 'completed' })).toBe(false)
  })

  it('sépare les séjours actifs et archivés', () => {
    expect(isActiveReservation({ status: 'confirmed' })).toBe(true)
    expect(isActiveReservation({ status: 'cancelled' })).toBe(false)
    expect(isArchivedReservation({ status: 'completed' })).toBe(true)
    expect(isBlockingReservationStatus('completed')).toBe(false)
    expect(isBlockingReservationStatus('confirmed')).toBe(true)
    expect(isPastStay('2026-07-01', '2026-07-15')).toBe(true)
    expect(isPastStay('2026-08-01', '2026-07-15')).toBe(false)
  })

  it('considère le départ comme une borne exclusive pour une réservation', () => {
    const reservationEvent = {
      start_date: '2026-08-01',
      end_date: '2026-08-03',
      reservation_id: 'reservation-1',
    }
    expect(calendarEventCoversDate(reservationEvent, '2026-08-01')).toBe(true)
    expect(calendarEventCoversDate(reservationEvent, '2026-08-02')).toBe(true)
    expect(calendarEventCoversDate(reservationEvent, '2026-08-03')).toBe(false)
    expect(calendarEventCoversDate({
      start_date: '2026-08-03',
      end_date: '2026-08-03',
      reservation_id: null,
    }, '2026-08-03')).toBe(true)
  })
})

describe('agency client requests', () => {
  const agencyInput = {
    propertyId: 'property-1',
    arrival: '2026-09-01',
    departure: '2026-09-08',
    guestName: '  Client Agence  ',
    guestEmail: ' client@agence.fr ',
    guestPhone: ' 0600000000 ',
    guestsCount: 2,
    notes: ' VIP ',
    guestLanguage: 'fr',
    propertyMaxGuests: 6,
    requestedBy: 'agency-user-1',
  }

  it('valide une demande agence', () => {
    expect(validateAgencyClientRequest(agencyInput)).toBeNull()
    expect(validateAgencyClientRequest({ ...agencyInput, guestName: ' ' })).toBe(
      'Renseignez le nom du client.',
    )
  })

  it('construit un payload pending pour validation propriétaire', () => {
    expect(buildAgencyClientRequestPayload(agencyInput)).toEqual({
      property_id: 'property-1',
      guest_name: 'Client Agence',
      guest_email: 'client@agence.fr',
      guest_phone: '0600000000',
      arrival: '2026-09-01',
      departure: '2026-09-08',
      guests_count: 2,
      status: 'pending',
      payment_status: 'pending',
      contract_status: 'draft',
      total_amount: 0,
      notes: 'Demande agence immobilière — VIP',
      contract_mode: 'to_prepare',
      booking_kind: 'guest',
      guest_language: 'fr',
      requested_by: 'agency-user-1',
    })
  })

  it('détecte une demande agence en attente', () => {
    expect(isPendingAgencyClientRequest({
      status: 'pending',
      requested_by: 'agency-user-1',
      booking_kind: 'guest',
    })).toBe(true)
    expect(isPendingAgencyClientRequest({
      status: 'confirmed',
      requested_by: 'agency-user-1',
      booking_kind: 'guest',
    })).toBe(false)
    expect(isPendingAgencyClientRequest({
      status: 'pending',
      requested_by: null,
      booking_kind: 'guest',
    })).toBe(false)
  })

  it('approuve ou refuse une demande agence', () => {
    expect(buildAgencyRequestDecisionPayload('approve')).toEqual({ status: 'confirmed' })
    expect(buildAgencyRequestDecisionPayload('reject')).toEqual({ status: 'cancelled' })
  })
})
