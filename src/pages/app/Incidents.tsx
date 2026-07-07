import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useIncidents, useProperties, useTeamMembers, type Incident, type TeamMember } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useRole } from '@/lib/roleContext'
import { useAuth } from '@/lib/authContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react'

const urgencyVariant = { critical: 'destructive', high: 'destructive', medium: 'warning', low: 'muted' } as const
const statusVariant: Record<Incident['status'], 'destructive' | 'info' | 'success' | 'muted'> = {
  open: 'destructive', in_progress: 'info', resolved: 'success', closed: 'muted',
}
const categories: Incident['category'][] = ['equipment', 'plumbing', 'electrical', 'damage', 'security', 'other']
const urgencies: Incident['urgency'][] = ['low', 'medium', 'high', 'critical']
const statuses: Incident['status'][] = ['open', 'in_progress', 'resolved', 'closed']
const urgencyRank = { critical: 0, high: 1, medium: 2, low: 3 } as const

function memberLabel(m: TeamMember | undefined): string {
  if (!m) return '—'
  return m.full_name || m.email || '—'
}

interface IncidentForm {
  property_id: string
  title: string
  description: string
  category: Incident['category']
  urgency: Incident['urgency']
  assigned_to: string
}

const emptyForm: IncidentForm = { property_id: '', title: '', description: '', category: 'other', urgency: 'medium', assigned_to: '' }

