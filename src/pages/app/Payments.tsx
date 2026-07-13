import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MetricCard } from '@/components/ui/MetricCard'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerPayments } from '@/lib/data'
import { formatDateForDisplay } from '@/lib/dateFormat'
import { computeOwnerCollectedTotal } from '@/lib/reservationPayments'
import type { Payment } from '@/lib/types'
import { useReservationDetail } from '@/lib/reservationDetailContext'

export function Payments() {
  const { user, profile } = useAuth()
  const { openReservation } = useReservationDetail()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])

  useEffect(() => {
    if (!user) return

    fetchOwnerPayments(user.id).then(({ data }) => {
      setPayments((data as Payment[]) ?? [])
      setLoading(false)
    })
  }, [user])

  if (loading) return <LoadingState />

  const totalPaid = computeOwnerCollectedTotal(payments)
  const totalPending = payments
    .filter(p => p.status === 'pending' && p.type !== 'booking')
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const deposits = payments.filter(p => p.type === 'deposit' && p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0)
  const commissions = payments.filter(p => p.type === 'commission' && p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="space-y-6">
      <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Payments</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Received" value={totalPaid} prefix="€" />
        <MetricCard label="Pending" value={totalPending} prefix="€" />
        <MetricCard label="Deposits" value={deposits} prefix="€" />
        <MetricCard label="Commissions" value={commissions} prefix="€" />
      </div>

      {payments.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Payment records will appear here once reservations are created."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
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
                  <tr
                    key={p.id}
                    className={`border-b border-border transition-colors h-14 ${
                      p.reservation_id ? 'cursor-pointer hover:bg-muted/50' : ''
                    }`}
                    onClick={() => {
                      if (p.reservation_id) openReservation(p.reservation_id)
                    }}
                  >
                    <td className="px-4 text-sm font-medium">{p.guest_name}</td>
                    <td className="px-4 text-sm text-muted-foreground">{p.property_name}</td>
                    <td className="px-4">
                      <Badge variant={p.type === 'booking' ? 'default' : p.type === 'deposit' ? 'info' : 'success'}>
                        {p.type}
                      </Badge>
                    </td>
                    <td className="px-4 text-sm font-mono text-right">€{Number(p.amount).toLocaleString()}</td>
                    <td className="px-4">
                      <Badge variant={p.status === 'paid' ? 'success' : 'warning'}>{p.status}</Badge>
                    </td>
                    <td className="px-4 text-sm font-mono text-muted-foreground">
                      {p.date ? formatDateForDisplay(p.date, profile?.date_format) : '—'}
                    </td>
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
