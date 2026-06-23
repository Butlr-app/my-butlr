import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MetricCard } from '@/components/ui/MetricCard'
import { payments } from '@/data/mockData'

export function Payments() {
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Payments</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Received" value={totalPaid} prefix="€" delta={18} />
        <MetricCard label="Pending" value={totalPending} prefix="€" />
        <MetricCard label="Deposits" value={8500} prefix="€" />
        <MetricCard label="Commissions" value={1275} prefix="€" delta={24} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Guest</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Property</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b border-border hover:bg-muted/50 transition-colors h-14">
                  <td className="px-4 text-sm font-mono text-muted-foreground">{p.id}</td>
                  <td className="px-4 text-sm font-medium">{p.guest}</td>
                  <td className="px-4 text-sm text-muted-foreground">{p.property}</td>
                  <td className="px-4">
                    <Badge variant={p.type === 'booking' ? 'default' : p.type === 'deposit' ? 'info' : 'success'}>
                      {p.type}
                    </Badge>
                  </td>
                  <td className="px-4 text-sm font-mono text-right">€{p.amount.toLocaleString()}</td>
                  <td className="px-4">
                    <Badge variant={p.status === 'paid' ? 'success' : 'warning'}>{p.status}</Badge>
                  </td>
                  <td className="px-4 text-sm font-mono text-muted-foreground">{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
