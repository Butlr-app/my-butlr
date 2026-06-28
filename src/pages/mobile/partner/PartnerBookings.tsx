import { useState } from 'react'
import { useReservations } from '@/lib/useSupabase'
import { Loader2, Calendar, MapPin, Users } from 'lucide-react'

export function PartnerBookings() {
  const { data: reservations, loading } = useReservations()
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    )
  }

  const filtered = filter === 'all'
    ? reservations
    : reservations.filter(r => r.status === filter)

  const filters = [
    { id: 'all' as const, label: 'All', count: reservations.length },
    { id: 'pending' as const, label: 'Pending', count: reservations.filter(r => r.status === 'pending').length },
    { id: 'confirmed' as const, label: 'Confirmed', count: reservations.filter(r => r.status === 'confirmed').length },
    { id: 'completed' as const, label: 'Done', count: reservations.filter(r => r.status === 'completed').length },
  ]

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your reservations</p>
      </div>

      {/* Filters */}
      <div className="px-5 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === f.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      <div className="px-5 mt-4 space-y-3 pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">No bookings</h3>
            <p className="text-sm text-gray-500">No bookings match this filter</p>
          </div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="rounded-2xl border border-gray-100 p-4 shadow-sm active:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{r.guest_name}</h3>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      r.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      r.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      r.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  {r.property && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {r.property.name}{r.property.location ? ` — ${r.property.location}` : ''}
                    </p>
                  )}
                </div>
                <p className="text-base font-bold text-gray-900">&euro;{Number(r.total_amount).toLocaleString()}</p>
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{r.arrival} — {r.departure}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>{r.guests_count} guests</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
