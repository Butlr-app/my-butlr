import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { FilterSidebar } from '@/components/FilterSidebar'
import { usePayments, useNotifications, type Payment } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useAuth } from '@/lib/authContext'
import { usePermissions } from '@/lib/permissionsContext'
import { formatMaskedAmount } from '@/lib/permissions'
import { formatDateForDisplay } from '@/lib/dateFormat'
import { useReservationDetail } from '@/lib/reservationDetailContext'
import { Plus, Loader2, Trash2, Pencil, Download, Filter } from 'lucide-react'

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
  const { insertNotification } = useNotifications()
  const { toast } = useToast()
  const { query, filters } = useSearch()
  const { t } = useTranslation()
  const { filterPayments, canEdit } = useRoleFilter()
  const { profile } = useAuth()
  const { can } = usePermissions()
  const canViewAmounts = can('reservation_amounts')
  const { openReservation } = useReservationDetail()
  const payments = filterPayments(rawPayments)
  const editable = canEdit('payments')
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(0)

  useEffect(() => { setPage(0) }, [query])

  const filtered = payments.filter(p => {
    if (query) {
      const q = query.toLowerCase()
      if (!(p.guest_name.toLowerCase().includes(q) || (p.property_name ?? '').toLowerCase().includes(q) || p.type.toLowerCase().includes(q))) return false
    }
    if (filters.paymentStatus && filters.paymentStatus.length > 0 && !filters.paymentStatus.includes(p.status)) return false
    if (filters.paymentMinAmount !== undefined && Number(p.amount) < filters.paymentMinAmount) return false
    if (filters.paymentMaxAmount !== undefined && Number(p.amount) > filters.paymentMaxAmount) return false
    if (filters.paymentDateFrom && p.date < filters.paymentDateFrom) return false
    if (filters.paymentDateTo && p.date > filters.paymentDateTo) return false
    return true
  })

  const totalRevenue = payments.reduce((s, p) => p.status === 'paid' ? s + Number(p.amount) : s, 0)
  const totalPending = payments.reduce((s, p) => p.status === 'pending' ? s + Number(p.amount) : s, 0)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.guest_name.trim()) errs.guest_name = form.type === 'service' ? 'Partner name is required' : 'Guest name is required'
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
        await insertNotification({
          user_id: null,
          type: 'payment',
          title: 'Payment recorded',
          message: `${form.type} payment of €${Number(form.amount).toLocaleString()} from ${form.guest_name}`,
          data: { guest_name: form.guest_name, amount: form.amount },
          related_id: null,
        }).catch(() => {})
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
    <div className="flex">
    <div className="flex-1 min-w-0 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-tight text-muted-foreground">{t('payments.title')}</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-1" /> {t('common.filter')}
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> {t('importExport.exportCsv')}
          </Button>
          {editable && (
            <Button variant="gold" size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> {t('payments.title')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-2xl tabular-nums font-medium">{formatMaskedAmount(totalRevenue, canViewAmounts)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl tabular-nums font-medium text-warning">{formatMaskedAmount(totalPending, canViewAmounts)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Transactions</p>
          <p className="text-2xl tabular-nums font-medium">{payments.length}</p>
        </Card>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {query ? 'No payments match your search.' : 'No payments recorded.'}
          </p>
          {!query && editable && <Button variant="gold" size="sm" onClick={openCreate}>Record payment</Button>}
        </Card>
      ) : (
        <>
          <div className="lg:hidden space-y-3">
            {paginated.map(p => (
              <Card
                key={p.id}
                className={`p-4 space-y-2 ${p.reservation_id ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
                onClick={() => {
                  if (p.reservation_id) openReservation(p.reservation_id)
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.guest_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.property_name}</p>
                  </div>
                  <p className="text-sm font-mono shrink-0">{formatMaskedAmount(p.amount, canViewAmounts)}</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{formatDateForDisplay(p.date, profile?.date_format)}</span>
                    <span className="capitalize">· {p.type}</span>
                  </div>
                  {editable ? (
                    <button onClick={e => { e.stopPropagation(); handleStatusUpdate(p.id, p.status === 'paid' ? 'pending' : 'paid') }}>
                      <Badge variant={
                        p.status === 'paid' ? 'success' :
                        p.status === 'failed' ? 'destructive' :
                        p.status === 'refunded' ? 'info' : 'warning'
                      }>
                        {p.status}
                      </Badge>
                    </button>
                  ) : (
                    <Badge variant={
                      p.status === 'paid' ? 'success' :
                      p.status === 'failed' ? 'destructive' :
                      p.status === 'refunded' ? 'info' : 'warning'
                    }>
                      {p.status}
                    </Badge>
                  )}
                </div>
                {editable && (
                  <div className="flex items-center justify-end gap-3 pt-1 border-t border-border">
                    <button onClick={e => { e.stopPropagation(); openEdit(p) }} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setDeleteTarget({ id: p.id, name: p.guest_name }) }} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guest</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    {editable && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(p => (
                    <tr
                      key={p.id}
                      className={`border-b border-border transition-colors h-14 ${
                        p.reservation_id ? 'cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring' : 'hover:bg-muted/50'
                      }`}
                      role={p.reservation_id ? 'button' : undefined}
                      tabIndex={p.reservation_id ? 0 : undefined}
                      aria-label={p.reservation_id ? `Voir la réservation de ${p.guest_name}` : undefined}
                      onClick={() => {
                        if (p.reservation_id) openReservation(p.reservation_id)
                      }}
                      onKeyDown={event => {
                        if (!p.reservation_id) return
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openReservation(p.reservation_id)
                        }
                      }}
                    >
                      <td className="px-4 text-sm tabular-nums">{formatDateForDisplay(p.date, profile?.date_format)}</td>
                      <td className="px-4 text-sm font-medium">{p.guest_name}</td>
                      <td className="px-4 text-sm text-muted-foreground">{p.property_name}</td>
                      <td className="px-4 text-sm text-muted-foreground capitalize">{p.type}</td>
                      <td className="px-4 text-sm tabular-nums text-right">{formatMaskedAmount(p.amount, canViewAmounts)}</td>
                      <td className="px-4">
                        {editable ? (
                          <button onClick={e => { e.stopPropagation(); handleStatusUpdate(p.id, p.status === 'paid' ? 'pending' : 'paid') }}>
                            <Badge variant={
                              p.status === 'paid' ? 'success' :
                              p.status === 'failed' ? 'destructive' :
                              p.status === 'refunded' ? 'info' : 'warning'
                            }>
                              {p.status}
                            </Badge>
                          </button>
                        ) : (
                          <Badge variant={
                            p.status === 'paid' ? 'success' :
                            p.status === 'failed' ? 'destructive' :
                            p.status === 'refunded' ? 'info' : 'warning'
                          }>
                            {p.status}
                          </Badge>
                        )}
                      </td>
                      {editable && (
                        <td className="px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={e => { e.stopPropagation(); openEdit(p) }} className="text-muted-foreground hover:text-foreground transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); setDeleteTarget({ id: p.id, name: p.guest_name }) }} className="text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-xs tabular-nums text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Payment' : 'Record Payment'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label={form.type === 'service' ? 'Partner Name' : 'Guest Name'}
                required
                value={form.guest_name}
                onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))}
              />
              {form.type === 'service' && (
                <p className="text-[11px] text-muted-foreground mt-1">Use the partner or provider name for service payments.</p>
              )}
              {errors.guest_name && <p className="text-xs text-destructive mt-1">{errors.guest_name}</p>}
            </div>
            <Input label="Property" value={form.property_name} onChange={e => setForm(f => ({ ...f, property_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    <FilterSidebar page="payments" open={showFilters} onClose={() => setShowFilters(false)} />
    </div>
  )
}
