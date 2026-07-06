import { useState } from 'react'
import { useIncidents, useProperties, type Incident } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useAuth } from '@/lib/authContext'
import { useToast } from '@/components/ui/Toast'
import { Loader2, AlertTriangle, Plus, X } from 'lucide-react'

const CATEGORIES: Incident['category'][] = ['equipment', 'plumbing', 'electrical', 'damage', 'security', 'other']
const URGENCIES: Incident['urgency'][] = ['low', 'medium', 'high', 'critical']

const URGENCY_STYLE: Record<Incident['urgency'], string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-50 text-blue-600',
  high: 'bg-amber-50 text-amber-600',
  critical: 'bg-red-50 text-red-600',
}

const STATUS_STYLE: Record<Incident['status'], string> = {
  open: 'bg-red-50 text-red-600',
  in_progress: 'bg-blue-50 text-blue-600',
  resolved: 'bg-emerald-50 text-emerald-600',
  closed: 'bg-gray-100 text-gray-500',
}

export function HmIncidents() {
  const { user } = useAuth()
  const { data: rawIncidents, loading: lInc, insert } = useIncidents()
  const { data: rawProperties, loading: lProps } = useProperties()
  const { filterIncidents, filterProperties, loading: lRole } = useRoleFilter()
  const { toast } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    property_id: '',
    title: '',
    description: '',
    category: 'equipment' as Incident['category'],
    urgency: 'medium' as Incident['urgency'],
  })

  const loading = lInc || lProps || lRole

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const properties = filterProperties(rawProperties)
  const propertyName = (id: string) => properties.find(p => p.id === id)?.name ?? 'Property'
  const incidents = filterIncidents(rawIncidents)
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  const submit = async () => {
    if (!form.property_id || !form.title.trim()) {
      toast('Property and title are required', 'error')
      return
    }
    setSaving(true)
    try {
      await insert({
        property_id: form.property_id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        urgency: form.urgency,
        status: 'open',
        reported_by: user?.id ?? null,
      })
      toast('Incident reported')
      setFormOpen(false)
      setForm({ property_id: '', title: '', description: '', category: 'equipment', urgency: 'medium' })
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Incidents</h1>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-900 text-white text-xs font-semibold active:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Report
        </button>
      </div>

      <div className="px-5 pb-8 space-y-3">
        {incidents.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-2xl border border-gray-100">
            <AlertTriangle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No incidents</p>
          </div>
        ) : (
          incidents.map(i => (
            <div key={i.id} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{i.title}</p>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_STYLE[i.status]}`}>
                  {i.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {propertyName(i.property_id)} &middot; {i.category} &middot; {new Date(i.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
              {i.description && <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{i.description}</p>}
              <span className={`inline-block mt-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${URGENCY_STYLE[i.urgency]}`}>
                {i.urgency}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Report sheet */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFormOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Report incident</h2>
              <button onClick={() => setFormOpen(false)} className="p-2 rounded-full bg-gray-100 active:bg-gray-200">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <label className="block text-xs font-semibold text-gray-700 mb-1">Property</label>
            <select
              value={form.property_id}
              onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-3 bg-white"
            >
              <option value="">Select a property</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="What happened?"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-3"
            />

            <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Details (optional)"
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-3"
            />

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as Incident['category'] }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Urgency</label>
                <select
                  value={form.urgency}
                  onChange={e => setForm(f => ({ ...f, urgency: e.target.value as Incident['urgency'] }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white"
                >
                  {URGENCIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={submit}
              disabled={saving}
              className="w-full flex items-center justify-center py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold active:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit report'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
