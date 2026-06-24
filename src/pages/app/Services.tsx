import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useServices, type Service } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { Plus, Loader2, Trash2, Pencil } from 'lucide-react'

const PAGE_SIZE = 12

const emptyForm = {
  name: '',
  description: '',
  category: 'dining',
  starting_price: 0,
  commission: 10,
  available: true,
}

export function Services() {
  const { data: services, loading, insert, update, remove } = useServices()
  const { toast } = useToast()
  const { query } = useSearch()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(0)

  useEffect(() => { setPage(0) }, [query])

  const filtered = services.filter(s => {
    if (!query) return true
    const q = query.toLowerCase()
    return s.name.toLowerCase().includes(q) || (s.category ?? '').toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (form.starting_price < 0) errs.starting_price = 'Must be positive'
    if (form.commission < 0 || form.commission > 100) errs.commission = '0-100%'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (s: Service) => {
    setEditingId(s.id)
    setForm({
      name: s.name,
      description: s.description ?? '',
      category: s.category ?? 'dining',
      starting_price: s.starting_price,
      commission: s.commission,
      available: s.available,
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
        toast('Service updated')
      } else {
        await insert(form)
        toast('Service created')
      }
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const toggleAvailability = async (id: string, available: boolean) => {
    try {
      await update(id, { available: !available })
      toast(available ? 'Service disabled' : 'Service enabled')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast('Service deleted')
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
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Service Marketplace</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Add service
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {query ? 'No services match your search.' : 'No services yet. Add your first service.'}
          </p>
          {!query && <Button size="sm" onClick={openCreate}>Add service</Button>}
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map(service => (
              <Card key={service.id} className="overflow-hidden flex flex-col">
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {service.image_url ? (
                    <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground font-mono">IMAGE</span>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold">{service.name}</h3>
                    <button onClick={() => toggleAvailability(service.id, service.available)}>
                      <Badge variant={service.available ? 'success' : 'muted'}>
                        {service.available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{service.category}</p>
                  <p className="text-xs text-muted-foreground mb-3 flex-1">{service.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <p className="text-sm font-mono font-medium">€{Number(service.starting_price).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Starting price</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-medium">{service.commission}%</p>
                      <p className="text-[10px] text-muted-foreground">Commission</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(service)}>
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setDeleteTarget({ id: service.id, name: service.name })}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-xs font-mono text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Service' : 'New Service'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input label="Name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Private Chef" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Description</label>
            <textarea
              className="w-full h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <Select
            label="Category"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            options={[
              { value: 'dining', label: 'Dining' },
              { value: 'transport', label: 'Transport' },
              { value: 'leisure', label: 'Leisure' },
              { value: 'wellness', label: 'Wellness' },
              { value: 'lifestyle', label: 'Lifestyle' },
              { value: 'security', label: 'Security' },
              { value: 'events', label: 'Events' },
              { value: 'provisions', label: 'Provisions' },
              { value: 'family', label: 'Family' },
              { value: 'housekeeping', label: 'Housekeeping' },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Starting Price (€)" type="number" min={0} value={form.starting_price} onChange={e => setForm(f => ({ ...f, starting_price: Number(e.target.value) }))} />
              {errors.starting_price && <p className="text-xs text-destructive mt-1">{errors.starting_price}</p>}
            </div>
            <div>
              <Input label="Commission (%)" type="number" min={0} max={100} value={form.commission} onChange={e => setForm(f => ({ ...f, commission: Number(e.target.value) }))} />
              {errors.commission && <p className="text-xs text-destructive mt-1">{errors.commission}</p>}
            </div>
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
        title="Delete service"
        message={`Delete "${deleteTarget?.name}"? This action cannot be undone.`}
      />
    </div>
  )
}
