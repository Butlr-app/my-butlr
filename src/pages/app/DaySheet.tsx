import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useProperties, useReservations, useTasks, useTaskChecklistItems, useTeamMembers, type Reservation, type Task, type TeamMember } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useTranslation } from '@/i18n/LanguageContext'
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Loader2, LogIn, LogOut, Printer, Users } from 'lucide-react'

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

function memberLabel(m: TeamMember | undefined): string {
  if (!m) return '—'
  return m.full_name || m.email || '—'
}

const priorityVariant = { high: 'destructive', medium: 'warning', low: 'muted' } as const
const statusVariant: Record<Task['status'], 'muted' | 'info' | 'warning' | 'success'> = {
  todo: 'muted', in_progress: 'info', waiting: 'warning', done: 'success',
}

interface VillaDay {
  propertyId: string
  propertyName: string
  location: string | null
  arrivals: Reservation[]
  departures: Reservation[]
  inHouse: Reservation[]
  tasks: Task[]
}

export function DaySheet() {
  const { t } = useTranslation()
  const [date, setDate] = useState(() => toDateString(new Date()))

  const { data: rawProperties, loading: loadingProps } = useProperties()
  const { data: rawReservations, loading: loadingRes } = useReservations()
  const { data: rawTasks, loading: loadingTasks } = useTasks()
  const { data: checklistItems } = useTaskChecklistItems()
  const { members } = useTeamMembers()
  const { filterProperties, filterReservations, filterTasks } = useRoleFilter()

  const loading = loadingProps || loadingRes || loadingTasks
  const isToday = date === toDateString(new Date())

  const villas = useMemo<VillaDay[]>(() => {
    const properties = filterProperties(rawProperties)
    const reservations = filterReservations(rawReservations).filter(r => r.status !== 'cancelled')
    const tasks = filterTasks(rawTasks)

    return properties
      .map(p => {
        const propRes = reservations.filter(r => r.property_id === p.id)
        return {
          propertyId: p.id,
          propertyName: p.name,
          location: p.location,
          arrivals: propRes.filter(r => r.arrival === date && (r.status === 'pending' || r.status === 'confirmed')),
          departures: propRes.filter(r => r.departure === date && (r.status === 'confirmed' || r.status === 'in_progress')),
          inHouse: propRes.filter(r => r.arrival < date && r.departure > date && (r.status === 'confirmed' || r.status === 'in_progress')),
          tasks: tasks
            .filter(task => task.property_id === p.id && task.due_date === date)
            .sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0) || a.title.localeCompare(b.title)),
        }
      })
      .sort((a, b) => a.propertyName.localeCompare(b.propertyName))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawProperties, rawReservations, rawTasks, date])

  const activeVillas = villas.filter(v => v.arrivals.length || v.departures.length || v.inHouse.length || v.tasks.length)
  const totals = {
    arrivals: villas.reduce((s, v) => s + v.arrivals.length, 0),
    departures: villas.reduce((s, v) => s + v.departures.length, 0),
    tasks: villas.reduce((s, v) => s + v.tasks.length, 0),
    inHouse: villas.reduce((s, v) => s + v.inHouse.length, 0),
  }

  const checklistProgress = (taskId: string): string | null => {
    const items = checklistItems.filter(i => i.task_id === taskId)
    if (items.length === 0) return null
    return `${items.filter(i => i.done).length}/${items.length}`
  }

  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="space-y-6 print:space-y-4" data-testid="day-sheet">
      <style>{`@media print { aside, header, nav, .print-hidden { display: none !important } main { padding: 0 !important } .lg\\:ml-64, .lg\\:ml-16 { margin-left: 0 !important } }`}</style>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-soft text-primary shrink-0 print:hidden">
          <CalendarDays className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight leading-tight">{t('daySheet.title')}</h2>
          <p className="text-sm text-muted-foreground capitalize">{displayDate}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground print-hidden" />}
        <div className="ml-auto flex items-center gap-2 print-hidden">
          <Button variant="secondary" size="sm" onClick={() => setDate(shiftDate(date, -1))} aria-label={t('daySheet.previousDay')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <input
            type="date"
            value={date}
            onChange={e => { if (e.target.value) setDate(e.target.value) }}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button variant="secondary" size="sm" onClick={() => setDate(shiftDate(date, 1))} aria-label={t('daySheet.nextDay')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          {!isToday && (
            <Button variant="secondary" size="sm" onClick={() => setDate(toDateString(new Date()))}>
              {t('daySheet.today')}
            </Button>
          )}
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" />
            {t('daySheet.print')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <LogIn className="w-5 h-5 text-success shrink-0" />
          <div>
            <p className="text-xl font-bold tabular-nums leading-none">{totals.arrivals}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('daySheet.arrivals')}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <LogOut className="w-5 h-5 text-warning shrink-0" />
          <div>
            <p className="text-xl font-bold tabular-nums leading-none">{totals.departures}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('daySheet.departures')}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-info shrink-0" />
          <div>
            <p className="text-xl font-bold tabular-nums leading-none">{totals.inHouse}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('daySheet.inHouse')}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-xl font-bold tabular-nums leading-none">{totals.tasks}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('daySheet.tasksDue')}</p>
          </div>
        </Card>
      </div>

      {activeVillas.length === 0 && !loading && (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t('daySheet.noActivity')}</Card>
      )}

      {activeVillas.map(villa => (
        <Card key={villa.propertyId} className="p-5 break-inside-avoid">
          <div className="flex items-baseline gap-2 mb-4">
            <h3 className="text-base font-semibold">{villa.propertyName}</h3>
            {villa.location && <span className="text-xs text-muted-foreground">{villa.location}</span>}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-success flex items-center gap-1.5 mb-2">
                  <LogIn className="w-3.5 h-3.5" /> {t('daySheet.arrivals')} ({villa.arrivals.length})
                </h4>
                {villa.arrivals.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                {villa.arrivals.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{r.guest_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.guests_count} {t('daySheet.guests')} · {t('daySheet.until')} {r.departure}
                      </p>
                    </div>
                    <Badge variant={r.status === 'confirmed' ? 'success' : 'warning'}>{r.status}</Badge>
                  </div>
                ))}
              </section>

              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-warning flex items-center gap-1.5 mb-2">
                  <LogOut className="w-3.5 h-3.5" /> {t('daySheet.departures')} ({villa.departures.length})
                </h4>
                {villa.departures.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                {villa.departures.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{r.guest_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.guests_count} {t('daySheet.guests')} · {t('daySheet.since')} {r.arrival}
                      </p>
                    </div>
                    <Badge variant="warning">{r.status}</Badge>
                  </div>
                ))}
              </section>

              {villa.inHouse.length > 0 && (
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-info flex items-center gap-1.5 mb-2">
                    <Users className="w-3.5 h-3.5" /> {t('daySheet.inHouse')} ({villa.inHouse.length})
                  </h4>
                  {villa.inHouse.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <p className="text-sm font-medium">{r.guest_name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{r.arrival} → {r.departure}</p>
                    </div>
                  ))}
                </section>
              )}
            </div>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-1.5 mb-2">
                <ClipboardList className="w-3.5 h-3.5" /> {t('daySheet.tasksDue')} ({villa.tasks.length})
              </h4>
              {villa.tasks.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
              {villa.tasks.map(task => {
                const progress = checklistProgress(task.id)
                const assignee = members.find(m => m.id === task.assigned_to)
                return (
                  <div key={task.id} className="py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {progress && <Badge variant="muted">{progress}</Badge>}
                        <Badge variant={priorityVariant[task.priority]}>{t(`tasks.${task.priority}`)}</Badge>
                        <Badge variant={statusVariant[task.status]}>{t(`daySheet.status.${task.status}`)}</Badge>
                      </div>
                    </div>
                    {task.assigned_to && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t('daySheet.assignedTo')} {memberLabel(assignee)}</p>
                    )}
                  </div>
                )
              })}
            </section>
          </div>
        </Card>
      ))}
    </div>
  )
}
