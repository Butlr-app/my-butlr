import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useContracts, useNotifications, type Contract } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { supabase } from '@/lib/supabase'
import { Plus, Loader2, Trash2, FileText, Pencil, Download, Send, Link2, Copy, Archive } from 'lucide-react'

const PAGE_SIZE = 20

const emptyForm = {
  guest_name: '',
  property_name: '',
  type: 'rental' as Contract['type'],
  status: 'draft' as Contract['status'],
  date: '',
}

export function Contracts() {
  const { data: contracts, loading, insert, update, remove } = useContracts()
  const { insertNotification } = useNotifications()
  const { toast } = useToast()
  const { query } = useSearch()
  const [signingLink, setSigningLink] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(0)

  useEffect(() => { setPage(0) }, [query])

  const filtered = contracts.filter(c => {
    if (!query) return true
    const q = query.toLowerCase()
    return c.guest_name.toLowerCase().includes(q) || (c.property_name ?? '').toLowerCase().includes(q) || c.type.toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.guest_name.trim()) errs.guest_name = 'Guest name is required'
    if (!form.date) errs.date = 'Date is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (c: Contract) => {
    setEditingId(c.id)
    setForm({
      guest_name: c.guest_name,
      property_name: c.property_name ?? '',
      type: c.type,
      status: c.status,
      date: c.date,
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
        toast('Contract updated')
      } else {
        await insert(form)
        toast('Contract created')
      }
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const advanceStatus = async (id: string, current: string) => {
    const flow: Record<string, string> = {
      draft: 'sent',
      sent: 'signed',
      signed: 'archived',
    }
    const next = flow[current]
    if (!next) return
    try {
      await update(id, { status: next as Contract['status'] })
      toast(`Contract ${next}`)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const generateSigningLink = async (contract: Contract) => {
    try {
      let token = contract.signing_token
      if (!token) {
        token = crypto.randomUUID()
        await update(contract.id, { signing_token: token })
      }
      const link = `${window.location.origin}/sign/${token}`
      setSigningLink(link)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const sendForSignature = async (contract: Contract) => {
    try {
      let token = contract.signing_token
      if (!token) {
        token = crypto.randomUUID()
        await update(contract.id, { signing_token: token, status: 'sent' })
      } else {
        await update(contract.id, { status: 'sent' })
      }
      const { data: { user } } = await supabase.auth.getUser()
      await insertNotification({
        user_id: user?.id ?? null,
        type: 'system',
        title: `Contract sent for signature`,
        message: `Contract for ${contract.guest_name} has been sent for signature`,
        data: { contract_id: contract.id },
        related_id: null,
      })
      toast('Contract sent for signature')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const copyLink = () => {
    if (signingLink) {
      navigator.clipboard.writeText(signingLink)
      toast('Link copied to clipboard')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast('Contract deleted')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
  }

  const exportCSV = () => {
    const headers = ['Date', 'Guest', 'Property', 'Type', 'Status']
    const rows = contracts.map(c => [c.date, c.guest_name, c.property_name ?? '', c.type, c.status])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contracts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast('CSV exported')
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
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> New contract
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-5 gap-4">
        {(['draft', 'sent', 'signed', 'archived', 'expired'] as const).map(status => {
          const count = contracts.filter(c => c.status === status).length
          return (
            <Card key={status} className="p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1 capitalize">{status}</p>
              <p className="text-2xl font-mono font-medium">{count}</p>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {query ? 'No contracts match your search.' : 'No contracts yet.'}
          </p>
          {!query && <Button size="sm" onClick={openCreate}>Create contract</Button>}
        </Card>
      ) : (
        <>
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
                  {paginated.map(c => (
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
                            c.status === 'archived' ? 'muted' :
                            c.status === 'expired' ? 'muted' : 'warning'
                          }>
                            {c.status}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.status === 'draft' && (
                            <button onClick={() => sendForSignature(c)} className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Send for signature">
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {(c.status === 'draft' || c.status === 'sent') && (
                            <button onClick={() => generateSigningLink(c)} className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Get signing link">
                              <Link2 className="w-4 h-4" />
                            </button>
                          )}
                          {c.status === 'signed' && (
                            <button onClick={() => advanceStatus(c.id, c.status)} className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Archive">
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget({ id: c.id, name: c.guest_name })} className="text-muted-foreground hover:text-destructive transition-colors p-1">
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Contract' : 'New Contract'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Guest Name" required value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} />
              {errors.guest_name && <p className="text-xs text-destructive mt-1">{errors.guest_name}</p>}
            </div>
            <Input label="Property" value={form.property_name} onChange={e => setForm(f => ({ ...f, property_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as Contract['type'] }))}
              options={[
                { value: 'rental', label: 'Rental Agreement' },
                { value: 'service', label: 'Service Agreement' },
                { value: 'partnership', label: 'Partnership Contract' },
              ]}
            />
            <div>
              <Input label="Date" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
            </div>
          </div>
          {editingId && (
            <Select
              label="Status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as Contract['status'] }))}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
                { value: 'signed', label: 'Signed' },
                { value: 'archived', label: 'Archived' },
                { value: 'expired', label: 'Expired' },
              ]}
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingId ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Signing Link Modal */}
      <Modal open={!!signingLink} onClose={() => setSigningLink(null)} title="Signing Link">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Share this link with the signer. They can sign the contract without logging in.</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={signingLink ?? ''}
              className="flex-1 h-10 px-3 bg-muted border border-input rounded-sm text-sm font-mono"
            />
            <Button size="sm" onClick={copyLink}>
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setSigningLink(null)}>Close</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete contract"
        message={`Delete contract for "${deleteTarget?.name}"? This action cannot be undone.`}
      />
    </div>
  )
}
