import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useWorkOrders, useServiceProviders, useIncidents, useProperties, type WorkOrder } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useRole } from '@/lib/roleContext'
import { useAuth } from '@/lib/authContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { Loader2, Plus, Trash2, Wrench } from 'lucide-react'

const statusVariant: Record<WorkOrder['status'], 'info' | 'warning' | 'success' | 'muted' | 'destructive'> = {
  sent: 'info', quote_received: 'warning', validated: 'success', completed: 'muted', cancelled: 'destructive',
}
const statuses: WorkOrder['status'][] = ['sent', 'quote_received', 'validated', 'completed', 'cancelled']

interface WorkOrderForm {
  property_id: string
  provider_id: string
  incident_id: string
  title: string
  description: string
  scheduled_date: string
}

const emptyForm: WorkOrderForm = { property_id: '', provider_id: '', incident_id: '', title: '', description: '', scheduled_date: '' }

function formatAmount(value: number | null): string {
  if (value == null) return '—'
  return `€${Number(value).toLocaleString()}`
}

export function WorkOrders() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user } = useAuth()
  const { actualRole } = useRole()
  const { data: rawWorkOrders, loading, insert, update, remove } = useWorkOrders()
  const { data: rawProperties } = useProperties()
  const { data: rawProviders } = useServiceProviders()
  const { data: rawIncidents } = useIncidents()
  const { filterWorkOrders, filterProperties, filterIncidents, filterServiceProviders } = useRoleFilter()

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [propertyFilter, setPropertyFilter] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<WorkOrder | null>(null)
  const [quoteAmount, setQuoteAmount] = useState('')
  const [finalCost, setFinalCost] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null)

  const properties = filterProperties(rawProperties)
  const providers = filterServiceProviders(rawProviders).filter(p => p.status === 'active')
  const incidents = filterIncidents(rawIncidents)

  const workOrders = useMemo(() => {
    return filterWorkOrders(rawWorkOrders)
      .filter(w => statusFilter === 'all' || w.status === statusFilter)
      .filter(w => !propertyFilter || w.property_id === propertyFilter)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawWorkOrders, statusFilter, propertyFilter])

  const propertyName = (id: string) => rawProperties.find(p => p.id === id)?.name ?? '—'
  const providerName = (id: string) => rawProviders.find(p => p.id === id)?.name ?? '—'
  const incidentTitle = (id: string | null) => id ? (rawIncidents.find(i => i.id === id)?.title ?? '—') : null

  const formIncidents = incidents.filter(i => i.property_id === form.property_id && (i.status === 'open' || i.status === 'in_progress'))
  const formProviders = providers.filter(p => !p.property_id || p.property_id === form.property_id)

  const openCreate = () => {
    setForm({ ...emptyForm, property_id: properties[0]?.id ?? '' })
    setFormError('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.property_id || !form.provider_id) {
      setFormError(t('workOrders.formError'))
      return
    }
    setSaving(true)
    try {
      await insert({
        property_id: form.property_id,
        provider_id: form.provider_id,
        incident_id: form.incident_id || null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        scheduled_date: form.scheduled_date || null,
        created_by: user?.id ?? null,
        status: 'sent',
      })
      toast(t('workOrders.created'))
      setShowForm(false)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const openDetail = (wo: WorkOrder) => {
    setDetail(wo)
    setQuoteAmount(wo.quote_amount != null ? String(wo.quote_amount) : '')
    setFinalCost(wo.final_cost != null ? String(wo.final_cost) : '')
  }

  const updateDetail = async (changes: Partial<WorkOrder>) => {
    if (!detail) return
    try {
      const updated = await update(detail.id, changes)
      setDetail(updated)
      toast(t('workOrders.updated'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast(t('workOrders.deleted'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
    setDetail(null)
  }

  const statusOptions = (current: WorkOrder['status']) =>
    statuses
      .filter(s => actualRole === 'owner' || actualRole === 'agency' || s !== 'validated' || current === 'validated')
      .map(s => ({ value: s, label: t(`workOrders.status.${s}`) }))

  return (
    <div className="space-y-6" data-testid="work-orders">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-info/10 text-info shrink-0">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight leading-tight">{t('workOrders.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('workOrders.subtitle')}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t('workOrders.create')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="w-44"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: t('workOrders.filterAll') },
            ...statuses.map(s => ({ value: s, label: t(`workOrders.status.${s}`) })),
          ]}
        />
        <Select
          className="w-52"
          value={propertyFilter}
          onChange={e => setPropertyFilter(e.target.value)}
          options={[
            { value: '', label: t('workOrders.allProperties') },
            ...properties.map(p => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>

      {workOrders.length === 0 && !loading && (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t('workOrders.empty')}</Card>
      )}

      <div className="grid gap-3">
        {workOrders.map(wo => (
          <Card
            key={wo.id}
            className="p-4 cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => openDetail(wo)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{wo.title}</p>
                  <Badge variant={statusVariant[wo.status]}>{t(`workOrders.status.${wo.status}`)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {propertyName(wo.property_id)} · {t('workOrders.provider')} {providerName(wo.provider_id)} · {new Date(wo.created_at).toLocaleDateString()}
                  {incidentTitle(wo.incident_id) && <> · {t('workOrders.incident')}: {incidentTitle(wo.incident_id)}</>}
                </p>
                {wo.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{wo.description}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums">{formatAmount(wo.final_cost ?? wo.quote_amount)}</p>
                {wo.quote_amount != null && wo.final_cost == null && (
                  <p className="text-[10px] text-muted-foreground">{t('workOrders.quoteLabel')}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('workOrders.create')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={t('workOrders.property')}
            value={form.property_id}
            onChange={e => setForm(f => ({ ...f, property_id: e.target.value, incident_id: '', provider_id: '' }))}
            options={properties.map(p => ({ value: p.id, label: p.name }))}
          />
          <Select
            label={t('workOrders.provider')}
            value={form.provider_id}
            onChange={e => setForm(f => ({ ...f, provider_id: e.target.value }))}
            options={[
              { value: '', label: t('workOrders.selectProvider') },
              ...formProviders.map(p => ({ value: p.id, label: `${p.name}${p.category ? ` (${p.category})` : ''}` })),
            ]}
          />
          <Select
            label={t('workOrders.incident')}
            value={form.incident_id}
            onChange={e => setForm(f => ({ ...f, incident_id: e.target.value }))}
            options={[
              { value: '', label: t('workOrders.noIncident') },
              ...formIncidents.map(i => ({ value: i.id, label: i.title })),
            ]}
          />
          <Input
            label={t('workOrders.orderTitle')}
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder={t('workOrders.titlePlaceholder')}
            error={formError || undefined}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">{t('workOrders.description')}</label>
            <textarea
              className="w-full min-h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <Input
            label={t('workOrders.scheduledDate')}
            type="date"
            value={form.scheduled_date}
            onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {t('workOrders.send')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? ''}>
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusVariant[detail.status]}>{t(`workOrders.status.${detail.status}`)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {propertyName(detail.property_id)} · {t('workOrders.provider')} {providerName(detail.provider_id)} · {new Date(detail.created_at).toLocaleString()}
              {incidentTitle(detail.incident_id) && <> · {t('workOrders.incident')}: {incidentTitle(detail.incident_id)}</>}
            </p>
            {detail.description && <p className="text-sm whitespace-pre-wrap">{detail.description}</p>}
            {detail.scheduled_date && (
              <p className="text-xs text-muted-foreground">{t('workOrders.scheduledDate')}: {new Date(detail.scheduled_date).toLocaleDateString()}</p>
            )}
            <Select
              label={t('common.status')}
              value={detail.status}
              onChange={e => updateDetail({ status: e.target.value as WorkOrder['status'] })}
              options={statusOptions(detail.status)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('workOrders.quoteAmount')}
                type="number"
                step="0.01"
                value={quoteAmount}
                onChange={e => setQuoteAmount(e.target.value)}
                onBlur={() => {
                  const parsed = quoteAmount === '' ? null : Number(quoteAmount)
                  if (parsed !== detail.quote_amount) updateDetail({ quote_amount: parsed })
                }}
              />
              <Input
                label={t('workOrders.finalCost')}
                type="number"
                step="0.01"
                value={finalCost}
                onChange={e => setFinalCost(e.target.value)}
                onBlur={() => {
                  const parsed = finalCost === '' ? null : Number(finalCost)
                  if (parsed !== detail.final_cost) updateDetail({ final_cost: parsed })
                }}
              />
            </div>
            {detail.completed_at && (
              <p className="text-xs text-muted-foreground">{t('workOrders.completedAt')} {new Date(detail.completed_at).toLocaleString()}</p>
            )}
            {actualRole === 'owner' && (
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(detail)}>
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  {t('common.delete')}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('workOrders.deleteTitle')}
        message={deleteTarget ? t('workOrders.deleteMessage').replace('{title}', deleteTarget.title) : ''}
      />
    </div>
  )
}
