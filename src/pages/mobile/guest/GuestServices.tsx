import { useState } from 'react'
import { useServices, useReservations, useServiceRequests } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { useToast } from '@/components/ui/Toast'
import { Loader2, Star, Clock, Check, X, Sparkles } from 'lucide-react'

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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
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
      toast('Request submitted! We\'ll confirm shortly.')
      setShowRequestSheet(false)
      setRequestForm({ details: '', preferred_date: '', preferred_time: '' })
      setSelectedService(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const statusIcon = (status: string) => {
    if (status === 'completed') return <Check className="w-4 h-4 text-green-500" />
    if (status === 'cancelled') return <X className="w-4 h-4 text-red-500" />
    return <Clock className="w-4 h-4 text-amber-500" />
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
        <p className="text-sm text-gray-500 mt-1">Book premium experiences</p>
      </div>

      {/* My Requests */}
      {requests.length > 0 && (
        <div className="px-5 mt-5">
          <h2 className="text-base font-bold text-gray-900 mb-3">My Requests</h2>
          <div className="space-y-2">
            {requests.slice(0, 5).map(req => (
              <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                {statusIcon(req.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{req.service_name}</p>
                  <p className="text-xs text-gray-500">
                    {req.preferred_date ?? 'Flexible'} {req.preferred_time ? `at ${req.preferred_time}` : ''}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  req.status === 'completed' ? 'bg-green-100 text-green-700' :
                  req.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  req.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Services */}
      <div className="px-5 mt-6 pb-6">
        <h2 className="text-base font-bold text-gray-900 mb-3">Available Services</h2>
        <div className="space-y-3">
          {availableServices.map(svc => (
            <button
              key={svc.id}
              onClick={() => { setSelectedService(svc.id); setShowRequestSheet(true) }}
              className="w-full text-left rounded-2xl border border-gray-100 overflow-hidden shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex gap-4 p-4">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center flex-shrink-0">
                  {svc.image_url ? (
                    <img src={svc.image_url} alt={svc.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Sparkles className="w-6 h-6 text-rose-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{svc.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{svc.description ?? svc.category ?? 'Premium service'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-gray-900">
                      From &euro;{Number(svc.starting_price).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-current text-rose-500" />
                      <span className="text-xs font-medium text-gray-600">4.9</span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {availableServices.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">No services available</h3>
            <p className="text-sm text-gray-500">Check back soon for new experiences</p>
          </div>
        )}
      </div>

      {/* Bottom Sheet */}
      {showRequestSheet && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRequestSheet(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 pb-10 animate-slide-up max-h-[80vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {services.find(s => s.id === selectedService)?.name ?? 'Service'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {services.find(s => s.id === selectedService)?.description ?? 'Book this service for your stay'}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Details or special requests</label>
                <textarea
                  value={requestForm.details}
                  onChange={e => setRequestForm(f => ({ ...f, details: e.target.value }))}
                  className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                  placeholder="Any preferences or requirements..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred date</label>
                  <input
                    type="date"
                    value={requestForm.preferred_date}
                    onChange={e => setRequestForm(f => ({ ...f, preferred_date: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
                  <input
                    type="time"
                    value={requestForm.preferred_time}
                    onChange={e => setRequestForm(f => ({ ...f, preferred_time: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleRequest}
              disabled={saving}
              className="w-full mt-6 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Request Service'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
