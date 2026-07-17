import { describe, expect, it } from 'vitest'
import {
  canDirectBookService,
  computeDirectServiceAmount,
  computeServiceAmount,
  countEnabledPropertyServices,
  mergePropertyServices,
  normalizeServiceOptions,
  resolveServiceBookingMode,
  resolveServiceOffer,
  resolveServiceOptions,
} from './propertyServices'
import type { Service } from './types'

const catalog: Service[] = [
  {
    id: 's1',
    name: 'Private Chef',
    description: 'Chef à domicile',
    category: 'dining',
    starting_price: 850,
    commission: 10,
    available: true,
    pricing_mode: 'fixed',
    booking_mode: 'quote',
  },
  {
    id: 's2',
    name: 'Helicopter Tour',
    description: 'Sur mesure',
    category: 'activities',
    starting_price: 1500,
    commission: 12,
    available: true,
    pricing_mode: 'quote',
    booking_mode: 'quote',
  },
]

describe('propertyServices', () => {
  it('merges catalog services with property assignments', () => {
    const items = mergePropertyServices(catalog, [{
      id: 'a1',
      property_id: 'p1',
      service_id: 's1',
      enabled: true,
      sort_order: 0,
      custom_price: 900,
      custom_description: null,
      pricing_mode: null,
      provider_name: null,
      includes_text: null,
      offer_title: null,
      is_detailed: false,
      offer_mode: 'specific',
      general_note: null,
      booking_mode: null,
    }])

    expect(items).toHaveLength(2)
    expect(items[0].enabled).toBe(true)
    expect(items[0].pricing.displayLabel).toContain('900')
    expect(items[1].pricing.displayLabel).toBe('Sur devis')
    expect(countEnabledPropertyServices(items)).toBe(1)
  })

  it('tracks detailed vs simple service cards', () => {
    const specific = resolveServiceOffer(catalog[0], {
      id: 'a2',
      property_id: 'p1',
      service_id: 's1',
      enabled: true,
      sort_order: 0,
      custom_price: 55,
      custom_description: null,
      pricing_mode: 'per_person',
      provider_name: 'Chef Remi',
      includes_text: 'Courses incluses',
      offer_title: 'Repas asiatique',
      is_detailed: true,
      offer_mode: 'specific',
      general_note: null,
      booking_mode: 'direct',
    })

    expect(specific.mode).toBe('specific')
    expect(specific.providerLabel).toBe('Chef Remi')
    expect(specific.pricing.displayLabel).toContain('/ personne')
  })

  it('autorise l’achat direct seulement avec prix et mode direct', () => {
    const assignment = {
      id: 'a-direct',
      property_id: 'p1',
      service_id: 's1',
      enabled: true,
      sort_order: 0,
      custom_price: 900,
      custom_description: null,
      pricing_mode: 'fixed' as const,
      provider_name: null,
      includes_text: null,
      offer_title: null,
      is_detailed: false,
      offer_mode: 'specific' as const,
      general_note: null,
      booking_mode: 'direct' as const,
    }

    expect(resolveServiceBookingMode(catalog[0], assignment)).toBe('direct')
    expect(canDirectBookService(catalog[0], assignment)).toBe(true)
    expect(computeDirectServiceAmount(catalog[0], assignment, 2)).toBe(900)

    expect(canDirectBookService(catalog[1], {
      ...assignment,
      service_id: 's2',
      pricing_mode: 'quote',
      booking_mode: 'direct',
    })).toBe(false)

    expect(canDirectBookService(catalog[0], {
      ...assignment,
      offer_mode: 'general',
      booking_mode: 'direct',
    })).toBe(false)
  })

  it('calcule le total par personne pour l’achat direct', () => {
    const amount = computeDirectServiceAmount(catalog[0], {
      id: 'a-pp',
      property_id: 'p1',
      service_id: 's1',
      enabled: true,
      sort_order: 0,
      custom_price: 55,
      custom_description: null,
      pricing_mode: 'per_person',
      provider_name: null,
      includes_text: null,
      offer_title: null,
      is_detailed: false,
      offer_mode: 'specific',
      general_note: null,
      booking_mode: 'direct',
    }, 3)
    expect(amount).toBe(165)
  })

  it('calcule le prix avec options (aéroport, modèle…)', () => {
    const transfer: Service = {
      ...catalog[0],
      id: 's-transfer',
      name: 'Airport Transfer',
      starting_price: 0,
      booking_mode: 'direct',
      options: [
        {
          id: 'airport',
          label: 'Aéroport',
          required: true,
          choices: [
            { id: 'nice', label: 'Nice', price: 120 },
            { id: 'monaco', label: 'Monaco', price: 180 },
          ],
        },
      ],
    }
    const assignment = {
      id: 'a-opt',
      property_id: 'p1',
      service_id: 's-transfer',
      enabled: true,
      sort_order: 0,
      custom_price: 0,
      custom_description: null,
      pricing_mode: 'fixed' as const,
      provider_name: null,
      includes_text: null,
      offer_title: null,
      is_detailed: false,
      offer_mode: 'specific' as const,
      general_note: null,
      booking_mode: 'direct' as const,
    }

    expect(resolveServiceOptions(transfer, assignment)).toHaveLength(1)
    expect(canDirectBookService(transfer, assignment)).toBe(true)
    expect(computeServiceAmount(transfer, assignment, 1, { airport: 'nice' })).toBe(120)
    expect(computeDirectServiceAmount(transfer, assignment, 1, { airport: 'monaco' })).toBe(180)
    expect(computeDirectServiceAmount(transfer, assignment, 1, {})).toBeNull()
    expect(normalizeServiceOptions([{ label: 'Modèle', choices: [{ label: 'SUV', price: 150 }] }])[0].choices[0].price).toBe(150)
  })

  it('supports generalized concierge-proposed offers', () => {
    const general = resolveServiceOffer(catalog[0], {
      id: 'a3',
      property_id: 'p1',
      service_id: 's1',
      enabled: true,
      sort_order: 0,
      custom_price: 850,
      custom_description: null,
      pricing_mode: 'fixed',
      provider_name: null,
      includes_text: null,
      offer_title: 'Chef privé à domicile',
      is_detailed: false,
      offer_mode: 'general',
      general_note: null,
      booking_mode: 'direct',
    })

    expect(general.isGeneral).toBe(true)
    expect(general.providerLabel).toBeNull()
    expect(general.conciergeMessage).toContain('conciergerie')
    expect(general.pricing.displayLabel).toContain('indicatif')
  })
})
