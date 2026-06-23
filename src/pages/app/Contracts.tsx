import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { contracts } from '@/data/mockData'
import { MetricCard } from '@/components/ui/MetricCard'

export function Contracts() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Contracts</p>
        <Button size="sm">New contract</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Contracts" value={contracts.length} />
        <MetricCard label="Signed" value={contracts.filter(c => c.status === 'signed').length} />
        <MetricCard label="Pending" value={contracts.filter(c => c.status === 'sent').length} />
        <MetricCard label="Drafts" value={contracts.filter(c => c.status === 'draft').length} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Guest / Partner</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Property</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/50 transition-colors h-14">
                  <td className="px-4 text-sm font-mono text-muted-foreground">{c.id}</td>
                  <td className="px-4 text-sm font-medium">{c.guest}</td>
                  <td className="px-4 text-sm text-muted-foreground">{c.property}</td>
                  <td className="px-4">
                    <Badge variant={c.type === 'rental' ? 'default' : 'info'}>{c.type}</Badge>
                  </td>
                  <td className="px-4">
                    <Badge variant={
                      c.status === 'signed' ? 'success' :
                      c.status === 'sent' ? 'info' : 'muted'
                    }>{c.status}</Badge>
                  </td>
                  <td className="px-4 text-sm font-mono text-muted-foreground">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
