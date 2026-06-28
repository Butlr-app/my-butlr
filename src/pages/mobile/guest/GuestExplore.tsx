import { useState } from 'react'
import { useReservations, useServices } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { Loader2, MapPin, Star, Sparkles, Heart, ArrowRight, Clock, Users } from 'lucide-react'

const SERVICE_IMAGES: Record<string, string> = {
  'Private Chef': '/images/chef.jpg',
  'Boat Rental': '/images/boat.jpg',
  'Wellness & Spa': '/images/spa.jpg',
  'Airport Transfer': '/images/luxury-interior.jpg',
  'Wine Tasting': '/images/villa-pool.jpg',
  'Personal Shopper': '/images/concierge.jpg',
  'Childcare': '/images/beach-villa.jpg',
  'Fitness Coach': '/images/spa.jpg',
  'Event Planning': '/images/villa-hero.jpg',
  'Helicopter Tour': '/images/yacht.jpg',
}

const CONCIERGE_PICKS = [
  { title: 'Sunset Dinner on the Terrace', subtitle: 'Private Chef + Wine Pairing', image: '/images/chef.jpg', price: 1200 },
  { title: 'Mediterranean Day Cruise', subtitle: 'Yacht + Lunch + Champagne', image: '/images/yacht.jpg', price: 3500 },
  { title: 'Full Day Wellness Retreat', subtitle: 'Massage + Yoga + Detox Menu', image: '/images/spa.jpg', price: 800 },
]

export function GuestExplore() {
  const { data: reservations, loading: lRes } = useReservations()
  const { data: services, loading: lSvc } = useServices()
  const { user } = useAuth()
  const [activeCategory, setActiveCategory] = useState('all')
  const [likedServices, setLikedServices] = useState<Set<string>>(new Set())

  const loading = lRes || lSvc

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 tracking-wide">Loading your experience...</p>
        </div>
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
    { id: 'all', label: 'All', icon: '✦' },
    { id: 'dining', label: 'Dining', icon: '🍽' },
    { id: 'wellness', label: 'Wellness', icon: '🧘' },
    { id: 'transport', label: 'Transport', icon: '🚁' },
    { id: 'activities', label: 'Activities', icon: '⛵' },
    { id: 'lifestyle', label: 'Lifestyle', icon: '💎' },
  ]

  const availableServices = services.filter(s => s.available)
  const filteredServices = activeCategory === 'all'
    ? availableServices
    : availableServices.filter(s => (s.category ?? '').toLowerCase().includes(activeCategory))

  const toggleLike = (id: string) => {
    setLikedServices(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const daysBetween = (a: string, b: string) => {
    const d1 = new Date(a).getTime()
    const d2 = new Date(b).getTime()
    return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="bg-[#FAFAF8] min-h-screen">
      {/* Hero Section */}
      <div className="relative">
        {activeReservation ? (
          <div className="relative h-72 overflow-hidden">
            <img
              src={activeReservation.property?.image_url ?? '/images/villa-hero.jpg'}
              alt="Your stay"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-medium text-white tracking-wide uppercase">
                  Currently staying
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {activeReservation.property?.name ?? 'Your Property'}
              </h1>
              <p className="text-sm text-white/80 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {activeReservation.property?.location ?? 'Luxury Villa'}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-xs text-white/70 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Day {daysBetween(activeReservation.arrival, today) + 1} of {daysBetween(activeReservation.arrival, activeReservation.departure)}
                </span>
                <span className="text-xs text-white/70 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {activeReservation.guests_count} guests
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative h-64 overflow-hidden">
            <img src="/images/villa-hero.jpg" alt="Butlr" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-sm text-white/70 tracking-wide">Welcome back,</p>
              <h1 className="text-3xl font-bold text-white">
                {user?.email?.split('@')[0] ?? 'Guest'}
              </h1>
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="px-5 -mt-6 relative z-10">
        <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 shadow-lg border border-gray-100/80">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">What would you like to do?</p>
            <p className="text-xs text-gray-400">Services &middot; Experiences &middot; Activities</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Concierge Picks */}
      <div className="mt-8 px-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Concierge Picks</h2>
            <p className="text-xs text-gray-400 mt-0.5">Curated by your house manager</p>
          </div>
          <button className="text-xs font-semibold text-amber-700 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory scrollbar-hide">
          {CONCIERGE_PICKS.map((pick, idx) => (
            <div key={idx} className="flex-shrink-0 w-72 snap-start">
              <div className="relative rounded-2xl overflow-hidden shadow-md">
                <img src={pick.image} alt={pick.title} className="w-full h-48 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-bold text-gray-900">
                    RECOMMENDED
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="font-semibold text-white text-sm">{pick.title}</p>
                  <p className="text-xs text-white/80 mt-0.5">{pick.subtitle}</p>
                  <p className="text-sm font-bold text-white mt-2">
                    From &euro;{pick.price.toLocaleString()} <span className="font-normal text-white/60 text-xs">/ experience</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Stays */}
      {upcomingReservations.length > 0 && (
        <div className="mt-8 px-5">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-4">Upcoming Stays</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory scrollbar-hide">
            {upcomingReservations.map(r => (
              <div key={r.id} className="flex-shrink-0 w-64 snap-start">
                <div className="rounded-2xl overflow-hidden shadow-md bg-white">
                  <div className="h-36 relative">
                    <img
                      src={r.property?.image_url ?? '/images/beach-villa.jpg'}
                      alt={r.property?.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm ${
                        r.status === 'confirmed' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="p-3.5">
                    <p className="font-semibold text-sm text-gray-900">{r.property?.name ?? 'Property'}</p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(r.arrival)} — {formatDate(r.departure)}
                    </p>
                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100">
                      <span className="text-xs text-gray-500">{r.guests_count} guests</span>
                      <span className="text-sm font-bold text-gray-900">&euro;{Number(r.total_amount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Categories */}
      <div className="mt-8 px-5">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-4">Premium Services</h2>
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl transition-all ${
                activeCategory === cat.id
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-100 shadow-sm'
              }`}
            >
              <span className="text-base">{cat.icon}</span>
              <span className="text-[11px] font-medium whitespace-nowrap">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="px-5 mt-4 pb-8">
        <div className="space-y-4">
          {filteredServices.slice(0, 8).map(svc => {
            const img = SERVICE_IMAGES[svc.name] ?? svc.image_url ?? '/images/villa-pool.jpg'
            return (
              <div key={svc.id} className="rounded-2xl overflow-hidden shadow-md bg-white active:scale-[0.98] transition-transform">
                <div className="relative h-52">
                  <img src={img} alt={svc.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLike(svc.id) }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm"
                  >
                    <Heart className={`w-4 h-4 transition-colors ${likedServices.has(svc.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                  </button>
                  <div className="absolute bottom-3 left-3">
                    <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-bold text-gray-900 uppercase tracking-wider">
                      {svc.category ?? 'Premium'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{svc.name}</h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {svc.description ?? 'Exclusive premium service tailored to your stay'}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 ml-3">
                      <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                      <span className="text-sm font-semibold text-gray-800">4.9</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <p className="text-base font-bold text-gray-900">
                      &euro;{Number(svc.starting_price).toLocaleString()}
                      <span className="text-xs font-normal text-gray-400"> / session</span>
                    </p>
                    <button className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-xl active:scale-95 transition-transform">
                      Book now
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No services in this category</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Calendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function formatDate(d: string) {
  const date = new Date(d)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
