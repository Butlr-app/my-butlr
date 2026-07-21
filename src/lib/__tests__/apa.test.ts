import { describe, it, expect } from 'vitest'
import { computePayout, buildPayoutDrafts, isReversible, DEFAULT_PLATFORM_RATE } from '../apa'
import type { Payment, Partner } from '../useSupabase'

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'pay-1',
    reservation_id: 'res-1',
    property_id: 'prop-1',
    guest_name: 'M. & Mme Laurent',
    property_name: 'Villa French Way',
    type: 'booking',
    amount: 18500,
    status: 'paid',
    date: '2026-06-01',
    partner_id: null,
    created_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

const partners: Partner[] = [
  { id: 'p1', name: 'Spa Prestige', commission: 12 } as Partner,
  { id: 'p2', name: 'Azure Boats', commission: 15 } as Partner,
]

describe('isReversible', () => {
  it('only reverses collected booking/deposit/service payments', () => {
    expect(isReversible(makePayment({ type: 'booking', status: 'paid' }))).toBe(true)
    expect(isReversible(makePayment({ type: 'deposit', status: 'paid' }))).toBe(true)
    expect(isReversible(makePayment({ type: 'service', status: 'paid' }))).toBe(true)
    expect(isReversible(makePayment({ type: 'commission', status: 'paid' }))).toBe(false)
    expect(isReversible(makePayment({ type: 'booking', status: 'pending' }))).toBe(false)
  })
})

describe('computePayout', () => {
  it('reverses a villa booking net of the platform fee', () => {
    const d = computePayout(makePayment({ type: 'booking', amount: 18500 }), partners, 15)
    expect(d).not.toBeNull()
    expect(d!.payee_type).toBe('villa')
    expect(d!.payee_name).toBe('Villa French Way')
    expect(d!.commission_rate).toBe(15)
    expect(d!.commission_amount).toBe(2775)
    expect(d!.net_amount).toBe(15725)
  })

  it('reverses a partner service net of the partner commission', () => {
    const d = computePayout(
      makePayment({ type: 'service', guest_name: 'Spa Prestige', property_name: 'Villa Mauritius', amount: 600 }),
      partners,
      DEFAULT_PLATFORM_RATE,
    )
    expect(d!.payee_type).toBe('partner')
    expect(d!.payee_name).toBe('Spa Prestige')
    expect(d!.commission_rate).toBe(12)
    expect(d!.commission_amount).toBe(72)
    expect(d!.net_amount).toBe(528)
  })

  it('matches the partner by partner_id even when the name differs', () => {
    const d = computePayout(
      makePayment({ type: 'service', guest_name: 'legacy label', partner_id: 'p1', amount: 600 }),
      partners,
      DEFAULT_PLATFORM_RATE,
    )
    expect(d!.payee_name).toBe('Spa Prestige')
    expect(d!.commission_rate).toBe(12)
    expect(d!.net_amount).toBe(528)
  })

  it('falls back to the platform rate for an unknown partner', () => {
    const d = computePayout(makePayment({ type: 'service', guest_name: 'Unknown Chef', amount: 1000 }), partners, 20)
    expect(d!.commission_rate).toBe(20)
    expect(d!.net_amount).toBe(800)
  })

  it('returns null for non-reversible payments', () => {
    expect(computePayout(makePayment({ type: 'commission' }), partners, 15)).toBeNull()
    expect(computePayout(makePayment({ status: 'pending' }), partners, 15)).toBeNull()
  })
})

describe('buildPayoutDrafts', () => {
  it('skips already-generated payments and non-reversible ones', () => {
    const payments = [
      makePayment({ id: 'a', type: 'booking', amount: 10000 }),
      makePayment({ id: 'b', type: 'service', guest_name: 'Azure Boats', amount: 1000 }),
      makePayment({ id: 'c', type: 'commission', amount: 450 }),
      makePayment({ id: 'd', type: 'booking', amount: 5000, status: 'pending' }),
    ]
    const drafts = buildPayoutDrafts(payments, partners, new Set(['a']), 15)
    expect(drafts.map(d => d.payment_id)).toEqual(['b'])
    expect(drafts[0].net_amount).toBe(850)
  })
})
