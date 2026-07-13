import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerPayments, fetchOwnerReservations } from '@/lib/data'
import { isCommercialReservation } from '@/lib/reservationWorkflow'
import { computeOwnerCollectedTotal } from '@/lib/reservationPayments'

export function Reports() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [serviceRevenue, setServiceRevenue] = useState(0)
  const [reservationCount, setReservationCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const userId = user.id

    async function load() {
      const [{ data: payments }, { data: reservations }] = await Promise.all([
        fetchOwnerPayments(userId),
        fetchOwnerReservations(userId),
      ])

      setMonthlyRevenue(computeOwnerCollectedTotal(payments ?? []))
      setServiceRevenue((payments ?? []).filter(p => p.type === 'service' && p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0))
      setReservationCount((reservations ?? []).filter(isCommercialReservation).length)
      setLoading(false)
    }

    load()
  }, [user])

  if (loading) return <LoadingState />

  const hasData = monthlyRevenue > 0 || reservationCount > 0

  return (
    <div className="space-y-6">
      <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Reports & Analytics</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Revenue" value={monthlyRevenue} prefix="€" />
        <MetricCard label="Service Revenue" value={serviceRevenue} prefix="€" />
        <MetricCard label="Reservations" value={reservationCount} />
        <MetricCard label="Properties" value={reservationCount > 0 ? '—' : 0} />
      </div>

      {!hasData ? (
        <EmptyState
          title="No reports yet"
          description="Analytics will appear here once you have reservations and payments."
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Revenue Overview</h3>
            <div className="h-48 bg-muted rounded-md flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Charts coming soon</p>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Occupancy Overview</h3>
            <div className="h-48 bg-muted rounded-md flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Charts coming soon</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
