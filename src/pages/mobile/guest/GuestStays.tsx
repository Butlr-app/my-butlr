import { useState } from 'react'
import { useReservations } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { Loader2, MapPin, Users, Heart, Star } from 'lucide-react'

export function GuestStays() {
  const { data: reservations, loading } = useReservations()
  const { user } = useAuth()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
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

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const PROPERTY_IMAGES = ['/images/villa-hero.jpg', '/images/beach-villa.jpg', '/images/villa-pool.jpg', '/images/luxury-interior.jpg']

  return (
    <div className="bg-[#FAFAF8] min-h-screen">
      {/* Header */}
      <div className="px-5 pt-14 pb-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Your Stays</h1>
        <p className="text-sm text-gray-400 mt-1">Past and upcoming reservations</p>
      </div>

      {/* Tab Switcher */}
      <div className="px-5 mt-4">
        <div className="flex bg-gray-100 rounded-2xl p-1">
          <button
            onClick={() => setTab('upcoming')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              tab === 'upcoming'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400'
            }`}
          >
            Upcoming ({upcoming.length})
          </button>
          <button
            onClick={() => setTab('past')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              tab === 'past'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400'
            }`}
          >
            Past ({past.length})
          </button>
        </div>
      </div>

      {/* Reservations List */}
      <div className="px-5 mt-5 space-y-5 pb-8">
        {displayed.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">
              {tab === 'upcoming' ? 'No upcoming stays' : 'No past stays'}
            </h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">
              {tab === 'upcoming'
                ? 'Your next luxury escape is just around the corner'
                : 'Your travel memories will appear here'}
            </p>
          </div>
        ) : (
          displayed.map((r, idx) => (
            <div key={r.id} className="rounded-2xl overflow-hidden shadow-md bg-white">
              {/* Property Image */}
              <div className="relative h-56">
                <img
                  src={r.property?.image_url ?? PROPERTY_IMAGES[idx % PROPERTY_IMAGES.length]}
                  alt={r.property?.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                {/* Heart button */}
                <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center">
                  <Heart className="w-4 h-4 text-gray-600" />
                </button>

                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm uppercase tracking-wider ${
                    r.status === 'confirmed' ? 'bg-emerald-500/90 text-white' :
                    r.status === 'in_progress' ? 'bg-white/90 text-gray-900' :
                    r.status === 'pending' ? 'bg-amber-500/90 text-white' :
                    'bg-gray-500/90 text-white'
                  }`}>
                    {r.status === 'in_progress' ? 'Active Now' : r.status}
                  </span>
                </div>

                {/* Dot indicators */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                </div>
              </div>

              {/* Details */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{r.property?.name ?? 'Property'}</h3>
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-current text-amber-400" />
                        <span className="text-xs font-semibold text-gray-700">5.0</span>
                      </div>
                    </div>
                    {r.property?.location && (
                      <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {r.property.location}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span>{formatDate(r.arrival)} — {formatDate(r.departure)}</span>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{r.guests_count} guest{r.guests_count > 1 ? 's' : ''}</span>
                  </div>
                  {r.total_amount > 0 && (
                    <p className="text-base font-bold text-gray-900">
                      &euro;{Number(r.total_amount).toLocaleString()}
                      <span className="text-xs font-normal text-gray-400"> total</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
