import { describe, expect, it } from 'vitest'
import {
  computeRevenueSplit,
  DEFAULT_REVENUE_SPLIT,
  nightsBetween,
  recommendStayReserveAmount,
  shouldAutoApprove,
  type StayReserve,
} from '@/lib/stayReserve'

describe('recommendStayReserveAmount', () => {
  it('recommends premium tier for large groups', () => {
    expect(recommendStayReserveAmount({ nights: 7, maxGuests: 16 })).toBeGreaterThanOrEqual(7500)
  })

  it('recommends mid tier for medium villas', () => {
    const amount = recommendStayReserveAmount({ nights: 5, maxGuests: 8 })
    expect(amount).toBeGreaterThanOrEqual(3000)
  })

  it('recommends base tier for small stays', () => {
    const amount = recommendStayReserveAmount({ nights: 3, maxGuests: 4 })
    expect(amount).toBeGreaterThanOrEqual(1500)
  })
})

describe('nightsBetween', () => {
  it('counts nights between arrival and departure', () => {
    expect(nightsBetween('2026-07-01', '2026-07-08')).toBe(7)
  })

  it('returns at least one night', () => {
    expect(nightsBetween('2026-07-01', '2026-07-01')).toBe(1)
  })
})

describe('shouldAutoApprove', () => {
  const baseReserve: StayReserve = {
    id: 'r1',
    reservation_id: 'res1',
    property_id: 'p1',
    client_id: null,
    currency: 'EUR',
    recommended_amount: 3000,
    initial_amount: 3000,
    current_balance: 3000,
    spent_amount: 0,
    pending_amount: 0,
    status: 'funded',
    approval_mode: 'auto_under_limit',
    auto_approval_limit: 300,
    notification_before_spending: true,
    created_at: '',
    updated_at: '',
    closed_at: null,
  }

  it('auto-approves under limit in comfort mode', () => {
    expect(shouldAutoApprove(baseReserve, 180)).toBe(true)
  })

  it('requires manual approval above limit', () => {
    expect(shouldAutoApprove(baseReserve, 650)).toBe(false)
  })

  it('never auto-approves in manual mode', () => {
    expect(shouldAutoApprove({ ...baseReserve, approval_mode: 'manual' }, 100)).toBe(false)
  })
})

describe('computeRevenueSplit', () => {
  it('splits 75/10/15 by default', () => {
    const split = computeRevenueSplit(1000, DEFAULT_REVENUE_SPLIT)
    expect(split.providerAmount).toBe(750)
    expect(split.villaAmount).toBe(100)
    expect(split.platformCommission).toBe(150)
  })
})
