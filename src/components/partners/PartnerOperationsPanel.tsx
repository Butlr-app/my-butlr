import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Plus,
  Receipt,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/EmptyState'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { TaskCard } from '@/components/tasks/TaskCard'
import { ProviderInvoiceFormModal } from './ProviderInvoiceFormModal'
import { fetchOwnerProperties } from '@/lib/data'
import { formatDateForDisplay } from '@/lib/dateFormat'
import {
  createProviderInvoiceSignedUrl,
  deleteProviderInvoice,
  fetchProviderInvoiceEvents,
  fetchProviderInvoices,
  providerInvoiceStatusLabels,
  providerInvoiceTransitions,
  updateProviderInvoiceStatus,
  type ProviderInvoice,
  type ProviderInvoiceEvent,
  type ProviderInvoiceStatus,
} from '@/lib/providerOperations'
import {
  deleteTask,
  fetchPartnerTasks,
  updateTaskStatus,
  type TaskRecord,
  type TaskStatus,
} from '@/lib/tasks'
import type { PartnerRecord } from '@/lib/partners'
import type { Property } from '@/lib/types'

interface PartnerOperationsPanelProps {
  partner: PartnerRecord
  ownerId: string
}

function invoiceBadgeVariant(status: ProviderInvoiceStatus) {
  if (status === 'paid') return 'success' as const
  if (status === 'approved') return 'info' as const
  if (status === 'rejected') return 'destructive' as const
  return 'warning' as const
}

