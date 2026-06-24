import { Card } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { usePayments, useReservations, useProperties, usePartners } from '@/lib/useSupabase'
import { Loader2 } from 'lucide-react'

export function Reports() {
  const { data: payments, loading: lPay } = usePayments()
  const { data: reservations, loading: lRes } = useReservations()
  const { data: properties, loading: lProp } = useProperties()
  const { data: partners, loading: lPart } = usePartners()
  const loading = lPay || lRes || lProp || lPart

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const serviceRevenue = payments.filter(p => p.type === 'service' && p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)

  const today = new Date().toISOString().split('T')[0]
  const totalProps = properties.length
  const occupiedProps = new Set(
    reservations
      .filter(r => r.arrival <= today && r.departure >= today && (r.status === 'confirmed' || r.status === 'in_progress'))
      .map(r => r.property_id)
      .filter(Boolean)
  ).size
  const occupancyRate = totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0

  const completedRes = reservations.filter(r => r.status === 'completed' || r.status === 'in_progress')
  const avgSpend = completedRes.length > 0 ? Math.round(completedRes.reduce((s, r) => s + Number(r.total_amount), 0) / completedRes.length) : 0

  // Service revenue by property
  const svcRevenue: Record<string, number> = {}
  payments.filter(p => p.type === 'service' && p.status === 'paid').forEach(p => {
    const label = p.property_name || 'Other'
    svcRevenue[label] = (svcRevenue[label] || 0) + Number(p.amount)
  })
  const totalSvcRev = Object.values(svcRevenue).reduce((s, v) => s + v, 0) || 1
  const svcBreakdown = Object.entries(svcRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([service, revenue]) => ({
      service,
      revenue,
      pct: Math.round((revenue / totalSvcRev) * 100),
    }))

  // Property performance
  const propPerf = properties.map(prop => {
    const propRes = reservations.filter(r => r.property_id === prop.id)
    const revenue = propRes.reduce((s, r) => s + Number(r.total_amount), 0)
    const occupied = propRes.filter(r =>
      r.arrival <= today && r.departure >= today && (r.status === 'confirmed' || r.status === 'in_progress')
    ).length
    return { property: prop.name, revenue, occupancy: occupied > 0 ? 100 : 0 }
  }).sort((a, b) => b.revenue - a.revenue)

  // Partner commissions
  const partnerStats = partners.map(p => ({
    partner: p.name,
    commission: Math.round(Number(p.commission) * p.bookings_count * 10),
    bookings: p.bookings_count,
  })).sort((a, b) => b.commission - a.commission).slice(0, 5)

  return (
    <div className="space-y-6">
      <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Reports & Analytics</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Revenue" value={totalRevenue} prefix="€" />
        <MetricCard label="Service Revenue" value={serviceRevenue} prefix="€" />
        <MetricCard label="Occupancy" value={`${occupancyRate}%`} />
        <MetricCard label="Avg Guest Spend" value={avgSpend} prefix="€" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Revenue Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <p className="text-sm">Booking Revenue</p>
              <p className="text-sm font-mono font-medium">€{(totalRevenue - serviceRevenue).toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <p className="text-sm">Service Revenue</p>
              <p className="text-sm font-mono font-medium">€{serviceRevenue.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <p className="text-sm">Total Payments</p>
              <p className="text-sm font-mono font-medium">{payments.length}</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <p className="text-sm font-semibold">Total Revenue</p>
              <p className="text-sm font-mono font-semibold">€{totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Service Revenue Breakdown</h3>
          {svcBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No service revenue yet.</p>
          ) : (
            <div className="space-y-3">
              {svcBreakdown.map(item => (
                <div key={item.service} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm">{item.service}</p>
                    <p className="text-sm font-mono">€{item.revenue.toLocaleString()}</p>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-foreground/60 rounded-full" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Property Performance</h3>
          <div className="space-y-4">
            {propPerf.length === 0 ? (
              <p className="text-sm text-muted-foreground">No properties yet.</p>
            ) : (
              propPerf.map(item => (
                <div key={item.property} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.property}</p>
                    <p className="text-xs text-muted-foreground">{item.occupancy}% occupancy</p>
                  </div>
                  <p className="text-sm font-mono font-medium">€{item.revenue.toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Partner Commissions</h3>
          <div className="space-y-4">
            {partnerStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No partners yet.</p>
            ) : (
              partnerStats.map(item => (
                <div key={item.partner} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.partner}</p>
                    <p className="text-xs text-muted-foreground">{item.bookings} bookings</p>
                  </div>
                  <p className="text-sm font-mono font-medium">€{item.commission}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
