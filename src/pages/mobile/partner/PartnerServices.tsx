
import { useServices } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { Loader2, Plus, Star, Eye, EyeOff, Sparkles, Edit } from 'lucide-react'

export function PartnerServices() {
  const { data: services, loading, update } = useServices()
  const { toast } = useToast()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    )
  }

  const activeServices = services.filter(s => s.available)
  const inactiveServices = services.filter(s => !s.available)

  const toggleAvailability = async (id: string, current: boolean) => {
    try {
      await update(id, { available: !current })
      toast(current ? 'Service hidden' : 'Service published')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Services</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your offerings</p>
        </div>
        <button className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Active Services */}
      <div className="px-5 mt-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Active ({activeServices.length})
        </h2>
        <div className="space-y-3">
          {activeServices.map(svc => (
            <div key={svc.id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center flex-shrink-0">
                {svc.image_url ? (
                  <img src={svc.image_url} alt={svc.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Sparkles className="w-6 h-6 text-rose-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{svc.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{svc.category ?? 'Service'}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm font-bold text-gray-900">&euro;{Number(svc.starting_price).toLocaleString()}</span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-current text-amber-400" />
                    <span className="text-xs text-gray-500">4.9</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Edit className="w-3.5 h-3.5 text-gray-600" />
                </button>
                <button
                  onClick={() => toggleAvailability(svc.id, svc.available)}
                  className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"
                >
                  <Eye className="w-3.5 h-3.5 text-green-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inactive Services */}
      {inactiveServices.length > 0 && (
        <div className="px-5 mt-6 pb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Hidden ({inactiveServices.length})
          </h2>
          <div className="space-y-3">
            {inactiveServices.map(svc => (
              <div key={svc.id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 opacity-60">
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{svc.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{svc.category ?? 'Service'}</p>
                  <span className="text-sm font-bold text-gray-900">&euro;{Number(svc.starting_price).toLocaleString()}</span>
                </div>
                <button
                  onClick={() => toggleAvailability(svc.id, svc.available)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {services.length === 0 && (
        <div className="px-5 mt-12 text-center">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-1">No services yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first service to get started</p>
          <button className="px-6 py-3 bg-rose-500 text-white font-semibold rounded-xl">
            Add Service
          </button>
        </div>
      )}
    </div>
  )
}
