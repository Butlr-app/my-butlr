import { useState } from 'react'
import { usePartnerPortal } from '@/lib/useSupabase'
import { Loader2, Calendar, Clock, Tag } from 'lucide-react'
import { PartnerUnlinked } from './PartnerUnlinked'

type Filter = 'all' | 'pending' | 'active' | 'completed'

export function PartnerBookings() {
  const { partner, bookings, loading } = usePartnerPortal()
  const [filter, setFilter] = useState<Filter>('all')

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
            <div key={b.id} className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden active:bg-gray-800 transition-colors">
              <div className="flex gap-4 p-4">
                <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white truncate">{b.service_name}</h3>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      b.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                      b.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                      b.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                      b.status === 'completed' ? 'bg-gray-500/10 text-gray-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
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
            </div>
          ))
        )}
      </div>
    </div>
  )
}
