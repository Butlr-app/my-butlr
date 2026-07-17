import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LoadingState } from '@/components/EmptyState'
import { partnerCategoryOptions, partnerStatusLabels, type PartnerRecord } from '@/lib/partners'
import {
  fetchMyPartnerProfile,
  partnerProfileToForm,
  updateMyPartnerProfile,
  type PartnerProfileFormInput,
} from '@/lib/partnerPortal'

interface PartnerProfilePageProps {
  mode?: 'onboarding' | 'edit'
}

export function PartnerProfilePage({ mode = 'edit' }: PartnerProfilePageProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState<PartnerProfileFormInput>({
    name: '',
    category: '',
    location: '',
    contact: '',
    email: '',
    phone: '',
    description: '',
    serviceAreas: '',
    status: 'active',
  })

  useEffect(() => {
    fetchMyPartnerProfile().then(({ data, error: loadError }) => {
      if (loadError) setError(loadError.message)
      if (data) setForm(partnerProfileToForm(data as PartnerRecord))
      setLoading(false)
    })
  }, [])

  const patch = (partial: Partial<PartnerProfileFormInput>) => {
    setForm(current => ({ ...current, ...partial }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    const { error: saveError } = await updateMyPartnerProfile(form)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    if (mode === 'onboarding') {
      navigate('/partner', { replace: true })
      return
    }
    setSuccess('Fiche mise à jour.')
  }

  if (loading) return <LoadingState label="Chargement de votre fiche…" />

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          {mode === 'onboarding' ? 'Complétez votre fiche prestataire' : 'Ma fiche'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ces informations sont visibles par les propriétaires sur la plateforme Butlr.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <Input
          label="Nom / raison sociale"
          value={form.name}
          onChange={e => patch({ name: e.target.value })}
          placeholder="Chef Rémi"
        />
        <Select
          label="Catégorie"
          value={form.category}
          onChange={e => patch({ category: e.target.value })}
          options={[
            { value: '', label: 'Choisir…' },
            ...partnerCategoryOptions.map(c => ({ value: c, label: c })),
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Zone d’intervention"
            value={form.serviceAreas}
            onChange={e => patch({ serviceAreas: e.target.value })}
            placeholder="Côte d’Azur, Monaco…"
          />
          <Input
            label="Ville / base"
            value={form.location}
            onChange={e => patch({ location: e.target.value })}
            placeholder="Nice"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Contact"
            value={form.contact}
            onChange={e => patch({ contact: e.target.value })}
            placeholder="Nom du contact"
          />
          <Input
            label="Téléphone"
            value={form.phone}
            onChange={e => patch({ phone: e.target.value })}
            placeholder="+33…"
          />
        </div>
        <Input
          label="E-mail professionnel"
          type="email"
          value={form.email}
          onChange={e => patch({ email: e.target.value })}
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Présentation</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={e => patch({ description: e.target.value })}
            placeholder="Services proposés, expérience, langues…"
            className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm focus:border-info focus:outline-none focus:ring-1 focus:ring-info/20"
          />
        </div>
        {mode === 'edit' && (
          <Select
            label="Statut"
            value={form.status}
            onChange={e => patch({ status: e.target.value as PartnerProfileFormInput['status'] })}
            options={Object.entries(partnerStatusLabels).map(([value, label]) => ({ value, label }))}
          />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving
              ? 'Enregistrement…'
              : mode === 'onboarding'
                ? 'Accéder à mon espace'
                : 'Enregistrer'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

export function PartnerOnboardingPage() {
  return <PartnerProfilePage mode="onboarding" />
}
