import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import { useShifts, useProperties, useTeamMembers, type Shift, type TeamMember } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useRole } from '@/lib/roleContext'
import { useAuth } from '@/lib/authContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { CalendarRange, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'

const shiftTypes: Shift['type'][] = ['general', 'cleaning', 'checkin', 'checkout', 'maintenance']

const typeStyle: Record<Shift['type'], string> = {
  general: 'bg-primary/10 text-primary border-primary/20',
  cleaning: 'bg-info/10 text-info border-info/20',
  checkin: 'bg-success/10 text-success border-success/20',
  checkout: 'bg-warning/10 text-warning border-warning/20',
  maintenance: 'bg-destructive/10 text-destructive border-destructive/20',
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return toDateString(d)
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

function hhmm(time: string): string {
  return time.slice(0, 5)
}

function memberLabel(m: TeamMember | undefined): string {
  if (!m) return '—'
  return m.full_name || m.email || '—'
}

interface ShiftForm {
  user_id: string
  property_id: string
  shift_date: string
  start_time: string
  end_time: string
  type: Shift['type']
  note: string
}

export function TeamPlanning() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user } = useAuth()
  const { actualRole } = useRole()
  const { data: rawShifts, loading, insert, remove } = useShifts()
  const { data: rawProperties } = useProperties()
  const { members } = useTeamMembers()
  const { filterShifts, filterProperties } = useRoleFilter()

  const [weekStart, setWeekStart] = useState(() => mondayOf(toDateString(new Date())))
  const [propertyFilter, setPropertyFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ShiftForm | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<Shift | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Shift | null>(null)

  const isOwner = actualRole === 'owner' || actualRole === 'agency'
  const properties = filterProperties(rawProperties)
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const today = toDateString(new Date())

  const weekShifts = filterShifts(rawShifts)
    .filter(s => s.shift_date >= days[0] && s.shift_date <= days[6])
    .filter(s => !propertyFilter || s.property_id === propertyFilter)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const rows = useMemo(() => {
    const ids = new Set(weekShifts.map(s => s.user_id))
    const known = members.filter(m => ids.has(m.id))
    const unknown = [...ids].filter(id => !members.some(m => m.id === id))
    return [
      ...known.sort((a, b) => memberLabel(a).localeCompare(memberLabel(b))),
      ...unknown.map(id => ({ id, full_name: null, email: null, role: '' }) as TeamMember),
    ]
  }, [weekShifts, members])

  const propertyName = (id: string) => rawProperties.find(p => p.id === id)?.name ?? '—'
  const totalHours = weekShifts.reduce((s, x) => {
    const [sh, sm] = x.start_time.split(':').map(Number)
    const [eh, em] = x.end_time.split(':').map(Number)
    return s + (eh * 60 + em - sh * 60 - sm) / 60
  }, 0)

  const openCreate = (userId?: string, date?: string) => {
    setForm({
      user_id: userId ?? members[0]?.id ?? '',
      property_id: properties[0]?.id ?? '',
      shift_date: date ?? today,
      start_time: '09:00',
      end_time: '17:00',
      type: 'general',
      note: '',
    })
    setFormError('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    if (!form.user_id || !form.property_id || !form.shift_date || form.end_time <= form.start_time) {
      setFormError(t('teamPlanning.formError'))
      return
    }
    setSaving(true)
    try {
      await insert({
        user_id: form.user_id,
        property_id: form.property_id,
        shift_date: form.shift_date,
        start_time: form.start_time,
        end_time: form.end_time,
        type: form.type,
        note: form.note.trim() || null,
        created_by: user?.id ?? null,
      })
      toast(t('teamPlanning.created'))
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
      toast(t('teamPlanning.deleted'))
      setDetail(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
  }

  const weekLabel = `${new Date(`${days[0]}T00:00:00`).toLocaleDateString()} – ${new Date(`${days[6]}T00:00:00`).toLocaleDateString()}`

  return (
    <div className="space-y-6" data-testid="team-planning">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <CalendarRange className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight leading-tight">{t('teamPlanning.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('teamPlanning.subtitle')}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto flex items-center gap-2">
          {isOwner && (
            <Button size="sm" onClick={() => openCreate()}>
              <Plus className="w-4 h-4 mr-1.5" />
              {t('teamPlanning.addShift')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label={t('teamPlanning.previousWeek')}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold tabular-nums">{weekLabel}</span>
        <Button variant="secondary" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label={t('teamPlanning.nextWeek')}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        {weekStart !== mondayOf(today) && (
          <Button variant="secondary" size="sm" onClick={() => setWeekStart(mondayOf(today))}>
            {t('teamPlanning.thisWeek')}
          </Button>
        )}
        <Select
          className="w-52"
          value={propertyFilter}
          onChange={e => setPropertyFilter(e.target.value)}
          options={[
            { value: '', label: t('teamPlanning.allProperties') },
            ...properties.map(p => ({ value: p.id, label: p.name })),
          ]}
        />
        <span className="ml-auto text-sm text-muted-foreground tabular-nums" data-testid="week-summary">
          {weekShifts.length} {t('teamPlanning.shifts')} · {totalHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} {t('teamPlanning.hours')}
        </span>
      </div>

      {rows.length === 0 && !loading && (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t('teamPlanning.empty')}</Card>
      )}

      {rows.length > 0 && (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-medium text-muted-foreground px-4 py-3 w-44">{t('teamPlanning.member')}</th>
                {days.map(d => (
                  <th key={d} className={`text-left font-medium px-2 py-3 ${d === today ? 'text-primary' : 'text-muted-foreground'}`}>
                    {new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(member => (
                <tr key={member.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{memberLabel(member)}</p>
                    {member.role && <p className="text-xs text-muted-foreground capitalize">{member.role.replace('_', ' ')}</p>}
                  </td>
                  {days.map(d => {
                    const cell = weekShifts.filter(s => s.user_id === member.id && s.shift_date === d)
                    return (
                      <td key={d} className={`px-2 py-2 ${d === today ? 'bg-primary/5' : ''}`}>
                        <div className="space-y-1.5">
                          {cell.map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setDetail(s)}
                              className={`block w-full text-left rounded-md border px-2 py-1.5 text-xs ${typeStyle[s.type]}`}
                              data-testid={`shift-${s.id}`}
                            >
                              <span className="font-semibold tabular-nums">{hhmm(s.start_time)}–{hhmm(s.end_time)}</span>
                              <span className="block truncate">{propertyName(s.property_id)}</span>
                            </button>
                          ))}
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => openCreate(member.id, d)}
                              className="w-full rounded-md border border-dashed border-border text-muted-foreground/60 hover:text-primary hover:border-primary/40 text-xs py-1"
                              aria-label={t('teamPlanning.addShift')}
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('teamPlanning.addShift')}>
        {form && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label={t('teamPlanning.member')}
              value={form.user_id}
              onChange={e => setForm(f => f && { ...f, user_id: e.target.value })}
              options={members.map(m => ({ value: m.id, label: memberLabel(m) }))}
            />
            <Select
              label={t('teamPlanning.property')}
              value={form.property_id}
              onChange={e => setForm(f => f && { ...f, property_id: e.target.value })}
              options={properties.map(p => ({ value: p.id, label: p.name }))}
            />
            <div className="grid grid-cols-3 gap-3">
              <Input
                label={t('teamPlanning.dateLabel')}
                type="date"
                value={form.shift_date}
                onChange={e => setForm(f => f && { ...f, shift_date: e.target.value })}
              />
              <Input
                label={t('teamPlanning.startLabel')}
                type="time"
                value={form.start_time}
                onChange={e => setForm(f => f && { ...f, start_time: e.target.value })}
              />
              <Input
                label={t('teamPlanning.endLabel')}
                type="time"
                value={form.end_time}
                onChange={e => setForm(f => f && { ...f, end_time: e.target.value })}
              />
            </div>
            <Select
              label={t('teamPlanning.typeLabel')}
              value={form.type}
              onChange={e => setForm(f => f && { ...f, type: e.target.value as Shift['type'] })}
              options={shiftTypes.map(ty => ({ value: ty, label: t(`teamPlanning.type.${ty}`) }))}
            />
            <Input
              label={t('teamPlanning.noteLabel')}
              value={form.note}
              onChange={e => setForm(f => f && { ...f, note: e.target.value })}
            />
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {t('teamPlanning.addShift')}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${memberLabel(members.find(m => m.id === detail.user_id))} — ${new Date(`${detail.shift_date}T00:00:00`).toLocaleDateString()}` : ''}
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="muted">{t(`teamPlanning.type.${detail.type}`)}</Badge>
              <span className="tabular-nums font-semibold">{hhmm(detail.start_time)}–{hhmm(detail.end_time)}</span>
            </div>
            <p><span className="text-muted-foreground">{t('teamPlanning.property')}:</span> {propertyName(detail.property_id)}</p>
            {detail.note && <p><span className="text-muted-foreground">{t('teamPlanning.noteLabel')}:</span> {detail.note}</p>}
            {isOwner && (
              <div className="flex justify-end">
                <Button size="sm" variant="secondary" onClick={() => setDeleteTarget(detail)}>
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
        title={t('teamPlanning.deleteTitle')}
        message={deleteTarget ? t('teamPlanning.deleteMessage').replace('{member}', memberLabel(members.find(m => m.id === deleteTarget.user_id))) : ''}
      />
    </div>
  )
}
