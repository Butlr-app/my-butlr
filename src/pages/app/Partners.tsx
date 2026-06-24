import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { usePartners } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { Star, Plus, Loader2, Trash2 } from 'lucide-react'

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
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await insert({ ...form, status: 'active', rating: 0, bookings_count: 0 })
      toast('Partner added')
      setShowForm(false)
      setForm(emptyForm)
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

  const handleDelete = async (id: string) => {
    try {
      await remove(id)
      toast('Partner removed')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
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
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add partner
        </Button>
      </div>

      {partners.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">No partners yet.</p>
          <Button size="sm" onClick={() => setShowForm(true)}>Add partner</Button>
        </Card>
      ) : (
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
                {partners.map(p => (
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
                      <button onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Partner">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Chef Martin" />
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
            <Input label="Commission (%)" type="number" min={0} max={100} value={form.commission} onChange={e => setForm(f => ({ ...f, commission: Number(e.target.value) }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <Input label="Contact Name" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Add Partner
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
