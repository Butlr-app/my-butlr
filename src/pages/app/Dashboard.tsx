import { useEffect, useState } from 'react'
import { MetricCard } from '@/components/ui/MetricCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useRole } from '@/lib/roleContext'
import { useAuth } from '@/lib/authContext'
import {
  fetchOwnerReservations,
  fetchOwnerTasks,
  fetchOwnerPayments,
  fetchOwnerProperties,
  todayISO,
} from '@/lib/data'
import type { Reservation, Task, Payment } from '@/lib/types'
import { isCommercialReservation } from '@/lib/reservationWorkflow'
import { useReservationDetail } from '@/lib/reservationDetailContext'

export function Dashboard() {
  const { role } = useRole()
  const { user } = useAuth()
  const { openReservation } = useReservationDetail()
  const [loading, setLoading] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [propertyCount, setPropertyCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const userId = user.id

    async function load() {
      const [resResult, taskResult, payResult, propResult] = await Promise.all([
        fetchOwnerReservations(userId),
        fetchOwnerTasks(userId),
        fetchOwnerPayments(userId),
        fetchOwnerProperties(userId),
      ])

      setReservations((resResult.data as Reservation[]) ?? [])
      setTasks((taskResult.data as Task[]) ?? [])
      setPayments((payResult.data as Payment[]) ?? [])
      setPropertyCount((propResult.data ?? []).length)
      setLoading(false)
    }

    load()
  }, [user])

  if (loading) return <LoadingState />

  const today = todayISO()
  const commercialReservations = reservations.filter(isCommercialReservation)
  const activeStays = commercialReservations.filter(r => r.status === 'in_progress').length
  const upcomingArrivals = commercialReservations.filter(
    r => r.arrival >= today && r.status === 'confirmed',
  ).length
  const pendingTasks = tasks.filter(t => t.status === 'todo').length
  const serviceRevenue = payments
    .filter(p => p.status === 'paid' && p.type === 'service')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const roleLabels: Record<string, string> = {
    owner: 'Owner Dashboard',
    house_manager: 'House Manager Dashboard',
    concierge: 'Concierge Dashboard',
    agency: 'Agency Dashboard',
    partner: 'Partner Dashboard',
    guest: 'Guest Dashboard',
  }

  if (propertyCount === 0) {
    return (
      <div className="space-y-6">
        <span className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
          {roleLabels[role]}
        </span>
        <EmptyState
          title="Welcome to butlr"
          description="Your dashboard will populate once you add properties and reservations."
          action={
            <Link to="/app/properties">
              <span className="text-sm text-foreground hover:underline">Go to Properties</span>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
          {roleLabels[role]}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard label="Active Stays" value={activeStays} />
        <MetricCard label="Upcoming Arrivals" value={upcomingArrivals} />
        <MetricCard label="Properties" value={propertyCount} />
        <MetricCard label="Service Revenue" value={serviceRevenue} prefix="€" />
        <MetricCard label="Pending Tasks" value={pendingTasks} />
        <MetricCard label="Reservations" value={commercialReservations.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Upcoming Arrivals</h3>
            <Link to="/app/reservations" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {upcomingArrivals === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming arrivals</p>
          ) : (
            <div className="space-y-3">
              {commercialReservations.filter(r => r.arrival >= today).slice(0, 3).map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openReservation(r)}
                  className="flex w-full cursor-pointer items-center justify-between border-b border-border py-2 text-left last:border-0 hover:bg-muted/30"
                >
                  <div>
                    <p className="text-sm font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{r.properties?.name}</p>
                  </div>
                  <Badge variant="success">{r.status}</Badge>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Pending Tasks</h3>
            <Link to="/app/tasks" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {pendingTasks === 0 ? (
            <p className="text-sm text-muted-foreground">No pending tasks</p>
          ) : (
            <div className="space-y-3">
              {tasks.filter(t => t.status === 'todo').slice(0, 3).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.properties?.name}</p>
                  </div>
                  <Badge variant={t.priority === 'high' ? 'destructive' : 'muted'}>{t.priority}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Recent Payments</h3>
            <Link to="/app/payments" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet</p>
          ) : (
            <div className="space-y-3">
              {payments.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{p.property_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-medium">€{Number(p.amount).toLocaleString()}</p>
                    <Badge variant={p.status === 'paid' ? 'success' : 'warning'} className="mt-1">{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
