import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerPayments, fetchOwnerProperties, fetchOwnerReservations } from '@/lib/data'
import { usePermissions } from '@/lib/permissionsContext'
import { isCommercialReservation } from '@/lib/reservationWorkflow'
import { computeOwnerCollectedTotal } from '@/lib/reservationPayments'
import type { Payment, Reservation } from '@/lib/types'

interface ChartPoint {
  label: string
  value: number
}

function MiniBarChart({ data, suffix = '' }: { data: ChartPoint[]; suffix?: string }) {
  const max = Math.max(1, ...data.map(d => d.value))
  return (
    <div className="flex h-40 items-end gap-2">
      {data.map(point => (
        <div key={point.label} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex h-32 w-full items-end justify-center">
            <div
              className="w-full max-w-8 rounded-t-sm bg-foreground/80"
              style={{ height: `${Math.max(2, (point.value / max) * 100)}%` }}
              title={`${point.label} : ${point.value}${suffix}`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{point.label}</span>
        </div>
      ))}
    </div>
  )
}

function lastSixMonths(): Date[] {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (5 - i), 1))
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

function nightsOverlappingMonth(arrival: string, departure: string, monthStart: Date, monthEnd: Date): number {
  const start = new Date(Math.max(new Date(arrival).getTime(), monthStart.getTime()))
  const end = new Date(Math.min(new Date(departure).getTime(), monthEnd.getTime()))
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  return Math.max(0, nights)
}

function buildRevenueChart(payments: Payment[], months: Date[]): ChartPoint[] {
  const revenueByMonth = new Map<string, number>()
  for (const payment of payments) {
    if (payment.status !== 'paid' || !payment.date) continue
    const d = new Date(payment.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + Number(payment.amount))
  }
  return months.map(d => ({
    label: monthLabel(d),
    value: Math.round(revenueByMonth.get(`${d.getFullYear()}-${d.getMonth()}`) ?? 0),
  }))
}

function buildOccupancyChart(reservations: Reservation[], propertiesCount: number, months: Date[]): ChartPoint[] {
  const commercial = reservations.filter(isCommercialReservation)
  return months.map(d => {
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const nightsBooked = commercial.reduce(
      (sum, r) => sum + nightsOverlappingMonth(r.arrival, r.departure, monthStart, monthEnd),
      0,
    )
    const capacity = Math.max(1, propertiesCount) * daysInMonth(d)
    return {
      label: monthLabel(d),
      value: Math.min(100, Math.round((nightsBooked / capacity) * 100)),
    }
  })
}

export function Reports() {
  const { user } = useAuth()
  const { can } = usePermissions()
  const canViewAmounts = can('reservation_amounts')
  const [loading, setLoading] = useState(true)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [serviceRevenue, setServiceRevenue] = useState(0)
  const [reservationCount, setReservationCount] = useState(0)
  const [propertiesCount, setPropertiesCount] = useState(0)
  const [revenueChart, setRevenueChart] = useState<ChartPoint[]>([])
  const [occupancyChart, setOccupancyChart] = useState<ChartPoint[]>([])

  useEffect(() => {
    if (!user) return
    const userId = user.id

    async function load() {
      const [{ data: payments }, { data: reservations }, { data: properties }] = await Promise.all([
        fetchOwnerPayments(userId),
        fetchOwnerReservations(userId),
        fetchOwnerProperties(userId),
      ])

      const paymentsList = (payments ?? []) as Payment[]
      const reservationsList = (reservations ?? []) as Reservation[]
      const months = lastSixMonths()

      setMonthlyRevenue(computeOwnerCollectedTotal(paymentsList))
      setServiceRevenue(
        paymentsList.filter(p => p.type === 'service' && p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0),
      )
      setReservationCount(reservationsList.filter(isCommercialReservation).length)
      setPropertiesCount((properties ?? []).length)
      setRevenueChart(buildRevenueChart(paymentsList, months))
      setOccupancyChart(buildOccupancyChart(reservationsList, (properties ?? []).length, months))
      setLoading(false)
    }

    load()
  }, [user])

  if (loading) return <LoadingState />

  const hasData = monthlyRevenue > 0 || reservationCount > 0

  return (
    <div className="space-y-6">
      <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Rapports & analyses</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Revenu total"
          value={canViewAmounts ? monthlyRevenue : '•••'}
          prefix={canViewAmounts ? '€' : undefined}
        />
        <MetricCard
          label="Revenu conciergerie"
          value={canViewAmounts ? serviceRevenue : '•••'}
          prefix={canViewAmounts ? '€' : undefined}
        />
        <MetricCard label="Réservations" value={reservationCount} />
        <MetricCard label="Propriétés" value={propertiesCount} />
      </div>

      {!hasData ? (
        <EmptyState
          title="Aucun rapport pour l'instant"
          description="Les analyses apparaîtront ici dès que vous aurez des réservations et des paiements."
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Revenu (6 derniers mois)</h3>
            {canViewAmounts ? (
              <MiniBarChart data={revenueChart} suffix="€" />
            ) : (
              <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Montants masqués pour votre rôle
              </p>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Taux d'occupation (6 derniers mois)</h3>
            {propertiesCount > 0 ? (
              <MiniBarChart data={occupancyChart} suffix="%" />
            ) : (
              <div className="flex h-40 items-center justify-center">
                <p className="text-xs text-muted-foreground">Ajoutez une propriété pour voir l'occupation.</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
