import { Mail, Phone } from 'lucide-react'
import { GuideContentRenderer } from '@/components/guide/GuideContentRenderer'
import { guestPortalTheme } from '@/components/guest/guestPortalStyles'
import { hasRichContent } from '@/lib/guideContent'
import {
  emergencyContactRoleLabels,
  parseEmergencyContacts,
  type EmergencyContact,
} from '@/lib/emergencyContacts'

interface EmergencyContactsPreviewProps {
  content: string | null | undefined
  variant?: 'default' | 'guest'
}

function ContactCard({
  contact,
  variant,
}: {
  contact: EmergencyContact
  variant: 'default' | 'guest'
}) {
  const label = contact.label.trim() || emergencyContactRoleLabels[contact.role]
  const isGuest = variant === 'guest'

  return (
    <div className={
      isGuest
        ? `${guestPortalTheme.card} p-4`
        : 'rounded-xl border border-black/5 bg-neutral-50 p-3'
    }>
      <div className="flex flex-wrap items-center gap-2">
        <p className={`text-sm font-semibold ${isGuest ? guestPortalTheme.title : 'text-neutral-900'}`}>
          {label}
        </p>
        {contact.available247 && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            isGuest ? guestPortalTheme.accentSoft : 'bg-success-soft text-success'
          }`}>
            24h/24
          </span>
        )}
      </div>

      {contact.phone.trim() && (
        <a
          href={`tel:${contact.phone.replace(/\s/g, '')}`}
          className={`mt-3 flex items-center gap-2.5 text-sm font-medium hover:underline ${
            isGuest ? guestPortalTheme.accent : 'text-neutral-800'
          }`}
        >
          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${
            isGuest ? guestPortalTheme.accentSoft : 'bg-neutral-100'
          }`}>
            <Phone className="h-4 w-4 shrink-0" />
          </span>
          {contact.phone}
        </a>
      )}

      {contact.email.trim() && (
        <a
          href={`mailto:${contact.email.trim()}`}
          className={`mt-2 flex items-center gap-2.5 text-sm hover:underline ${
            isGuest ? guestPortalTheme.body : 'text-neutral-700'
          }`}
        >
          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${
            isGuest ? guestPortalTheme.accentSoft : 'bg-neutral-100'
          }`}>
            <Mail className="h-4 w-4 shrink-0" />
          </span>
          {contact.email}
        </a>
      )}

      {contact.notes.trim() && (
        <p className={`mt-2 text-sm leading-relaxed ${isGuest ? guestPortalTheme.body : 'text-neutral-600'}`}>
          {contact.notes}
        </p>
      )}
    </div>
  )
}

export function EmergencyContactsPreview({
  content,
  variant = 'default',
}: EmergencyContactsPreviewProps) {
  const doc = parseEmergencyContacts(content)
  const contacts = doc.contacts.filter(contact => (
    contact.label.trim()
    || contact.phone.trim()
    || contact.email.trim()
    || contact.notes.trim()
  ))

  if (contacts.length === 0 && !hasRichContent(doc.instructions)) {
    return null
  }

  return (
    <div className="space-y-3">
      {contacts.length > 0 && (
        <div className="space-y-3">
          {contacts.map(contact => (
            <ContactCard key={contact.id} contact={contact} variant={variant} />
          ))}
        </div>
      )}
      {hasRichContent(doc.instructions) && (
        <GuideContentRenderer content={doc.instructions!} variant={variant} />
      )}
    </div>
  )
}

export function hasEmergencyContactsPreview(content: string | null | undefined): boolean {
  const doc = parseEmergencyContacts(content)
  return doc.contacts.some(contact => (
    contact.label.trim()
    || contact.phone.trim()
    || contact.email.trim()
    || contact.notes.trim()
  )) || hasRichContent(doc.instructions)
}
