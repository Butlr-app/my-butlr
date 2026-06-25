import { describe, it, expect } from 'vitest'
import {
  generateIcs,
  parseIcs,
  guestNameFromSummary,
  rangesOverlap,
  findConflicts,
} from '../ical'
import type { Reservation, Property } from '../useSupabase'

const property: Property = {
  id: 'prop-1',
  name: 'Villa The French Way',
} as Property

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'res-1',
    guest_name: 'Pavard',
    guest_email: 'pavard@example.com',
    guest_phone: '+33600000000',
    property_id: 'prop-1',
    arrival: '2026-07-01',
    departure: '2026-07-08',
    guests_count: 4,
    total_amount: 60000,
    status: 'confirmed',
    payment_status: 'paid',
    contract_status: 'signed',
    notes: null,
    ...overrides,
  } as Reservation
}

describe('generateIcs', () => {
  it('produces a valid VCALENDAR wrapper', () => {
    const ics = generateIcs([makeReservation()], [property])
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
    expect(ics).toContain('VERSION:2.0')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('END:VEVENT')
  })

  it('uses all-day DATE values for arrival and departure', () => {
    const ics = generateIcs([makeReservation()], [property])
    expect(ics).toContain('DTSTART;VALUE=DATE:20260701')
    expect(ics).toContain('DTEND;VALUE=DATE:20260708')
  })

  it('includes the guest name and property in the summary', () => {
    const ics = generateIcs([makeReservation()], [property])
    expect(ics).toContain('SUMMARY:Pavard — Villa The French Way')
  })

  it('marks cancelled reservations as CANCELLED', () => {
    const ics = generateIcs([makeReservation({ status: 'cancelled' })], [property])
    expect(ics).toContain('STATUS:CANCELLED')
  })

  it('filters by property when propertyId is provided', () => {
    const reservations = [
      makeReservation({ id: 'a', property_id: 'prop-1', guest_name: 'Alice' }),
      makeReservation({ id: 'b', property_id: 'prop-2', guest_name: 'Bob' }),
    ]
    const ics = generateIcs(reservations, [property], { propertyId: 'prop-1' })
    expect(ics).toContain('Alice')
    expect(ics).not.toContain('Bob')
  })

  it('escapes special characters in text fields', () => {
    const ics = generateIcs([makeReservation({ notes: 'a; b, c' })], [property])
    expect(ics).toContain('\\;')
    expect(ics).toContain('\\,')
  })
})

describe('parseIcs', () => {
  it('round-trips an exported calendar', () => {
    const ics = generateIcs([makeReservation()], [property])
    const events = parseIcs(ics)
    expect(events).toHaveLength(1)
    expect(events[0].arrival).toBe('2026-07-01')
    expect(events[0].departure).toBe('2026-07-08')
  })

  it('parses an Airbnb-style .ics block', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20260810',
      'DTEND;VALUE=DATE:20260815',
      'SUMMARY:Reserved',
      'UID:abc-123@airbnb.com',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const events = parseIcs(ics)
    expect(events).toHaveLength(1)
    expect(events[0].arrival).toBe('2026-08-10')
    expect(events[0].departure).toBe('2026-08-15')
    expect(events[0].uid).toBe('abc-123@airbnb.com')
  })

  it('unfolds continuation lines', () => {
    const longText = 'X'.repeat(120)
    const ics = generateIcs([makeReservation({ notes: longText })], [property])
    const events = parseIcs(ics)
    expect(events[0].description).toContain('X'.repeat(120))
  })

  it('returns empty array for non-calendar text', () => {
    expect(parseIcs('not a calendar')).toEqual([])
  })
})

describe('guestNameFromSummary', () => {
  it('keeps a real guest name', () => {
    expect(guestNameFromSummary('Pavard — Villa')).toBe('Pavard')
  })

  it('falls back for generic Airbnb/Booking summaries', () => {
    expect(guestNameFromSummary('Reserved')).toBe('Imported booking')
    expect(guestNameFromSummary('CLOSED - Not available')).toBe('Imported booking')
    expect(guestNameFromSummary('')).toBe('Imported booking')
  })
})

describe('rangesOverlap', () => {
  it('detects overlapping ranges', () => {
    expect(rangesOverlap('2026-07-01', '2026-07-08', '2026-07-05', '2026-07-10')).toBe(true)
  })

  it('treats back-to-back bookings (checkout = checkin) as non-conflicting', () => {
    expect(rangesOverlap('2026-07-01', '2026-07-08', '2026-07-08', '2026-07-12')).toBe(false)
  })

  it('returns false for disjoint ranges', () => {
    expect(rangesOverlap('2026-07-01', '2026-07-05', '2026-07-10', '2026-07-12')).toBe(false)
  })
})

describe('findConflicts', () => {
  const existing = [
    makeReservation({ id: 'res-1', property_id: 'prop-1', arrival: '2026-07-01', departure: '2026-07-08' }),
    makeReservation({ id: 'res-2', property_id: 'prop-1', arrival: '2026-08-01', departure: '2026-08-05', status: 'cancelled' }),
    makeReservation({ id: 'res-3', property_id: 'prop-2', arrival: '2026-07-03', departure: '2026-07-09' }),
  ]

  it('flags an overlapping booking on the same property', () => {
    const conflicts = findConflicts(
      { property_id: 'prop-1', arrival: '2026-07-05', departure: '2026-07-10' },
      existing
    )
    expect(conflicts.map(c => c.id)).toEqual(['res-1'])
  })

  it('ignores cancelled reservations', () => {
    const conflicts = findConflicts(
      { property_id: 'prop-1', arrival: '2026-08-02', departure: '2026-08-04' },
      existing
    )
    expect(conflicts).toHaveLength(0)
  })

  it('ignores conflicts on a different property', () => {
    const conflicts = findConflicts(
      { property_id: 'prop-1', arrival: '2026-07-03', departure: '2026-07-09' },
      existing
    )
    expect(conflicts.map(c => c.id)).toEqual(['res-1'])
  })
})
