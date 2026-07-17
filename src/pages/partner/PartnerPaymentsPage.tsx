import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import type { PartnerRecord } from '@/lib/partners'
import {
  fetchMyInvoices,
  fetchMyMissions,
  fetchMyPartnerProfile,
  fetchPropertyOwnerId,
  openMyInvoiceFile,
  uploadMyInvoice,
  type PartnerMission,
} from '@/lib/partnerPortal'
import {
  providerInvoiceStatusLabels,
  type ProviderInvoice,
} from '@/lib/providerOperations'
import { formatDateForDisplay } from '@/lib/dateFormat'

export function PartnerPaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [partner, setPartner] = useState<PartnerRecord | null>(null)
  const [invoices, setInvoices] = useState<ProviderInvoice[]>([])
  const [missions, setMissions] = useState<PartnerMission[]>([])
  const [error, setError] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    missionId: '',
    amount: '',
    issueDate: new Date().toISOString().slice(0, 10),
    invoiceNumber: '',
    notes: '',
    file: null as File | null,
  })

  const load = async () => {
    setLoading(true)
    setError('')
    const { data: profile, error: profileError } = await fetchMyPartnerProfile()
    if (profileError || !profile) {
      setError(profileError?.message ?? 'Fiche introuvable.')
      setLoading(false)
      return
    }
    const partnerRow = profile as PartnerRecord
    setPartner(partnerRow)
    const [invoicesResult, missionsResult] = await Promise.all([
      fetchMyInvoices(partnerRow.id),
      fetchMyMissions(partnerRow.id),
    ])
    if (invoicesResult.error) setError(invoicesResult.error.message)
    setInvoices((invoicesResult.data ?? []) as ProviderInvoice[])
    setMissions(((missionsResult.data ?? []) as PartnerMission[]).filter(m => m.status === 'done'))
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const missionOptions = useMemo(
    () => missions
      .filter(m => m.property_id)
      .map(m => ({
        value: m.id,
        label: `${m.title}${m.properties?.name ? ` · ${m.properties.name}` : ''}`,
      })),
    [missions],
  )

  const handleUpload = async () => {
    if (!partner || !form.file || !form.missionId) {
      setError('Sélectionnez une mission terminée et un fichier.')
      return
    }
    const mission = missions.find(m => m.id === form.missionId)
    if (!mission?.property_id) {
      setError('Mission invalide.')
      return
    }

    setSaving(true)
    setError('')
    const { data: property, error: propertyError } = await fetchPropertyOwnerId(mission.property_id)
    if (propertyError || !property?.owner_id) {
      setSaving(false)
      setError(propertyError?.message ?? 'Propriétaire de la villa introuvable.')
      return
    }

    const { data, error: uploadError } = await uploadMyInvoice({
      partnerId: partner.id,
      propertyId: mission.property_id,
      propertyOwnerId: property.owner_id,
      taskId: mission.id,
      invoiceNumber: form.invoiceNumber,
      issueDate: form.issueDate,
      amount: Number(form.amount.replace(',', '.')),
      notes: form.notes,
      file: form.file,
    })
    setSaving(false)

    if (uploadError || !data) {
      setError(uploadError?.message ?? 'Envoi impossible.')
      return
    }

    setInvoices(current => [data, ...current])
    setUploadOpen(false)
    setForm({
      missionId: '',
      amount: '',
      issueDate: new Date().toISOString().slice(0, 10),
      invoiceNumber: '',
      notes: '',
      file: null,
    })
  }

  if (loading) return <LoadingState label="Chargement des paiements…" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Paiements & factures</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivez vos factures et déposez-en une après une mission terminée.
          </p>
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)} disabled={missionOptions.length === 0}>
          Déposer une facture
        </Button>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {invoices.length === 0 ? (
        <EmptyState
          title="Aucune facture"
          description={
            missionOptions.length === 0
              ? 'Terminez d’abord une mission assignée, puis déposez la facture correspondante.'
              : 'Déposez une facture liée à une mission terminée pour démarrer le suivi de paiement.'
          }
          action={
            missionOptions.length > 0 ? (
              <Button size="sm" onClick={() => setUploadOpen(true)}>Déposer une facture</Button>
            ) : (
              <Link to="/partner/missions" className="text-sm underline">
                Voir mes missions
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {invoices.map(invoice => (
            <Card key={invoice.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {Number(invoice.amount).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: invoice.currency || 'EUR',
                    })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {invoice.properties?.name ?? 'Villa'}
                    {invoice.tasks?.title ? ` · ${invoice.tasks.title}` : ''}
                    {' · '}
                    {formatDateForDisplay(invoice.issue_date)}
                  </p>
                  {invoice.invoice_number && (
                    <p className="mt-1 text-xs text-muted-foreground">N° {invoice.invoice_number}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={invoice.status === 'paid' ? 'success' : 'muted'}>
                    {providerInvoiceStatusLabels[invoice.status]}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        const url = await openMyInvoiceFile(invoice.storage_path)
                        window.open(url, '_blank', 'noopener,noreferrer')
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Ouverture impossible.')
                      }
                    }}
                  >
                    Ouvrir
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Déposer une facture">
        <div className="space-y-4">
          <Select
            label="Mission terminée"
            value={form.missionId}
            onChange={e => setForm(current => ({ ...current, missionId: e.target.value }))}
            options={[
              { value: '', label: 'Choisir…' },
              ...missionOptions,
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Montant (€)"
              type="number"
              value={form.amount}
              onChange={e => setForm(current => ({ ...current, amount: e.target.value }))}
            />
            <Input
              label="Date"
              type="date"
              value={form.issueDate}
              onChange={e => setForm(current => ({ ...current, issueDate: e.target.value }))}
            />
          </div>
          <Input
            label="N° de facture (optionnel)"
            value={form.invoiceNumber}
            onChange={e => setForm(current => ({ ...current, invoiceNumber: e.target.value }))}
          />
          <Input
            label="Fichier (PDF ou image)"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={e => setForm(current => ({
              ...current,
              file: e.target.files?.[0] ?? null,
            }))}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(current => ({ ...current, notes: e.target.value }))}
              className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUploadOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleUpload} disabled={saving}>
              {saving ? 'Envoi…' : 'Envoyer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
