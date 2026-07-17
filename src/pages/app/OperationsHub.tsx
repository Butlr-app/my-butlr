import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CircleDollarSign,
  ClipboardList,
  Droplets,
  Leaf,
  Plus,
  Receipt,
  Sparkles,
  Trees,
  Wrench,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { PartnerDetailModal } from '@/components/partners/PartnerDetailModal'
import { PartnerFormModal } from '@/components/partners/PartnerFormModal'
import { ProviderInvoiceFormModal } from '@/components/partners/ProviderInvoiceFormModal'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerProperties } from '@/lib/data'
import { formatDateForDisplay } from '@/lib/dateFormat'
import {
  fetchManualPartners,
  fetchMarketplacePartners,
  intervenantPartnerCategoryFilters,
  isIntervenantPartnerCategory,
  matchesIntervenantCategoryFilter,
  type IntervenantCategoryFilterId,
  type PartnerRecord,
} from '@/lib/partners'
import {
  categoryHintToPartnerCategory,
  consumeAssistantDraft,
  taskDraftToFormPrefill,
  type AssistantTaskCategoryHint,
} from '@/lib/assistantDraft'
import {
  createProviderInvoiceSignedUrl,
  deleteProviderInvoice,
  fetchOwnerProviderInvoices,
  providerInvoiceStatusLabels,
  providerInvoiceTransitions,
  updateProviderInvoiceStatus,
  type ProviderInvoice,
  type ProviderInvoiceStatus,
} from '@/lib/providerOperations'
import {
  deleteTask,
  fetchOwnerPartnerTasks,
  updateTaskStatus,
  type TaskFormInput,
  type TaskRecord,
  type TaskStatus,
} from '@/lib/tasks'
import type { Property } from '@/lib/types'

type HubTab = 'overview' | 'tasks' | 'invoices' | 'providers'
type CategoryFilter = IntervenantCategoryFilterId
type PeriodFilter = '30' | '90' | 'all'

const tabs: Array<{ id: HubTab; label: string }> = [
  { id: 'overview', label: 'Vue d’ensemble' },
  { id: 'tasks', label: 'Tâches' },
  { id: 'invoices', label: 'Factures' },
  { id: 'providers', label: 'Intervenants' },
]

