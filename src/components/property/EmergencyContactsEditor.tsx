import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { SwitchField } from '@/components/ui/Switch'
import { GuideBlockEditor } from '@/components/guide/GuideBlockEditor'
import {
  createEmptyEmergencyContact,
  emergencyContactPresets,
  emergencyContactRoleLabels,
  moveEmergencyContact,
  parseEmergencyContacts,
  serializeEmergencyContacts,
  type EmergencyContact,
  type EmergencyContactRole,
} from '@/lib/emergencyContacts'
import { parseGuideContent, serializeGuideContent } from '@/lib/guideContent'

interface EmergencyContactsEditorProps {
  value: string | null | undefined
  onChange: (value: string) => void
  propertyId: string
  userId?: string | null
}

function updateContact(
  contacts: EmergencyContact[],
  contactId: string,
  patch: Partial<EmergencyContact>,
): EmergencyContact[] {
  return contacts.map(contact => (
    contact.id === contactId ? { ...contact, ...patch } : contact
  ))
}

export function EmergencyContactsEditor({
  value,
  onChange,
  propertyId,
  userId,
}: EmergencyContactsEditorProps) {
  const doc = parseEmergencyContacts(value)
  const contacts = doc.contacts.length > 0
    ? doc.contacts
    : [createEmptyEmergencyContact()]

  const syncContacts = (nextContacts: EmergencyContact[]) => {
    onChange(serializeEmergencyContacts({
      ...doc,
      contacts: nextContacts,
    }))
  }

  const syncInstructions = (instructions: string) => {
    onChange(serializeEmergencyContacts({
      ...doc,
      contacts,
      instructions,
    }))
  }

  const addPreset = (preset: (typeof emergencyContactPresets)[number]) => {
    syncContacts([...contacts, createEmptyEmergencyContact(preset)])
  }

  const roleOptions = Object.entries(emergencyContactRoleLabels).map(([role, label]) => ({
    value: role,
    label,
  }))

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Ajoutez les numéros utiles pour vos voyageurs (conciergerie, propriétaire, secours…).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {emergencyContactPresets.map(preset => (
            <Button
              key={preset.role}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => addPreset(preset)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {contacts.map((contact, index) => (
          <div key={contact.id} className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Contact {index + 1}
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={index === 0}
                  onClick={() => syncContacts(moveEmergencyContact(contacts, contact.id, -1))}
                  aria-label="Monter le contact"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={index === contacts.length - 1}
                  onClick={() => syncContacts(moveEmergencyContact(contacts, contact.id, 1))}
                  aria-label="Descendre le contact"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={contacts.length === 1}
                  onClick={() => syncContacts(contacts.filter(item => item.id !== contact.id))}
                  aria-label="Supprimer le contact"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Nom / libellé"
                value={contact.label}
                onChange={event => syncContacts(updateContact(contacts, contact.id, {
                  label: event.target.value,
                }))}
                placeholder="Ex. Conciergerie Villa"
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Type</label>
                <select
                  value={contact.role}
                  onChange={event => {
                    const role = event.target.value as EmergencyContactRole
                    const preset = emergencyContactPresets.find(item => item.role === role)
                    syncContacts(updateContact(contacts, contact.id, {
                      role,
                      label: contact.label.trim() ? contact.label : preset?.label ?? contact.label,
                      phone: contact.phone.trim() ? contact.phone : preset?.phone ?? contact.phone,
                      available247: preset?.available247 ?? contact.available247,
                    }))
                  }}
                  className="h-10 w-full px-3 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
                >
                  {roleOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PhoneInput
                label="Téléphone"
                value={contact.phone}
                onChange={phone => syncContacts(updateContact(contacts, contact.id, { phone }))}
              />
              <Input
                label="E-mail (optionnel)"
                type="email"
                value={contact.email}
                onChange={event => syncContacts(updateContact(contacts, contact.id, {
                  email: event.target.value,
                }))}
                placeholder="contact@example.com"
              />
            </div>

            <Input
              label="Note (optionnelle)"
              value={contact.notes}
              onChange={event => syncContacts(updateContact(contacts, contact.id, {
                notes: event.target.value,
              }))}
              placeholder="Disponible 24h/24, parler français…"
            />

            <SwitchField
              checked={contact.available247}
              onCheckedChange={available247 => syncContacts(updateContact(contacts, contact.id, {
                available247,
              }))}
              label="Disponible 24h/24"
            />
          </div>
        ))}
      </div>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => syncContacts([...contacts, createEmptyEmergencyContact()])}
      >
        <Plus className="mr-1 h-4 w-4" />
        Ajouter un contact
      </Button>

      <div className="space-y-2 border-t border-border pt-5">
        <div>
          <p className="text-sm font-medium text-foreground">Consignes d’urgence</p>
          <p className="text-xs text-muted-foreground">
            Procédures, consignes de sécurité, accès secours… (texte, étapes, listes, images, vidéos).
          </p>
        </div>
        <GuideBlockEditor
          blocks={parseGuideContent(doc.instructions ?? '')}
          onChange={blocks => syncInstructions(serializeGuideContent(blocks))}
          propertyId={propertyId}
          userId={userId}
        />
      </div>
    </div>
  )
}
