import { useEffect, useState } from 'react'
import { FileUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import {
  uploadProviderInvoice,
  type ProviderInvoice,
} from '@/lib/providerOperations'
import type { TaskRecord } from '@/lib/tasks'
import type { Property } from '@/lib/types'

interface ProviderInvoiceFormModalProps {
  open: boolean
  ownerId: string
  partnerId: string
  properties: Property[]
  tasks: TaskRecord[]
  onClose: () => void
  onSaved: (invoice: ProviderInvoice) => void
}

function currentDateIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function ProviderInvoiceFormModal({
  open,
  ownerId,
  partnerId,
  properties,
  tasks,
  onClose,
  onSaved,
}: ProviderInvoiceFormModalProps) {
  const [propertyId, setPropertyId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [issueDate, setIssueDate] = useState(currentDateIso())
  const [dueDate, setDueDate] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setPropertyId(properties[0]?.id ?? '')
    setTaskId('')
    setInvoiceNumber('')
    setIssueDate(currentDateIso())
    setDueDate('')
    setAmount('')
    setNotes('')
    setFile(null)
    setError('')
  }, [open, properties])

  const propertyTasks = tasks.filter(task => !propertyId || task.property_id === propertyId)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!file) {
      setError('Ajoutez le fichier de la facture.')
      return
    }

    setSaving(true)
    setError('')
    const { data, error: saveError } = await uploadProviderInvoice({
      partnerId,
      propertyId,
      taskId,
      invoiceNumber,
      issueDate,
      dueDate,
      amount: Number(amount),
      notes,
      file,
    }, ownerId)
    setSaving(false)

    if (saveError || !data) {
      setError(saveError?.message ?? 'Impossible d’ajouter la facture.')
      return
    }

    onSaved(data as ProviderInvoice)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="Ajouter une facture"
      className="max-w-xl"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Villa"
            value={propertyId}
            onChange={event => {
              setPropertyId(event.target.value)
              setTaskId('')
            }}
            options={properties.length
              ? properties.map(property => ({ value: property.id, label: property.name }))
              : [{ value: '', label: 'Aucune villa disponible' }]}
          />
          <Select
            label="Tâche associée (optionnel)"
            value={taskId}
            onChange={event => setTaskId(event.target.value)}
            options={[
              { value: '', label: 'Aucune tâche' },
              ...propertyTasks.map(task => ({ value: task.id, label: task.title })),
            ]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Numéro de facture (optionnel)"
            value={invoiceNumber}
            onChange={event => setInvoiceNumber(event.target.value)}
          />
          <Input
            label="Montant TTC"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={event => setAmount(event.target.value)}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DateInput
            label="Date de facture"
            value={issueDate}
            onChange={setIssueDate}
          />
          <DateInput
            label="Échéance (optionnel)"
            value={dueDate}
            onChange={setDueDate}
          />
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Fichier</span>
          <span className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm">
            <FileUp className="h-5 w-5 text-muted-foreground" />
            <span className="min-w-0 truncate text-muted-foreground">
              {file?.name ?? 'PDF, JPG, PNG ou WebP — 15 Mo maximum'}
            </span>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={event => setFile(event.target.files?.[0] ?? null)}
            />
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Notes (optionnel)</span>
          <textarea
            rows={3}
            value={notes}
            onChange={event => setNotes(event.target.value)}
            className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving || properties.length === 0}>
            {saving ? 'Téléversement…' : 'Ajouter la facture'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
