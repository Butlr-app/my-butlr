import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useInspections, useProperties, type Inspection } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useRole } from '@/lib/roleContext'
import { useAuth } from '@/lib/authContext'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from '@/i18n/LanguageContext'
import { Link } from 'react-router-dom'
import { Plus, Loader2, Trash2, ClipboardCheck, Building2, User, CalendarDays, ArrowRight } from 'lucide-react'

const PAGE_SIZE = 9

export function Inspections() {
  const { inspections: rawInspections, loading, insert, remove } = useInspections()
  const { data: rawProperties } = useProperties()
  const { filterInspections, filterProperties } = useRoleFilter()
  const { actualRole } = useRole()
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ inspector_name: '', property_id: '', inspection_type: 'check_in' as Inspection['inspection_type'], notes: '' })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const properties = filterProperties(rawProperties)
  const inspections = filterInspections(rawInspections)

  const filtered = inspections.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const openCreate = () => {
    setForm({ inspector_name: '', property_id: properties[0]?.id ?? '', inspection_type: 'check_in', notes: '' })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.inspector_name.trim()) return
    setSaving(true)
    try {
      await insert({
        inspector_name: form.inspector_name,
        property_id: form.property_id || null,
        inspection_type: form.inspection_type,
        notes: form.notes || null,
        created_by: user?.id ?? null,
        status: 'in_progress',
      })
      toast(t('toast.saved'))
      setShowForm(false)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast(t('toast.deleted'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-soft text-primary shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight leading-tight">{t('inspections.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('inspections.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
            options={[
              { value: 'all', label: t('common.all') },
              { value: 'in_progress', label: t('inspections.inProgress') },
              { value: 'completed', label: t('inspections.completed') },
            ]}
          />
          <Button variant="gold" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> {t('inspections.newInspection')}
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">{t('inspections.noInspections')}</p>
          <Button variant="gold" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> {t('inspections.newInspection')}
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map(inspection => (
              <InspectionCard
                key={inspection.id}
                inspection={inspection}
                canDelete={actualRole === 'owner' || actualRole === 'agency'}
                onDelete={() => setDeleteTarget({ id: inspection.id, name: inspection.property?.name ?? inspection.inspector_name })}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={safePage === 0} onClick={() => setPage(p => p - 1)}>
                {t('common.previous')}
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">{safePage + 1} / {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                {t('common.next')}
              </Button>
            </div>
          )}
        </>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('inspections.newInspection')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('inspections.inspector')}
            required
            value={form.inspector_name}
            onChange={e => setForm(f => ({ ...f, inspector_name: e.target.value }))}
            placeholder={t('inspections.inspectorPlaceholder')}
          />
          <Select
            label={t('inspections.property')}
            value={form.property_id}
            onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
            options={[
              { value: '', label: t('inspections.selectProperty') },
              ...properties.map(p => ({ value: p.id, label: p.name })),
            ]}
          />
          <Select
            label={t('inspections.type')}
            value={form.inspection_type}
            onChange={e => setForm(f => ({ ...f, inspection_type: e.target.value as Inspection['inspection_type'] }))}
            options={[
              { value: 'check_in', label: t('inspections.types.check_in') },
              { value: 'check_out', label: t('inspections.types.check_out') },
              { value: 'routine', label: t('inspections.types.routine') },
            ]}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">{t('inspections.notes')}</label>
            <textarea
              className="w-full h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {t('common.add')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('inspections.deleteInspection')}
        message={t('inspections.confirmDelete')}
      />
    </div>
  )
}

function InspectionCard({ inspection, canDelete, onDelete }: { inspection: Inspection; canDelete: boolean; onDelete: () => void }) {
  const { t } = useTranslation()
  const date = new Date(inspection.created_at).toLocaleDateString()

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{inspection.property?.name ?? '—'}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span>{inspection.inspector_name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="w-3 h-3" />
            <span>{date}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={inspection.status === 'completed' ? 'success' : 'warning'}>
            {inspection.status === 'completed' ? t('inspections.completed') : t('inspections.inProgress')}
          </Badge>
          <Badge variant="muted">{t(`inspections.types.${inspection.inspection_type}`)}</Badge>
        </div>
      </div>

      {inspection.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2">{inspection.notes}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Link to={`/app/inspections/${inspection.id}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full">
            {t('common.viewAll')} <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
        {canDelete && (
          <Button variant="secondary" size="sm" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>
    </Card>
  )
}
