import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useState, useEffect } from 'react'
import { useProfile, useProperties, useServices, usePayments, type Property, type Service } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useRole } from '@/lib/roleContext'
import { useRolePermissions, CONFIGURABLE_PAGES, type RolePermissions } from '@/lib/useSupabase'

const BASE_TABS = ['Account', 'Team', 'Properties', 'Payments', 'Services']

export function Settings() {
  const [activeTab, setActiveTab] = useState('Account')
  const { profile, loading, updateProfile } = useProfile()
  const { toast } = useToast()
  const { role } = useRole()

  const settingsTabs = role === 'owner' ? [...BASE_TABS, 'Permissions'] : BASE_TABS

  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold tracking-tight text-muted-foreground">Settings</p>

      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {settingsTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Account' && <AccountTab profile={profile} loading={loading} updateProfile={updateProfile} toast={toast} />}
      {activeTab === 'Team' && <TeamTab profile={profile} toast={toast} />}
      {activeTab === 'Properties' && <PropertiesTab toast={toast} />}
      {activeTab === 'Payments' && <PaymentsTab />}
      {activeTab === 'Services' && <ServicesTab toast={toast} />}
      {activeTab === 'Permissions' && <PermissionsTab toast={toast} />}
    </div>
  )
}

/* ─── Account Tab ────────────────────────────────────────────────────────── */

function AccountTab({ profile, loading, updateProfile, toast }: {
  profile: ReturnType<typeof useProfile>['profile']
  loading: boolean
  updateProfile: ReturnType<typeof useProfile>['updateProfile']
  toast: (msg: string, variant?: 'success' | 'error' | 'warning' | 'info') => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', company: '' })
  const [pwForm, setPwForm] = useState({ current: '', password: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        company: profile.company ?? '',
      })
    }
  }, [profile])

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast('Name is required', 'error'); return }
    setSaving(true)
    try {
      await updateProfile(form)
      toast('Profile updated')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const handlePasswordChange = async () => {
    if (pwForm.password.length < 6) { toast('Password must be at least 6 characters', 'error'); return }
    if (pwForm.password !== pwForm.confirm) { toast('Passwords do not match', 'error'); return }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.password })
    setPwLoading(false)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Password updated')
      setPwForm({ current: '', password: '', confirm: '' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Card className="p-6">
        <h3 className="text-base font-semibold mb-6">Profile</h3>
        <div className="space-y-4">
          <ImageUpload
            variant="avatar"
            storagePath="avatars"
            currentUrl={profile?.avatar_url}
            onUploaded={async (url) => {
              try {
                await updateProfile({ avatar_url: url })
                toast('Avatar updated')
              } catch (err) {
                toast((err as Error).message, 'error')
              }
            }}
          />
          <Input label="Full name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Save changes
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-base font-semibold mb-6">Change Password</h3>
        <div className="space-y-4">
          <Input label="New password" type="password" value={pwForm.password} onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 characters" />
          <Input label="Confirm password" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Repeat password" />
          <Button size="sm" onClick={handlePasswordChange} disabled={pwLoading}>
            {pwLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Update password
          </Button>
        </div>
      </Card>
    </div>
  )
}

/* ─── Team Tab ───────────────────────────────────────────────────────────── */

interface TeamMember {
  id: string
  full_name: string | null
  email: string | null
  role: string
}

function TeamTab({ profile, toast }: {
  profile: ReturnType<typeof useProfile>['profile']
  toast: (msg: string, variant?: 'success' | 'error' | 'warning' | 'info') => void
}) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editMember, setEditMember] = useState<TeamMember | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'concierge' })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('profiles').select('id, full_name, email, role')
      setMembers((data ?? []) as TeamMember[])
      setLoading(false)
    }
    load()
  }, [])

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) { toast('Email is required', 'error'); return }
    const { error } = await supabase.auth.admin.inviteUserByEmail(inviteForm.email)
    if (error) {
      toast('Invitation sent (or user already exists)', 'info')
    } else {
      toast('Invitation sent')
    }
    setInviteOpen(false)
    setInviteForm({ email: '', role: 'concierge' })
  }

  const handleRoleChange = async () => {
    if (!editMember) return
    const { error } = await supabase.from('profiles').update({ role: editMember.role }).eq('id', editMember.id)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Role updated')
      setMembers(prev => prev.map(m => m.id === editMember.id ? { ...m, role: editMember.role } : m))
    }
    setEditMember(null)
  }

  const handleRemove = async () => {
    if (!deleteTarget) return
    const { error } = await supabase.from('profiles').delete().eq('id', deleteTarget.id)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Member removed')
      setMembers(prev => prev.filter(m => m.id !== deleteTarget.id))
    }
    setDeleteTarget(null)
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold">Team Members</h3>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Invite member
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{member.full_name ?? 'Unnamed'}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{member.role}</span>
                  {member.id !== profile?.id && (
                    <>
                      <button onClick={() => setEditMember({ ...member })} className="p-1 rounded hover:bg-muted">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteTarget(member)} className="p-1 rounded hover:bg-muted">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No team members yet</p>
            )}
          </div>
        )}
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Team Member">
        <div className="space-y-4">
          <Input label="Email address" type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} required />
          <Select
            label="Role"
            value={inviteForm.role}
            onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
            options={[
              { value: 'owner', label: 'Owner' },
              { value: 'house_manager', label: 'House Manager' },
              { value: 'concierge', label: 'Concierge' },
              { value: 'agency', label: 'Agency' },
              { value: 'partner', label: 'Partner' },
            ]}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleInvite}>Send invite</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editMember} onClose={() => setEditMember(null)} title="Change Role">
        {editMember && (
          <div className="space-y-4">
            <p className="text-sm">{editMember.full_name ?? editMember.email}</p>
            <Select
              label="Role"
              value={editMember.role}
              onChange={e => setEditMember(m => m ? { ...m, role: e.target.value } : null)}
              options={[
                { value: 'owner', label: 'Owner' },
                { value: 'house_manager', label: 'House Manager' },
                { value: 'concierge', label: 'Concierge' },
                { value: 'agency', label: 'Agency' },
                { value: 'partner', label: 'Partner' },
              ]}
            />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setEditMember(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleRoleChange}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleRemove}
        title="Remove team member"
        message={`Remove ${deleteTarget?.full_name ?? deleteTarget?.email}? This action cannot be undone.`}
      />
    </>
  )
}

