import { describe, expect, it } from 'vitest'
import { isSubscriptionBlocking, type Subscription } from './billing'

function sub(partial: Partial<Subscription>): Subscription {
  return {
    id: 'sub-1',
    owner_id: 'owner-1',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    plan: 'starter',
    status: 'trialing',
    trial_ends_at: null,
    current_period_end: null,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...partial,
  }
}

describe('isSubscriptionBlocking', () => {
  const today = new Date('2026-07-20T12:00:00Z')

  it('ne bloque pas sans abonnement (trial soft)', () => {
    expect(isSubscriptionBlocking(null, today)).toBe(false)
  })

  it('bloque canceled et past_due', () => {
    expect(isSubscriptionBlocking(sub({ status: 'canceled' }), today)).toBe(true)
    expect(isSubscriptionBlocking(sub({ status: 'past_due' }), today)).toBe(true)
  })

  it('bloque un trial expiré', () => {
    expect(isSubscriptionBlocking(sub({
      status: 'trialing',
      trial_ends_at: '2026-07-01T00:00:00Z',
    }), today)).toBe(true)
  })

  it('autorise active', () => {
    expect(isSubscriptionBlocking(sub({ status: 'active' }), today)).toBe(false)
  })
})
