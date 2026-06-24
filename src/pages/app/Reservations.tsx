import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useReservations, useProperties, useNotifications, type Reservation } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { Plus, Loader2, Download } from 'lucide-react'

const PAGE_SIZE = 20

const emptyForm = {
  guest_name: '',
  guest_email: '',
  guest_phone: '',
  property_id: '',
  arrival: '',
  departure: '',
  guests_count: 1,
  status: 'pending' as Reservation['status'],
  total_amount: 0,
  notes: '',
}

export function Reservations() {
  const { data: reservations, loading, insert, update } = useReservations()
  const { data: properties } = useProperties()
  const { insertNotification } = useNotifications()
  const { toast } = useToast()
  const { query } = useSearch()
  const [selected, setSelected] = useState<Reservation | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)

  useEffect(() => { setPage(0) }, [query])

  const filtered = reservations.filter(r => {
    if (!query) return true
    const q = query.toLowerCase()
    return r.guest_name.toLowerCase().includes(q) || (r.property?.name ?? '').toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const exportCSV = () => {
    const headers = ['Guest', 'Property', 'Arrival', 'Departure', 'Guests', 'Amount', 'Status', 'Payment', 'Contract']
    const rows = reservations.map(r => [r.guest_name, r.property?.name ?? '', r.arrival, r.departure, String(r.guests_count), String(r.total_amount), r.status, r.payment_status, r.contract_status])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reservations-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast('CSV exported')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await insert({
        ...form,
        property_id: form.property_id || null,
        total_amount: Number(form.total_amount),
      })
      await insertNotification({
        user_id: null,
        type: 'reservation',
        title: 'New reservation',
        message: `Reservation for ${form.guest_name} (${form.arrival} → ${form.departure})`,
        data: { guest_name: form.guest_name },
        related_id: null,
      }).catch(() => {})
      toast('Reservation created')
      setShowForm(false)
      setForm(emptyForm)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const handleStatusChange = async (id: string, status: Reservation['status']) => {
    try {
      await update(id, { status })
      setSelected(prev => prev ? { ...prev, status } : prev)
      toast(`Status updated to ${status}`)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">All Reservations</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> New reservation
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">{query ? 'No reservations match your search.' : 'No reservations yet.'}</p>
          {!query && <Button size="sm" onClick={() => setShowForm(true)}>Create reservation</Button>}
        </Card>
      ) : (
        <>
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
                  <th className="px-4 py-3 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Contract</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(r => (
                  <tr
                    key={r.id}
                    className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors h-14"
                    onClick={() => setSelected(r)}
                  >
                    <td className="px-4 text-sm font-medium">{r.guest_name}</td>
                    <td className="px-4 text-sm text-muted-foreground">{r.property?.name ?? '—'}</td>
                    <td className="px-4 text-sm font-mono">{r.arrival}</td>
                    <td className="px-4 text-sm font-mono">{r.departure}</td>
                    <td className="px-4 text-sm font-mono text-right">{r.guests_count}</td>
                    <td className="px-4 text-sm font-mono text-right">€{Number(r.total_amount).toLocaleString()}</td>
                    <td className="px-4">
                      <Badge variant={r.status === 'confirmed' || r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'destructive' : 'warning'}>{r.status}</Badge>
                    </td>
                    <td className="px-4">
                      <Badge variant={r.payment_status === 'paid' ? 'success' : r.payment_status === 'partial' ? 'warning' : 'muted'}>
                        {r.payment_status}
                      </Badge>
                    </td>
                    <td className="px-4">
                      <Badge variant={r.contract_status === 'signed' ? 'success' : r.contract_status === 'sent' ? 'info' : 'muted'}>
                        {r.contract_status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-xs font-mono text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Reservation Detail">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Guest</p>
                <p className="text-sm font-medium mt-1">{selected.guest_name}</p>
                {selected.guest_email && <p className="text-xs text-muted-foreground">{selected.guest_email}</p>}
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Property</p>
                <p className="text-sm font-medium mt-1">{selected.property?.name ?? '—'}</p>
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
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Total Amount</p>
                <p className="text-sm font-mono mt-1">€{Number(selected.total_amount).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Status</p>
                <div className="mt-1 flex gap-1 flex-wrap">
                  {(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(selected.id, s)}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        selected.status === s
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {selected.notes && (
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
                <p className="text-sm text-muted-foreground">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Reservation">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Guest Name" required value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.guest_email} onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))} />
            <Input label="Phone" value={form.guest_phone} onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))} />
          </div>
          <Select
            label="Property"
            value={form.property_id}
            onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
            options={[
              { value: '', label: 'Select property...' },
              ...properties.map(p => ({ value: p.id, label: p.name })),
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Arrival" type="date" required value={form.arrival} onChange={e => setForm(f => ({ ...f, arrival: e.target.value }))} />
            <Input label="Departure" type="date" required value={form.departure} onChange={e => setForm(f => ({ ...f, departure: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Guests" type="number" min={1} value={form.guests_count} onChange={e => setForm(f => ({ ...f, guests_count: Number(e.target.value) }))} />
            <Input label="Total Amount (€)" type="number" min={0} value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: Number(e.target.value) }))} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Notes</label>
            <textarea
              className="w-full h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
