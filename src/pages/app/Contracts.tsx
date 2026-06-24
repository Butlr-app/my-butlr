import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useContracts } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { Plus, Loader2, Trash2, FileText } from 'lucide-react'

const emptyForm = {
  guest_name: '',
  property_name: '',
  type: 'rental' as const,
  status: 'draft' as const,
  date: '',
}

export function Contracts() {
  const { data: contracts, loading, insert, update, remove } = useContracts()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await insert(form)
      toast('Contract created')
      setShowForm(false)
      setForm(emptyForm)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const advanceStatus = async (id: string, current: string) => {
    const flow: Record<string, string> = {
      draft: 'sent',
      sent: 'signed',
      signed: 'expired',
    }
    const next = flow[current]
    if (!next) return
    try {
      await update(id, { status: next })
      toast(`Contract ${next}`)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await remove(id)
      toast('Contract deleted')
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
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Contracts</p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> New contract
        </Button>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        {(['draft', 'sent', 'signed', 'expired'] as const).map(status => {
          const count = contracts.filter(c => c.status === status).length
          return (
            <Card key={status} className="p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1 capitalize">{status}</p>
              <p className="text-2xl font-mono font-medium">{count}</p>
            </Card>
          )
        })}
      </div>

      {contracts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">No contracts yet.</p>
          <Button size="sm" onClick={() => setShowForm(true)}>Create contract</Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Contract</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Guest</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/50 transition-colors h-14">
                    <td className="px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm capitalize">{c.type.replace(/_/g, ' ')}</span>
                      </div>
                    </td>
                    <td className="px-4 text-sm font-medium">{c.guest_name}</td>
                    <td className="px-4 text-sm text-muted-foreground">{c.property_name}</td>
                    <td className="px-4 text-sm font-mono">{c.date}</td>
                    <td className="px-4">
                      <button onClick={() => advanceStatus(c.id, c.status)}>
                        <Badge variant={
                          c.status === 'signed' ? 'success' :
                          c.status === 'sent' ? 'info' :
                          c.status === 'expired' ? 'muted' : 'warning'
                        }>
                          {c.status}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 text-right">
                      <button onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-destructive transition-colors">
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Contract">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Guest Name" required value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} />
            <Input label="Property" value={form.property_name} onChange={e => setForm(f => ({ ...f, property_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof form.type }))}
              options={[
                { value: 'rental', label: 'Rental Agreement' },
                { value: 'service', label: 'Service Agreement' },
                { value: 'partnership', label: 'Partnership Contract' },
              ]}
            />
            <Input label="Date" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
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
