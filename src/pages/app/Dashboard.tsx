import { MetricCard } from '@/components/ui/MetricCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useDashboardKPIs, useReservations, useTasks, usePayments } from '@/lib/useSupabase'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useRole } from '@/lib/roleContext'
import { useRoleFilter } from '@/lib/useRoleFilter'

export function Dashboard() {
  const { role } = useRole()
  const { filterReservations, filterTasks, filterPayments } = useRoleFilter()
  const { kpis } = useDashboardKPIs()
  const { data: rawReservations, loading: loadingRes } = useReservations()
  const { data: rawTasks, loading: loadingTasks } = useTasks()
  const { data: rawPayments, loading: loadingPay } = usePayments()

  const reservations = filterReservations(rawReservations)
  const tasks = filterTasks(rawTasks)
  const payments = filterPayments(rawPayments)

  const loading = loadingRes || loadingTasks || loadingPay

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
          {role === 'owner' && 'Owner Dashboard'}
          {role === 'house_manager' && 'House Manager Dashboard'}
          {role === 'concierge' && 'Concierge Dashboard'}
          {role === 'agency' && 'Agency Dashboard'}
          {role === 'partner' && 'Partner Dashboard'}
          {role === 'guest' && 'Guest Dashboard'}
        </span>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard label="Active Stays" value={kpis.activeStays} />
        <MetricCard label="Upcoming Arrivals" value={kpis.upcomingArrivals} />
        <MetricCard label="Guest Requests" value={kpis.guestRequests} />
        <MetricCard label="Service Revenue" value={kpis.serviceRevenue} prefix="€" />
        <MetricCard label="Pending Tasks" value={kpis.pendingTasks} />
        <MetricCard label="Occupancy Rate" value={`${kpis.occupancyRate}%`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Recent Reservations</h3>
            <Link to="/app/reservations" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {reservations.slice(0, 3).map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{r.guest_name}</p>
                  <p className="text-xs text-muted-foreground">{r.property?.name ?? '—'}</p>
                </div>
                <Badge variant={r.status === 'confirmed' || r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'destructive' : 'warning'}>
                  {r.status}
                </Badge>
              </div>
            ))}
            {reservations.length === 0 && !loadingRes && (
              <p className="text-xs text-muted-foreground py-4 text-center">No reservations yet</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Open Tasks</h3>
            <Link to="/app/tasks" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {tasks.filter(t => t.status === 'todo' || t.status === 'in_progress').slice(0, 3).map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.status.replace('_', ' ')}</p>
                </div>
                <Badge variant={t.priority === 'high' ? 'destructive' : t.priority === 'medium' ? 'warning' : 'muted'}>
                  {t.priority}
                </Badge>
              </div>
            ))}
            {tasks.length === 0 && !loadingTasks && (
              <p className="text-xs text-muted-foreground py-4 text-center">No tasks yet</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Recent Payments</h3>
            <Link to="/app/payments" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {payments.slice(0, 3).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.guest_name}</p>
                  <p className="text-xs text-muted-foreground">{p.property_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-medium">€{Number(p.amount).toLocaleString()}</p>
                  <Badge variant={p.status === 'paid' ? 'success' : 'warning'} className="mt-1">
                    {p.status}
                  </Badge>
                </div>
              </div>
            ))}
            {payments.length === 0 && !loadingPay && (
              <p className="text-xs text-muted-foreground py-4 text-center">No payments yet</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Quick Stats</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Reservations</span>
              <span className="text-sm font-mono font-medium">{reservations.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Tasks Done</span>
              <span className="text-sm font-mono font-medium">{tasks.filter(t => t.status === 'done').length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Paid Payments</span>
              <span className="text-sm font-mono font-medium">{payments.filter(p => p.status === 'paid').length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Total Revenue</span>
              <span className="text-sm font-mono font-medium">€{payments.reduce((s, p) => p.status === 'paid' ? s + Number(p.amount) : s, 0).toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
