import { describe, expect, it } from 'vitest'
import { buildStayPhaseContext, getStayPhase, getStayTiming } from '@/lib/guestStayPhase'

describe('guestStayPhase', () => {
  it('detects stay phases from dates', () => {
    expect(getStayPhase('2026-07-15', '2026-07-22', '2026-07-10')).toBe('before')
    expect(getStayPhase('2026-07-15', '2026-07-22', '2026-07-15')).toBe('arrival')
    expect(getStayPhase('2026-07-15', '2026-07-22', '2026-07-18')).toBe('during')
    expect(getStayPhase('2026-07-15', '2026-07-22', '2026-07-22')).toBe('departure')
    expect(getStayPhase('2026-07-15', '2026-07-22', '2026-07-25')).toBe('after')
  })

  it('prioritizes pending quotes in home context', () => {
    const ctx = buildStayPhaseContext('2026-07-15', '2026-07-22', { pendingCount: 2 })
    expect(ctx.headline).toContain('2 devis')
    expect(ctx.primaryAction?.target).toBe('requests')
  })

  it('builds a phase-aware stay label without clamping past stays', () => {
    expect(getStayTiming('2026-07-20', '2026-07-27', '2026-07-16').label).toBe(
      'Arrivée dans 4 jours',
    )
    expect(getStayTiming('2026-07-15', '2026-07-22', '2026-07-18').label).toBe(
      'Jour 4 sur 7',
    )
    expect(getStayTiming('2026-07-15', '2026-07-22', '2026-07-22').label).toBe(
      'Jour du départ',
    )
    expect(getStayTiming('2026-07-15', '2026-07-22', '2026-07-25').label).toBe(
      'Séjour terminé',
    )
  })
})
