import { useState } from 'react'
import { useCurrentPartner, usePartnerServices } from '@/lib/useSupabase'
import type { Service } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { Loader2, Star, Eye, EyeOff, Edit3, Plus, Sparkles, X, Trash2 } from 'lucide-react'
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

interface Draft {
  id: string | null
  name: string
  description: string
  category: string
  starting_price: string
  available: boolean
}

const emptyDraft = (category: string | null): Draft => ({
  id: null, name: '', description: '', category: category ?? '', starting_price: '', available: true,
})

export function PartnerServices() {
  const { partner, loading: partnerLoading } = useCurrentPartner()
  const { services, loading: servicesLoading, addService, updateService, removeService } =
    usePartnerServices(partner?.id)
  const { toast } = useToast()
  const [showHidden, setShowHidden] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  if (partnerLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!partner) {
    return <PartnerUnlinked title="Services" />
  }

  const activeServices = services.filter(s => s.available)
  const hiddenServices = services.filter(s => !s.available)
  const displayed = showHidden ? hiddenServices : activeServices

  const openNew = () => setDraft(emptyDraft(partner.category))
  const openEdit = (s: Service) => setDraft({
    id: s.id,
    name: s.name,
    description: s.description ?? '',
    category: s.category ?? '',
    starting_price: String(s.starting_price ?? ''),
    available: s.available,
  })

  const priceValue = (d: Draft) => {
    const n = Number(d.starting_price)
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  const draftValid = (d: Draft) => d.name.trim() !== '' && priceValue(d) !== null

  const save = async () => {
    if (!draft || !draftValid(draft)) return
    setSaving(true)
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        category: draft.category.trim() || null,
        starting_price: priceValue(draft) ?? 0,
        available: draft.available,
      }
      if (draft.id) {
        await updateService(draft.id, payload)
        toast('Service updated', 'success')
      } else {
        await addService(payload)
        toast('Service added', 'success')
      }
      setDraft(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailable = async (s: Service) => {
    try {
      await updateService(s.id, { available: !s.available })
      toast(s.available ? 'Service hidden' : 'Service published', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong', 'error')
    }
  }

  const del = async (s: Service) => {
    try {
      await removeService(s.id)
      toast('Service deleted', 'success')
      setDraft(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong', 'error')
    }
  }

  return (
    <div className="bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Services</h1>
            <p className="text-sm text-gray-500 mt-1">Your service catalog</p>
          </div>
          <button
            onClick={openNew}
            aria-label="Add service"
            className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 active:scale-95 transition-transform"
          >
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
              {showHidden ? 'No hidden services' : 'No active services yet'}
            </p>
            {!showHidden && (
              <button onClick={openNew} className="mt-3 text-sm font-semibold text-amber-500">
                Add your first service
              </button>
            )}
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
                      <button
                        onClick={() => toggleAvailable(svc)}
                        aria-label={svc.available ? 'Hide service' : 'Publish service'}
                        className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center active:bg-gray-700 transition-colors border border-gray-700"
                      >
                        {svc.available ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => openEdit(svc)}
                        aria-label="Edit service"
                        className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center active:bg-gray-700 transition-colors border border-gray-700"
                      >
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

      {draft && (
        <ServiceSheet
          draft={draft}
          setDraft={setDraft}
          saving={saving}
          valid={draftValid(draft)}
          onClose={() => { if (!saving) setDraft(null) }}
          onSave={save}
          onDelete={draft.id ? () => del({ id: draft.id! } as Service) : undefined}
        />
      )}
    </div>
  )
}

function ServiceSheet({
  draft, setDraft, saving, valid, onClose, onSave, onDelete,
}: {
  draft: Draft
  setDraft: (d: Draft) => void
  saving: boolean
  valid: boolean
  onClose: () => void
  onSave: () => void
  onDelete?: () => void
}) {
  const field = 'w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-amber-500/50'
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-900 border-t border-gray-800 rounded-t-3xl p-5 pb-8 animate-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{draft.id ? 'Edit service' : 'New service'}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Name</label>
            <input
              value={draft.name}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Sunset Yacht Cruise"
              className={`mt-1.5 ${field}`}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category</label>
            <input
              value={draft.category}
              onChange={e => setDraft({ ...draft, category: e.target.value })}
              placeholder="e.g. Wellness"
              className={`mt-1.5 ${field}`}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Starting price (EUR)</label>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={draft.starting_price}
              onChange={e => setDraft({ ...draft, starting_price: e.target.value })}
              placeholder="0"
              className={`mt-1.5 ${field}`}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Description</label>
            <textarea
              value={draft.description}
              onChange={e => setDraft({ ...draft, description: e.target.value })}
              placeholder="Describe what guests get"
              rows={3}
              className={`mt-1.5 ${field} resize-none`}
            />
          </div>
          <button
            onClick={() => setDraft({ ...draft, available: !draft.available })}
            className="w-full flex items-center justify-between bg-gray-950 border border-gray-800 rounded-xl px-3 py-3"
          >
            <span className="text-sm text-white">Published (visible to guests)</span>
            <span className={`w-11 h-6 rounded-full flex items-center transition-colors ${draft.available ? 'bg-amber-500 justify-end' : 'bg-gray-700 justify-start'} px-0.5`}>
              <span className="w-5 h-5 rounded-full bg-white" />
            </span>
          </button>
        </div>

        <div className="mt-6 space-y-2.5">
          <button
            onClick={onSave}
            disabled={saving || !valid}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-500 text-white font-semibold active:scale-[0.99] transition-transform disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {draft.id ? 'Save changes' : 'Add service'}
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-800 text-red-400 font-semibold active:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete service
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
