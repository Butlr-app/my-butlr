import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { usePartners, type Partner } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { Star, Plus, Loader2, Trash2, Pencil } from 'lucide-react'

const PAGE_SIZE = 20

const emptyForm = {
  name: '',
  category: 'Private Chef',
  location: '',
  contact: '',
  email: '',
  phone: '',
  commission: 10,
}

export function Partners() {
  const { data: partners, loading, insert, update, remove } = usePartners()
  const { toast } = useToast()
  const { query } = useSearch()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(0)

  const filtered = partners.filter(p => {
    if (!query) return true
    const q = query.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q) || (p.location ?? '').toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (form.commission < 0 || form.commission > 100) errs.commission = '0-100%'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (p: Partner) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      category: p.category ?? 'Private Chef',
      location: p.location ?? '',
      contact: p.contact ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
      commission: p.commission,
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
        toast('Partner updated')
      } else {
        await insert({ ...form, status: 'active', rating: 0, bookings_count: 0 })
        toast('Partner added')
      }
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const toggleStatus = async (id: string, current: string) => {
    try {
      await update(id, { status: current === 'active' ? 'inactive' : 'active' })
      toast('Status updated')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast('Partner removed')
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
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Partner Network</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Add partner
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {query ? 'No partners match your search.' : 'No partners yet.'}
          </p>
          {!query && <Button size="sm" onClick={openCreate}>Add partner</Button>}
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Commission</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Rating</th>
                    <th className="px-4 py-3 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Bookings</th>
                    <th className="px-4 py-3 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(p => (
                    <tr key={p.id} className="border-b border-border hover:bg-muted/50 transition-colors h-14">
                      <td className="px-4">
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.email || p.contact}</p>
                      </td>
                      <td className="px-4 text-sm text-muted-foreground">{p.category}</td>
                      <td className="px-4 text-sm text-muted-foreground">{p.location}</td>
                      <td className="px-4 text-sm font-mono">{p.commission}%</td>
                      <td className="px-4">
                        <button onClick={() => toggleStatus(p.id, p.status)}>
                          <Badge variant={p.status === 'active' ? 'success' : 'muted'}>{p.status}</Badge>
                        </button>
                      </td>
                      <td className="px-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current text-warning" />
                          <span className="text-sm font-mono">{Number(p.rating).toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-4 text-sm font-mono text-right">{p.bookings_count}</td>
                      <td className="px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
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
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-xs font-mono text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Partner' : 'New Partner'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input label="Name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Chef Martin" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <Select
            label="Category"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            options={[
              { value: 'Private Chef', label: 'Private Chef' },
              { value: 'Car Rental', label: 'Car Rental' },
              { value: 'Boat Rental', label: 'Boat Rental' },
              { value: 'Wellness', label: 'Wellness' },
              { value: 'Security', label: 'Security' },
              { value: 'Event Planning', label: 'Event Planning' },
              { value: 'Housekeeping', label: 'Housekeeping' },
              { value: 'Transport', label: 'Transport' },
              { value: 'Other', label: 'Other' },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            <div>
              <Input label="Commission (%)" type="number" min={0} max={100} value={form.commission} onChange={e => setForm(f => ({ ...f, commission: Number(e.target.value) }))} />
              {errors.commission && <p className="text-xs text-destructive mt-1">{errors.commission}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <Input label="Contact Name" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingId ? 'Save changes' : 'Add Partner'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Remove partner"
        message={`Remove "${deleteTarget?.name}"? This action cannot be undone.`}
      />
    </div>
  )
}
