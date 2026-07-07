import { useState } from 'react'
import { usePartnerPortal } from '@/lib/useSupabase'
import type { ServiceRequest, ServiceRequestStatus } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { Loader2, Calendar, Clock, Tag, X, Check, Ban, Play, CheckCircle2 } from 'lucide-react'
import { PartnerUnlinked } from './PartnerUnlinked'

type Filter = 'all' | 'pending' | 'active' | 'completed'

const STATUS_STYLES: Record<ServiceRequestStatus, string> = {
  approved: 'bg-emerald-500/10 text-emerald-400',
  pending: 'bg-amber-500/10 text-amber-400',
  in_progress: 'bg-blue-500/10 text-blue-400',
  completed: 'bg-gray-500/10 text-gray-400',
  cancelled: 'bg-red-500/10 text-red-400',
}

export function PartnerBookings() {
  const { partner, bookings, loading, updateRequest } = usePartnerPortal()
  const { toast } = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<ServiceRequest | null>(null)
  const [quote, setQuote] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!partner) {
    return <PartnerUnlinked title="Bookings" />
  }

  const matches = (status: string, f: Filter) => {
    if (f === 'all') return true
    if (f === 'pending') return status === 'pending'
    if (f === 'active') return status === 'approved' || status === 'in_progress'
    return status === 'completed'
  }

  const filtered = bookings.filter(b => matches(b.status, filter))

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: bookings.length },
    { id: 'pending', label: 'Pending', count: bookings.filter(b => b.status === 'pending').length },
    { id: 'active', label: 'Active', count: bookings.filter(b => b.status === 'approved' || b.status === 'in_progress').length },
    { id: 'completed', label: 'Done', count: bookings.filter(b => b.status === 'completed').length },
  ]

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  const openSheet = (b: ServiceRequest) => {
    setSelected(b)
    setQuote(b.quoted_price != null ? String(b.quoted_price) : '')
  }

  const closeSheet = () => {
    if (saving) return
    setSelected(null)
    setQuote('')
  }

  const applyAction = async (patch: Partial<ServiceRequest>, successMsg: string) => {
    if (!selected) return
    setSaving(true)
    try {
      await updateRequest(selected.id, patch)
      toast(successMsg, 'success')
      setSelected(null)
      setQuote('')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong', 'error')
    } finally {
      setSaving(false)
    }
  }

  const parsedQuote = () => {
    const trimmed = quote.trim()
    if (trimmed === '') return null
    const n = Number(trimmed)
    return Number.isFinite(n) && n >= 0 ? n : undefined
  }

  return (
    <div className="bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">Requests assigned to you</p>
      </div>

      {/* Filters */}
      <div className="px-5 pt-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                filter === f.id
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-gray-900 text-gray-400 border border-gray-800'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      <div className="px-5 mt-4 space-y-3 pb-8">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-gray-900 rounded-2xl border border-gray-800">
            <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No bookings match this filter</p>
          </div>
        ) : (
          filtered.map(b => (
            <button
              key={b.id}
              onClick={() => openSheet(b)}
              className="w-full text-left rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden active:bg-gray-800 transition-colors"
            >
              <div className="flex gap-4 p-4">
                <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white truncate">{b.service_name}</h3>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_STYLES[b.status]}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>
                  {b.details && (
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{b.details}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/50">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {b.preferred_date ? formatDate(b.preferred_date) : formatDate(b.created_at)}
                  {b.preferred_time ? ` · ${b.preferred_time}` : ''}
                </span>
                <p className="text-sm font-bold text-white">
                  {b.quoted_price != null ? `\u20ac${Number(b.quoted_price).toLocaleString()}` : 'No quote'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {selected && (
        <BookingSheet
          booking={selected}
          quote={quote}
          setQuote={setQuote}
          saving={saving}
          onClose={closeSheet}
          onAction={applyAction}
          parsedQuote={parsedQuote}
        />
      )}
    </div>
  )
}

function BookingSheet({
  booking, quote, setQuote, saving, onClose, onAction, parsedQuote,
}: {
  booking: ServiceRequest
  quote: string
  setQuote: (v: string) => void
  saving: boolean
  onClose: () => void
  onAction: (patch: Partial<ServiceRequest>, successMsg: string) => void
  parsedQuote: () => number | null | undefined
}) {
  const status = booking.status
  const quoteEditable = status === 'pending' || status === 'approved'
  const invalidQuote = parsedQuote() === undefined

  const accept = () => {
    const q = parsedQuote()
    if (q === undefined) return
    onAction({ status: 'approved', quoted_price: q }, q != null ? 'Request accepted with quote' : 'Request accepted')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-900 border-t border-gray-800 rounded-t-3xl p-5 pb-8 animate-in">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>
              {status.replace('_', ' ')}
            </span>
            <h2 className="text-xl font-bold text-white mt-2 truncate">{booking.service_name}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {booking.details && (
          <p className="text-sm text-gray-400 mt-3">{booking.details}</p>
        )}

        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
          {booking.preferred_date
            ? new Date(booking.preferred_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'No preferred date'}
          {booking.preferred_time ? ` · ${booking.preferred_time}` : ''}
        </div>

        {/* Quote */}
        <div className="mt-5">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Quote (EUR)</label>
          {quoteEditable ? (
            <div className="mt-1.5 flex items-center bg-gray-950 border border-gray-800 rounded-xl px-3">
              <span className="text-gray-500 text-sm">&euro;</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={quote}
                onChange={e => setQuote(e.target.value)}
                placeholder="Set your price"
                className="flex-1 bg-transparent py-3 px-2 text-white text-sm outline-none"
              />
            </div>
          ) : (
            <p className="text-lg font-bold text-white mt-1">
              {booking.quoted_price != null ? `\u20ac${Number(booking.quoted_price).toLocaleString()}` : 'No quote'}
            </p>
          )}
          {quoteEditable && invalidQuote && (
            <p className="text-[11px] text-red-400 mt-1.5">Enter a valid amount (or leave empty).</p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-2.5">
          {status === 'pending' && (
            <>
              <button
                onClick={accept}
                disabled={saving || invalidQuote}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-500 text-white font-semibold active:scale-[0.99] transition-transform disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Accept{parsedQuote() != null ? ' & send quote' : ''}
              </button>
              <button
                onClick={() => onAction({ status: 'cancelled' }, 'Request declined')}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-800 text-red-400 font-semibold active:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                Decline
              </button>
            </>
          )}

          {status === 'approved' && (
            <>
              <button
                onClick={() => {
                  const q = parsedQuote()
                  if (q === undefined) return
                  onAction({ status: 'in_progress', quoted_price: q }, 'Service started')
                }}
                disabled={saving || invalidQuote}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-500 text-white font-semibold active:scale-[0.99] transition-transform disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Start service
              </button>
              {parsedQuote() !== undefined && String(parsedQuote() ?? '') !== String(booking.quoted_price ?? '') && (
                <button
                  onClick={() => onAction({ quoted_price: parsedQuote() ?? null }, 'Quote updated')}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-800 text-white font-semibold active:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Update quote
                </button>
              )}
            </>
          )}

          {status === 'in_progress' && (
            <button
              onClick={() => onAction({ status: 'completed' }, 'Service marked complete')}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500 text-white font-semibold active:scale-[0.99] transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Mark complete
            </button>
          )}

          {(status === 'completed' || status === 'cancelled') && (
            <p className="text-center text-sm text-gray-500 py-2">
              This request is {status}. No further action needed.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
