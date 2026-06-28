import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  useServiceRequests, useReservations, usePartners,
  type ServiceRequest, type ServiceRequestStatus,
} from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { Loader2, ConciergeBell, Check, X, Play, CheckCircle2, CalendarClock } from 'lucide-react'

type Tab = ServiceRequestStatus | 'all'

const STATUS_TABS: Array<{ value: Tab; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
]

function statusVariant(s: ServiceRequestStatus) {
  if (s === 'completed') return 'success' as const
  if (s === 'cancelled') return 'destructive' as const
  if (s === 'in_progress' || s === 'approved') return 'warning' as const
  return 'muted' as const
}

function statusLabel(s: ServiceRequestStatus) {
  return s.replace('_', ' ')
}

export function ServiceRequests() {
  const { requests, loading, updateRequest } = useServiceRequests()
  const { data: reservations } = useReservations()
  const { data: partners } = usePartners()
  const { toast } = useToast()
  const { query } = useSearch()

  const [tab, setTab] = useState<Tab>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [approveTarget, setApproveTarget] = useState<ServiceRequest | null>(null)
  const [approvePartner, setApprovePartner] = useState('')
  const [approvePrice, setApprovePrice] = useState('')
  const [approveSaving, setApproveSaving] = useState(false)

  const guestName = (req: ServiceRequest) => {
    const res = reservations.find(r => r.id === req.reservation_id)
    return res?.guest_name ?? 'Guest'
  }
  const partnerName = (id: string | null) => partners.find(p => p.id === id)?.name ?? null

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { pending: 0, approved: 0, in_progress: 0, completed: 0, cancelled: 0, all: requests.length }
    for (const r of requests) c[r.status] += 1
    return c
  }, [requests])

  const filtered = useMemo(() => {
    let list = tab === 'all' ? requests : requests.filter(r => r.status === tab)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(r =>
        r.service_name.toLowerCase().includes(q) ||
        guestName(r).toLowerCase().includes(q) ||
        (r.details ?? '').toLowerCase().includes(q)
      )
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, tab, query, reservations])

  const setStatus = async (req: ServiceRequest, status: ServiceRequestStatus) => {
    setBusyId(req.id)
    try {
      await updateRequest(req.id, { status })
      toast(`Request ${statusLabel(status)}`)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setBusyId(null)
  }

  const openApprove = (req: ServiceRequest) => {
    setApproveTarget(req)
    setApprovePartner(req.partner_id ?? '')
    setApprovePrice(req.quoted_price != null ? String(req.quoted_price) : '')
  }

  const confirmApprove = async () => {
    if (!approveTarget) return
    setApproveSaving(true)
    try {
      await updateRequest(approveTarget.id, {
        status: 'approved',
        partner_id: approvePartner || null,
        quoted_price: approvePrice ? Number(approvePrice) : null,
      })
      toast('Request approved')
      setApproveTarget(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setApproveSaving(false)
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
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Service Requests</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 h-8 rounded-md text-xs font-medium transition-colors ${
              tab === t.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label} <span className="opacity-60">({counts[t.value]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <ConciergeBell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No requests in this view.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <Card key={req.id} className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold truncate">{req.service_name}</h3>
                    <Badge variant={statusVariant(req.status)}>{statusLabel(req.status)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Requested by <span className="text-foreground">{guestName(req)}</span>
                  </p>
                  {req.details && <p className="text-xs text-muted-foreground mt-2">{req.details}</p>}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                    {(req.preferred_date || req.preferred_time) && (
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" />
                        {req.preferred_date ?? ''} {req.preferred_time ?? ''}
                      </span>
                    )}
                    {partnerName(req.partner_id) && <span>Partner: {partnerName(req.partner_id)}</span>}
                    {req.quoted_price != null && <span>Quote: €{Number(req.quoted_price).toLocaleString()}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  {req.status === 'pending' && (
                    <>
                      <Button size="sm" disabled={busyId === req.id} onClick={() => openApprove(req)}>
                        <Check className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button variant="secondary" size="sm" disabled={busyId === req.id} onClick={() => setStatus(req, 'cancelled')}>
                        <X className="w-3 h-3 mr-1 text-destructive" /> Decline
                      </Button>
                    </>
                  )}
                  {req.status === 'approved' && (
                    <Button size="sm" disabled={busyId === req.id} onClick={() => setStatus(req, 'in_progress')}>
                      <Play className="w-3 h-3 mr-1" /> Start
                    </Button>
                  )}
                  {req.status === 'in_progress' && (
                    <Button size="sm" disabled={busyId === req.id} onClick={() => setStatus(req, 'completed')}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                    </Button>
                  )}
                  {(req.status === 'approved' || req.status === 'in_progress') && (
                    <Button variant="secondary" size="sm" disabled={busyId === req.id} onClick={() => setStatus(req, 'cancelled')}>
                      <X className="w-3 h-3 mr-1 text-destructive" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title="Approve request">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Assign a partner and quote a price for <span className="text-foreground font-medium">{approveTarget?.service_name}</span>.
          </p>
          <Select
            label="Assign partner (optional)"
            value={approvePartner}
            onChange={e => setApprovePartner(e.target.value)}
            options={[
              { value: '', label: 'No partner' },
              ...partners.filter(p => p.status === 'active').map(p => ({ value: p.id, label: p.name })),
            ]}
          />
          <Input
            label="Quoted price (€, optional)"
            type="number"
            min={0}
            value={approvePrice}
            onChange={e => setApprovePrice(e.target.value)}
            placeholder="0"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button type="button" disabled={approveSaving} onClick={confirmApprove}>
              {approveSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Approve
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
