import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import {
  useMaintenancePlans, useProperties, useTeamMembers, generateMaintenanceTasks,
  type MaintenancePlan, type TeamMember,
} from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useRole } from '@/lib/roleContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { CalendarClock, Loader2, Plus, Trash2, Pencil } from 'lucide-react'

const categories: MaintenancePlan['category'][] = ['hvac', 'plumbing', 'electrical', 'pool', 'garden', 'safety', 'appliance', 'other']
const intervals = [
  { value: 1, key: 'monthly' },
  { value: 3, key: 'quarterly' },
  { value: 6, key: 'semiannual' },
  { value: 12, key: 'annual' },
  { value: 24, key: 'biennial' },
] as const

function memberLabel(m: TeamMember | undefined): string {
  if (!m) return '—'
  return m.full_name || m.email || '—'
}

interface PlanForm {
  property_id: string
  title: string
  category: MaintenancePlan['category']
  notes: string
  interval_months: number
  lead_days: number
  next_due: string
  assigned_to: string
  active: boolean
}

const today = () => new Date().toISOString().slice(0, 10)

const emptyForm: PlanForm = {
  property_id: '', title: '', category: 'other', notes: '',
  interval_months: 12, lead_days: 7, next_due: today(), assigned_to: '', active: true,
}

export function Maintenance() {
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const { actualRole } = useRole()
  const { data: rawPlans, loading, insert, update, remove, refetch } = useMaintenancePlans()
  const { data: rawProperties } = useProperties()
  const { members } = useTeamMembers()
  const { filterMaintenancePlans, filterProperties } = useRoleFilter()

  const canManage = actualRole === 'owner' || actualRole === 'agency'
  const [propertyFilter, setPropertyFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MaintenancePlan | null>(null)

  useEffect(() => {
    generateMaintenanceTasks().then(n => { if (n > 0) refetch() }).catch(() => {})
  }, [refetch])

  const properties = filterProperties(rawProperties)
  const plans = filterMaintenancePlans(rawPlans)
    .filter(p => !propertyFilter || p.property_id === propertyFilter)
    .sort((a, b) => a.next_due.localeCompare(b.next_due))

  const propertyName = (id: string) => rawProperties.find(p => p.id === id)?.name ?? '—'
  const intervalLabel = (months: number) => {
    const match = intervals.find(i => i.value === months)
    return match ? t(`maintenance.interval.${match.key}`) : `${months} ${t('maintenance.months')}`
  }
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB'
  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })

  const dueBadge = (d: string): { variant: 'destructive' | 'warning' | 'muted'; key: string } => {
    const days = Math.round((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000)
    if (days < 0) return { variant: 'destructive', key: 'overdue' }
    if (days <= 14) return { variant: 'warning', key: 'soon' }
    return { variant: 'muted', key: 'scheduled' }
  }

  const openCreate = () => {
    setEditId(null)
    setForm({ ...emptyForm, property_id: properties[0]?.id ?? '' })
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (p: MaintenancePlan) => {
    setEditId(p.id)
    setForm({
      property_id: p.property_id, title: p.title, category: p.category, notes: p.notes ?? '',
      interval_months: p.interval_months, lead_days: p.lead_days, next_due: p.next_due,
      assigned_to: p.assigned_to ?? '', active: p.active,
    })
    setFormError('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.property_id || !form.next_due) {
      setFormError(t('maintenance.formError'))
      return
    }
    setSaving(true)
    try {
      const payload = {
        property_id: form.property_id,
        title: form.title.trim(),
        category: form.category,
        notes: form.notes.trim() || null,
        interval_months: form.interval_months,
        lead_days: form.lead_days,
        next_due: form.next_due,
        assigned_to: form.assigned_to || null,
        active: form.active,
      }
      if (editId) {
        await update(editId, payload)
        toast(t('maintenance.updated'))
      } else {
        await insert(payload)
        toast(t('maintenance.created'))
      }
      setShowForm(false)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast(t('maintenance.deleted'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6" data-testid="maintenance">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <CalendarClock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight leading-tight">{t('maintenance.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('maintenance.subtitle')}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        {canManage && (
          <div className="ml-auto">
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1.5" />
              {t('maintenance.add')}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="w-52"
          value={propertyFilter}
          onChange={e => setPropertyFilter(e.target.value)}
          options={[
            { value: '', label: t('maintenance.allProperties') },
            ...properties.map(p => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>

      {plans.length === 0 && !loading && (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t('maintenance.empty')}</Card>
      )}

      <div className="grid gap-3">
        {plans.map(plan => {
          const due = dueBadge(plan.next_due)
          return (
            <Card key={plan.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{plan.title}</p>
                    <Badge variant="muted">{t(`maintenance.category.${plan.category}`)}</Badge>
                    <Badge variant={due.variant}>{t(`maintenance.due.${due.key}`)}</Badge>
                    {!plan.active && <Badge variant="muted">{t('maintenance.inactive')}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {propertyName(plan.property_id)} · {t('maintenance.nextDue')} {fmtDate(plan.next_due)} · {t('maintenance.every')} {intervalLabel(plan.interval_months)}
                    {plan.assigned_to && <> · {memberLabel(members.find(m => m.id === plan.assigned_to))}</>}
                  </p>
                  {plan.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.notes}</p>}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(plan)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(plan)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? t('maintenance.editTitle') : t('maintenance.add')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={t('maintenance.property')}
            value={form.property_id}
            onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
            options={properties.map(p => ({ value: p.id, label: p.name }))}
          />
          <Input
            label={t('maintenance.planTitle')}
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder={t('maintenance.titlePlaceholder')}
            error={formError || undefined}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('maintenance.categoryLabel')}
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as MaintenancePlan['category'] }))}
              options={categories.map(c => ({ value: c, label: t(`maintenance.category.${c}`) }))}
            />
            <Select
              label={t('maintenance.frequency')}
              value={String(form.interval_months)}
              onChange={e => setForm(f => ({ ...f, interval_months: Number(e.target.value) }))}
              options={intervals.map(i => ({ value: String(i.value), label: t(`maintenance.interval.${i.key}`) }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label={t('maintenance.nextDue')}
              value={form.next_due}
              onChange={e => setForm(f => ({ ...f, next_due: e.target.value }))}
            />
            <Input
              type="number"
              label={t('maintenance.leadDays')}
              value={String(form.lead_days)}
              onChange={e => setForm(f => ({ ...f, lead_days: Math.max(0, Number(e.target.value)) }))}
            />
          </div>
          <Select
            label={t('maintenance.assignedTo')}
            value={form.assigned_to}
            onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
            options={[
              { value: '', label: t('maintenance.unassigned') },
              ...members.map(m => ({ value: m.id, label: memberLabel(m) })),
            ]}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">{t('maintenance.notes')}</label>
            <textarea
              className="w-full min-h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 rounded border-input"
            />
            {t('maintenance.activePlan')}
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('maintenance.deleteTitle')}
        message={deleteTarget ? t('maintenance.deleteMessage').replace('{title}', deleteTarget.title) : ''}
      />
    </div>
  )
}
