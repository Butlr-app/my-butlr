import { describe, expect, it } from 'vitest'
import { buildStayPhaseContext, getStayPhase } from '@/lib/guestStayPhase'

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
})
