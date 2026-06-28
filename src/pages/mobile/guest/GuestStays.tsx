import { useState } from 'react'
import { useReservations } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { Loader2, MapPin, Calendar, Users, ChevronRight } from 'lucide-react'

export function GuestStays() {
  const { data: reservations, loading } = useReservations()
  const { user } = useAuth()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const guestReservations = reservations.filter(r => r.guest_email === user?.email)

  const upcoming = guestReservations.filter(r =>
    r.departure >= today && (r.status === 'confirmed' || r.status === 'pending' || r.status === 'in_progress')
  )
  const past = guestReservations.filter(r =>
    r.departure < today || r.status === 'completed'
  )

  const displayed = tab === 'upcoming' ? upcoming : past

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Your Stays</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your reservations</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex px-5 pt-4 gap-1 bg-gray-50 mx-5 mt-4 rounded-xl p-1">
        <button
          onClick={() => setTab('upcoming')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'upcoming'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          onClick={() => setTab('past')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'past'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          Past ({past.length})
        </button>
      </div>

      {/* Reservations List */}
      <div className="px-5 mt-4 space-y-4 pb-6">
        {displayed.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">
              No {tab} stays
            </h3>
            <p className="text-sm text-gray-500">
              {tab === 'upcoming'
                ? 'Your next adventure awaits!'
                : 'Your past stays will appear here'}
            </p>
          </div>
        ) : (
          displayed.map(r => (
            <div key={r.id} className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {/* Property Image */}
              <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                {r.property?.image_url ? (
                  <img src={r.property.image_url} alt={r.property.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
                    <MapPin className="w-12 h-12 text-rose-300" />
                  </div>
                )}
                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    r.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    r.status === 'in_progress' ? 'bg-rose-100 text-rose-800' :
                    r.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {r.status === 'in_progress' ? 'Active' : r.status}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{r.property?.name ?? 'Property'}</h3>
                    {r.property?.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {r.property.location}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 mt-0.5" />
                </div>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{r.arrival} — {r.departure}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{r.guests_count}</span>
                  </div>
                </div>

                {r.total_amount > 0 && (
                  <p className="text-sm font-semibold text-gray-900 mt-3">
                    &euro;{Number(r.total_amount).toLocaleString()} total
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
