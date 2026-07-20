import { useEffect, useRef, useState } from 'react'
import { useIncidents, useProperties, type Incident, type Property } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useAuth } from '@/lib/authContext'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from '@/i18n/LanguageContext'
import { uploadFile } from '@/lib/storage'
import { useCachedRows, useOnlineStatus, queueOp, getPendingIncidents, getPendingIncidentStatus, SYNC_EVENT } from '@/lib/offline'
import { Loader2, AlertTriangle, Plus, X, Camera, CloudOff, ChevronRight } from 'lucide-react'

const NEXT_INCIDENT_STATUS: Partial<Record<Incident['status'], Incident['status']>> = {
  open: 'in_progress',
  in_progress: 'resolved',
}
const NEXT_INCIDENT_LABEL_KEY: Partial<Record<Incident['status'], string>> = {
  open: 'hm.markInProgress',
  in_progress: 'hm.markResolved',
}

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
  const { data: rawIncidents, loading: lInc, error: eInc, insert, update, refetch } = useIncidents()
  const { data: rawProperties, loading: lProps, error: eProps } = useProperties()
  const { filterIncidents, filterProperties, loading: lRole } = useRoleFilter()
  const { toast } = useToast()
  const { t, language } = useTranslation()
  const online = useOnlineStatus()

  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [viewPhoto, setViewPhoto] = useState<string | null>(null)
  const [pendingRows, setPendingRows] = useState(() => getPendingIncidents())
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>(() => getPendingIncidentStatus())
  const [busyId, setBusyId] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    property_id: '',
    title: '',
    description: '',
    category: 'equipment' as Incident['category'],
    urgency: 'medium' as Incident['urgency'],
  })

  const incidentRows = useCachedRows<Incident>('incidents', rawIncidents, lInc, eInc)
  const propertyRows = useCachedRows<Property>('properties', rawProperties, lProps, eProps)

  useEffect(() => {
    const onSynced = () => {
      setPendingRows(getPendingIncidents())
      setPendingStatus(getPendingIncidentStatus())
      refetch()
    }
    window.addEventListener(SYNC_EVENT, onSynced)
    return () => window.removeEventListener(SYNC_EVENT, onSynced)
  }, [refetch])

  useEffect(() => {
    if (!photo) { setPhotoPreview(null); return }
    const url = URL.createObjectURL(photo)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const loading = lInc || lProps || lRole

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const properties = filterProperties(propertyRows.rows)
  const propertyName = (id: string) => properties.find(p => p.id === id)?.name ?? 'Property'
  const incidents = filterIncidents(incidentRows.rows)
    .map(i => (pendingStatus[i.id] ? { ...i, status: pendingStatus[i.id] as Incident['status'] } : i))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  const advance = async (incident: Incident) => {
    const next = NEXT_INCIDENT_STATUS[incident.status]
    if (!next) return
    if (!online) {
      queueOp({ kind: 'incident_update', id: incident.id, changes: { status: next } })
      setPendingStatus(getPendingIncidentStatus())
      toast(t('hm.savedOffline'))
      return
    }
    setBusyId(incident.id)
    try {
      await update(incident.id, { status: next })
      toast(t('hm.updated'))
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const resetForm = () => {
    setFormOpen(false)
    setPhoto(null)
    setForm({ property_id: '', title: '', description: '', category: 'equipment', urgency: 'medium' })
  }

  const submit = async () => {
    if (!form.property_id || !form.title.trim()) {
      toast(t('hm.requiredError'), 'error')
      return
    }
    const row = {
      property_id: form.property_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      urgency: form.urgency,
      status: 'open' as const,
      reported_by: user?.id ?? null,
    }
    if (!online) {
      // Photos cannot be uploaded offline — queue the report without one.
      queueOp({ kind: 'incident_insert', tempId: crypto.randomUUID(), row })
      setPendingRows(getPendingIncidents())
      toast(photo ? t('hm.savedOfflineNoPhoto') : t('hm.savedOffline'))
      resetForm()
      return
    }
    setSaving(true)
    try {
      let photo_url: string | null = null
      if (photo) {
        photo_url = await uploadFile(`incidents/${form.property_id}`, photo)
      }
      await insert({ ...row, photo_url })
      toast(t('hm.incidentReported'))
      resetForm()
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('hm.nav.incidents')}</h1>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-900 text-white text-xs font-semibold active:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('hm.report')}
        </button>
      </div>

      <div className="px-5 pb-8 space-y-3">
        {pendingRows.map(p => (
          <div key={p.tempId} className="p-4 rounded-2xl bg-white border border-dashed border-gray-300">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900">{String(p.row.title)}</p>
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                <CloudOff className="w-3 h-3" />
                {t('hm.pendingSync')}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {propertyName(String(p.row.property_id))} &middot; {t(`hm.categories.${String(p.row.category)}`)}
            </p>
          </div>
        ))}
        {incidents.length === 0 && pendingRows.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-2xl border border-gray-100">
            <AlertTriangle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">{t('hm.noIncidents')}</p>
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
                {propertyName(i.property_id)} &middot; {t(`hm.categories.${i.category}`)} &middot; {new Date(i.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' })}
              </p>
              {i.description && <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{i.description}</p>}
              <div className="flex items-center justify-between mt-2">
                <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${URGENCY_STYLE[i.urgency]}`}>
                  {t(`hm.urgencies.${i.urgency}`)}
                </span>
                {i.photo_url && (
                  <button onClick={() => setViewPhoto(i.photo_url)} className="flex-shrink-0">
                    <img src={i.photo_url} alt="Incident photo" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                  </button>
                )}
              </div>
              {NEXT_INCIDENT_STATUS[i.status] && (
                <button
                  onClick={() => advance(i)}
                  disabled={busyId === i.id}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-semibold active:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {busyId === i.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      {t(NEXT_INCIDENT_LABEL_KEY[i.status] ?? '')}
                      {pendingStatus[i.id] ? <CloudOff className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </>
                  )}
                </button>
              )}
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
              <h2 className="text-lg font-bold text-gray-900">{t('hm.reportIncident')}</h2>
              <button onClick={() => setFormOpen(false)} className="p-2 rounded-full bg-gray-100 active:bg-gray-200">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <label className="block text-xs font-semibold text-gray-700 mb-1">{t('hm.property')}</label>
            <select
              value={form.property_id}
              onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-3 bg-white"
            >
              <option value="">{t('hm.selectProperty')}</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <label className="block text-xs font-semibold text-gray-700 mb-1">{t('hm.titleLabel')}</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={t('hm.titlePlaceholder')}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-3"
            />

            <label className="block text-xs font-semibold text-gray-700 mb-1">{t('hm.descriptionLabel')}</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={t('hm.descriptionPlaceholder')}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-3"
            />

            <label className="block text-xs font-semibold text-gray-700 mb-1">{t('hm.photo')}</label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => setPhoto(e.target.files?.[0] ?? null)}
            />
            {photoPreview ? (
              <div className="relative mb-3">
                <img src={photoPreview} alt="Photo preview" className="w-full h-36 rounded-xl object-cover border border-gray-200" />
                <button
                  onClick={() => { setPhoto(null); if (photoInputRef.current) photoInputRef.current.value = '' }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => photoInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 mb-3 rounded-xl border border-dashed border-gray-300 text-xs font-semibold text-gray-500 active:bg-gray-50"
              >
                <Camera className="w-4 h-4" />
                {t('hm.takePhoto')}
              </button>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{t('hm.category')}</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as Incident['category'] }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{t(`hm.categories.${c}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{t('hm.urgency')}</label>
                <select
                  value={form.urgency}
                  onChange={e => setForm(f => ({ ...f, urgency: e.target.value as Incident['urgency'] }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white"
                >
                  {URGENCIES.map(u => <option key={u} value={u}>{t(`hm.urgencies.${u}`)}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={submit}
              disabled={saving}
              className="w-full flex items-center justify-center py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold active:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('hm.submitReport')}
            </button>
          </div>
        </div>
      )}

      {/* Full-size photo viewer */}
      {viewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setViewPhoto(null)}>
          <img src={viewPhoto} alt="Incident photo" className="max-w-full max-h-full rounded-2xl object-contain" />
          <button className="absolute top-5 right-5 p-2 rounded-full bg-white/20 text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}