/* ─── Properties Tab ─────────────────────────────────────────────────────── */

function PropertiesTab({ toast }: { toast: (msg: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const { data: properties, loading, insert, update, remove } = useProperties()
  const [editProp, setEditProp] = useState<Property | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null)
  const [form, setForm] = useState({ name: '', location: '', type: 'villa', status: 'active', bedrooms: '0', bathrooms: '0', max_guests: '0', surface_m2: '0', units: '1', description: '' })

  const resetForm = () => setForm({ name: '', location: '', type: 'villa', status: 'active', bedrooms: '0', bathrooms: '0', max_guests: '0', surface_m2: '0', units: '1', description: '' })

  const openEdit = (p: Property) => {
    setForm({
      name: p.name,
      location: p.location ?? '',
      type: p.type,
      status: p.status,
      bedrooms: p.bedrooms.toString(),
      bathrooms: p.bathrooms.toString(),
      max_guests: p.max_guests.toString(),
      surface_m2: p.surface_m2.toString(),
      units: p.units.toString(),
      description: p.description ?? '',
    })
    setEditProp(p)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast('Name is required', 'error'); return }
    const payload = {
      name: form.name,
      location: form.location || null,
      type: form.type as Property['type'],
      status: form.status as Property['status'],
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      max_guests: Number(form.max_guests),
      surface_m2: Number(form.surface_m2),
      units: Number(form.units),
      description: form.description || null,
    }
    try {
      if (editProp) {
        await update(editProp.id, payload)
        toast('Property updated')
      } else {
        await insert(payload)
        toast('Property created')
      }
      setEditProp(null)
      setAddOpen(false)
      resetForm()
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast('Property deleted')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
  }

  const isOpen = addOpen || !!editProp

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold">Properties</h3>
          <Button size="sm" onClick={() => { resetForm(); setAddOpen(true) }}>
            <Plus className="w-4 h-4 mr-1" /> Add property
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-20"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            {properties.map(p => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.location} &middot; {p.type} &middot; {p.bedrooms} bed &middot; {p.max_guests} guests</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium uppercase tracking-wide ${p.status === 'active' ? 'text-success' : 'text-muted-foreground'}`}>{p.status}</span>
                  <button onClick={() => openEdit(p)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => setDeleteTarget(p)} className="p-1 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                </div>
              </div>
            ))}
            {properties.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No properties</p>}
          </div>
        )}
      </Card>

      <Modal open={isOpen} onClose={() => { setEditProp(null); setAddOpen(false); resetForm() }} title={editProp ? 'Edit Property' : 'Add Property'}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={[
              { value: 'villa', label: 'Villa' }, { value: 'yacht', label: 'Yacht' }, { value: 'apartment', label: 'Apartment' }, { value: 'chalet', label: 'Chalet' },
            ]} />
            <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} options={[
              { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'maintenance', label: 'Maintenance' },
            ]} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Bedrooms" type="number" min="0" value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))} />
            <Input label="Bathrooms" type="number" min="0" value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))} />
            <Input label="Max guests" type="number" min="0" value={form.max_guests} onChange={e => setForm(f => ({ ...f, max_guests: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Surface (m2)" type="number" min="0" value={form.surface_m2} onChange={e => setForm(f => ({ ...f, surface_m2: e.target.value }))} />
            <Input label="Units" type="number" min="1" value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setEditProp(null); setAddOpen(false); resetForm() }}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave}>{editProp ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete property" message={`Delete "${deleteTarget?.name}"? This cannot be undone.`} />
    </>
  )
}

