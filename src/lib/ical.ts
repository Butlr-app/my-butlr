/**
 * iCalendar (RFC 5545) utilities for syncing reservations with
 * Airbnb / Booking.com and other platforms that expose .ics calendar feeds.
 *
 * No external dependencies — manual generation/parsing, consistent with
 * the CSV utilities in importExport.ts.
 *
 * Browsers cannot fetch a remote Airbnb/Booking .ics feed directly because
 * those hosts do not send CORS headers, so import works from an uploaded
 * file or pasted .ics text. (Automatic URL polling would require a backend
 * edge function — see PR description.)
 */

import type { Reservation, Property } from './useSupabase'

// ─── Export: reservations → .ics ─────────────────────────────────────────────

const PRODID = '-//My Butlr//Reservations//EN'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Format a YYYY-MM-DD date string as an iCal DATE value (YYYYMMDD). */
function toIcsDate(date: string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date.replace(/-/g, '')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}

/** Format a Date as an iCal UTC date-time value (YYYYMMDDTHHMMSSZ). */
function toIcsDateTime(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

/** Escape a text value per RFC 5545 (commas, semicolons, newlines, backslashes). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Fold lines longer than 75 octets per RFC 5545 (continuation with leading space). */
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const chunks: string[] = []
  let remaining = line
  chunks.push(remaining.slice(0, 75))
  remaining = remaining.slice(75)
  while (remaining.length > 74) {
    chunks.push(' ' + remaining.slice(0, 74))
    remaining = remaining.slice(74)
  }
  if (remaining.length > 0) chunks.push(' ' + remaining)
  return chunks.join('\r\n')
}

export interface IcsExportOptions {
  /** Restrict export to a single property; omit for all reservations. */
  propertyId?: string
  calendarName?: string
}

export function generateIcs(
  reservations: Reservation[],
  properties: Property[],
  options: IcsExportOptions = {}
): string {
  const propsById = new Map(properties.map(p => [p.id, p]))
  const stamp = toIcsDateTime(new Date())

  const filtered = options.propertyId
    ? reservations.filter(r => r.property_id === options.propertyId)
    : reservations

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  if (options.calendarName) {
    lines.push(`X-WR-CALNAME:${escapeText(options.calendarName)}`)
  }

  for (const r of filtered) {
    const property = r.property_id ? propsById.get(r.property_id) : undefined
    const summary = `${r.guest_name}${property ? ` — ${property.name}` : ''}`
    const descriptionParts = [
      `Status: ${r.status}`,
      `Guests: ${r.guests_count}`,
      `Payment: ${r.payment_status}`,
    ]
    if (r.guest_email) descriptionParts.push(`Email: ${r.guest_email}`)
    if (r.guest_phone) descriptionParts.push(`Phone: ${r.guest_phone}`)
    if (r.notes) descriptionParts.push(`Notes: ${r.notes}`)

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:reservation-${r.id}@mybutlr`)
    lines.push(`DTSTAMP:${stamp}`)
    // All-day events: DTEND is exclusive (checkout day), matching Airbnb/Booking.
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(r.arrival)}`)
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(r.departure)}`)
    lines.push(foldLine(`SUMMARY:${escapeText(summary)}`))
    lines.push(foldLine(`DESCRIPTION:${escapeText(descriptionParts.join('\\n'))}`))
    if (property?.location) {
      lines.push(foldLine(`LOCATION:${escapeText(property.location)}`))
    }
    lines.push(`STATUS:${r.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcs(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Import: .ics → reservation drafts ───────────────────────────────────────

export interface ParsedIcsEvent {
  uid: string | null
  summary: string
  arrival: string // YYYY-MM-DD
  departure: string // YYYY-MM-DD
  description: string | null
  cancelled: boolean
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

/** Parse an iCal DATE or DATE-TIME value into a YYYY-MM-DD string. */
function parseIcsDate(value: string): string | null {
  const raw = value.trim()
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

/**
 * Parse .ics text into events. Unfolds continuation lines, strips property
 * parameters (e.g. DTSTART;VALUE=DATE), and extracts the fields we need to
 * create reservations.
 */
export function parseIcs(text: string): ParsedIcsEvent[] {
  // Unfold: a line beginning with a space/tab continues the previous line.
  const rawLines = text.split(/\r?\n/)
  const unfolded: string[] = []
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1)
    } else {
      unfolded.push(line)
    }
  }

  const events: ParsedIcsEvent[] = []
  let current: Partial<ParsedIcsEvent> & { _start?: string; _end?: string } | null = null

  for (const line of unfolded) {
    if (line === 'BEGIN:VEVENT') {
      current = { uid: null, summary: '', description: null, cancelled: false }
      continue
    }
    if (line === 'END:VEVENT') {
      if (current && current._start && current._end) {
        events.push({
          uid: current.uid ?? null,
          summary: current.summary ?? '',
          arrival: current._start,
          departure: current._end,
          description: current.description ?? null,
          cancelled: current.cancelled ?? false,
        })
      }
      current = null
      continue
    }
    if (!current) continue

    const colon = line.indexOf(':')
    if (colon === -1) continue
    const rawKey = line.slice(0, colon)
    const value = line.slice(colon + 1)
    const key = rawKey.split(';')[0].toUpperCase()

    switch (key) {
      case 'UID':
        current.uid = value.trim()
        break
      case 'SUMMARY':
        current.summary = unescapeText(value)
        break
      case 'DESCRIPTION':
        current.description = unescapeText(value)
        break
      case 'DTSTART':
        current._start = parseIcsDate(value) ?? undefined
        break
      case 'DTEND':
        current._end = parseIcsDate(value) ?? undefined
        break
      case 'STATUS':
        if (value.trim().toUpperCase() === 'CANCELLED') current.cancelled = true
        break
    }
  }

  return events
}

// ─── Double-booking detection ────────────────────────────────────────────────

/**
 * Two date ranges overlap when each starts before the other ends. Departure
 * dates are exclusive (checkout day), so back-to-back bookings (one departs
 * the day another arrives) do NOT count as a conflict.
 */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart < bEnd && bStart < aEnd
}

export interface BookingConflict {
  candidate: { arrival: string; departure: string; summary: string }
  existing: Reservation
}

/**
 * Find conflicts between candidate (e.g. imported) date ranges and existing
 * reservations on the same property. Cancelled reservations are ignored.
 */
export function findConflicts(
  candidate: { property_id: string | null; arrival: string; departure: string; summary?: string },
  existing: Reservation[]
): Reservation[] {
  return existing.filter(
    r =>
      r.status !== 'cancelled' &&
      r.property_id === candidate.property_id &&
      rangesOverlap(candidate.arrival, candidate.departure, r.arrival, r.departure)
  )
}

/**
 * Heuristic to pull a guest name out of an imported event summary.
 * Airbnb uses summaries like "Reserved" or "CLOSED - Not available";
 * Booking.com uses "CLOSED". When no real guest name is present we fall
 * back to a generic label so the event still imports as a blocked slot.
 */
export function guestNameFromSummary(summary: string): string {
  const trimmed = summary.trim()
  const upper = trimmed.toUpperCase()
  if (
    trimmed === '' ||
    upper === 'RESERVED' ||
    upper.startsWith('CLOSED') ||
    upper.includes('NOT AVAILABLE') ||
    upper.includes('UNAVAILABLE') ||
    upper.includes('BLOCKED')
  ) {
    return 'Imported booking'
  }
  // Strip a trailing " — Property" suffix if present.
  return trimmed.split(' — ')[0].split(' - ')[0].trim() || 'Imported booking'
}
