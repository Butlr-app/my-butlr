import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useProperties, type Property } from '@/lib/useSupabase'
import { useAuth } from '@/lib/authContext'
import { useToast } from '@/components/ui/Toast'
import { Link } from 'react-router-dom'
import { MapPin, Plus, Loader2, Trash2 } from 'lucide-react'

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
  description: '',
}

export function Properties() {
  const { data: properties, loading, insert, remove } = useProperties()
  const { user } = useAuth()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await insert({ ...form, owner_id: user?.id ?? null })
      toast('Property created')
      setShowForm(false)
      setForm(emptyForm)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await remove(id)
      toast('Property deleted')
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
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Portfolio</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add property
        </Button>
      </div>

      {properties.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">No properties yet. Add your first property to get started.</p>
          <Button size="sm" onClick={() => setShowForm(true)}>Add property</Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {properties.map(property => (
            <Card key={property.id} className="overflow-hidden">
              <div className="aspect-[16/9] bg-muted flex items-center justify-center">
                {property.image_url ? (
                  <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground font-mono">IMAGE</span>
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
                    <p className="text-sm font-mono font-medium">{property.bedrooms}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bathrooms</p>
                    <p className="text-sm font-mono font-medium">{property.bathrooms}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Max Guests</p>
                    <p className="text-sm font-mono font-medium">{property.max_guests}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link to={`/app/properties/${property.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">Open property</Button>
                  </Link>
                  <Button variant="secondary" size="sm" onClick={() => handleDelete(property.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Property">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Villa French Way" />
          <Input label="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Saint-Tropez, France" />
          <div className="grid grid-cols-2 gap-4">
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
            <Input label="Bedrooms" type="number" min={0} value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: Number(e.target.value) }))} />
            <Input label="Bathrooms" type="number" min={0} value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: Number(e.target.value) }))} />
            <Input label="Max Guests" type="number" min={0} value={form.max_guests} onChange={e => setForm(f => ({ ...f, max_guests: Number(e.target.value) }))} />
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
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
