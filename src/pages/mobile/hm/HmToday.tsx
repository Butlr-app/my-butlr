import { useProperties, useReservations, useTasks, type Property, type Reservation, type Task } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useAuth } from '@/lib/authContext'
import { useCachedRows } from '@/lib/offline'
import { Loader2, LogIn, LogOut, ClipboardList, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function HmToday() {
  const { user } = useAuth()
  const { data: rawProperties, loading: lProps, error: eProps } = useProperties()
  const { data: rawReservations, loading: lRes, error: eRes } = useReservations()
  const { data: rawTasks, loading: lTasks, error: eTasks } = useTasks()
  const { filterProperties, filterReservations, filterTasks, loading: lRole } = useRoleFilter()

  const propertyRows = useCachedRows<Property>('properties', rawProperties, lProps, eProps)
  const reservationRows = useCachedRows<Reservation>('reservations', rawReservations, lRes, eRes)
  const taskRows = useCachedRows<Task>('tasks', rawTasks, lTasks, eTasks)

  const loading = lProps || lRes || lTasks || lRole

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const today = toDateString(new Date())
  const properties = filterProperties(propertyRows.rows)
  const propertyIds = new Set(properties.map(p => p.id))
  const propertyName = (id: string | null) =>
    (id && properties.find(p => p.id === id)?.name) ?? 'Property'

  const reservations = filterReservations(reservationRows.rows)
    .filter(r => r.status !== 'cancelled' && r.property_id && propertyIds.has(r.property_id))
  const arrivals = reservations.filter(r => r.arrival === today)
  const departures = reservations.filter(r => r.departure === today)

  const tasks = filterTasks(taskRows.rows).filter(t =>
    t.status !== 'done' && (t.due_date === today || (t.due_date !== null && t.due_date < today))
  )

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="px-5 pt-14 pb-5">
        <p className="text-sm text-gray-500">{dateLabel}</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Hello, {user?.email?.split('@')[0] ?? 'Manager'}
        </h1>
      </div>

      {/* KPI row */}
      <div className="px-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
            <LogIn className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
            <p className="text-xl font-bold text-gray-900">{arrivals.length}</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Arrivals</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
            <LogOut className="w-5 h-5 text-orange-500 mx-auto mb-2" />
            <p className="text-xl font-bold text-gray-900">{departures.length}</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Departures</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
            <ClipboardList className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p className="text-xl font-bold text-gray-900">{tasks.length}</p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Tasks due</p>
          </div>
        </div>
      </div>

      {/* Arrivals */}
      <div className="px-5 mt-6">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Arrivals today</h2>
        {arrivals.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 p-4">No arrivals today</p>
        ) : (
          <div className="space-y-3">
            {arrivals.map(r => (
              <div key={r.id} className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <LogIn className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.guest_name}</p>
                  <p className="text-[11px] text-gray-500">{propertyName(r.property_id)} &middot; {r.guests_count} guest{r.guests_count > 1 ? 's' : ''}</p>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Departures */}
      <div className="px-5 mt-6">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Departures today</h2>
        {departures.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 p-4">No departures today</p>
        ) : (
          <div className="space-y-3">
            {departures.map(r => (
              <div key={r.id} className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.guest_name}</p>
                  <p className="text-[11px] text-gray-500">{propertyName(r.property_id)} &middot; {r.guests_count} guest{r.guests_count > 1 ? 's' : ''}</p>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-orange-600">{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tasks due */}
      <div className="px-5 mt-6 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Tasks due</h2>
          <Link to="/hm/tasks" className="text-xs font-medium text-amber-600">View all</Link>
        </div>
        {tasks.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">All caught up</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 8).map(t => (
              <Link key={t.id} to="/hm/tasks" className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm active:bg-gray-50 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.title}</p>
                  <p className="text-[11px] text-gray-500">{propertyName(t.property_id)}{t.due_date && t.due_date < today ? ' · overdue' : ''}</p>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{t.status.replace('_', ' ')}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
