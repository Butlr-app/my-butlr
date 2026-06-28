import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useInvoices, useNotifications, type Invoice } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { Loader2, Download, FileText, Pencil, Trash2, Plus, Send, RefreshCw, Bell } from 'lucide-react'

const PAGE_SIZE = 20

const statusBadge: Record<Invoice['status'], 'muted' | 'info' | 'success' | 'destructive' | 'warning'> = {
  draft: 'muted',
  sent: 'info',
  paid: 'success',
  overdue: 'destructive',
}

export function Invoices() {
  const { data: invoices, loading, update, remove } = useInvoices()
  const { insertNotification } = useNotifications()
  const { toast } = useToast()
  const { query } = useSearch()
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [editStatus, setEditStatus] = useState<Invoice['status']>('draft')
  const [editRecurring, setEditRecurring] = useState(false)
  const [editRecurringInterval, setEditRecurringInterval] = useState<string>('')

  useEffect(() => { setPage(0) }, [query, statusFilter, dateFrom, dateTo])

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (statusFilter && inv.status !== statusFilter) return false
      if (dateFrom && inv.created_at < dateFrom) return false
      if (dateTo && inv.created_at > dateTo + 'T23:59:59') return false
      if (query) {
        const q = query.toLowerCase()
        return inv.client_name.toLowerCase().includes(q) || inv.invoice_number.toLowerCase().includes(q)
      }
      return true
    })
  }, [invoices, statusFilter, dateFrom, dateTo, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const stats = useMemo(() => ({
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalHT: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_ht), 0),
  }), [invoices])

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast('Invoice deleted')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
  }

  const markAsSent = async (id: string) => {
    try {
      await update(id, { status: 'sent' })
      toast('Invoice marked as sent')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const sendReminder = async (inv: Invoice) => {
    try {
      await insertNotification({
        user_id: null,
        type: 'payment',
        title: `Payment reminder: ${inv.invoice_number}`,
        message: `Reminder sent for invoice ${inv.invoice_number} — ${inv.client_name} — ${fmt(inv.total_ttc)} EUR`,
        data: { invoice_id: inv.id },
        related_id: null,
      })
      toast('Reminder sent')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const openEdit = (inv: Invoice) => {
    setEditingInvoice(inv)
    setEditStatus(inv.status)
    setEditRecurring(inv.is_recurring)
    setEditRecurringInterval(inv.recurring_interval ?? '')
  }

  const handleEditSave = async () => {
    if (!editingInvoice) return
    try {
      await update(editingInvoice.id, {
        status: editStatus,
        is_recurring: editRecurring,
        recurring_interval: editRecurring && editRecurringInterval ? editRecurringInterval as Invoice['recurring_interval'] : null,
      })
      toast('Invoice updated')
      setEditingInvoice(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const exportCSV = () => {
    const headers = ['Invoice #', 'Date', 'Client', 'Total HT', 'Total TTC', 'Status', 'Recurring']
    const rows = invoices.map(inv => [
      inv.invoice_number,
      inv.created_at.split('T')[0],
      inv.client_name,
      fmt(inv.total_ht),
      fmt(inv.total_ttc),
      inv.status,
      inv.is_recurring ? (inv.recurring_interval ?? 'yes') : 'no',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Invoices</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => navigate('/app/invoices/generate')}>
            <Plus className="w-4 h-4 mr-1" /> New Invoice
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-5 gap-4">
        {(['draft', 'sent', 'paid', 'overdue'] as const).map(status => (
          <Card key={status} className="p-5">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1 capitalize">{status}</p>
            <p className="text-2xl font-mono font-medium">{stats[status]}</p>
          </Card>
        ))}
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Revenue</p>
          <p className="text-2xl font-mono font-medium">{fmt(stats.totalHT)} €</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-end gap-4 flex-wrap">
          <Select
            label="Status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'sent', label: 'Sent' },
              { value: 'paid', label: 'Paid' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />
          <Input label="From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <Input label="To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          {(statusFilter || dateFrom || dateTo) && (
            <Button variant="secondary" size="sm" onClick={() => { setStatusFilter(''); setDateFrom(''); setDateTo('') }}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {query ? 'No invoices match your search.' : 'No invoices yet.'}
          </p>
          {!query && <Button size="sm" onClick={() => navigate('/app/invoices/generate')}>Create first invoice</Button>}
        </Card>
      ) : (
        <>
          <div className="lg:hidden space-y-3">
            {paginated.map(inv => (
              <Card key={inv.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-mono truncate">{inv.invoice_number}</span>
                    </div>
                    <p className="text-sm font-medium truncate mt-0.5">{inv.client_name}</p>
                  </div>
                  <Badge variant={statusBadge[inv.status]}>{inv.status}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">{inv.created_at.split('T')[0]}</span>
                  <span className="font-mono text-foreground">{fmt(inv.total_ttc)} € TTC</span>
                </div>
                {inv.is_recurring && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <RefreshCw className="w-3.5 h-3.5" /> {inv.recurring_interval ?? 'recurring'}
                  </span>
                )}
                <div className="flex items-center justify-end gap-1 pt-1 border-t border-border">
                  {inv.status === 'draft' && (
                    <button onClick={() => markAsSent(inv.id)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5" title="Mark as sent">
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                  {(inv.status === 'sent' || inv.status === 'overdue') && (
                    <button onClick={() => sendReminder(inv)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5" title="Send reminder">
                      <Bell className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => openEdit(inv)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget({ id: inv.id, name: inv.invoice_number })} className="text-muted-foreground hover:text-destructive transition-colors p-1.5" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Total HT</th>
                    <th className="px-4 py-3 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Total TTC</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Recurring</th>
                    <th className="px-4 py-3 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(inv => (
                    <tr key={inv.id} className="border-b border-border hover:bg-muted/50 transition-colors h-14">
                      <td className="px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-mono">{inv.invoice_number}</span>
                        </div>
                      </td>
                      <td className="px-4 text-sm font-medium">{inv.client_name}</td>
                      <td className="px-4 text-sm font-mono">{inv.created_at.split('T')[0]}</td>
                      <td className="px-4 text-sm font-mono text-right">{fmt(inv.total_ht)} €</td>
                      <td className="px-4 text-sm font-mono text-right">{fmt(inv.total_ttc)} €</td>
                      <td className="px-4">
                        <Badge variant={statusBadge[inv.status]}>{inv.status}</Badge>
                      </td>
                      <td className="px-4 text-sm">
                        {inv.is_recurring ? (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <RefreshCw className="w-3.5 h-3.5" /> {inv.recurring_interval ?? 'yes'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {inv.status === 'draft' && (
                            <button onClick={() => markAsSent(inv.id)} className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Mark as sent">
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <button onClick={() => sendReminder(inv)} className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Send reminder">
                              <Bell className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => openEdit(inv)} className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget({ id: inv.id, name: inv.invoice_number })} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Delete">
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

      {/* Edit Invoice Modal */}
      <Modal open={!!editingInvoice} onClose={() => setEditingInvoice(null)} title={`Edit ${editingInvoice?.invoice_number ?? ''}`}>
        <div className="space-y-4">
          <Select
            label="Status"
            value={editStatus}
            onChange={e => setEditStatus(e.target.value as Invoice['status'])}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'sent', label: 'Sent' },
              { value: 'paid', label: 'Paid' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editRecurring}
                onChange={e => setEditRecurring(e.target.checked)}
                className="rounded border-border"
              />
              Recurring invoice
            </label>
          </div>
          {editRecurring && (
            <Select
              label="Interval"
              value={editRecurringInterval}
              onChange={e => setEditRecurringInterval(e.target.value)}
              options={[
                { value: '', label: 'Select interval' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditingInvoice(null)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete invoice"
        message={`Delete invoice "${deleteTarget?.name}"? This action cannot be undone.`}
      />
    </div>
  )
}
