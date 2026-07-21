import { describe, it, expect } from 'vitest'
import { reservationWorkflowFields } from '../useSupabase'

// Mirrors the DB `reservations_workflow_consistency_check` constraint so the
// test fails if the helper ever drifts from what the database accepts.
function satisfiesConstraint(f: ReturnType<typeof reservationWorkflowFields>): boolean {
  const nonGuest =
    f.contract_mode === 'none' &&
    f.booking_kind !== 'guest' &&
    f.contract_status === 'none' &&
    f.payment_status === 'not_applicable' &&
    f.total_amount === 0
  const guest =
    f.contract_mode !== 'none' &&
    f.booking_kind === 'guest' &&
    f.payment_status !== 'not_applicable' &&
    ((f.contract_mode === 'already_done' && f.contract_status === 'signed') ||
      (['to_prepare', 'concierge'].includes(f.contract_mode) &&
        ['draft', 'sent', 'signed'].includes(f.contract_status)))
  return nonGuest || guest
}

describe('reservationWorkflowFields', () => {
  it('produces a constraint-consistent guest booking (to_prepare)', () => {
    const f = reservationWorkflowFields('guest', 'to_prepare', 12000)
    expect(f).toMatchObject({
      booking_kind: 'guest',
      contract_mode: 'to_prepare',
      contract_status: 'draft',
      payment_status: 'pending',
      total_amount: 12000,
    })
    expect(satisfiesConstraint(f)).toBe(true)
  })

  it('marks an already-signed contract as signed', () => {
    const f = reservationWorkflowFields('guest', 'already_done', 5000)
    expect(f.contract_status).toBe('signed')
    expect(satisfiesConstraint(f)).toBe(true)
  })

  it('falls back to to_prepare when a guest booking has no contract mode', () => {
    const f = reservationWorkflowFields('guest', 'none', 1000)
    expect(f.contract_mode).toBe('to_prepare')
    expect(satisfiesConstraint(f)).toBe(true)
  })

  it('turns non-guest bookings into non-billable holds', () => {
    for (const kind of ['owner_stay', 'marketing_event', 'blocked_dates', 'other'] as const) {
      const f = reservationWorkflowFields(kind, 'to_prepare', 9999)
      expect(f).toMatchObject({
        booking_kind: kind,
        contract_mode: 'none',
        contract_status: 'none',
        payment_status: 'not_applicable',
        total_amount: 0,
      })
      expect(satisfiesConstraint(f)).toBe(true)
    }
  })

  it('coerces a non-finite amount to 0', () => {
    const f = reservationWorkflowFields('guest', 'to_prepare', Number.NaN)
    expect(f.total_amount).toBe(0)
  })
})
