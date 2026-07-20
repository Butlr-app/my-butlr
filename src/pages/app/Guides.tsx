import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useGuides, useProperties, type Guide } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { useTranslation } from '@/i18n/LanguageContext'
import {
  Plus, Loader2, Trash2, Pencil, BookOpen, Thermometer, Tv, Shield,
  UtensilsCrossed, Waves, Snowflake, Wifi, TreePine, KeyRound, SprayCan, Cog, Eye, EyeOff
} from 'lucide-react'

const PAGE_SIZE = 12

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'spa', label: 'Spa & Wellness' },
  { value: 'home_automation', label: 'Home Automation' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'security', label: 'Security' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'pool', label: 'Pool' },
  { value: 'heating_cooling', label: 'Heating & Cooling' },
  { value: 'wifi_tech', label: 'Wi-Fi & Tech' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'keys_access', label: 'Keys & Access' },
  { value: 'cleaning', label: 'Cleaning' },
]

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  general: BookOpen,
  spa: Thermometer,
  home_automation: Cog,
  entertainment: Tv,
  security: Shield,
  kitchen: UtensilsCrossed,
  pool: Waves,
  heating_cooling: Snowflake,
  wifi_tech: Wifi,
  outdoor: TreePine,
  keys_access: KeyRound,
  cleaning: SprayCan,
}

const emptyForm = {
  title: '',
  category: 'general' as Guide['category'],
  content: '',
  property_id: '' as string | null,
  published: true,
}

export function Guides() {
  const { data: guides, loading, insert, update, remove } = useGuides()
  const { data: properties } = useProperties()
  const { toast } = useToast()
  const { query } = useSearch()
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(0)
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => { setPage(0) }, [query, filterCategory])

  const filtered = guides.filter(g => {
    if (filterCategory !== 'all' && g.category !== filterCategory) return false
    if (!query) return true
    const q = query.toLowerCase()
    return g.title.toLowerCase().includes(q) || (g.content ?? '').toLowerCase().includes(q) || g.category.toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = t('guides.errors.titleRequired')
    if (!form.content.trim()) errs.content = t('guides.errors.contentRequired')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (g: Guide) => {
    setEditingId(g.id)
    setForm({
      title: g.title,
      category: g.category,
      content: g.content ?? '',
      property_id: g.property_id,
      published: g.published,
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
      }
      if (editingId) {
        await update(editingId, payload)
        toast(t('guides.updated'))
      } else {
        await insert(payload)
        toast(t('guides.created'))
      }
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const togglePublished = async (id: string, published: boolean) => {
    try {
      await update(id, { published: !published })
      toast(published ? t('guides.unpublished') : t('guides.publishedToast'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast(t('guides.deleted'))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-tight text-muted-foreground">{t('guides.title')}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t('guides.subtitle')}</p>
        </div>
        <Button variant="gold" size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> {t('guides.addGuide')}
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCategory === 'all' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          {t('guides.allCategories')}
        </button>
        {CATEGORY_OPTIONS.map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCategory === cat.value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {query ? t('guides.noMatch') : t('guides.empty')}
          </p>
          {!query && <Button variant="gold" size="sm" onClick={openCreate}>{t('guides.addGuide')}</Button>}
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map(guide => {
              const Icon = CATEGORY_ICONS[guide.category] || BookOpen
              const property = properties.find(p => p.id === guide.property_id)
              return (
                <Card key={guide.id} className="overflow-hidden flex flex-col">
                  <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center relative">
                    <Icon className="w-10 h-10 text-primary/60" />
                    <div className="absolute top-2 right-2">
                      <button onClick={() => togglePublished(guide.id, guide.published)}>
                        <Badge variant={guide.published ? 'success' : 'muted'}>
                          {guide.published ? <><Eye className="w-3 h-3 mr-1" />{t('guides.published')}</> : <><EyeOff className="w-3 h-3 mr-1" />{t('guides.draft')}</>}
                        </Badge>
                      </button>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold mb-1">{guide.title}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="info">{CATEGORY_OPTIONS.find(c => c.value === guide.category)?.label ?? guide.category}</Badge>
                      {property && <span className="text-[10px] text-muted-foreground truncate">{property.name}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 flex-1 line-clamp-3">{guide.content}</p>
                    <div className="flex gap-2 mt-auto pt-3 border-t border-border">
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(guide)}>
                        <Pencil className="w-3 h-3 mr-1" /> {t('guides.edit')}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setDeleteTarget({ id: guide.id, name: guide.title })}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-xs tabular-nums text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? t('guides.editGuide') : t('guides.newGuide')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input label={t('guides.form.title')} required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t('guides.form.titlePlaceholder')} />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </div>
          <Select
            label={t('guides.form.category')}
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value as Guide['category'] }))}
            options={CATEGORY_OPTIONS}
          />
          <Select
            label={t('guides.form.property')}
            value={form.property_id ?? ''}
            onChange={e => setForm(f => ({ ...f, property_id: e.target.value || null }))}
            options={[
              { value: '', label: t('guides.form.allProperties') },
              ...properties.map(p => ({ value: p.id, label: p.name }))
            ]}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">{t('guides.form.content')}</label>
            <textarea
              className="w-full h-40 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info resize-y"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder={t('guides.form.contentPlaceholder')}
            />
            {errors.content && <p className="text-xs text-destructive mt-1">{errors.content}</p>}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
              className="w-4 h-4 rounded border-input"
            />
            <span className="text-sm">{t('guides.form.publishImmediately')}</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>{t('guides.form.cancel')}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingId ? t('guides.form.save') : t('guides.form.create')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('guides.deleteTitle')}
        message={`${t('guides.deleteMessage')} "${deleteTarget?.name}"`}
      />
    </div>
  )
}
