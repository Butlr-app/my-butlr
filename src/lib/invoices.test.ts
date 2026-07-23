import { describe, expect, it } from 'vitest'
import {
  billableItemsToLineItems,
  buildInvoiceClientRef,
  computeInvoiceTotals,
  conciergeRequestToBillableItem,
  isBillableConciergeRequest,
  mergeStayLineItems,
  resolveBoutiqueItemAmount,
  type InvoiceLineItem,
} from './invoices'
import type { StayServiceRequest } from './stayReserve'
import type { StoreOrderItem } from './boutique'

const conciergeRequest = (overrides: Partial<StayServiceRequest>): StayServiceRequest => ({
  id: 'req-1',
  reservation_id: 'res-1',
  stay_reserve_id: 'reserve-1',
  property_id: 'prop-1',
  category: 'Transport',
  title: 'Transfert aéroport',
  description: null,
  requested_date: null,
  urgency: 'normal',
  status: 'completed',
  estimated_amount: 120,
  final_amount: 150,
  provider_name: null,
  property_service_id: null,
  approved_at: null,
  completed_at: null,
  created_at: '2026-07-01T10:00:00Z',
  updated_at: '2026-07-01T10:00:00Z',
  ...overrides,
})

describe('invoices', () => {
  it('identifie les demandes conciergerie facturables', () => {
    expect(isBillableConciergeRequest(conciergeRequest({ status: 'completed' }))).toBe(true)
    expect(isBillableConciergeRequest(conciergeRequest({ status: 'cancelled' }))).toBe(false)
    expect(isBillableConciergeRequest(conciergeRequest({ final_amount: null, estimated_amount: null }))).toBe(false)
  })

  it('convertit une demande conciergerie en ligne de facture', () => {
    const billable = conciergeRequestToBillableItem(conciergeRequest({}))
    expect(billable.amount).toBe(150)
    expect(billableItemsToLineItems([billable])[0]).toMatchObject({
      description: 'Conciergerie — Transfert aéroport (Transport)',
      unitPrice: 150,
      quantity: 1,
      sourceType: 'concierge',
      sourceId: 'req-1',
    })
  })

  it('calcule les totaux HT / TVA / TTC', () => {
    const items: InvoiceLineItem[] = [
      { description: 'A', unitPrice: 100, quantity: 1, vatPercent: 20 },
      { description: 'B', unitPrice: 50, quantity: 2, vatPercent: 10 },
    ]

    expect(computeInvoiceTotals(items)).toEqual({
      subtotalHT: 200,
      totalVAT: 30,
      totalTTC: 230,
    })
  })

  it('fusionne les lignes séjour et conserve les lignes manuelles', () => {
    const current: InvoiceLineItem[] = [
      { description: 'Manuel', unitPrice: 10, quantity: 1, vatPercent: 20, sourceType: 'manual' },
      { description: 'Ancienne ligne séjour', unitPrice: 99, quantity: 1, vatPercent: 20, sourceType: 'concierge', sourceId: 'old' },
    ]
    const stay: InvoiceLineItem[] = [
      { description: 'Nouvelle ligne', unitPrice: 40, quantity: 1, vatPercent: 20, sourceType: 'boutique', sourceId: 'new' },
    ]

    expect(mergeStayLineItems(current, stay)).toHaveLength(2)
    expect(mergeStayLineItems(current, stay)[0].description).toBe('Nouvelle ligne')
    expect(mergeStayLineItems(current, stay)[1].description).toBe('Manuel')
  })

  it('résout le montant boutique depuis total ou unitaire', () => {
    const item = {
      total_price: null,
      unit_price: 25,
      quantity: 3,
      quoted_amount: null,
    } as StoreOrderItem

    expect(resolveBoutiqueItemAmount(item)).toBe(75)
  })

  it('construit la référence client depuis la réservation', () => {
    expect(buildInvoiceClientRef({
      id: 'res-1',
      property_id: 'prop-1',
      guest_name: 'Alice',
      guest_email: null,
      guest_phone: null,
      arrival: '2026-08-01',
      departure: '2026-08-08',
      guests_count: 4,
      status: 'confirmed',
      payment_status: 'paid',
      contract_status: 'signed',
      contract_mode: 'to_prepare',
      booking_kind: 'guest',
      total_amount: 10000,
      notes: null,
      properties: { name: 'Villa Azur' },
    })).toBe('Villa Azur — séjour 2026-08-01 → 2026-08-08')
  })
})
