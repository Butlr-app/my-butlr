import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { CsvImportModal } from '@/components/CsvImportModal'
import { IcalSyncModal } from '@/components/IcalSyncModal'
import { FilterSidebar } from '@/components/FilterSidebar'
import { useReservations, useProperties, useNotifications, useCheckins, type Reservation } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { Plus, Loader2, Download, Filter, Upload, CalendarSync } from 'lucide-react'
import { useRoleFilter } from '@/lib/useRoleFilter'

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
  const { data: rawReservations, loading, insert, update } = useReservations()
  const { data: properties } = useProperties()
  const { insertNotification } = useNotifications()
  const { checkins } = useCheckins()
  const { toast } = useToast()
  const checkinByReservation = new Map(checkins.map(c => [c.reservation_id, c]))
  const { query, filters } = useSearch()
  const { t } = useTranslation()
  const { filterReservations } = useRoleFilter()
  const reservations = filterReservations(rawReservations)
  const [selected, setSelected] = useState<Reservation | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)
  const [showImport, setShowImport] = useState(false)
  const [showIcal, setShowIcal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => { setPage(0) }, [query])

  const filtered = reservations.filter(r => {
    if (query) {
      const q = query.toLowerCase()
      if (!(r.guest_name.toLowerCase().includes(q) || (r.property?.name ?? '').toLowerCase().includes(q))) return false
    }
    if (filters.reservationStatus && filters.reservationStatus.length > 0 && !filters.reservationStatus.includes(r.status)) return false
    if (filters.reservationDateFrom && r.arrival < filters.reservationDateFrom) return false
    if (filters.reservationDateTo && r.departure > filters.reservationDateTo) return false
    return true
  })

  const importFields = [
    { key: 'guest_name', label: t('reservations.guestName'), required: true },
    { key: 'guest_email', label: 'Email' },
    { key: 'guest_phone', label: 'Phone' },
    { key: 'arrival', label: t('reservations.arrival'), required: true },
    { key: 'departure', label: t('reservations.departure'), required: true },
    { key: 'guests_count', label: t('reservations.guestsCount') },
    { key: 'total_amount', label: t('common.amount') },
    { key: 'status', label: t('common.status') },
    { key: 'notes', label: 'Notes' },
  ]

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
    <div className="flex">
    <div className="flex-1 min-w-0 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-tight text-muted-foreground">{t('reservations.title')}</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-1" /> {t('common.filter')}
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> {t('importExport.exportCsv')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-1" /> {t('common.import')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowIcal(true)}>
            <CalendarSync className="w-4 h-4 mr-1" /> {t('ical.title')}
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> {t('reservations.addReservation')}
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
        <div className="lg:hidden space-y-3">
          {paginated.map(r => (
            <Card key={r.id} className="p-4 space-y-2 cursor-pointer" onClick={() => setSelected(r)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.guest_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.property?.name ?? '—'}</p>
                </div>
                <p className="text-sm font-mono shrink-0">€{Number(r.total_amount).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span>{r.arrival}</span>
                <span>→</span>
                <span>{r.departure}</span>
                <span className="ml-auto">{r.guests_count} pax</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={r.status === 'confirmed' || r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'destructive' : 'warning'}>{r.status}</Badge>
                <Badge variant={r.payment_status === 'paid' ? 'success' : r.payment_status === 'partial' ? 'warning' : 'muted'}>{r.payment_status}</Badge>
                <Badge variant={r.contract_status === 'signed' ? 'success' : r.contract_status === 'sent' ? 'info' : 'muted'}>{r.contract_status}</Badge>
                <Badge variant={checkinByReservation.get(r.id)?.status === 'completed' ? 'success' : 'muted'}>
                  {checkinByReservation.get(r.id)?.status === 'completed' ? 'check-in' : 'check-in pending'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guest</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Arrival</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Departure</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guests</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contract</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check-in</th>
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
                    <td className="px-4 text-sm tabular-nums">{r.arrival}</td>
                    <td className="px-4 text-sm tabular-nums">{r.departure}</td>
                    <td className="px-4 text-sm tabular-nums text-right">{r.guests_count}</td>
                    <td className="px-4 text-sm tabular-nums text-right">€{Number(r.total_amount).toLocaleString()}</td>
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
                    <td className="px-4">
                      <Badge variant={checkinByReservation.get(r.id)?.status === 'completed' ? 'success' : 'muted'}>
                        {checkinByReservation.get(r.id)?.status === 'completed' ? 'completed' : 'pending'}
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
              <span className="text-xs tabular-nums text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Reservation Detail">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Guest</p>
                <p className="text-sm font-medium mt-1">{selected.guest_name}</p>
                {selected.guest_email && <p className="text-xs text-muted-foreground">{selected.guest_email}</p>}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Property</p>
                <p className="text-sm font-medium mt-1">{selected.property?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Arrival</p>
                <p className="text-sm tabular-nums mt-1">{selected.arrival}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Departure</p>
                <p className="text-sm tabular-nums mt-1">{selected.departure}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Amount</p>
                <p className="text-sm tabular-nums mt-1">€{Number(selected.total_amount).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
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
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Notes</p>
                <p className="text-sm text-muted-foreground">{selected.notes}</p>
              </div>
            )}
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Online Check-in</p>
              {(() => {
                const ci = checkinByReservation.get(selected.id)
                if (!ci || ci.status !== 'completed') {
                  return <Badge variant="muted">Pending</Badge>
                }
                return (
                  <div className="space-y-3">
                    <Badge variant="success">Completed {ci.submitted_at ? `· ${new Date(ci.submitted_at).toLocaleString()}` : ''}</Badge>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Guests:</span> {ci.num_guests}</div>
                      <div><span className="text-muted-foreground">Arrival:</span> {ci.estimated_arrival ?? '—'}</div>
                      <div><span className="text-muted-foreground">Nationality:</span> {ci.nationality ?? '—'}</div>
                      <div><span className="text-muted-foreground">ID:</span> {ci.id_doc_type} · {ci.id_doc_number ?? '—'}</div>
                    </div>
                    {ci.special_requests && <p className="text-sm text-muted-foreground">{ci.special_requests}</p>}
                    {ci.id_document_url && (
                      <a href={ci.id_document_url} target="_blank" rel="noopener noreferrer" className="text-sm underline">View ID document</a>
                    )}
                    {ci.signature_data && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Signature</p>
                        <img src={ci.signature_data} alt="Signature" className="border border-border rounded-sm bg-white max-w-[220px]" />
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </Modal>

      <CsvImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        targetTable="reservations"
        targetFields={importFields}
      />

      <IcalSyncModal
        open={showIcal}
        onClose={() => setShowIcal(false)}
        reservations={rawReservations}
        properties={properties}
        onImport={async rows => {
          for (const row of rows) {
            await insert(row)
          }
        }}
      />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Reservation">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Guest Name" required value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Arrival" type="date" required value={form.arrival} onChange={e => setForm(f => ({ ...f, arrival: e.target.value }))} />
            <Input label="Departure" type="date" required value={form.departure} onChange={e => setForm(f => ({ ...f, departure: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    <FilterSidebar page="reservations" open={showFilters} onClose={() => setShowFilters(false)} />
    </div>
  )
}
