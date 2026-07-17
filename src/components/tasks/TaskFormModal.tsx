import { useEffect, useMemo, useState } from 'react'
import { Building2, Handshake, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerProperties } from '@/lib/data'
import { fetchPartnersForTasks, partnerSelectLabel, type PartnerRecord } from '@/lib/partners'
import { formatDateForDisplay } from '@/lib/dateFormat'
import {
  fetchTaskReservationOptions,
  saveTask,
  taskLinkTypeLabels,
  taskPriorityLabels,
  taskStatusLabels,
  validateTaskInput,
  type TaskFormInput,
  type TaskLinkType,
  type TaskPriority,
  type TaskRecord,
  type TaskStatus,
} from '@/lib/tasks'
import type { Property } from '@/lib/types'

interface TaskFormModalProps {
  open: boolean
  task?: TaskRecord | null
  initialPartnerId?: string
  initialPropertyId?: string
  initialLinkType?: TaskLinkType
  initialPrefill?: Partial<TaskFormInput>
  onClose: () => void
  onSaved: (task: TaskRecord) => void
}

const statusOptions = (Object.entries(taskStatusLabels) as Array<[TaskStatus, string]>).map(
  ([value, label]) => ({ value, label }),
)

const priorityOptions = (Object.entries(taskPriorityLabels) as Array<[TaskPriority, string]>).map(
  ([value, label]) => ({ value, label }),
)

const defaultForm = (): TaskFormInput => ({
  linkType: 'property',
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
  propertyId: '',
  reservationId: '',
  partnerId: '',
})

export function TaskFormModal({
  open,
  task,
  initialPartnerId,
  initialPropertyId,
  initialLinkType,
  initialPrefill,
  onClose,
  onSaved,
}: TaskFormModalProps) {
  const { user, profile } = useAuth()
  const [form, setForm] = useState<TaskFormInput>(defaultForm)
  const [properties, setProperties] = useState<Property[]>([])
  const [reservations, setReservations] = useState<Array<{
    id: string
    guest_name: string
    arrival: string
    departure: string
    properties?: { name: string } | null
  }>>([])
  const [partners, setPartners] = useState<PartnerRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !user) return

    Promise.all([
      fetchOwnerProperties(user.id),
      fetchTaskReservationOptions(user.id),
      fetchPartnersForTasks(user.id),
    ]).then(([propertyResult, reservationResult, partnerResult]) => {
      setProperties((propertyResult.data as Property[]) ?? [])
      setReservations((reservationResult.data ?? []) as unknown as typeof reservations)
      setPartners((partnerResult.data as PartnerRecord[]) ?? [])
    })
  }, [open, user])

  useEffect(() => {
    if (!open) return

    if (task) {
      setForm({
        linkType: task.link_type,
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date ?? '',
        propertyId: task.property_id ?? '',
        reservationId: task.reservation_id ?? '',
        partnerId: task.partner_id ?? '',
      })
    } else {
      setForm({
        ...defaultForm(),
        linkType: initialPrefill?.linkType
          ?? initialLinkType
          ?? (initialPartnerId ? 'partner' : 'property'),
        title: initialPrefill?.title ?? '',
        description: initialPrefill?.description ?? '',
        status: initialPrefill?.status ?? 'todo',
        priority: initialPrefill?.priority ?? 'medium',
        dueDate: initialPrefill?.dueDate ?? '',
        propertyId: initialPrefill?.propertyId || initialPropertyId || properties[0]?.id || '',
        reservationId: initialPrefill?.reservationId || '',
        partnerId: initialPrefill?.partnerId || initialPartnerId || '',
      })
    }
    setError('')
  }, [
    open,
    task?.id,
    properties,
    initialPartnerId,
    initialPropertyId,
    initialLinkType,
    initialPrefill,
  ])

  const reservationOptions = useMemo(
    () => reservations.map(reservation => ({
      value: reservation.id,
      label: `${reservation.guest_name} · ${reservation.properties?.name ?? 'Villa'} (${formatDateForDisplay(reservation.arrival, profile?.date_format)} → ${formatDateForDisplay(reservation.departure, profile?.date_format)})`,
    })),
    [reservations, profile?.date_format],
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const validationError = validateTaskInput(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')

    const { data, error: saveError } = await saveTask(form, task?.id)
    setSaving(false)

    if (saveError || !data) {
      setError(saveError?.message ?? 'Impossible d’enregistrer la tâche.')
      return
    }

    onSaved(data as TaskRecord)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={task ? 'Modifier la tâche' : 'Nouvelle tâche'}
      className="max-w-lg"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <p className="text-sm font-medium">Rattachement</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(taskLinkTypeLabels) as TaskLinkType[]).map(type => {
              const Icon = type === 'client' ? UserRound : type === 'property' ? Building2 : Handshake
              const selected = form.linkType === type
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm(current => ({ ...current, linkType: type }))}
                  className={`flex cursor-pointer flex-col items-start gap-2 rounded-lg border px-3 py-3 text-left transition-colors ${
                    selected
                      ? 'border-foreground/20 bg-muted ring-1 ring-border'
                      : 'border-border bg-card hover:bg-muted/60'
                  }`}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{taskLinkTypeLabels[type]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {(form.linkType === 'property' || form.linkType === 'partner') && (
          <Select
            label="Villa"
            value={form.propertyId}
            onChange={event => setForm(current => ({ ...current, propertyId: event.target.value }))}
            options={properties.length > 0
              ? properties.map(property => ({ value: property.id, label: property.name }))
              : [{ value: '', label: 'Aucune villa disponible' }]}
          />
        )}

        {form.linkType === 'client' && (
          <Select
            label="Séjour client"
            value={form.reservationId}
            onChange={event => setForm(current => ({ ...current, reservationId: event.target.value }))}
            options={reservationOptions.length > 0
              ? reservationOptions
              : [{ value: '', label: 'Aucun séjour disponible' }]}
          />
        )}

        {form.linkType === 'partner' && (
          <Select
            label="Prestataire"
            value={form.partnerId}
            onChange={event => setForm(current => ({ ...current, partnerId: event.target.value }))}
            options={partners.length > 0
              ? partners.map(partner => ({
                  value: partner.id,
                  label: partnerSelectLabel(partner),
                }))
              : [{ value: '', label: 'Aucun prestataire disponible' }]}
          />
        )}

        <Input
          label="Titre"
          value={form.title}
          onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Description (optionnel)</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
            className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm focus:border-info focus:outline-none focus:ring-1 focus:ring-info/20"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Statut"
            value={form.status}
            onChange={event => setForm(current => ({ ...current, status: event.target.value as TaskStatus }))}
            options={statusOptions}
          />
          <Select
            label="Priorité"
            value={form.priority}
            onChange={event => setForm(current => ({ ...current, priority: event.target.value as TaskPriority }))}
            options={priorityOptions}
          />
        </div>

        <DateInput
          label="Échéance (optionnel)"
          value={form.dueDate}
          onChange={value => setForm(current => ({ ...current, dueDate: value }))}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : task ? 'Mettre à jour' : 'Créer la tâche'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
