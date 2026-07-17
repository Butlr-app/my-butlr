import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/lib/authContext'
import {
  partnerCategoriesForScope,
  partnerStatusLabels,
  partnerToFormInput,
  saveManualPartner,
  validatePartnerInput,
  type PartnerCategoryScope,
  type PartnerFormInput,
  type PartnerRecord,
  type PartnerStatus,
} from '@/lib/partners'

interface PartnerFormModalProps {
  open: boolean
  partner?: PartnerRecord | null
  initialCategory?: string
  categoryScope?: PartnerCategoryScope
  onClose: () => void
  onSaved: (partner: PartnerRecord) => void
}

const defaultForm = (): PartnerFormInput => ({
  name: '',
  category: '',
  location: '',
  contact: '',
  email: '',
  phone: '',
  commission: '10',
  status: 'active',
  notes: '',
})

export function PartnerFormModal({
  open,
  partner,
  initialCategory = '',
  categoryScope = 'all',
  onClose,
  onSaved,
}: PartnerFormModalProps) {
  const { user } = useAuth()
  const [form, setForm] = useState<PartnerFormInput>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const categoryOptions = partnerCategoriesForScope(categoryScope)
  const scopeTitle = categoryScope === 'intervenant'
    ? 'intervenant'
    : categoryScope === 'service'
      ? 'prestataire de services'
      : 'prestataire'
  const scopeHint = categoryScope === 'intervenant'
    ? 'Intervenant technique villa (ménage, piscine, jardin, électricité, travaux…) — commission, contacts et notes.'
    : categoryScope === 'service'
      ? 'Prestataire de services voyageur (chef, spa, transport, activités…) — commission, contacts et notes.'
      : 'Prestataire avec lequel vous travaillez régulièrement — commission, contacts et notes internes.'

  useEffect(() => {
    if (!open) return
    if (partner) {
      setForm(partnerToFormInput(partner))
    } else {
      setForm({
        ...defaultForm(),
        category: initialCategory || '',
      })
    }
    setError('')
  }, [open, partner?.id, initialCategory])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return

    const validationError = validatePartnerInput(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')

    const { data, error: saveError } = await saveManualPartner(form, user.id, partner?.id)
    setSaving(false)

    if (saveError || !data) {
      setError(saveError?.message ?? 'Impossible d’enregistrer le partenaire.')
      return
    }

    onSaved(data as PartnerRecord)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={partner ? `Configurer le ${scopeTitle}` : `Ajouter un ${scopeTitle}`}
      className="max-w-lg"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-muted-foreground">
          {scopeHint}
        </p>

        <Input
          label="Nom"
          value={form.name}
          onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
          required
        />

        <Select
          label="Catégorie"
          value={form.category}
          onChange={event => setForm(current => ({ ...current, category: event.target.value }))}
          options={[
            { value: '', label: 'Sélectionner…' },
            ...categoryOptions.map(category => ({ value: category, label: category })),
            // Keep current value visible when editing a partner whose category is outside the scope.
            ...(partner?.category
              && form.category
              && !categoryOptions.includes(form.category)
              ? [{ value: form.category, label: `${form.category} (hors périmètre)` }]
              : []),
          ]}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Contact principal"
            value={form.contact}
            onChange={event => setForm(current => ({ ...current, contact: event.target.value }))}
          />
          <Input
            label="Localisation"
            value={form.location}
            onChange={event => setForm(current => ({ ...current, location: event.target.value }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
          />
          <PhoneInput
            label="Téléphone"
            value={form.phone}
            onChange={value => setForm(current => ({ ...current, phone: value }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Commission (%)"
            type="number"
            min="0"
            max="100"
            value={form.commission}
            onChange={event => setForm(current => ({ ...current, commission: event.target.value }))}
          />
          <Select
            label="Statut"
            value={form.status}
            onChange={event => setForm(current => ({
              ...current,
              status: event.target.value as PartnerStatus,
            }))}
            options={Object.entries(partnerStatusLabels).map(([value, label]) => ({ value, label }))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Notes internes</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={event => setForm(current => ({ ...current, notes: event.target.value }))}
            placeholder="Accord commission, préférences, historique…"
            className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm focus:border-info focus:outline-none focus:ring-1 focus:ring-info/20"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : partner ? 'Enregistrer les modifications' : 'Ajouter le prestataire'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
