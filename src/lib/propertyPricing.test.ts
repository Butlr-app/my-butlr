import { describe, expect, it } from 'vitest'
import {
  calculateStayQuote,
  getDateRange,
  getEffectiveNightRate,
  isWeekendDate,
  type PropertyPricingSettings,
  type PropertyRateOverride,
  type PropertyRateSeason,
} from './propertyPricing'
import type { Reservation } from './types'

const settings: PropertyPricingSettings = {
  property_id: 'property-1',
  currency: 'EUR',
  base_rate: 100,
  weekend_rate: 125,
  cleaning_fee: 80,
  security_deposit: 500,
  tourist_tax_per_person: 2.5,
  extra_guest_fee: 20,
  extra_guest_after: 4,
  minimum_stay: 2,
  maximum_stay: 30,
  check_in_time: '16:00',
  check_out_time: '10:00',
}

const season: PropertyRateSeason = {
  id: 'season-1',
  property_id: 'property-1',
  name: 'Haute saison',
  start_date: '2026-07-01',
  end_date: '2026-08-31',
  nightly_rate: 200,
  weekend_rate: 250,
  minimum_stay: 4,
  weekly_discount: 10,
  monthly_discount: 20,
  priority: 1,
  color: 'amber',
  active: true,
}

const override: PropertyRateOverride = {
  id: 'override-1',
  property_id: 'property-1',
  date: '2026-07-15',
  nightly_rate: 320,
  minimum_stay: 5,
  availability: 'available',
  note: 'Festival',
}

describe('propertyPricing', () => {
  it('applique le tarif de base et le tarif week-end', () => {
    expect(isWeekendDate('2026-07-03')).toBe(true)
    expect(getEffectiveNightRate({
      date: '2026-06-30',
      settings,
      seasons: [],
      overrides: [],
    })).toMatchObject({ rate: 100, minimumStay: 2, source: 'base' })
    expect(getEffectiveNightRate({
      date: '2026-07-03',
      settings,
      seasons: [],
      overrides: [],
    })).toMatchObject({ rate: 125, source: 'base' })
  })

  it('fait primer la saison puis l’exception journalière', () => {
    expect(getEffectiveNightRate({
      date: '2026-07-10',
      settings,
      seasons: [season],
      overrides: [],
    })).toMatchObject({ rate: 250, minimumStay: 4, source: 'season' })

    expect(getEffectiveNightRate({
      date: '2026-07-15',
      settings,
      seasons: [season],
      overrides: [override],
    })).toMatchObject({ rate: 320, minimumStay: 5, source: 'override' })
  })

  it('affiche une réservation comme indisponible et libère le jour du départ', () => {
    const reservation: Reservation = {
      id: 'reservation-1',
      property_id: 'property-1',
      guest_name: 'Jeanne',
      guest_email: null,
      guest_phone: null,
      arrival: '2026-07-15',
      departure: '2026-07-18',
      guests_count: 2,
      status: 'confirmed',
      payment_status: 'pending',
      contract_status: 'draft',
      contract_mode: 'to_prepare',
      booking_kind: 'guest',
      total_amount: 800,
      notes: null,
    }

    expect(getEffectiveNightRate({
      date: '2026-07-17',
      settings,
      seasons: [season],
      overrides: [],
      reservations: [reservation],
    }).availability).toBe('booked')
    expect(getEffectiveNightRate({
      date: '2026-07-18',
      settings,
      seasons: [season],
      overrides: [],
      reservations: [reservation],
    }).availability).toBe('available')
  })

  it('génère toutes les dates d’une période inclusive', () => {
    expect(getDateRange('2026-12-30', '2027-01-02')).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ])
  })

  it('calcule un devis avec remise, frais et taxe de séjour', () => {
    const quote = calculateStayQuote({
      arrival: '2026-07-01',
      departure: '2026-07-08',
      guests: 5,
      settings,
      seasons: [season],
      overrides: [],
    })

    expect(quote.nights).toBe(7)
    expect(quote.accommodationSubtotal).toBe(1500)
    expect(quote.discountRate).toBe(10)
    expect(quote.discountAmount).toBe(150)
    expect(quote.cleaningFee).toBe(80)
    expect(quote.extraGuestFee).toBe(140)
    expect(quote.touristTax).toBe(87.5)
    expect(quote.total).toBe(1657.5)
  })
})
