import { MetricCard } from '@/components/ui/MetricCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { kpiData, reservations, tasks, payments } from '@/data/mockData'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useRole } from '@/lib/roleContext'

export function Dashboard() {
  const { role } = useRole()

  return (
    <div className="space-y-6">
      {/* Role indicator */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
          {role === 'owner' && 'Owner Dashboard'}
          {role === 'house_manager' && 'House Manager Dashboard'}
          {role === 'concierge' && 'Concierge Dashboard'}
          {role === 'agency' && 'Agency Dashboard'}
          {role === 'partner' && 'Partner Dashboard'}
          {role === 'guest' && 'Guest Dashboard'}
        </span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard label="Active Stays" value={kpiData.activeStays} delta={12} />
        <MetricCard label="Upcoming Arrivals" value={kpiData.upcomingArrivals} delta={8} />
        <MetricCard label="Guest Requests" value={kpiData.guestRequests} delta={-5} />
        <MetricCard label="Service Revenue" value={kpiData.serviceRevenue} prefix="€" delta={22} />
        <MetricCard label="Pending Tasks" value={kpiData.pendingTasks} />
        <MetricCard label="Occupancy Rate" value={`${kpiData.occupancyRate}%`} delta={4} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's arrivals */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Today's Arrivals</h3>
            <Link to="/app/reservations" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {reservations.filter(r => r.status === 'confirmed').slice(0, 2).map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{r.guestName}</p>
                  <p className="text-xs text-muted-foreground">{r.property}</p>
                </div>
                <Badge variant="success">Confirmed</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Open guest requests */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Open Guest Requests</h3>
            <Link to="/app/tasks" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { guest: 'M. Laurent', request: 'Private chef for Saturday dinner', time: '2h ago' },
              { guest: 'M. Laurent', request: 'Airport transfer on departure day', time: '4h ago' },
              { guest: 'Mme Laurent', request: 'Spa treatment recommendation', time: '6h ago' },
            ].map((req, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{req.request}</p>
                  <p className="text-xs text-muted-foreground">{req.guest}</p>
                </div>
                <span className="text-xs text-muted-foreground">{req.time}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Pending tasks */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Pending Tasks</h3>
            <Link to="/app/tasks" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {tasks.filter(t => t.status === 'todo').slice(0, 3).map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.property}</p>
                </div>
                <Badge variant={t.priority === 'high' ? 'destructive' : 'muted'}>
                  {t.priority}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent payments */}
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
                  <p className="text-sm font-medium">{p.guest}</p>
                  <p className="text-xs text-muted-foreground">{p.property}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-medium">€{p.amount.toLocaleString()}</p>
                  <Badge variant={p.status === 'paid' ? 'success' : 'warning'} className="mt-1">
                    {p.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
