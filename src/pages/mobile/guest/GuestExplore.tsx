import { useState } from 'react'
import { useReservations, useServices } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { Loader2, MapPin, Star, Sparkles } from 'lucide-react'

export function GuestExplore() {
  const { data: reservations, loading: lRes } = useReservations()
  const { data: services, loading: lSvc } = useServices()
  const { user } = useAuth()
  const [activeCategory, setActiveCategory] = useState('all')

  const loading = lRes || lSvc

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const guestReservations = reservations.filter(r => r.guest_email === user?.email)
  const activeReservation = guestReservations.find(r =>
    r.arrival <= today && r.departure >= today && (r.status === 'confirmed' || r.status === 'in_progress')
  )
  const upcomingReservations = guestReservations.filter(r =>
    r.arrival > today && (r.status === 'confirmed' || r.status === 'pending')
  ).slice(0, 5)

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'chef', label: 'Chef' },
    { id: 'wellness', label: 'Wellness' },
    { id: 'transport', label: 'Transport' },
    { id: 'boat', label: 'Boat' },
    { id: 'event', label: 'Events' },
  ]

  const availableServices = services.filter(s => s.available)
  const filteredServices = activeCategory === 'all'
    ? availableServices
    : availableServices.filter(s => (s.category ?? '').toLowerCase().includes(activeCategory))

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="px-5 pt-12 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Welcome back</p>
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.email?.split('@')[0] ?? 'Guest'}
              </h1>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {(user?.email?.[0] ?? 'G').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3 bg-gray-100 rounded-full px-4 py-3 shadow-sm border border-gray-200">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">Where are you going?</p>
              <p className="text-xs text-gray-500">Anywhere &middot; Any week &middot; Add guests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Stay Banner */}
      {activeReservation && (
        <div className="mx-5 mt-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 p-5 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider opacity-90">Currently staying</span>
              </div>
              <h3 className="text-lg font-bold mb-1">{activeReservation.property?.name ?? 'Your Property'}</h3>
              <p className="text-sm opacity-90 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {activeReservation.property?.location ?? 'Luxury Stay'}
              </p>
              <p className="text-xs mt-2 opacity-75">
                {activeReservation.arrival} — {activeReservation.departure}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Stays */}
      {upcomingReservations.length > 0 && (
        <div className="mt-6 px-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Upcoming Stays</h2>
            <button className="text-sm font-medium text-rose-500">See all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory scrollbar-hide">
            {upcomingReservations.map(r => (
              <div key={r.id} className="flex-shrink-0 w-64 snap-start">
                <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                    {r.property?.image_url ? (
                      <img src={r.property.image_url} alt={r.property.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-gray-900">{r.property?.name ?? 'Property'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.arrival} — {r.departure}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-medium text-rose-500 capitalize">{r.status}</span>
                      <span className="text-xs font-semibold">{r.guests_count} guests</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Categories */}
      <div className="mt-6 px-5">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Experiences & Services</h2>
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="px-5 mt-2 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {filteredServices.slice(0, 8).map(svc => (
            <div key={svc.id} className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm active:scale-[0.98] transition-transform">
              <div className="h-28 bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center relative">
                {svc.image_url ? (
                  <img src={svc.image_url} alt={svc.name} className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-8 h-8 text-rose-300" />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-900 truncate">{svc.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{svc.category ?? 'Premium Service'}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-gray-900">
                    &euro;{Number(svc.starting_price).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-current text-rose-500" />
                    <span className="text-xs font-medium text-gray-600">4.9</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No services available in this category</p>
          </div>
        )}
      </div>
    </div>
  )
}
