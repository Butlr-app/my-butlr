import { describe, expect, it } from 'vitest'
import {
  formatDateForDisplay,
  normalizeDateFormat,
  parseDateInput,
} from './dateFormat'

describe('dateFormat', () => {
  it('utilise le format français par défaut', () => {
    expect(normalizeDateFormat(null)).toBe('DD/MM/YYYY')
    expect(formatDateForDisplay('2026-12-31')).toBe('31/12/2026')
    expect(parseDateInput('31/12/2026')).toBe('2026-12-31')
  })

  it('gère les formats américain et ISO', () => {
    expect(formatDateForDisplay('2026-12-31', 'MM/DD/YYYY')).toBe('12/31/2026')
    expect(parseDateInput('12/31/2026', 'MM/DD/YYYY')).toBe('2026-12-31')
    expect(formatDateForDisplay('2026-12-31', 'YYYY-MM-DD')).toBe('2026-12-31')
    expect(parseDateInput('2026-12-31', 'YYYY-MM-DD')).toBe('2026-12-31')
  })

  it('refuse les dates inexistantes ou mal formatées', () => {
    expect(parseDateInput('31/02/2026')).toBeNull()
    expect(parseDateInput('2026-12-31')).toBeNull()
    expect(parseDateInput('13/31/2026', 'MM/DD/YYYY')).toBeNull()
  })
})
