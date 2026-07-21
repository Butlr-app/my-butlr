import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import {
  useContracts,
  useNotifications,
  useReservations,
  useProperties,
  revokeContractSigningToken,
  type Contract,
} from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { supabase } from '@/lib/supabase'
import { sendContractEmail } from '@/lib/sendContractEmail'
import { Plus, Loader2, Trash2, FileText, Pencil, Download, Send, Link2, Copy, Archive, FilePlus, Ban } from 'lucide-react'
import { useRoleFilter } from '@/lib/useRoleFilter'

const PAGE_SIZE = 20
const TOKEN_TTL_DAYS = 14

const emptyForm = {
  guest_name: '',
  property_id: null as string | null,
  property_name: '',
  type: 'rental' as Contract['type'],
  status: 'draft' as Contract['status'],
  date: '',
}

function expiryIso(days = TOKEN_TTL_DAYS) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export function Contracts() {
  const navigate = useNavigate()
  const { data: contracts, loading, insert, update, remove, refetch } = useContracts()
  const { data: reservations } = useReservations()
  const { data: properties } = useProperties()
  const { insertNotification } = useNotifications()
  const { toast } = useToast()
  const { query } = useSearch()
  const { canEdit, filterContracts } = useRoleFilter()
  const editable = canEdit('contracts')
  const [signingLink, setSigningLink] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(0)
  const [emailTarget, setEmailTarget] = useState<Contract | null>(null)
  const [emailTo, setEmailTo] = useState('')
  const [emailSending, setEmailSending] = useState(false)

  useEffect(() => { setPage(0) }, [query])

  const filtered = filterContracts(contracts).filter(c => {
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
      property_id: c.property_id,
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

  const ensureToken = async (contract: Contract) => {
    let token = contract.signing_token
    const expires = expiryIso()
    if (!token) {
      token = crypto.randomUUID()
      await update(contract.id, { signing_token: token, signing_expires_at: expires })
    } else if (!contract.signing_expires_at || new Date(contract.signing_expires_at) < new Date()) {
      await update(contract.id, { signing_expires_at: expires })
    }
    return token
  }

  const generateSigningLink = async (contract: Contract) => {
    try {
      const token = await ensureToken(contract)
      setSigningLink(`${window.location.origin}/sign/${token}`)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const openSendEmail = (contract: Contract) => {
    const fromReservation = reservations.find(r => r.id === contract.reservation_id)
    setEmailTarget(contract)
    setEmailTo(contract.signer_email || fromReservation?.guest_email || '')
  }

  const sendForSignature = async (contract: Contract, toEmail?: string) => {
    try {
      const token = await ensureToken(contract)
      const link = `${window.location.origin}/sign/${token}`
      await update(contract.id, { status: 'sent', signer_email: toEmail || contract.signer_email })

      if (toEmail) {
        setEmailSending(true)
        try {
          const result = await sendContractEmail({
            contractId: contract.id,
            toEmail,
            guestName: contract.guest_name,
            propertyName: contract.property_name ?? undefined,
            signingLink: link,
          })
          setSigningLink(result.signing_link || link)
          toast(result.sent
            ? `Email sent to ${toEmail}`
            : `Link ready — email not configured (${result.reason || 'copy manually'})`)
          await refetch()
        } finally {
          setEmailSending(false)
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        await insertNotification({
          user_id: user?.id ?? null,
          type: 'system',
          title: 'Contract sent for signature',
          message: `Contract for ${contract.guest_name} is ready to sign. Share the signing link.`,
          data: { contract_id: contract.id, signing_link: link },
          related_id: null,
        })
        setSigningLink(link)
        toast('Contract marked as sent — copy the signing link to share')
      }
      setEmailTarget(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const revokeLink = async (contract: Contract) => {
    try {
      await revokeContractSigningToken(contract.id)
      toast('Signing link revoked')
      await refetch()
    } catch {
      try {
        await update(contract.id, { signing_token: null, signing_expires_at: null })
        toast('Signing link revoked')
      } catch (e2) {
        toast((e2 as Error).message, 'error')
      }
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

  const actionButtons = (c: Contract) => (
    <>
      {c.status === 'draft' && (
        <button onClick={() => openSendEmail(c)} className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Send for signature">
          <Send className="w-4 h-4" />
        </button>
      )}
      {(c.status === 'draft' || c.status === 'sent') && (
        <>
          <button onClick={() => generateSigningLink(c)} className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Get signing link">
            <Link2 className="w-4 h-4" />
          </button>
          {c.signing_token && (
            <button onClick={() => revokeLink(c)} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Revoke signing link">
              <Ban className="w-4 h-4" />
            </button>
          )}
        </>
      )}
      {c.status === 'signed' && (
        <button onClick={() => advanceStatus(c.id, c.status)} className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Archive">
          <Archive className="w-4 h-4" />
        </button>
      )}
      {(c.document_url || c.signed_document_url) && (
        <a
          href={c.signed_document_url || c.document_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          title="Open document"
        >
          <Download className="w-4 h-4" />
        </a>
      )}
      <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={() => setDeleteTarget({ id: c.id, name: c.guest_name })} className="text-muted-foreground hover:text-destructive transition-colors p-1">
        <Trash2 className="w-4 h-4" />
      </button>
    </>
  )

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
        <p className="text-xs font-semibold tracking-tight text-muted-foreground">Contracts</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          {editable && (
            <>
              <Button variant="secondary" size="sm" onClick={() => navigate('/app/contracts/generate')}>
                <FilePlus className="w-4 h-4 mr-1" /> Generate PDF
              </Button>
              <Button variant="gold" size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" /> New contract
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-5 gap-4">
        {(['draft', 'sent', 'signed', 'archived', 'expired'] as const).map(status => {
          const count = filterContracts(contracts).filter(c => c.status === status).length
          return (
            <Card key={status} className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 capitalize">{status}</p>
              <p className="text-2xl tabular-nums font-medium">{count}</p>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {query ? 'No contracts match your search.' : 'No contracts yet.'}
          </p>
          {!query && editable && <Button variant="gold" size="sm" onClick={openCreate}>Create contract</Button>}
        </Card>
      ) : (
        <>
          <div className="lg:hidden space-y-3">
            {paginated.map(c => (
              <Card key={c.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.guest_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.property_name}</p>
                  </div>
                  {editable ? (
                    <button onClick={() => advanceStatus(c.id, c.status)} className="shrink-0">
                      <Badge variant={
                        c.status === 'signed' ? 'success' :
                        c.status === 'sent' ? 'info' :
                        c.status === 'archived' || c.status === 'expired' ? 'muted' : 'warning'
                      }>
                        {c.status}
                      </Badge>
                    </button>
                  ) : (
                    <Badge variant={
                      c.status === 'signed' ? 'success' :
                      c.status === 'sent' ? 'info' :
                      c.status === 'archived' || c.status === 'expired' ? 'muted' : 'warning'
                    }>
                      {c.status}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="capitalize">{c.type.replace(/_/g, ' ')}</span>
                  <span className="font-mono ml-auto">{c.date}</span>
                </div>
                {editable && (
                  <div className="flex items-center justify-end gap-1 pt-1 border-t border-border">
                    {actionButtons(c)}
                  </div>
                )}
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contract</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guest</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Property</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    {editable && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>}
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
                      <td className="px-4 text-sm tabular-nums">{c.date}</td>
                      <td className="px-4">
                        {editable ? (
                          <button onClick={() => advanceStatus(c.id, c.status)}>
                            <Badge variant={
                              c.status === 'signed' ? 'success' :
                              c.status === 'sent' ? 'info' :
                              c.status === 'archived' || c.status === 'expired' ? 'muted' : 'warning'
                            }>
                              {c.status}
                            </Badge>
                          </button>
                        ) : (
                          <Badge variant={
                            c.status === 'signed' ? 'success' :
                            c.status === 'sent' ? 'info' :
                            c.status === 'archived' || c.status === 'expired' ? 'muted' : 'warning'
                          }>
                            {c.status}
                          </Badge>
                        )}
                      </td>
                      {editable && (
                        <td className="px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {actionButtons(c)}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-xs tabular-nums text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Contract' : 'New Contract'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input label="Guest Name" required value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} />
              {errors.guest_name && <p className="text-xs text-destructive mt-1">{errors.guest_name}</p>}
            </div>
            <Select
              label="Property"
              value={form.property_id ?? ''}
              onChange={e => {
                const id = e.target.value
                const prop = properties.find(p => p.id === id)
                setForm(f => ({ ...f, property_id: id || null, property_name: prop?.name ?? '' }))
              }}
              options={[{ value: '', label: '— No property —' }, ...properties.map(p => ({ value: p.id, label: p.name }))]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <Modal open={!!emailTarget} onClose={() => setEmailTarget(null)} title="Send for signature">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Email the signing link to the guest. If Resend is not configured, the link is still generated for manual sharing.
          </p>
          <Input
            label="Recipient email"
            type="email"
            value={emailTo}
            onChange={e => setEmailTo(e.target.value)}
            placeholder="guest@example.com"
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEmailTarget(null)}>Cancel</Button>
            <Button
              disabled={emailSending || !emailTo.trim()}
              onClick={() => emailTarget && sendForSignature(emailTarget, emailTo.trim())}
            >
              {emailSending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Send
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!signingLink} onClose={() => setSigningLink(null)} title="Signing Link">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this link with the signer. Links expire after {TOKEN_TTL_DAYS} days and can be revoked.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={signingLink ?? ''}
              className="flex-1 h-10 px-3 bg-muted border border-input rounded-sm text-sm tabular-nums"
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
