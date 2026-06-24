import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { usePayments } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { Plus, Loader2, Trash2 } from 'lucide-react'

const emptyForm = {
  guest_name: '',
  property_name: '',
  type: 'booking' as const,
  amount: 0,
  status: 'pending' as const,
  date: '',
  description: '',
}

export function Payments() {
  const { data: payments, loading, insert, update, remove } = usePayments()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const totalRevenue = payments.reduce((s, p) => p.status === 'paid' ? s + Number(p.amount) : s, 0)
  const totalPending = payments.reduce((s, p) => p.status === 'pending' ? s + Number(p.amount) : s, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await insert({ ...form, amount: Number(form.amount) })
      toast('Payment recorded')
      setShowForm(false)
      setForm(emptyForm)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await update(id, { status })
      toast('Status updated')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await remove(id)
      toast('Payment deleted')
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
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Payments</p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Record payment
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-2xl font-mono font-medium">€{totalRevenue.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-mono font-medium text-warning">€{totalPending.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Transactions</p>
          <p className="text-2xl font-mono font-medium">{payments.length}</p>
        </Card>
      </div>

      {payments.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">No payments recorded.</p>
          <Button size="sm" onClick={() => setShowForm(true)}>Record payment</Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Guest</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/50 transition-colors h-14">
                    <td className="px-4 text-sm font-mono">{p.date}</td>
                    <td className="px-4 text-sm font-medium">{p.guest_name}</td>
                    <td className="px-4 text-sm text-muted-foreground">{p.property_name}</td>
                    <td className="px-4 text-sm text-muted-foreground capitalize">{p.type}</td>
                    <td className="px-4 text-sm font-mono text-right">€{Number(p.amount).toLocaleString()}</td>
                    <td className="px-4">
                      <button onClick={() => handleStatusUpdate(p.id, p.status === 'paid' ? 'pending' : 'paid')}>
                        <Badge variant={
                          p.status === 'paid' ? 'success' :
                          p.status === 'failed' ? 'destructive' :
                          p.status === 'refunded' ? 'info' : 'warning'
                        }>
                          {p.status}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 text-right">
                      <button onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Record Payment">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Guest Name" required value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} />
            <Input label="Property" value={form.property_name} onChange={e => setForm(f => ({ ...f, property_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof form.type }))}
              options={[
                { value: 'booking', label: 'Booking' },
                { value: 'service', label: 'Service' },
                { value: 'commission', label: 'Commission' },
                { value: 'deposit', label: 'Deposit' },
  
              ]}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' },
                { value: 'failed', label: 'Failed' },
                { value: 'refunded', label: 'Refunded' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (€)" type="number" min={0} required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
            <Input label="Date" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
