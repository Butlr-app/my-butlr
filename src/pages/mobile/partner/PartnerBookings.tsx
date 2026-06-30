import { useState } from 'react'
import { useReservations } from '@/lib/useSupabase'
import { Loader2, Calendar, MapPin, Users, Clock } from 'lucide-react'

export function PartnerBookings() {
  const { data: reservations, loading } = useReservations()
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const filtered = filter === 'all'
    ? reservations
    : reservations.filter(r => r.status === filter)

  const filters = [
    { id: 'all' as const, label: 'All', count: reservations.length },
    { id: 'pending' as const, label: 'Pending', count: reservations.filter(r => r.status === 'pending').length },
    { id: 'confirmed' as const, label: 'Active', count: reservations.filter(r => r.status === 'confirmed').length },
    { id: 'completed' as const, label: 'Done', count: reservations.filter(r => r.status === 'completed').length },
  ]

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your reservations</p>
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
          filtered.map(r => (
            <div key={r.id} className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden active:bg-gray-800 transition-colors">
              <div className="flex gap-4 p-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={r.property?.image_url ?? '/images/villa-hero.jpg'} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white truncate">{r.guest_name}</h3>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      r.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                      r.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                      r.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                      r.status === 'completed' ? 'bg-gray-500/10 text-gray-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {r.property?.name ?? 'Property'}{r.property?.location ? ` — ${r.property.location}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(r.arrival)} — {formatDate(r.departure)}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {r.guests_count}
                  </span>
                </div>
                <p className="text-sm font-bold text-white">&euro;{Number(r.total_amount).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