export function PartnerOperationsPanel({
  partner,
  ownerId,
}: PartnerOperationsPanelProps) {
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [invoices, setInvoices] = useState<ProviderInvoice[]>([])
  const [invoiceEvents, setInvoiceEvents] = useState<ProviderInvoiceEvent[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const [tasksResult, invoicesResult, propertiesResult] = await Promise.all([
      fetchPartnerTasks(partner.id),
      fetchProviderInvoices(partner.id),
      fetchOwnerProperties(ownerId),
    ])
    const nextInvoices = (invoicesResult.data ?? []) as ProviderInvoice[]
    const eventsResult = await fetchProviderInvoiceEvents(
      nextInvoices.map(invoice => invoice.id),
    )
    setTasks((tasksResult.data ?? []) as TaskRecord[])
    setInvoices(nextInvoices)
    setInvoiceEvents((eventsResult.data ?? []) as ProviderInvoiceEvent[])
    setProperties((propertiesResult.data ?? []) as Property[])
    setError(
      tasksResult.error?.message
      ?? invoicesResult.error?.message
      ?? propertiesResult.error?.message
      ?? eventsResult.error?.message
      ?? '',
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [partner.id, ownerId])

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      todo: tasks.filter(task => task.status === 'todo').length,
      inProgress: tasks.filter(task => task.status === 'in_progress').length,
      overdue: tasks.filter(task =>
        task.status !== 'done' && task.due_date && task.due_date < today,
      ).length,
      unpaid: invoices.filter(invoice => invoice.status === 'received' || invoice.status === 'approved').length,
    }
  }, [tasks, invoices])

  const handleTaskSaved = (task: TaskRecord) => {
    setTasks(current => {
      const exists = current.some(item => item.id === task.id)
      return exists
        ? current.map(item => item.id === task.id ? task : item)
        : [task, ...current]
    })
    setEditingTask(null)
  }

  const handleTaskStatus = async (task: TaskRecord, status: TaskStatus) => {
    setBusyId(task.id)
    const { data, error: updateError } = await updateTaskStatus(task.id, status)
    setBusyId(null)
    if (updateError || !data) {
      setError(updateError?.message ?? 'Impossible de mettre à jour la tâche.')
      return
    }
    setTasks(current => current.map(item => item.id === task.id ? data as TaskRecord : item))
  }

  const handleTaskDelete = async (task: TaskRecord) => {
    if (!confirm(`Supprimer la tâche « ${task.title} » ?`)) return
    setBusyId(task.id)
    const { error: deleteError } = await deleteTask(task.id)
    setBusyId(null)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setTasks(current => current.filter(item => item.id !== task.id))
  }

  const handleInvoiceStatus = async (
    invoice: ProviderInvoice,
    status: ProviderInvoiceStatus,
  ) => {
    const note = status === 'rejected'
      ? prompt('Motif du refus de cette facture :')
      : undefined
    if (status === 'rejected' && note === null) return

    setBusyId(invoice.id)
    const { data, error: updateError } = await updateProviderInvoiceStatus(
      invoice.id,
      status,
      note ?? undefined,
    )
    setBusyId(null)
    if (updateError || !data) {
      setError(updateError?.message ?? 'Impossible de mettre à jour la facture.')
      return
    }
    setInvoices(current => current.map(item => item.id === invoice.id
      ? { ...item, ...(data as ProviderInvoice) }
      : item))
    const eventsResult = await fetchProviderInvoiceEvents([invoice.id])
    if (!eventsResult.error) {
      setInvoiceEvents(current => [
        ...current.filter(event => event.invoice_id !== invoice.id),
        ...((eventsResult.data ?? []) as ProviderInvoiceEvent[]),
      ])
    }
  }

  const handleInvoiceSaved = async (invoice: ProviderInvoice) => {
    setInvoices(current => [invoice, ...current])
    const eventsResult = await fetchProviderInvoiceEvents([invoice.id])
    if (!eventsResult.error) {
      setInvoiceEvents(current => [
        ...((eventsResult.data ?? []) as ProviderInvoiceEvent[]),
        ...current,
      ])
    }
  }

  const handleOpenInvoice = async (invoice: ProviderInvoice) => {
    const target = window.open('about:blank', '_blank')
    setBusyId(invoice.id)
    try {
      const url = await createProviderInvoiceSignedUrl(invoice.storage_path)
      if (target) {
        target.opener = null
        target.location.href = url
      } else {
        window.location.assign(url)
      }
    } catch (openError) {
      target?.close()
      setError(openError instanceof Error ? openError.message : 'Impossible d’ouvrir la facture.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteInvoice = async (invoice: ProviderInvoice) => {
    if (!confirm(`Supprimer la facture « ${invoice.file_name} » ?`)) return
    setBusyId(invoice.id)
    const { error: deleteError, databaseDeleted } = await deleteProviderInvoice(invoice)
    setBusyId(null)
    if (!databaseDeleted) {
      setError(deleteError?.message ?? 'Impossible de supprimer la facture.')
      return
    }
    setInvoices(current => current.filter(item => item.id !== invoice.id))
    setInvoiceEvents(current => current.filter(event => event.invoice_id !== invoice.id))
    if (deleteError) {
      setError('La facture a été supprimée, mais le fichier devra être nettoyé ultérieurement.')
    }
  }

  if (loading) return <LoadingState label="Chargement du suivi prestataire…" />

  const activeTasks = tasks.filter(task => task.status !== 'done')
  const completedTasks = tasks.filter(task => task.status === 'done')

  return (
    <div className="space-y-6 border-t border-border pt-5">
      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Suivi opérationnel
        </p>
        <h3 className="mt-1 text-base font-semibold">Interventions et factures</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-3">
          <Clock3 className="h-4 w-4 text-muted-foreground" />
          <p className="mt-2 text-2xl font-semibold">{stats.todo}</p>
          <p className="text-xs text-muted-foreground">À faire</p>
        </Card>
        <Card className="p-3">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <p className="mt-2 text-2xl font-semibold">{stats.inProgress}</p>
          <p className="text-xs text-muted-foreground">En cours</p>
        </Card>
        <Card className="p-3">
          <Clock3 className="h-4 w-4 text-destructive" />
          <p className="mt-2 text-2xl font-semibold">{stats.overdue}</p>
          <p className="text-xs text-muted-foreground">En retard</p>
        </Card>
        <Card className="p-3">
          <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          <p className="mt-2 text-2xl font-semibold">{stats.unpaid}</p>
          <p className="text-xs text-muted-foreground">Factures à traiter</p>
        </Card>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold">Tâches et interventions</h4>
            <p className="text-xs text-muted-foreground">
              Planifiez les passages et suivez leur avancement par villa.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingTask(null)
              setTaskModalOpen(true)
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nouvelle tâche
          </Button>
        </div>

        {activeTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-5 text-center">
            <p className="text-sm font-medium">Aucune intervention en cours</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajoutez une tâche pour planifier le prochain passage.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {activeTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                busyId={busyId}
                onEdit={item => {
                  setEditingTask(item)
                  setTaskModalOpen(true)
                }}
                onDelete={handleTaskDelete}
                onStatusChange={handleTaskStatus}
              />
            ))}
          </div>
        )}

        {completedTasks.length > 0 && (
          <details className="rounded-lg border border-border">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              Historique terminé ({completedTasks.length})
            </summary>
            <div className="grid gap-3 border-t border-border p-3 lg:grid-cols-2">
              {completedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  compact
                  busyId={busyId}
                  onEdit={item => {
                    setEditingTask(item)
                    setTaskModalOpen(true)
                  }}
                  onDelete={handleTaskDelete}
                  onStatusChange={handleTaskStatus}
                />
              ))}
            </div>
          </details>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold">Factures</h4>
            <p className="text-xs text-muted-foreground">
              Centralisez les justificatifs, validations et paiements.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setInvoiceModalOpen(true)}
            disabled={properties.length === 0}
          >
            <Receipt className="mr-1.5 h-4 w-4" />
            Ajouter une facture
          </Button>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-5 text-center">
            <FileText className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Aucune facture</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Les PDF et photos de factures apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {invoices.map(invoice => {
              const events = invoiceEvents.filter(event => event.invoice_id === invoice.id)
              const canDelete = invoice.status === 'received' || invoice.status === 'rejected'
              const transitions = providerInvoiceTransitions[invoice.status]
              return (
              <div
                key={invoice.id}
                className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenInvoice(invoice)}
                      disabled={busyId === invoice.id}
                      className="truncate text-sm font-semibold underline-offset-2 hover:underline"
                    >
                      {invoice.invoice_number || invoice.file_name}
                    </button>
                    <Badge variant={invoiceBadgeVariant(invoice.status)}>
                      {providerInvoiceStatusLabels[invoice.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {invoice.properties?.name ?? 'Villa'}
                    {' · '}
                    {formatDateForDisplay(invoice.issue_date)}
                    {invoice.tasks?.title ? ` · ${invoice.tasks.title}` : ''}
                  </p>
                  {events.length > 0 && (
                    <details className="mt-2 text-xs text-muted-foreground">
                      <summary className="cursor-pointer">
                        Historique ({events.length})
                      </summary>
                      <div className="mt-2 space-y-1 border-l border-border pl-3">
                        {events.map(event => (
                          <p key={event.id}>
                            {providerInvoiceStatusLabels[event.new_status]}
                            {' · '}
                            {new Date(event.created_at).toLocaleString('fr-FR')}
                            {event.actor?.full_name || event.actor?.email
                              ? ` · ${event.actor.full_name || event.actor.email}`
                              : ''}
                            {event.note ? ` — ${event.note}` : ''}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <p className="mr-1 font-mono text-sm font-semibold">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: invoice.currency,
                    }).format(Number(invoice.amount))}
                  </p>
                  <select
                    aria-label={`Statut de ${invoice.invoice_number || invoice.file_name}`}
                    value={invoice.status}
                    disabled={busyId === invoice.id || transitions.length === 0}
                    onChange={event => handleInvoiceStatus(
                      invoice,
                      event.target.value as ProviderInvoiceStatus,
                    )}
                    className="h-8 rounded-md border border-border bg-card px-2 text-xs"
                  >
                    {[invoice.status, ...transitions]
                      .map(status => (
                        <option key={status} value={status}>
                          {providerInvoiceStatusLabels[status]}
                        </option>
                      ))}
                  </select>
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === invoice.id}
                      onClick={() => handleDeleteInvoice(invoice)}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </section>

      <TaskFormModal
        open={taskModalOpen}
        task={editingTask}
        initialPartnerId={partner.id}
        initialPropertyId={properties[0]?.id}
        onClose={() => {
          setTaskModalOpen(false)
          setEditingTask(null)
        }}
        onSaved={handleTaskSaved}
      />

      <ProviderInvoiceFormModal
        open={invoiceModalOpen}
        ownerId={ownerId}
        partnerId={partner.id}
        properties={properties}
        tasks={tasks}
        onClose={() => setInvoiceModalOpen(false)}
        onSaved={handleInvoiceSaved}
      />
    </div>
  )
}
