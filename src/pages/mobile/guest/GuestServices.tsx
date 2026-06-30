import { useState } from 'react'
import { useServices, useReservations, useServiceRequests } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { useToast } from '@/components/ui/Toast'
import { Loader2, Star, Clock, Check, X, Sparkles } from 'lucide-react'

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

export function GuestServices() {
  const { data: services, loading: lSvc } = useServices()
  const { data: reservations } = useReservations()
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [showRequestSheet, setShowRequestSheet] = useState(false)
  const [requestForm, setRequestForm] = useState({ details: '', preferred_date: '', preferred_time: '' })
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const guestReservations = reservations.filter(r => r.guest_email === user?.email)
  const currentReservation = guestReservations.find(r =>
    r.arrival <= today && r.departure >= today && (r.status === 'confirmed' || r.status === 'in_progress')
  ) ?? guestReservations[0]

  const { requests, addRequest } = useServiceRequests(currentReservation?.id)

  const loading = lSvc

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    )
  }

  const availableServices = services.filter(s => s.available)

  const handleRequest = async () => {
    if (!selectedService) return
    setSaving(true)
    try {
      const svc = services.find(s => s.id === selectedService)
      await addRequest({
        reservation_id: currentReservation?.id ?? null,
        guest_user_id: user?.id ?? null,
        service_id: selectedService,
        service_name: svc?.name ?? 'Service',
        details: requestForm.details || null,
        preferred_date: requestForm.preferred_date || null,
        preferred_time: requestForm.preferred_time || null,
        status: 'pending',
      })
      toast('Request submitted! Your concierge will confirm shortly.')
      setShowRequestSheet(false)
      setRequestForm({ details: '', preferred_date: '', preferred_time: '' })
      setSelectedService(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const statusConfig = (status: string) => {
    if (status === 'completed') return { icon: <Check className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
    if (status === 'cancelled') return { icon: <X className="w-4 h-4" />, color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' }
    if (status === 'approved') return { icon: <Check className="w-4 h-4" />, color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' }
    return { icon: <Clock className="w-4 h-4" />, color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' }
  }

  const selectedSvc = services.find(s => s.id === selectedService)
  const selectedImg = selectedSvc ? (SERVICE_IMAGES[selectedSvc.name] ?? selectedSvc.image_url ?? '/images/villa-pool.jpg') : ''

  return (
    <div className="bg-[#FAFAF8] min-h-screen">
      {/* Header */}
      <div className="px-5 pt-14 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Services</h1>
        <p className="text-sm text-gray-400 mt-1">Premium experiences for your stay</p>
      </div>

      {/* My Requests */}
      {requests.length > 0 && (
        <div className="px-5 mb-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">My Requests</h2>
          <div className="space-y-2">
            {requests.slice(0, 5).map(req => {
              const sc = statusConfig(req.status)
              return (
                <div key={req.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border ${sc.color}`}>
                  <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{req.service_name}</p>
                    <p className="text-xs opacity-70">
                      {req.preferred_date ?? 'Flexible'} {req.preferred_time ? `at ${req.preferred_time}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">{req.status}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Available Services */}
      <div className="px-5 pb-8">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Available Services</h2>
        <div className="space-y-4">
          {availableServices.map(svc => {
            const img = SERVICE_IMAGES[svc.name] ?? svc.image_url ?? '/images/villa-pool.jpg'
            return (
              <button
                key={svc.id}
                onClick={() => { setSelectedService(svc.id); setShowRequestSheet(true) }}
                className="w-full text-left rounded-2xl overflow-hidden shadow-md bg-white active:scale-[0.98] transition-transform"
              >
                <div className="flex gap-0">
                  <div className="w-28 h-28 flex-shrink-0">
                    <img src={img} alt={svc.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-gray-900 text-sm">{svc.name}</p>
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-current text-amber-400" />
                          <span className="text-xs font-semibold text-gray-700">4.9</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{svc.description ?? svc.category ?? 'Premium service'}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-gray-900">
                        &euro;{Number(svc.starting_price).toLocaleString()}
                        <span className="text-[10px] font-normal text-gray-400"> /session</span>
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full uppercase">
                        Book
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {availableServices.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No services available</p>
          </div>
        )}
      </div>

      {/* Premium Bottom Sheet */}
      {showRequestSheet && selectedSvc && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRequestSheet(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] animate-slide-up max-h-[90vh] overflow-y-auto">
            {/* Service Image Header */}
            <div className="relative h-48">
              <img src={selectedImg} alt={selectedSvc.name} className="w-full h-full object-cover rounded-t-[2rem]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-t-[2rem]" />
              <div className="absolute top-4 left-0 right-0 flex justify-center">
                <div className="w-10 h-1 bg-white/50 rounded-full" />
              </div>
              <div className="absolute bottom-4 left-5 right-5">
                <h3 className="text-xl font-bold text-white">{selectedSvc.name}</h3>
                <p className="text-sm text-white/80 mt-0.5">
                  From &euro;{Number(selectedSvc.starting_price).toLocaleString()} / session
                </p>
              </div>
            </div>

            <div className="p-6 pb-10">
              <p className="text-sm text-gray-500 mb-6">
                {selectedSvc.description ?? 'Book this exclusive service for your stay. Our concierge will confirm and arrange everything for you.'}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                    Special Requests
                  </label>
                  <textarea
                    value={requestForm.details}
                    onChange={e => setRequestForm(f => ({ ...f, details: e.target.value }))}
                    className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none placeholder:text-gray-300"
                    placeholder="Any dietary preferences, allergies, or special requirements..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Date</label>
                    <input
                      type="date"
                      value={requestForm.preferred_date}
                      onChange={e => setRequestForm(f => ({ ...f, preferred_date: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Time</label>
                    <input
                      type="time"
                      value={requestForm.preferred_time}
                      onChange={e => setRequestForm(f => ({ ...f, preferred_time: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleRequest}
                disabled={saving}
                className="w-full mt-6 py-4 bg-gray-900 text-white font-bold rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-all text-sm tracking-wide"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Request This Service'
                )}
              </button>
              <p className="text-center text-[11px] text-gray-400 mt-3">
                Your concierge will confirm availability within 2 hours
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
