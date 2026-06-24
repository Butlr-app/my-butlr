import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { usePayments, type Payment } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { Plus, Loader2, Trash2, Pencil, Download } from 'lucide-react'
import { useRoleFilter } from '@/lib/useRoleFilter'

const PAGE_SIZE = 20

const emptyForm = {
  guest_name: '',
  property_name: '',
  type: 'booking' as Payment['type'],
  amount: 0,
  status: 'pending' as Payment['status'],
  date: '',
}

export function Payments() {
  const { data: rawPayments, loading, insert, update, remove } = usePayments()
  const { toast } = useToast()
  const { query } = useSearch()
  const { filterPayments } = useRoleFilter()
  const payments = filterPayments(rawPayments)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(0)

  useEffect(() => { setPage(0) }, [query])

  const filtered = payments.filter(p => {
    if (!query) return true
    const q = query.toLowerCase()
    return p.guest_name.toLowerCase().includes(q) || (p.property_name ?? '').toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
  })

  const totalRevenue = payments.reduce((s, p) => p.status === 'paid' ? s + Number(p.amount) : s, 0)
  const totalPending = payments.reduce((s, p) => p.status === 'pending' ? s + Number(p.amount) : s, 0)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.guest_name.trim()) errs.guest_name = 'Guest name is required'
    if (form.amount <= 0) errs.amount = 'Amount must be positive'
    if (!form.date) errs.date = 'Date is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (p: Payment) => {
    setEditingId(p.id)
    setForm({
      guest_name: p.guest_name,
      property_name: p.property_name ?? '',
      type: p.type,
      amount: p.amount,
      status: p.status,
      date: p.date,
    })
    setErrors({})
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      if (editingId) {
        await update(editingId, { ...form, amount: Number(form.amount) })
        toast('Payment updated')
      } else {
        await insert({ ...form, amount: Number(form.amount) })
        toast('Payment recorded')
      }
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const handleStatusUpdate = async (id: string, status: Payment['status']) => {
    try {
      await update(id, { status })
      toast('Status updated')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast('Payment deleted')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
  }

  const exportCSV = () => {
    const headers = ['Date', 'Guest', 'Property', 'Type', 'Amount', 'Status']
    const rows = payments.map(p => [p.date, p.guest_name, p.property_name ?? '', p.type, String(p.amount), p.status])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast('CSV exported')
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
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Record payment
          </Button>
        </div>
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

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {query ? 'No payments match your search.' : 'No payments recorded.'}
          </p>
          {!query && <Button size="sm" onClick={openCreate}>Record payment</Button>}
        </Card>
      ) : (
        <>
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
                  {paginated.map(p => (
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
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(p)} className="text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget({ id: p.id, name: p.guest_name })} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Payment' : 'Record Payment'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Guest Name" required value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} />
              {errors.guest_name && <p className="text-xs text-destructive mt-1">{errors.guest_name}</p>}
            </div>
            <Input label="Property" value={form.property_name} onChange={e => setForm(f => ({ ...f, property_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as Payment['type'] }))}
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
              onChange={e => setForm(f => ({ ...f, status: e.target.value as Payment['status'] }))}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' },
                { value: 'failed', label: 'Failed' },
                { value: 'refunded', label: 'Refunded' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Amount (€)" type="number" min={0} required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
            </div>
            <div>
              <Input label="Date" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingId ? 'Save changes' : 'Record'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete payment"
        message={`Delete payment for "${deleteTarget?.name}"? This action cannot be undone.`}
      />
    </div>
  )
}