function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function daysAgoIso(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function invoiceBadgeVariant(status: ProviderInvoiceStatus) {
  if (status === 'paid') return 'success' as const
  if (status === 'approved') return 'info' as const
  if (status === 'rejected') return 'destructive' as const
  return 'warning' as const
}

function categoryIcon(category: string | null | undefined) {
  if (category === 'Ménage & entretien') return Sparkles
  if (category === 'Piscine & spa technique') return Droplets
  if (category === 'Jardinage & espaces verts') return Leaf
  if (category === 'Électricité') return Zap
  if (category === 'Menuiserie' || category === 'Maintenance & réparations') return Wrench
  return Trees
}

function filterCardIcon(filterId: IntervenantCategoryFilterId) {
  if (filterId === 'cleaning') return Sparkles
  if (filterId === 'pool') return Droplets
  if (filterId === 'garden') return Leaf
  if (filterId === 'works') return Wrench
  return Trees
}

function parseHubTab(value: string | null): HubTab | null {
  if (value === 'overview' || value === 'tasks' || value === 'invoices' || value === 'providers') {
    return value
  }
  return null
}

export function OperationsHub() {
  const { user, profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<HubTab>(() => parseHubTab(searchParams.get('tab')) ?? 'overview')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [propertyFilter, setPropertyFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('90')
  const [properties, setProperties] = useState<Property[]>([])
  const [partners, setPartners] = useState<PartnerRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [invoices, setInvoices] = useState<ProviderInvoice[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null)
  const [taskPrefill, setTaskPrefill] = useState<Partial<TaskFormInput> | null>(null)
  const [pendingCategoryHint, setPendingCategoryHint] = useState<AssistantTaskCategoryHint | null>(null)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [invoicePartnerId, setInvoicePartnerId] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<PartnerRecord | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formInitialCategory, setFormInitialCategory] = useState('')

  useEffect(() => {
    const nextTab = parseHubTab(searchParams.get('tab'))
    if (nextTab) setTab(nextTab)

    const create = searchParams.get('create')
    if (!create) return

    if (create === 'task') {
      const draft = consumeAssistantDraft()
      setTab('tasks')
      setEditingTask(null)
      setTaskPrefill(draft ? taskDraftToFormPrefill(draft) : null)
      setPendingCategoryHint(draft?.categoryHint ?? null)
      setTaskModalOpen(true)
    } else if (create === 'invoice') {
      setTab('invoices')
      setInvoiceModalOpen(true)
    } else if (create === 'partner' || create === 'pisciniste') {
      setTab('providers')
      setFormInitialCategory(
        create === 'pisciniste' ? 'Piscine & spa technique' : '',
      )
      setFormOpen(true)
    }

    const cleaned = new URLSearchParams(searchParams)
    cleaned.delete('create')
    setSearchParams(cleaned, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!taskModalOpen || !pendingCategoryHint || partners.length === 0) return
    const category = categoryHintToPartnerCategory(pendingCategoryHint)
    const match = partners.find(partner => partner.category === category)
    if (match) {
      setTaskPrefill(current => ({
        ...current,
        linkType: 'partner',
        partnerId: match.id,
      }))
    }
    setPendingCategoryHint(null)
  }, [taskModalOpen, pendingCategoryHint, partners])

  const openCreateTask = () => {
    setEditingTask(null)
    setTaskPrefill(null)
    setPendingCategoryHint(null)
    setTaskModalOpen(true)
  }

  const load = async () => {
    if (!user) return
    setLoading(true)
    const [propertiesResult, manualResult, marketplaceResult] = await Promise.all([
      fetchOwnerProperties(user.id),
      fetchManualPartners(user.id),
      fetchMarketplacePartners(),
    ])
    const nextProperties = (propertiesResult.data ?? []) as Property[]
    const propertyIds = nextProperties.map(property => property.id)
    const [tasksResult, invoicesResult] = await Promise.all([
      fetchOwnerPartnerTasks(propertyIds),
      fetchOwnerProviderInvoices(propertyIds),
    ])

    const nextPartners = [
      ...((manualResult.data ?? []) as PartnerRecord[]),
      ...((marketplaceResult.data ?? []) as PartnerRecord[]),
    ]

    setProperties(nextProperties)
    setPartners(nextPartners)
    setTasks((tasksResult.data ?? []) as TaskRecord[])
    setInvoices((invoicesResult.data ?? []) as ProviderInvoice[])
    setError(
      propertiesResult.error?.message
      ?? manualResult.error?.message
      ?? marketplaceResult.error?.message
      ?? tasksResult.error?.message
      ?? invoicesResult.error?.message
      ?? '',
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [user?.id])

  const intervenantPartners = useMemo(
    () => partners.filter(partner => isIntervenantPartnerCategory(partner.category)),
    [partners],
  )

  const partnerById = useMemo(() => {
    const map = new Map(partners.map(partner => [partner.id, partner]))
    return map
  }, [partners])

  const filteredPartners = useMemo(
    () => intervenantPartners.filter(partner =>
      matchesIntervenantCategoryFilter(partner.category, categoryFilter),
    ),
    [intervenantPartners, categoryFilter],
  )

  const filteredPartnerIds = useMemo(
    () => new Set(filteredPartners.map(partner => partner.id)),
    [filteredPartners],
  )

  const periodStart = useMemo(() => {
    if (periodFilter === '30') return daysAgoIso(30)
    if (periodFilter === '90') return daysAgoIso(90)
    return null
  }, [periodFilter])

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.partner_id || !filteredPartnerIds.has(task.partner_id)) return false
      if (propertyFilter !== 'all' && task.property_id !== propertyFilter) return false
      if (periodStart && task.due_date && task.due_date < periodStart) return false
      if (periodStart && !task.due_date && task.created_at && task.created_at.slice(0, 10) < periodStart) {
        return false
      }
      return true
    })
  }, [tasks, filteredPartnerIds, propertyFilter, periodStart])

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      if (!filteredPartnerIds.has(invoice.partner_id)) return false
      if (propertyFilter !== 'all' && invoice.property_id !== propertyFilter) return false
      if (periodStart && invoice.issue_date < periodStart) return false
      return true
    })
  }, [invoices, filteredPartnerIds, propertyFilter, periodStart])

  const today = todayIso()
  const kpis = useMemo(() => {
    const openTasks = filteredTasks.filter(task => task.status !== 'done')
    const overdue = openTasks.filter(task => task.due_date && task.due_date < today)
    const toValidate = filteredInvoices.filter(invoice => invoice.status === 'received')
    const toPay = filteredInvoices.filter(invoice => invoice.status === 'approved')
    const unpaidAmount = [...toValidate, ...toPay].reduce(
      (sum, invoice) => sum + Number(invoice.amount || 0),
      0,
    )
    return {
      todo: openTasks.length,
      overdue: overdue.length,
      toValidate: toValidate.length,
      toPay: toPay.length,
      unpaidAmount,
    }
  }, [filteredTasks, filteredInvoices, today])

  const categoryCards = useMemo(() => {
    return intervenantPartnerCategoryFilters
      .filter(item => item.id !== 'all')
      .map(item => {
        const categoryPartners = intervenantPartners.filter(partner =>
          matchesIntervenantCategoryFilter(partner.category, item.id),
        )
        const partnerIds = new Set(categoryPartners.map(partner => partner.id))
        const openTasks = tasks.filter(
          task => task.partner_id
            && partnerIds.has(task.partner_id)
            && task.status !== 'done'
            && (propertyFilter === 'all' || task.property_id === propertyFilter),
        )
        const pendingInvoices = invoices.filter(
          invoice => partnerIds.has(invoice.partner_id)
            && (invoice.status === 'received' || invoice.status === 'approved')
            && (propertyFilter === 'all' || invoice.property_id === propertyFilter),
        )
        return {
          ...item,
          partners: categoryPartners.length,
          openTasks: openTasks.length,
          pendingInvoices: pendingInvoices.length,
        }
      })
  }, [intervenantPartners, tasks, invoices, propertyFilter])

  const upcomingTasks = useMemo(() => {
    return [...filteredTasks]
      .filter(task => task.status !== 'done')
      .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
      .slice(0, 5)
  }, [filteredTasks])

  const openCreatePartner = (category = '') => {
    setFormInitialCategory(category)
    setFormOpen(true)
  }

  const openPartner = (partner: PartnerRecord) => {
    setSelectedPartner(partner)
    setDetailOpen(true)
  }

  const handleTaskStatus = async (task: TaskRecord, status: TaskStatus) => {
    setBusyId(task.id)
    const { data, error: updateError } = await updateTaskStatus(task.id, status)
    setBusyId(null)
    if (updateError || !data) {
      setError(updateError?.message ?? 'Impossible de mettre à jour la tâche.')
      return
    }
    setTasks(current => current.map(item => (item.id === task.id ? data as TaskRecord : item)))
  }

  const handleDeleteTask = async (task: TaskRecord) => {
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

  const handleInvoiceStatus = async (invoice: ProviderInvoice, status: ProviderInvoiceStatus) => {
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
    setInvoices(current => current.map(item => (
      item.id === invoice.id ? { ...item, ...(data as ProviderInvoice) } : item
    )))
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
    if (deleteError) {
      setError('La facture a été supprimée, mais le fichier devra être nettoyé ultérieurement.')
    }
  }

  if (loading) return <LoadingState label="Chargement de l’entretien villa…" />

  const invoicePartnerOptions = filteredPartners.length > 0 ? filteredPartners : intervenantPartners

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
            Exploitation
          </p>
          <h1 className="mt-1 text-lg font-semibold">Entretien & travaux</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Pilotez piscinistes, jardiniers et interventions techniques : tâches, factures
            et suivi par villa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={openCreateTask}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nouvelle tâche
          </Button>
          <Button type="button" size="sm" onClick={() => openCreatePartner('Piscine & spa technique')}>
            <Plus className="mr-1.5 h-4 w-4" />
            Ajouter un intervenant
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Select
          label="Villa"
          value={propertyFilter}
          onChange={event => setPropertyFilter(event.target.value)}
          options={[
            { value: 'all', label: 'Toutes les villas' },
            ...properties.map(property => ({ value: property.id, label: property.name })),
          ]}
        />
        <Select
          label="Catégorie"
          value={categoryFilter}
          onChange={event => setCategoryFilter(event.target.value as CategoryFilter)}
          options={intervenantPartnerCategoryFilters.map(item => ({
            value: item.id,
            label: item.label,
          }))}
        />
        <Select
          label="Période"
          value={periodFilter}
          onChange={event => setPeriodFilter(event.target.value as PeriodFilter)}
          options={[
            { value: '30', label: '30 derniers jours' },
            { value: '90', label: '90 derniers jours' },
            { value: 'all', label: 'Tout' },
          ]}
        />
        <div className="flex items-end">
          <Button type="button" variant="secondary" className="w-full" onClick={load}>
            Actualiser
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tâches ouvertes</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{kpis.todo}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">En retard</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-semibold tabular-nums">
            {kpis.overdue}
            {kpis.overdue > 0 && <AlertTriangle className="h-4 w-4 text-warning" />}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Factures à traiter</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {kpis.toValidate + kpis.toPay}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {kpis.toValidate} à valider · {kpis.toPay} à payer
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Montant impayé</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            }).format(kpis.unpaidAmount)}
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(option => (
          <button
            key={option.id}
            type="button"
            onClick={() => setTab(option.id)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              tab === option.id
                ? 'border-foreground/20 bg-foreground text-background'
                : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {categoryCards.map(card => {
              const Icon = filterCardIcon(card.id)
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(card.id)
                    setTab('providers')
                  }}
                  className="rounded-lg border border-border bg-card p-4 text-left transition hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{card.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {card.partners} intervenant{card.partners > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                    <span>{card.openTasks} tâche{card.openTasks > 1 ? 's' : ''} ouverte{card.openTasks > 1 ? 's' : ''}</span>
                    <span>{card.pendingInvoices} facture{card.pendingInvoices > 1 ? 's' : ''} en attente</span>
                  </div>
                </button>
              )
            })}
          </div>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Prochaines échéances</h2>
              <Button type="button" variant="secondary" size="sm" onClick={() => setTab('tasks')}>
                Voir toutes les tâches
              </Button>
            </div>
            {upcomingTasks.length === 0 ? (
              <EmptyState
                title="Aucune tâche technique planifiée"
                description="Créez une intervention pour votre intervenant technique."
                action={(
                  <Button
                    type="button"
                    size="sm"
                    onClick={openCreateTask}
                  >
                    Planifier une intervention
                  </Button>
                )}
              />
            ) : (
              <div className="space-y-3">
                {upcomingTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    dateFormat={profile?.date_format}
                    busyId={busyId}
                    compact
                    onEdit={item => {
                      setEditingTask(item)
                      setTaskPrefill(null)
                      setPendingCategoryHint(null)
                      setTaskModalOpen(true)
                    }}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleTaskStatus}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {filteredTasks.length} tâche{filteredTasks.length > 1 ? 's' : ''} intervenant
            </p>
            <Button
              type="button"
              size="sm"
              onClick={openCreateTask}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nouvelle tâche
            </Button>
          </div>
          {filteredTasks.length === 0 ? (
            <EmptyState
              title="Aucune tâche dans ce filtre"
              description="Ajoutez un intervenant technique puis planifiez ses interventions."
              action={(
                <Button type="button" size="sm" onClick={() => openCreatePartner()}>
                  Ajouter un intervenant
                </Button>
              )}
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  dateFormat={profile?.date_format}
                  busyId={busyId}
                  onEdit={item => {
                    setEditingTask(item)
                    setTaskPrefill(null)
                    setPendingCategoryHint(null)
                    setTaskModalOpen(true)
                  }}
                  onDelete={handleDeleteTask}
                  onStatusChange={handleTaskStatus}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'invoices' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <Select
                  label="Prestataire pour une nouvelle facture"
                  value={invoicePartnerId}
                  onChange={event => setInvoicePartnerId(event.target.value)}
                  options={[
                    { value: '', label: 'Sélectionner…' },
                    ...invoicePartnerOptions.map(partner => ({
                      value: partner.id,
                      label: partner.category
                        ? `${partner.name} · ${partner.category}`
                        : partner.name,
                    })),
                  ]}
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!invoicePartnerId}
                onClick={() => setInvoiceModalOpen(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Ajouter une facture
              </Button>
            </div>
          </Card>

          {filteredInvoices.length === 0 ? (
            <EmptyState
              title="Aucune facture prestataire"
              description="Archivez les factures de piscine, jardinage et travaux pour suivre les montants à valider et à payer."
            />
          ) : (
            <div className="space-y-3">
              {filteredInvoices.map(invoice => {
                const partner = partnerById.get(invoice.partner_id)
                const canDelete = invoice.status === 'received' || invoice.status === 'rejected'
                const transitions = providerInvoiceTransitions[invoice.status]
                return (
                  <Card key={invoice.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">
                            {invoice.invoice_number || invoice.file_name}
                          </p>
                          <Badge variant={invoiceBadgeVariant(invoice.status)}>
                            {providerInvoiceStatusLabels[invoice.status]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {partner?.name ?? invoice.partners?.name ?? 'Prestataire'}
                          {' · '}
                          {invoice.properties?.name ?? 'Villa'}
                          {' · '}
                          {formatDateForDisplay(invoice.issue_date, profile?.date_format)}
                        </p>
                        <p className="mt-2 text-sm font-semibold tabular-nums">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: invoice.currency || 'EUR',
                          }).format(Number(invoice.amount || 0))}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busyId === invoice.id}
                          onClick={() => handleOpenInvoice(invoice)}
                        >
                          <Receipt className="mr-1.5 h-3.5 w-3.5" />
                          Ouvrir
                        </Button>
                        {canDelete && (
                          <Button
                            type="button"
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
                    {transitions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                        {transitions.map(status => (
                          <Button
                            key={status}
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={busyId === invoice.id}
                            onClick={() => handleInvoiceStatus(invoice, status)}
                          >
                            {providerInvoiceStatusLabels[status]}
                          </Button>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'providers' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {filteredPartners.length} intervenant{filteredPartners.length > 1 ? 's' : ''}
              {categoryFilter !== 'all' ? ' dans ce filtre' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/app/partners"
                className="inline-flex h-9 items-center rounded-sm border border-input bg-card px-3 text-sm font-medium hover:bg-muted"
              >
                Prestataires de services
              </Link>
              <Button type="button" size="sm" onClick={() => openCreatePartner()}>
                <Plus className="mr-1.5 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </div>

          {filteredPartners.length === 0 ? (
            <EmptyState
              title="Aucun intervenant technique"
              description="Ajoutez un intervenant (ménage, pisciniste, jardinier, électricien…) pour centraliser les interventions et les factures."
              action={(
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" size="sm" onClick={() => openCreatePartner('Ménage & entretien')}>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Ajouter le ménage
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => openCreatePartner('Piscine & spa technique')}>
                    <Droplets className="mr-1.5 h-4 w-4" />
                    Ajouter un pisciniste
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => openCreatePartner('Jardinage & espaces verts')}>
                    <Leaf className="mr-1.5 h-4 w-4" />
                    Ajouter un jardinier
                  </Button>
                </div>
              )}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredPartners.map(partner => {
                const Icon = categoryIcon(partner.category)
                const partnerTasks = tasks.filter(
                  task => task.partner_id === partner.id && task.status !== 'done',
                )
                const partnerInvoices = invoices.filter(
                  invoice => invoice.partner_id === partner.id
                    && (invoice.status === 'received' || invoice.status === 'approved'),
                )
                return (
                  <Card key={partner.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{partner.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {partner.category ?? 'Catégorie non renseignée'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <ClipboardList className="h-3.5 w-3.5" />
                            {partnerTasks.length} ouverte{partnerTasks.length > 1 ? 's' : ''}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CircleDollarSign className="h-3.5 w-3.5" />
                            {partnerInvoices.length} facture{partnerInvoices.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button type="button" size="sm" onClick={() => openPartner(partner)}>
                        Ouvrir la fiche
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setInvoicePartnerId(partner.id)
                          setInvoiceModalOpen(true)
                        }}
                      >
                        Facture
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      <TaskFormModal
        open={taskModalOpen}
        task={editingTask}
        initialLinkType={taskPrefill?.linkType ?? 'partner'}
        initialPartnerId={
          editingTask?.partner_id
          ?? taskPrefill?.partnerId
          ?? filteredPartners[0]?.id
        }
        initialPropertyId={
          editingTask?.property_id
          ?? taskPrefill?.propertyId
          ?? (propertyFilter !== 'all' ? propertyFilter : properties[0]?.id)
        }
        initialPrefill={editingTask ? undefined : taskPrefill ?? undefined}
        onClose={() => {
          setTaskModalOpen(false)
          setEditingTask(null)
          setTaskPrefill(null)
          setPendingCategoryHint(null)
        }}
        onSaved={task => {
          setTasks(current => {
            const exists = current.some(item => item.id === task.id)
            return exists
              ? current.map(item => (item.id === task.id ? task : item))
              : [task, ...current]
          })
          setTaskModalOpen(false)
          setEditingTask(null)
          setTaskPrefill(null)
          setPendingCategoryHint(null)
        }}
      />

      {user && invoicePartnerId && (
        <ProviderInvoiceFormModal
          open={invoiceModalOpen}
          ownerId={user.id}
          partnerId={invoicePartnerId}
          properties={properties}
          tasks={tasks.filter(task => task.partner_id === invoicePartnerId)}
          onClose={() => setInvoiceModalOpen(false)}
          onSaved={invoice => {
            setInvoices(current => [invoice, ...current])
            setInvoiceModalOpen(false)
          }}
        />
      )}

      <PartnerFormModal
        open={formOpen}
        categoryScope="intervenant"
        initialCategory={formInitialCategory}
        onClose={() => {
          setFormOpen(false)
          setFormInitialCategory('')
        }}
        onSaved={partner => {
          setPartners(current => [partner, ...current.filter(item => item.id !== partner.id)])
          setFormOpen(false)
          setFormInitialCategory('')
          if (isIntervenantPartnerCategory(partner.category)) {
            setSelectedPartner(partner)
            setDetailOpen(true)
          }
        }}
      />

      <PartnerDetailModal
        open={detailOpen}
        partner={selectedPartner}
        ownerId={user?.id}
        onClose={() => {
          setDetailOpen(false)
          setSelectedPartner(null)
          load()
        }}
        onEdit={partner => {
          setSelectedPartner(partner)
          setFormInitialCategory(partner.category ?? '')
          setFormOpen(true)
        }}
        onDeleted={partnerId => {
          setPartners(current => current.filter(item => item.id !== partnerId))
          setDetailOpen(false)
          setSelectedPartner(null)
        }}
      />
    </div>
  )
}
