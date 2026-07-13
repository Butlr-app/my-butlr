import { describe, expect, it } from 'vitest'
import {
  hasEmergencyContacts,
  normalizeEmergencyContactsForSave,
  parseEmergencyContacts,
  serializeEmergencyContacts,
} from './emergencyContacts'
import { serializeGuideContent } from './guideContent'

describe('emergencyContacts', () => {
  it('parses legacy plain text as a single contact note', () => {
    const doc = parseEmergencyContacts('Conciergerie 24/7 : +33 6 00 00 00 00')
    expect(doc.contacts).toHaveLength(1)
    expect(doc.contacts[0].notes).toContain('Conciergerie')
  })

  it('round-trips structured contacts and instructions', () => {
    const serialized = serializeEmergencyContacts({
      v: 1,
      contacts: [{
        id: '1',
        label: 'Conciergerie',
        role: 'concierge',
        phone: '+33 6 12 34 56 78',
        email: 'help@example.com',
        notes: 'Disponible la nuit',
        available247: true,
      }],
      instructions: serializeGuideContent([
        { id: 'b1', type: 'text', text: 'Coupez le gaz en cas de fuite.' },
      ]),
    })

    const parsed = parseEmergencyContacts(serialized)
    expect(parsed.contacts[0].label).toBe('Conciergerie')
    expect(parsed.contacts[0].available247).toBe(true)
    expect(hasEmergencyContacts(serialized)).toBe(true)
  })

  it('normalizes empty contacts to null', () => {
    const empty = serializeEmergencyContacts({
      v: 1,
      contacts: [{
        id: '1',
        label: '',
        role: 'other',
        phone: '',
        email: '',
        notes: '',
        available247: false,
      }],
      instructions: null,
    })
    expect(normalizeEmergencyContactsForSave(empty)).toBeNull()
  })
})
