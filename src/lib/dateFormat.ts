export const dateFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const

export type DateFormat = typeof dateFormats[number]

export const DEFAULT_DATE_FORMAT: DateFormat = 'DD/MM/YYYY'

export const dateFormatLabels: Record<DateFormat, string> = {
  'DD/MM/YYYY': '31/12/2026 — France',
  'MM/DD/YYYY': '12/31/2026 — États-Unis',
  'YYYY-MM-DD': '2026-12-31 — ISO',
}

export function normalizeDateFormat(value?: string | null): DateFormat {
  return dateFormats.includes(value as DateFormat)
    ? value as DateFormat
    : DEFAULT_DATE_FORMAT
}

export function localeForDateFormat(format?: string | null): string {
  return normalizeDateFormat(format) === 'MM/DD/YYYY' ? 'en-US' : 'fr-FR'
}

export function formatDateForDisplay(
  isoDate: string,
  format?: string | null,
): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return isoDate

  const [, year, month, day] = match

  switch (normalizeDateFormat(format)) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`
    case 'YYYY-MM-DD':
      return isoDate
    default:
      return `${day}/${month}/${year}`
  }
}

export function parseDateInput(
  input: string,
  format?: string | null,
): string | null {
  const value = input.trim()
  let year: number
  let month: number
  let day: number

  switch (normalizeDateFormat(format)) {
    case 'MM/DD/YYYY': {
      const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value)
      if (!match) return null
      month = Number(match[1])
      day = Number(match[2])
      year = Number(match[3])
      break
    }
    case 'YYYY-MM-DD': {
      const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value)
      if (!match) return null
      year = Number(match[1])
      month = Number(match[2])
      day = Number(match[3])
      break
    }
    default: {
      const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value)
      if (!match) return null
      day = Number(match[1])
      month = Number(match[2])
      year = Number(match[3])
    }
  }

  const candidate = new Date(Date.UTC(year, month - 1, day))
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
  ) {
    return null
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Formats a stay date range for display, e.g. "12 – 19 juillet 2026" or
 * "28 juin – 3 juillet 2026". Falls back gracefully on malformed input.
 */
export function formatStayRange(
  arrival: string,
  departure: string,
  format?: string | null,
): string {
  const start = /^\d{4}-\d{2}-\d{2}$/.test(arrival) ? new Date(`${arrival}T12:00:00`) : null
  const end = /^\d{4}-\d{2}-\d{2}$/.test(departure) ? new Date(`${departure}T12:00:00`) : null
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${formatDateForDisplay(arrival, format)} → ${formatDateForDisplay(departure, format)}`
  }

  const locale = localeForDateFormat(format)
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const sameYear = start.getFullYear() === end.getFullYear()

  const dayMonthYear = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  const dayOnly = new Intl.DateTimeFormat(locale, { day: 'numeric' })
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' })

  if (sameMonth) {
    return `${dayOnly.format(start)} – ${dayMonthYear.format(end)}`
  }
  if (sameYear) {
    return `${dayMonth.format(start)} – ${dayMonthYear.format(end)}`
  }
  return `${dayMonthYear.format(start)} – ${dayMonthYear.format(end)}`
}
