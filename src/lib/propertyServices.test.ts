import { describe, expect, it } from 'vitest'
import {
  countEnabledPropertyServices,
  mergePropertyServices,
  resolveServiceOffer,
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
    })

    expect(specific.mode).toBe('specific')
    expect(specific.providerLabel).toBe('Chef Remi')
    expect(specific.pricing.displayLabel).toContain('/ personne')
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
    })

    expect(general.isGeneral).toBe(true)
    expect(general.providerLabel).toBeNull()
    expect(general.conciergeMessage).toContain('conciergerie')
    expect(general.pricing.displayLabel).toContain('indicatif')
  })
})