/* ─── Payments Tab ───────────────────────────────────────────────────────── */

function PaymentsTab() {
  const { data: payments, loading } = usePayments()

  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold mb-6">Billing & Payments</h3>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-lg font-bold">{totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
        </div>
        <div className="p-4 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground mb-1">Pending</p>
          <p className="text-lg font-bold">{pendingAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
        </div>
        <div className="p-4 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground mb-1">Transactions</p>
          <p className="text-lg font-bold">{payments.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-20"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Guest</th>
                <th className="py-2 pr-4">Property</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 20).map(p => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2.5 pr-4 text-muted-foreground">{p.date}</td>
                  <td className="py-2.5 pr-4">{p.guest_name}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{p.property_name ?? '-'}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-xs uppercase">{p.type}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{Number(p.amount).toLocaleString('fr-FR')} EUR</td>
                  <td className="py-2.5">
                    <span className={`text-xs tabular-nums uppercase ${p.status === 'paid' ? 'text-success' : p.status === 'pending' ? 'text-warning' : 'text-destructive'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No payments yet</p>}
        </div>
      )}
    </Card>
  )
}

/* ─── Services Tab ───────────────────────────────────────────────────────── */

function ServicesTab({ toast }: { toast: (msg: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const { data: services, loading, insert, update, remove } = useServices()
  const [editSvc, setEditSvc] = useState<Service | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)
  const [form, setForm] = useState({ name: '', description: '', category: '', starting_price: '0', commission: '0', available: 'true' })

  const resetForm = () => setForm({ name: '', description: '', category: '', starting_price: '0', commission: '0', available: 'true' })

  const openEdit = (s: Service) => {
    setForm({
      name: s.name,
      description: s.description ?? '',
      category: s.category ?? '',
      starting_price: s.starting_price.toString(),
      commission: s.commission.toString(),
      available: s.available ? 'true' : 'false',
    })
    setEditSvc(s)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast('Name is required', 'error'); return }
    const payload = {
      name: form.name,
      description: form.description || null,
      category: form.category || null,
      starting_price: Number(form.starting_price),
      commission: Number(form.commission),
      available: form.available === 'true',
    }
    try {
      if (editSvc) {
        await update(editSvc.id, payload)
        toast('Service updated')
      } else {
        await insert(payload)
        toast('Service created')
      }
      setEditSvc(null)
      setAddOpen(false)
      resetForm()
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast('Service deleted')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
  }

  const isOpen = addOpen || !!editSvc

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold">Service Catalog</h3>
          <Button size="sm" onClick={() => { resetForm(); setAddOpen(true) }}>
            <Plus className="w-4 h-4 mr-1" /> Add service
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-20"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            {services.map(s => (
              <div key={s.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.category} &middot; From {s.starting_price} EUR &middot; {s.commission}% commission</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium uppercase tracking-wide ${s.available ? 'text-success' : 'text-muted-foreground'}`}>
                    {s.available ? 'Available' : 'Unavailable'}
                  </span>
                  <button onClick={() => openEdit(s)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => setDeleteTarget(s)} className="p-1 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                </div>
              </div>
            ))}
            {services.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No services</p>}
          </div>
        )}
      </Card>

      <Modal open={isOpen} onClose={() => { setEditSvc(null); setAddOpen(false); resetForm() }} title={editSvc ? 'Edit Service' : 'Add Service'}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20 resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Starting price (EUR)" type="number" min="0" value={form.starting_price} onChange={e => setForm(f => ({ ...f, starting_price: e.target.value }))} />
            <Input label="Commission (%)" type="number" min="0" max="100" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} />
            <Select label="Available" value={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.value }))} options={[
              { value: 'true', label: 'Yes' }, { value: 'false', label: 'No' },
            ]} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setEditSvc(null); setAddOpen(false); resetForm() }}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave}>{editSvc ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete service" message={`Delete "${deleteTarget?.name}"? This cannot be undone.`} />
    </>
  )
}

