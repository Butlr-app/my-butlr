import { describe, expect, it } from 'vitest'
import { buildProductCardPayload, messagePreviewLabel } from './stayMessageTypes'
import type { BoutiqueCatalogEntry } from './boutique'

describe('stayMessageTypes', () => {
  it('builds product card payload from catalog entry', () => {
    const entry = {
      item: {
        id: 'item-1',
        title: 'Panier d’accueil',
        images: ['https://example.com/p.jpg'],
        currency: 'EUR',
        base_price: 120,
        price_type: 'fixed_price',
      },
      assignment: { custom_price: null },
      category: { name: 'Courses' },
    } as unknown as BoutiqueCatalogEntry

    expect(buildProductCardPayload(entry)).toMatchObject({
      catalog_item_id: 'item-1',
      title: 'Panier d’accueil',
      image_url: 'https://example.com/p.jpg',
      subtitle: 'Courses',
    })
  })

  it('labels product cards in previews', () => {
    expect(
      messagePreviewLabel('product_card', null, { catalog_item_id: '1', title: 'Champagne' }),
    ).toBe('Produit : Champagne')
  })
})
