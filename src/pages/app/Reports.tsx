import { Card } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'

export function Reports() {
  return (
    <div className="space-y-6">
      <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Reports & Analytics</p>

      {/* Top metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Monthly Revenue" value={73700} prefix="€" delta={12} />
        <MetricCard label="Service Revenue" value={4250} prefix="€" delta={22} />
        <MetricCard label="Occupancy" value="67%" delta={4} />
        <MetricCard label="Avg Guest Spend" value={2100} prefix="€" delta={8} />
      </div>

      {/* Charts placeholder */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Revenue Trend</h3>
          <div className="h-48 bg-muted rounded-md flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs font-mono text-muted-foreground">CHART</p>
              <p className="text-xs text-muted-foreground mt-1">Monthly revenue visualization</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {[
              { month: 'Apr', value: '€52K' },
              { month: 'May', value: '€64K' },
              { month: 'Jun', value: '€74K' },
            ].map(m => (
              <div key={m.month} className="text-center">
                <p className="text-xs text-muted-foreground">{m.month}</p>
                <p className="text-sm font-mono font-medium">{m.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Service Revenue Breakdown</h3>
          <div className="space-y-3">
            {[
              { service: 'Private Chef', revenue: 1850, pct: 44 },
              { service: 'Boat Rental', revenue: 1200, pct: 28 },
              { service: 'Wellness', revenue: 600, pct: 14 },
              { service: 'Airport Transfer', revenue: 350, pct: 8 },
              { service: 'Other', revenue: 250, pct: 6 },
            ].map(item => (
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
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Property Performance</h3>
          <div className="space-y-4">
            {[
              { property: 'Villa French Way', revenue: 24500, occupancy: 85 },
              { property: 'French West Yacht', revenue: 18200, occupancy: 62 },
              { property: 'Villa Mauritius', revenue: 31000, occupancy: 54 },
            ].map(item => (
              <div key={item.property} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.property}</p>
                  <p className="text-xs text-muted-foreground">{item.occupancy}% occupancy</p>
                </div>
                <p className="text-sm font-mono font-medium">€{item.revenue.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Partner Commissions</h3>
          <div className="space-y-4">
            {[
              { partner: 'Chef Martin', commission: 450, bookings: 5 },
              { partner: 'Spa Prestige', commission: 380, bookings: 8 },
              { partner: 'Azure Boats', commission: 300, bookings: 2 },
              { partner: 'Riviera Cars', commission: 145, bookings: 4 },
            ].map(item => (
              <div key={item.partner} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.partner}</p>
                  <p className="text-xs text-muted-foreground">{item.bookings} bookings</p>
                </div>
                <p className="text-sm font-mono font-medium">€{item.commission}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