export function Incidents() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user } = useAuth()
  const { actualRole } = useRole()
  const { data: rawIncidents, loading, insert, update, remove } = useIncidents()
  const { data: rawProperties } = useProperties()
  const { members } = useTeamMembers()
  const { filterIncidents, filterProperties } = useRoleFilter()

  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [propertyFilter, setPropertyFilter] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<Incident | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Incident | null>(null)

  const properties = filterProperties(rawProperties)
  const incidents = filterIncidents(rawIncidents)
    .filter(i => {
      if (statusFilter === 'active') return i.status === 'open' || i.status === 'in_progress'
      if (statusFilter && statusFilter !== 'all') return i.status === statusFilter
      return true
    })
    .filter(i => !propertyFilter || i.property_id === propertyFilter)
    .sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency] || b.created_at.localeCompare(a.created_at))

  const propertyName = (id: string) => rawProperties.find(p => p.id === id)?.name ?? '—'

  const openCreate = () => {
    setForm({ ...emptyForm, property_id: properties[0]?.id ?? '' })
    setFormError('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.property_id) {
      setFormError(t('incidents.formError'))
      return
    }
    setSaving(true)
    try {
      await insert({
        property_id: form.property_id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        urgency: form.urgency,
        assigned_to: form.assigned_to || null,
        reported_by: user?.id ?? null,
        status: 'open',
      })
      toast(t('incidents.reported'))
      setShowForm(false)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const openDetail = (incident: Incident) => {
    setDetail(incident)
    setResolutionNote(incident.resolution_note ?? '')
  }

  const updateDetail = async (changes: Partial<Incident>) => {
    if (!detail) return
    try {
      const updated = await update(detail.id, changes)
      setDetail(updated)
      toast(t('incidents.updated'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast(t('incidents.deleted'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
    setDetail(null)
  }

  return (
    <div className="space-y-6" data-testid="incidents">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-destructive/10 text-destructive shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight leading-tight">{t('incidents.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('incidents.subtitle')}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t('incidents.report')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="w-44"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          options={[
            { value: 'active', label: t('incidents.filterActive') },
            { value: 'all', label: t('incidents.filterAll') },
            ...statuses.map(s => ({ value: s, label: t(`incidents.status.${s}`) })),
          ]}
        />
        <Select
          className="w-52"
          value={propertyFilter}
          onChange={e => setPropertyFilter(e.target.value)}
          options={[
            { value: '', label: t('incidents.allProperties') },
            ...properties.map(p => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>

      {incidents.length === 0 && !loading && (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t('incidents.empty')}</Card>
      )}

      <div className="grid gap-3">
        {incidents.map(incident => (
          <Card
            key={incident.id}
            className="p-4 cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => openDetail(incident)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">{incident.title}</p>
                  <Badge variant={urgencyVariant[incident.urgency]}>{t(`incidents.urgency.${incident.urgency}`)}</Badge>
                  <Badge variant={statusVariant[incident.status]}>{t(`incidents.status.${incident.status}`)}</Badge>
                  <Badge variant="muted">{t(`incidents.category.${incident.category}`)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {propertyName(incident.property_id)} · {new Date(incident.created_at).toLocaleDateString()}
                  {incident.assigned_to && <> · {t('incidents.assignedTo')} {memberLabel(members.find(m => m.id === incident.assigned_to))}</>}
                </p>
                {incident.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{incident.description}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('incidents.report')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label={t('incidents.property')}
            value={form.property_id}
            onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
            options={properties.map(p => ({ value: p.id, label: p.name }))}
          />
          <Input
            label={t('incidents.incidentTitle')}
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder={t('incidents.titlePlaceholder')}
            error={formError || undefined}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">{t('incidents.description')}</label>
            <textarea
              className="w-full min-h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('incidents.categoryLabel')}
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as Incident['category'] }))}
              options={categories.map(c => ({ value: c, label: t(`incidents.category.${c}`) }))}
            />
            <Select
              label={t('incidents.urgencyLabel')}
              value={form.urgency}
              onChange={e => setForm(f => ({ ...f, urgency: e.target.value as Incident['urgency'] }))}
              options={urgencies.map(u => ({ value: u, label: t(`incidents.urgency.${u}`) }))}
            />
          </div>
          <Select
            label={t('incidents.assignedTo')}
            value={form.assigned_to}
            onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
            options={[
              { value: '', label: t('incidents.unassigned') },
              ...members.map(m => ({ value: m.id, label: memberLabel(m) })),
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {t('incidents.report')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? ''}>
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={urgencyVariant[detail.urgency]}>{t(`incidents.urgency.${detail.urgency}`)}</Badge>
              <Badge variant={statusVariant[detail.status]}>{t(`incidents.status.${detail.status}`)}</Badge>
              <Badge variant="muted">{t(`incidents.category.${detail.category}`)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {propertyName(detail.property_id)} · {t('incidents.reportedBy')} {memberLabel(members.find(m => m.id === detail.reported_by))} · {new Date(detail.created_at).toLocaleString()}
            </p>
            {detail.description && <p className="text-sm whitespace-pre-wrap">{detail.description}</p>}
            {detail.photo_url && (
              <a href={detail.photo_url} target="_blank" rel="noreferrer">
                <img src={detail.photo_url} alt={t('incidents.photo')} className="w-full max-h-64 rounded-lg object-cover border" />
              </a>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t('common.status')}
                value={detail.status}
                onChange={e => updateDetail({ status: e.target.value as Incident['status'] })}
                options={statuses.map(s => ({ value: s, label: t(`incidents.status.${s}`) }))}
              />
              <Select
                label={t('incidents.assignedTo')}
                value={detail.assigned_to ?? ''}
                onChange={e => updateDetail({ assigned_to: e.target.value || null })}
                options={[
                  { value: '', label: t('incidents.unassigned') },
                  ...members.map(m => ({ value: m.id, label: memberLabel(m) })),
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">{t('incidents.resolutionNote')}</label>
              <textarea
                className="w-full min-h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
                value={resolutionNote}
                onChange={e => setResolutionNote(e.target.value)}
                onBlur={() => {
                  if (resolutionNote !== (detail.resolution_note ?? '')) {
                    updateDetail({ resolution_note: resolutionNote || null })
                  }
                }}
              />
            </div>
            {detail.resolved_at && (
              <p className="text-xs text-muted-foreground">{t('incidents.resolvedAt')} {new Date(detail.resolved_at).toLocaleString()}</p>
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
        title={t('incidents.deleteTitle')}
        message={deleteTarget ? t('incidents.deleteMessage').replace('{title}', deleteTarget.title) : ''}
      />
    </div>
  )
}
