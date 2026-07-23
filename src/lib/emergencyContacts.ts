import { hasRichContent } from './guideContent'

export type EmergencyContactRole =
  | 'concierge'
  | 'owner'
  | 'manager'
  | 'medical'
  | 'fire'
  | 'police'
  | 'other'

export interface EmergencyContact {
  id: string
  label: string
  role: EmergencyContactRole
  phone: string
  email: string
  notes: string
  available247: boolean
}

export interface EmergencyContactsDocument {
  v: 1
  contacts: EmergencyContact[]
  instructions: string | null
}

export const emergencyContactRoleLabels: Record<EmergencyContactRole, string> = {
  concierge: 'Conciergerie',
  owner: 'Propriétaire',
  manager: 'Gestionnaire',
  medical: 'Urgences médicales (15)',
  fire: 'Pompiers (18)',
  police: 'Police (17)',
  other: 'Autre',
}

export const emergencyContactPresets: {
  role: EmergencyContactRole
  label: string
  phone?: string
  available247?: boolean
}[] = [
  { role: 'concierge', label: 'Conciergerie', available247: true },
  { role: 'owner', label: 'Propriétaire' },
  { role: 'manager', label: 'Gestionnaire' },
  { role: 'medical', label: 'SAMU', phone: '15' },
  { role: 'fire', label: 'Pompiers', phone: '18' },
  { role: 'police', label: 'Police', phone: '17' },
]

export function createEmergencyContactId(): string {
  return crypto.randomUUID()
}

export function createEmptyEmergencyContact(
  preset?: (typeof emergencyContactPresets)[number],
): EmergencyContact {
  return {
    id: createEmergencyContactId(),
    label: preset?.label ?? '',
    role: preset?.role ?? 'other',
    phone: preset?.phone ?? '',
    email: '',
    notes: '',
    available247: preset?.available247 ?? false,
  }
}

function normalizeContact(raw: unknown): EmergencyContact | null {
  if (!raw || typeof raw !== 'object') return null
  const contact = raw as EmergencyContact
  if (!contact.id) return null

  const role = contact.role && contact.role in emergencyContactRoleLabels
    ? contact.role
    : 'other'

  return {
    id: contact.id,
    label: typeof contact.label === 'string' ? contact.label : '',
    role,
    phone: typeof contact.phone === 'string' ? contact.phone : '',
    email: typeof contact.email === 'string' ? contact.email : '',
    notes: typeof contact.notes === 'string' ? contact.notes : '',
    available247: Boolean(contact.available247),
  }
}

function isEmergencyContactsDocument(value: unknown): value is EmergencyContactsDocument {
  if (!value || typeof value !== 'object') return false
  const doc = value as EmergencyContactsDocument
  return doc.v === 1 && Array.isArray(doc.contacts)
}

export function parseEmergencyContacts(content: string | null | undefined): EmergencyContactsDocument {
  const trimmed = content?.trim()
  if (!trimmed) {
    return { v: 1, contacts: [], instructions: null }
  }

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (isEmergencyContactsDocument(parsed)) {
        const contacts = parsed.contacts
          .map(normalizeContact)
          .filter((contact): contact is EmergencyContact => contact !== null)
        return {
          v: 1,
          contacts,
          instructions: typeof parsed.instructions === 'string' ? parsed.instructions : null,
        }
      }
    } catch {
      // fall through to legacy plain text
    }
  }

  return {
    v: 1,
    contacts: [{
      id: createEmergencyContactId(),
      label: 'Contact d’urgence',
      role: 'other',
      phone: '',
      email: '',
      notes: trimmed,
      available247: false,
    }],
    instructions: null,
  }
}

export function serializeEmergencyContacts(doc: EmergencyContactsDocument): string {
  return JSON.stringify(doc)
}

function contactHasContent(contact: EmergencyContact): boolean {
  return Boolean(
    contact.label.trim()
    || contact.phone.trim()
    || contact.email.trim()
    || contact.notes.trim(),
  )
}

export function hasEmergencyContacts(content: string | null | undefined): boolean {
  const doc = parseEmergencyContacts(content)
  return doc.contacts.some(contactHasContent) || hasRichContent(doc.instructions)
}

export function normalizeEmergencyContactsForSave(content: string | null | undefined): string | null {
  const doc = parseEmergencyContacts(content)
  const contacts = doc.contacts.filter(contactHasContent)
  const instructions = hasRichContent(doc.instructions) ? doc.instructions!.trim() : null

  if (contacts.length === 0 && !instructions) return null

  return serializeEmergencyContacts({
    v: 1,
    contacts,
    instructions,
  })
}

export function moveEmergencyContact(
  contacts: EmergencyContact[],
  contactId: string,
  direction: -1 | 1,
): EmergencyContact[] {
  const index = contacts.findIndex(contact => contact.id === contactId)
  if (index < 0) return contacts
  const target = index + direction
  if (target < 0 || target >= contacts.length) return contacts

  const next = [...contacts]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

export function emergencyContactsSummary(content: string | null | undefined, maxLength = 80): string {
  const doc = parseEmergencyContacts(content)
  const parts = doc.contacts
    .filter(contactHasContent)
    .map(contact => {
      const label = contact.label.trim() || emergencyContactRoleLabels[contact.role]
      if (contact.phone.trim()) return `${label} · ${contact.phone.trim()}`
      return label
    })

  if (parts.length === 0 && hasRichContent(doc.instructions)) {
    return 'Consignes d’urgence'
  }

  const summary = parts.join(' · ')
  if (summary.length <= maxLength) return summary
  return `${summary.slice(0, maxLength - 1)}…`
}
