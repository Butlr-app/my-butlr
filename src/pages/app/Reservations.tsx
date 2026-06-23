import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { reservations } from '@/data/mockData'

export function Reservations() {
  const [selected, setSelected] = useState<typeof reservations[0] | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">All Reservations</p>
        <Button size="sm">New reservation</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Guest</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Property</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Arrival</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Departure</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Guests</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Contract</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(r => (
                <tr
                  key={r.id}
                  className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors h-14"
                  onClick={() => setSelected(r)}
                >
                  <td className="px-4 text-sm font-medium">{r.guestName}</td>
                  <td className="px-4 text-sm text-muted-foreground">{r.property}</td>
                  <td className="px-4 text-sm font-mono">{r.arrival}</td>
                  <td className="px-4 text-sm font-mono">{r.departure}</td>
                  <td className="px-4 text-sm font-mono text-right">{r.guests}</td>
                  <td className="px-4">
                    <Badge variant={r.status === 'confirmed' ? 'success' : 'warning'}>{r.status}</Badge>
                  </td>
                  <td className="px-4">
                    <Badge variant={r.paymentStatus === 'paid' ? 'success' : r.paymentStatus === 'partial' ? 'warning' : 'muted'}>
                      {r.paymentStatus}
                    </Badge>
                  </td>
                  <td className="px-4">
                    <Badge variant={r.contractStatus === 'signed' ? 'success' : r.contractStatus === 'sent' ? 'info' : 'muted'}>
                      {r.contractStatus}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Reservation Detail">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Guest</p>
                <p className="text-sm font-medium mt-1">{selected.guestName}</p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Property</p>
                <p className="text-sm font-medium mt-1">{selected.property}</p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Arrival</p>
                <p className="text-sm font-mono mt-1">{selected.arrival}</p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Departure</p>
                <p className="text-sm font-mono mt-1">{selected.departure}</p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Status</p>
                <Badge variant={selected.status === 'confirmed' ? 'success' : 'warning'} className="mt-1">{selected.status}</Badge>
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Payment</p>
                <Badge variant={selected.paymentStatus === 'paid' ? 'success' : 'warning'} className="mt-1">{selected.paymentStatus}</Badge>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Services Booked</p>
              <p className="text-sm text-muted-foreground">Private chef dinner, Airport transfer</p>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Internal Notes</p>
              <p className="text-sm text-muted-foreground">VIP guest, returning visitor. Prefers early check-in.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
