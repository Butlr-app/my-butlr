import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { fetchPartners } from '@/lib/data'
import { Star } from 'lucide-react'
import type { Partner } from '@/lib/types'

export function Partners() {
  const [loading, setLoading] = useState(true)
  const [partners, setPartners] = useState<Partner[]>([])

  useEffect(() => {
    fetchPartners().then(({ data }) => {
      setPartners((data as Partner[]) ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingState />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Partner Network</p>
        <Button size="sm" disabled>Add partner</Button>
      </div>

      {partners.length === 0 ? (
        <EmptyState
          title="No partners yet"
          description="Add service providers and partners to your network."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Partner</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Commission</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Rating</th>
                  <th className="px-4 py-3 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {partners.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/50 transition-colors h-14">
                    <td className="px-4">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.contact}</p>
                    </td>
                    <td className="px-4 text-sm text-muted-foreground">{p.category}</td>
                    <td className="px-4 text-sm text-muted-foreground">{p.location}</td>
                    <td className="px-4 text-sm font-mono">{p.commission}%</td>
                    <td className="px-4">
                      <Badge variant={p.status === 'active' ? 'success' : 'muted'}>{p.status}</Badge>
                    </td>
                    <td className="px-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current text-warning" />
                        <span className="text-sm font-mono">{p.rating}</span>
                      </div>
                    </td>
                    <td className="px-4 text-sm font-mono text-right">{p.bookings_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
