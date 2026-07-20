import { useState } from 'react'
import { useServices, useCurrentPartner } from '@/lib/useSupabase'
import { Loader2, Star, Eye, EyeOff, Edit3, Plus, Sparkles } from 'lucide-react'
import { PartnerUnlinked } from './PartnerUnlinked'

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

export function PartnerServices() {
  const { data: allServices, loading: servicesLoading } = useServices()
  const { partner, loading: partnerLoading } = useCurrentPartner()
  const [showHidden, setShowHidden] = useState(false)

  if (servicesLoading || partnerLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!partner) {
    return <PartnerUnlinked title="Services" />
  }

  // Scope the catalog to the partner's own category when one is set.
  const services = partner.category
    ? allServices.filter(s => (s.category ?? '').toLowerCase() === partner.category!.toLowerCase())
    : allServices

  const activeServices = services.filter(s => s.available)
  const hiddenServices = services.filter(s => !s.available)
  const displayed = showHidden ? hiddenServices : activeServices

  return (
    <div className="bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Services</h1>
            <p className="text-sm text-gray-500 mt-1">
              {partner.category ? `Your ${partner.category} catalog` : 'Your service catalog'}
            </p>
          </div>
          <button className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 active:scale-95 transition-transform">
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Toggle */}
      <div className="px-5 mt-2">
        <div className="flex bg-gray-900 rounded-2xl p-1 border border-gray-800">
          <button
            onClick={() => setShowHidden(false)}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              !showHidden ? 'bg-gray-800 text-white' : 'text-gray-500'
            }`}
          >
            Active ({activeServices.length})
          </button>
          <button
            onClick={() => setShowHidden(true)}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              showHidden ? 'bg-gray-800 text-white' : 'text-gray-500'
            }`}
          >
            Hidden ({hiddenServices.length})
          </button>
        </div>
      </div>

      {/* Service List */}
      <div className="px-5 mt-5 space-y-4 pb-8">
        {displayed.length === 0 ? (
          <div className="text-center py-16 bg-gray-900 rounded-2xl border border-gray-800">
            <Sparkles className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {showHidden ? 'No hidden services' : 'No active services'}
            </p>
          </div>
        ) : (
          displayed.map(svc => {
            const img = SERVICE_IMAGES[svc.name] ?? svc.image_url ?? '/images/villa-pool.jpg'
            return (
              <div key={svc.id} className="rounded-2xl overflow-hidden bg-gray-900 border border-gray-800">
                <div className="relative h-40">
                  <img src={img} alt={svc.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[9px] font-bold text-white uppercase tracking-wider">
                          {svc.category ?? 'Premium'}
                        </span>
                        <h3 className="font-bold text-white text-lg mt-1.5">{svc.name}</h3>
                      </div>
                      <div className="flex items-center gap-0.5 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
                        <Star className="w-3 h-3 fill-current text-amber-400" />
                        <span className="text-xs font-bold text-white">{Number(partner.rating).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                    {svc.description ?? 'Premium service for your guests'}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-base font-bold text-white">
                      &euro;{Number(svc.starting_price).toLocaleString()}
                      <span className="text-xs font-normal text-gray-500"> /session</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center active:bg-gray-700 transition-colors border border-gray-700">
                        {svc.available ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <button className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center active:bg-gray-700 transition-colors border border-gray-700">
                        <Edit3 className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
