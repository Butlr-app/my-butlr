import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ExportButton } from '@/components/ExportButton'
import { useServiceProviders, useProperties, type ServiceProvider } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { Plus, Loader2, Trash2, Pencil, Phone, Mail, MapPin, Calendar, Heart, UserCheck, Filter } from 'lucide-react'
import { useRoleFilter } from '@/lib/useRoleFilter'

const PAGE_SIZE = 20

const CATEGORIES = [
  'Cleaning',
  'Gardening',
  'Pool Maintenance',
  'Plumbing',
  'Electrician',
  'Security',
  'Laundry',
  'Pest Control',
  'HVAC',
  'Handyman',
  'Catering',
  'Transport',
  'Other',
]

const emptyForm: {
  name: string
  category: string
  specialty: string
  phone: string
  email: string
  address: string
  visit_days: string
  notes: string
  is_favorite: boolean
  is_backup: boolean
  property_id: string
  status: 'active' | 'inactive'
} = {
  name: '',
  category: 'Cleaning',
  specialty: '',
  phone: '',
  email: '',
  address: '',
  visit_days: '',
  notes: '',
  is_favorite: false,
  is_backup: false,
  property_id: '',
  status: 'active',
}

export function ServiceProviders() {
  const { data: rawProviders, loading, insert, update, remove } = useServiceProviders()
  const { data: properties } = useProperties()
  const { toast } = useToast()
  const { query } = useSearch()
  const { t } = useTranslation()
  const { filterServiceProviders } = useRoleFilter()
  const providers = filterServiceProviders(rawProviders)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(0)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [filterBackup, setFilterBackup] = useState(false)

  useEffect(() => { setPage(0) }, [query, filterCategory, filterFavorites, filterBackup])

  const filtered = providers.filter(p => {
    if (filterCategory && p.category !== filterCategory) return false
    if (filterFavorites && !p.is_favorite) return false
    if (filterBackup && !p.is_backup) return false
    if (!query) return true
    const q = query.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      (p.category ?? '').toLowerCase().includes(q) ||
      (p.specialty ?? '').toLowerCase().includes(q) ||
      (p.phone ?? '').toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = t('serviceProviders.nameRequired')
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('serviceProviders.invalidEmail')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (p: ServiceProvider) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      category: p.category ?? 'Cleaning',
      specialty: p.specialty ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      address: p.address ?? '',
      visit_days: p.visit_days ?? '',
      notes: p.notes ?? '',
      is_favorite: p.is_favorite,
      is_backup: p.is_backup,
      property_id: p.property_id ?? '',
      status: p.status,
    })
    setErrors({})
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        property_id: form.property_id || null,
        updated_at: new Date().toISOString(),
      }
      if (editingId) {
        await update(editingId, payload)
        toast(t('serviceProviders.updated'))
      } else {
        await insert(payload)
        toast(t('serviceProviders.added'))
      }
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const toggleFavorite = async (id: string, current: boolean) => {
    try {
      await update(id, { is_favorite: !current })
      toast(!current ? t('serviceProviders.addedFavorite') : t('serviceProviders.removedFavorite'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const toggleStatus = async (id: string, current: string) => {
    try {
      await update(id, { status: current === 'active' ? 'inactive' : 'active' })
      toast(t('serviceProviders.statusUpdated'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast(t('serviceProviders.removed'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
  }

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) return null
    return properties.find(p => p.id === propertyId)?.name ?? null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const exportColumns: { key: keyof ServiceProvider; label: string }[] = [
    { key: 'name', label: t('common.name') },
    { key: 'category', label: t('serviceProviders.category') },
    { key: 'specialty', label: t('serviceProviders.specialty') },
    { key: 'phone', label: t('serviceProviders.phone') },
    { key: 'email', label: 'Email' },
    { key: 'address', label: t('serviceProviders.address') },
    { key: 'visit_days', label: t('serviceProviders.visitDays') },
    { key: 'status', label: t('common.status') },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-tight text-muted-foreground">{t('serviceProviders.title')}</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{t('serviceProviders.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={exportColumns as { key: string; label: string }[]} filename={`service-providers-${new Date().toISOString().split('T')[0]}`} />
          <Button variant="gold" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> {t('serviceProviders.addProvider')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          options={[{ value: '', label: t('common.all') }, ...CATEGORIES.map(c => ({ value: c, label: c }))]}
        />
        <button
          onClick={() => setFilterFavorites(!filterFavorites)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterFavorites ? 'bg-warning/20 text-warning' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          <Heart className={`w-3 h-3 ${filterFavorites ? 'fill-current' : ''}`} />
          {t('serviceProviders.favorites')}
        </button>
        <button
          onClick={() => setFilterBackup(!filterBackup)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterBackup ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          <UserCheck className="w-3 h-3" />
          {t('serviceProviders.backup')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {query || filterCategory || filterFavorites || filterBackup
              ? t('serviceProviders.noMatch')
              : t('serviceProviders.empty')}
          </p>
          {!query && !filterCategory && !filterFavorites && !filterBackup && (
            <Button variant="gold" size="sm" onClick={openCreate}>{t('serviceProviders.addProvider')}</Button>
          )}
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {paginated.map(p => (
              <Card key={p.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      {p.is_favorite && <Heart className="w-3 h-3 fill-current text-warning shrink-0" />}
                      {p.is_backup && <Badge variant="muted" className="text-[10px]">{t('serviceProviders.backup')}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{p.category}{p.specialty ? ` - ${p.specialty}` : ''}</p>
                  </div>
                  <button onClick={() => toggleStatus(p.id, p.status)} className="shrink-0">
                    <Badge variant={p.status === 'active' ? 'success' : 'muted'}>{p.status}</Badge>
                  </button>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {p.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{p.phone}</div>}
                  {p.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{p.email}</div>}
                  {p.address && <div className="flex items-center gap-2"><MapPin className="w-3 h-3" />{p.address}</div>}
                  {p.visit_days && <div className="flex items-center gap-2"><Calendar className="w-3 h-3" />{p.visit_days}</div>}
                  {getPropertyName(p.property_id) && <div className="text-xs italic">{getPropertyName(p.property_id)}</div>}
                </div>
                <div className="flex items-center justify-end gap-3 pt-1 border-t border-border">
                  <button onClick={() => toggleFavorite(p.id, p.is_favorite)} className={`transition-colors p-1 ${p.is_favorite ? 'text-warning' : 'text-muted-foreground hover:text-warning'}`}>
                    <Heart className={`w-4 h-4 ${p.is_favorite ? 'fill-current' : ''}`} />
                  </button>
                  <button onClick={() => openEdit(p)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget({ id: p.id, name: p.name })} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('serviceProviders.provider')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('serviceProviders.category')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('serviceProviders.contact')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('serviceProviders.visitDays')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('serviceProviders.property')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common.status')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(p => (
                    <tr key={p.id} className="border-b border-border hover:bg-muted/50 transition-colors h-14">
                      <td className="px-4">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            {p.specialty && <p className="text-xs text-muted-foreground truncate">{p.specialty}</p>}
                          </div>
                          {p.is_favorite && <Heart className="w-3 h-3 fill-current text-warning shrink-0" />}
                          {p.is_backup && <Badge variant="muted" className="text-[10px]">{t('serviceProviders.backup')}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 text-sm text-muted-foreground">{p.category}</td>
                      <td className="px-4">
                        <div className="space-y-0.5">
                          {p.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</p>}
                          {p.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</p>}
                        </div>
                      </td>
                      <td className="px-4 text-sm text-muted-foreground">{p.visit_days || '—'}</td>
                      <td className="px-4 text-sm text-muted-foreground">{getPropertyName(p.property_id) || '—'}</td>
                      <td className="px-4">
                        <button onClick={() => toggleStatus(p.id, p.status)}>
                          <Badge variant={p.status === 'active' ? 'success' : 'muted'}>{p.status}</Badge>
                        </button>
                      </td>
                      <td className="px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => toggleFavorite(p.id, p.is_favorite)} className={`transition-colors ${p.is_favorite ? 'text-warning' : 'text-muted-foreground hover:text-warning'}`}>
                            <Heart className={`w-4 h-4 ${p.is_favorite ? 'fill-current' : ''}`} />
                          </button>
                          <button onClick={() => openEdit(p)} className="text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget({ id: p.id, name: p.name })} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>{t('common.previous')}</Button>
              <span className="text-xs tabular-nums text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>{t('common.next')}</Button>
            </div>
          )}
        </>
      )}

      {/* Form modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? t('serviceProviders.editProvider') : t('serviceProviders.newProvider')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input label={t('common.name')} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jean Dupont" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('serviceProviders.category')}
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              options={CATEGORIES.map(c => ({ value: c, label: c }))}
            />
            <Input label={t('serviceProviders.specialty')} value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder={t('serviceProviders.specialtyPlaceholder')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('serviceProviders.phone')} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+33 6 12 34 56 78" />
            <div>
              <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
          </div>
          <Input label={t('serviceProviders.address')} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <Input label={t('serviceProviders.visitDays')} value={form.visit_days} onChange={e => setForm(f => ({ ...f, visit_days: e.target.value }))} placeholder={t('serviceProviders.visitDaysPlaceholder')} />
          <Select
            label={t('serviceProviders.property')}
            value={form.property_id}
            onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
            options={[{ value: '', label: t('serviceProviders.allProperties') }, ...properties.map(p => ({ value: p.id, label: p.name }))]}
          />
          <div className="space-y-2">
            <Input label={t('serviceProviders.notes')} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={t('serviceProviders.notesPlaceholder')} />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_favorite} onChange={e => setForm(f => ({ ...f, is_favorite: e.target.checked }))} className="rounded border-border" />
              <Heart className="w-4 h-4 text-warning" />
              {t('serviceProviders.markFavorite')}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_backup} onChange={e => setForm(f => ({ ...f, is_backup: e.target.checked }))} className="rounded border-border" />
              <UserCheck className="w-4 h-4 text-primary" />
              {t('serviceProviders.markBackup')}
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingId ? t('common.save') : t('serviceProviders.addProvider')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('serviceProviders.removeTitle')}
        message={`${t('serviceProviders.removeMessage')} "${deleteTarget?.name}"?`}
      />
    </div>
  )
}