/* ─── Permissions Tab ────────────────────────────────────────────────────── */

const PAGE_LABELS: Record<string, string> = {
  payments: 'Payments',
  partners: 'Partners',
  contracts: 'Contracts',
  invoices: 'Invoices',
  apa: 'APA',
  reports: 'Reports',
  notifications: 'Notifications',
}

function PermissionsTab({ toast }: { toast: (msg: string, variant?: 'success' | 'error' | 'warning' | 'info') => void }) {
  const { permissions, loading, saving, savePermissions, DEFAULT_PERMISSIONS } = useRolePermissions()
  const [local, setLocal] = useState<RolePermissions>(permissions)

  useEffect(() => { setLocal(permissions) }, [permissions])

  const toggle = (role: string, page: string, field: 'view' | 'edit') => {
    setLocal(prev => {
      const updated = JSON.parse(JSON.stringify(prev)) as RolePermissions
      if (!updated[role]) updated[role] = {}
      if (!updated[role][page]) updated[role][page] = { view: false, edit: false }
      updated[role][page][field] = !updated[role][page][field]
      if (field === 'view' && !updated[role][page].view) {
        updated[role][page].edit = false
      }
      if (field === 'edit' && updated[role][page].edit) {
        updated[role][page].view = true
      }
      return updated
    })
  }

  const handleSave = async () => {
    const err = await savePermissions(local)
    if (err) {
      toast(err.message, 'error')
    } else {
      toast('Permissions saved')
    }
  }

  const handleReset = () => {
    setLocal(DEFAULT_PERMISSIONS)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const roles = ['house_manager', 'concierge'] as const
  const roleLabels: Record<string, string> = { house_manager: 'House Manager', concierge: 'Concierge' }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-base font-semibold mb-2">Role Permissions</h3>
        <p className="text-sm text-muted-foreground mb-6">Configure which pages each role can view and edit.</p>

        {roles.map(role => (
          <div key={role} className="mb-8 last:mb-0">
            <h4 className="text-sm font-semibold mb-3 text-foreground">{roleLabels[role]}</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Page</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Can View</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Can Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {CONFIGURABLE_PAGES.map(page => {
                    const perm = local[role]?.[page] ?? { view: false, edit: false }
                    return (
                      <tr key={page} className="border-b border-border/50">
                        <td className="py-2.5 pr-4 font-medium">{PAGE_LABELS[page]}</td>
                        <td className="text-center py-2.5 px-4">
                          <input
                            type="checkbox"
                            checked={perm.view}
                            onChange={() => toggle(role, page, 'view')}
                            className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                          />
                        </td>
                        <td className="text-center py-2.5 px-4">
                          <input
                            type="checkbox"
                            checked={perm.edit}
                            onChange={() => toggle(role, page, 'edit')}
                            disabled={!perm.view}
                            className="w-4 h-4 rounded border-border accent-primary cursor-pointer disabled:opacity-30"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : 'Save Permissions'}
          </Button>
          <Button variant="secondary" onClick={handleReset}>Reset to Defaults</Button>
        </div>
      </Card>
    </div>
  )
}
