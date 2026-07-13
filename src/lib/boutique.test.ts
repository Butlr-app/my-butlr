import { describe, expect, it } from 'vitest'
import {
  cartEstimatedTotal,
  formatCatalogPrice,
  resolveCatalogPrice,
  type BoutiqueCartLine,
  type BoutiqueCatalogEntry,
  type CatalogItem,
} from '@/lib/boutique'

const sampleItem: CatalogItem = {
  id: '1',
  type: 'product',
  category_id: 'c1',
  title: 'Pack arrivée',
  short_description: 'Essentiels',
  long_description: null,
  images: [],
  base_price: 250,
  price_type: 'fixed_price',
  currency: 'EUR',
  provider_name: null,
  availability_status: 'available',
  minimum_notice_hours: 0,
  duration_minutes: null,
  max_quantity: 10,
  requires_quote: false,
  requires_approval: false,
  is_featured: true,
  is_active: true,
}

describe('formatCatalogPrice', () => {
  it('formats fixed price', () => {
    expect(formatCatalogPrice(sampleItem, null)).toContain('250')
  })

  it('shows sur devis for quote items', () => {
    expect(formatCatalogPrice({ ...sampleItem, requires_quote: true, base_price: null }, null)).toBe('Sur devis')
  })
})

describe('cartEstimatedTotal', () => {
  it('sums fixed price lines', () => {
    const catalog: BoutiqueCatalogEntry[] = [{
      assignment: { id: 'a1', property_id: 'p1', catalog_item_id: '1', enabled: true, custom_price: null, is_featured: false, sort_order: 0 },
      item: sampleItem,
      category: { id: 'c1', slug: 'groceries', name: 'Courses', description: null, icon: null, sort_order: 0, is_active: true },
    }]
    const lines: BoutiqueCartLine[] = [{ catalogItemId: '1', quantity: 2 }]
    expect(cartEstimatedTotal(lines, catalog)).toEqual({ total: 500, hasQuote: false })
  })
})

describe('resolveCatalogPrice', () => {
  it('prefers custom property price', () => {
    expect(resolveCatalogPrice(sampleItem, {
      id: 'a1', property_id: 'p1', catalog_item_id: '1', enabled: true,
      custom_price: 199, is_featured: false, sort_order: 0,
    })).toBe(199)
  })
})
