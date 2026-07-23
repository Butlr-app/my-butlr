import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ExportButton } from '@/components/ExportButton'
import { CsvImportModal } from '@/components/CsvImportModal'
import { FilterSidebar } from '@/components/FilterSidebar'
import { useProperties, type Property } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { usePermissions } from '@/lib/permissionsContext'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { Link } from 'react-router-dom'
import { MapPin, Plus, Loader2, Trash2, Pencil, Filter, Upload } from 'lucide-react'
import { useRoleFilter } from '@/lib/useRoleFilter'

const PAGE_SIZE = 9

const statusMap = {
  active: { variant: 'success' as const, label: 'Active' },
  inactive: { variant: 'muted' as const, label: 'Inactive' },
  maintenance: { variant: 'warning' as const, label: 'Maintenance' },
}

const emptyForm = {
  name: '',
  location: '',
  type: 'villa' as Property['type'],
  status: 'active' as Property['status'],
  bedrooms: 0,
  bathrooms: 0,
  max_guests: 0,
  surface_m2: 0,
  units: 1,
  description: '',
}

export function Properties() {
  const { data: rawProperties, loading, insert, update, remove } = useProperties()
  const { user } = useAuth()
  const { can } = usePermissions()
  const { toast } = useToast()
  const { query, filters } = useSearch()
  const { filterProperties } = useRoleFilter()
  const properties = filterProperties(rawProperties)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(0)
  const [showImport, setShowImport] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const { t } = useTranslation()

  useEffect(() => { setPage(0) }, [query])

  const filtered = properties.filter(p => {
    if (query) {
      const q = query.toLowerCase()
      if (!(p.name.toLowerCase().includes(q) || (p.location ?? '').toLowerCase().includes(q) || p.type.toLowerCase().includes(q))) return false
    }
    if (filters.propertyType && filters.propertyType.length > 0 && !filters.propertyType.includes(p.type)) return false
    if (filters.propertyLocation && !(p.location ?? '').toLowerCase().includes(filters.propertyLocation.toLowerCase())) return false
    if (filters.propertyBedrooms !== undefined && p.bedrooms < filters.propertyBedrooms) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (form.bedrooms < 0) errs.bedrooms = 'Must be positive'
    if (form.bathrooms < 0) errs.bathrooms = 'Must be positive'
    if (form.max_guests < 0) errs.max_guests = 'Must be positive'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (p: Property) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      location: p.location ?? '',
      type: p.type,
      status: p.status,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      max_guests: p.max_guests,
      surface_m2: p.surface_m2 ?? 0,
      units: p.units ?? 1,
      description: p.description ?? '',
    })
    setErrors({})
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      if (editingId) {
        await update(editingId, form)
        toast('Property updated')
      } else {
        await insert({ ...form, owner_id: user?.id ?? null })
        toast('Property created')
      }
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast('Property deleted')
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

  const exportColumns: { key: keyof Property; label: string }[] = [
    { key: 'name', label: t('common.name') },
    { key: 'location', label: t('common.location') },
    { key: 'type', label: t('common.type') },
    { key: 'status', label: t('common.status') },
    { key: 'bedrooms', label: t('properties.bedrooms') },
    { key: 'bathrooms', label: t('properties.bathrooms') },
    { key: 'max_guests', label: t('properties.maxGuests') },
    { key: 'surface_m2', label: t('properties.surface') },
  ]

  const importFields = [
    { key: 'name', label: t('common.name'), required: true },
    { key: 'location', label: t('common.location') },
    { key: 'type', label: t('common.type') },
    { key: 'status', label: t('common.status') },
    { key: 'bedrooms', label: t('properties.bedrooms') },
    { key: 'bathrooms', label: t('properties.bathrooms') },
    { key: 'max_guests', label: t('properties.maxGuests') },
    { key: 'surface_m2', label: t('properties.surface') },
    { key: 'description', label: t('common.description') },
  ]

  return (
    <div className="flex">
    <div className="flex-1 min-w-0 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-tight text-muted-foreground">{t('properties.title')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-1" /> {t('common.filter')}
          </Button>
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={exportColumns as { key: string; label: string }[]} filename={`properties-${new Date().toISOString().split('T')[0]}`} />
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-1" /> {t('common.import')}
          </Button>
          {can('properties_create') && (
            <Button variant="gold" size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> {t('properties.addProperty')}
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {query ? 'No properties match your search.' : 'No properties yet. Add your first property to get started.'}
          </p>
          {!query && can('properties_create') && <Button variant="gold" size="sm" onClick={openCreate}>Add property</Button>}
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map(property => (
              <Card key={property.id} className="overflow-hidden">
                <div className="aspect-[16/9] bg-muted flex items-center justify-center relative overflow-hidden">
                  {property.image_url ? (
                    <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <MapPin className="w-5 h-5 text-muted-foreground/40" />
                      <span className="text-[10px] text-muted-foreground/40 tabular-nums">No image</span>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-base font-semibold">{property.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {property.location || 'No location'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={statusMap[property.status]?.variant ?? 'muted'}>
                      {statusMap[property.status]?.label ?? property.status}
                    </Badge>
                    <Badge variant="muted">{property.type}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Bedrooms</p>
                      <p className="text-sm tabular-nums font-medium">{property.bedrooms}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bathrooms</p>
                      <p className="text-sm tabular-nums font-medium">{property.bathrooms}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Max Guests</p>
                      <p className="text-sm tabular-nums font-medium">{property.max_guests}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link to={`/app/properties/${property.id}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">Open property</Button>
                    </Link>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(property)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {can('properties_delete') && (
                      <Button variant="secondary" size="sm" onClick={() => setDeleteTarget({ id: property.id, name: property.name })}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Property' : 'New Property'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input label="Name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Villa French Way" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <Input label="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Saint-Tropez, France" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as Property['type'] }))}
              options={[
                { value: 'villa', label: 'Villa' },
                { value: 'yacht', label: 'Yacht' },
                { value: 'apartment', label: 'Apartment' },
                { value: 'chalet', label: 'Chalet' },
              ]}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as Property['status'] }))}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'maintenance', label: 'Maintenance' },
              ]}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Input label="Bedrooms" type="number" min={0} value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: Number(e.target.value) }))} />
              {errors.bedrooms && <p className="text-xs text-destructive mt-1">{errors.bedrooms}</p>}
            </div>
            <div>
              <Input label="Bathrooms" type="number" min={0} value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: Number(e.target.value) }))} />
              {errors.bathrooms && <p className="text-xs text-destructive mt-1">{errors.bathrooms}</p>}
            </div>
            <div>
              <Input label="Max Guests" type="number" min={0} value={form.max_guests} onChange={e => setForm(f => ({ ...f, max_guests: Number(e.target.value) }))} />
              {errors.max_guests && <p className="text-xs text-destructive mt-1">{errors.max_guests}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Surface (m²)" type="number" min={0} value={form.surface_m2} onChange={e => setForm(f => ({ ...f, surface_m2: Number(e.target.value) }))} />
            <Input label="Units" type="number" min={1} value={form.units} onChange={e => setForm(f => ({ ...f, units: Number(e.target.value) }))} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Description</label>
            <textarea
              className="w-full h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the property..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingId ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete property"
        message={`Delete "${deleteTarget?.name}"? This action cannot be undone.`}
      />

      <CsvImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        targetTable="properties"
        targetFields={importFields}
      />
    </div>
    <FilterSidebar page="properties" open={showFilters} onClose={() => setShowFilters(false)} />
    </div>
  )
}
