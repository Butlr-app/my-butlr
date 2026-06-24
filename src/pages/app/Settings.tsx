import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/authContext'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  role: string | null
  avatar_url: string | null
}

interface Payment {
  id: string
  reservation_id: string | null
  guest_name: string | null
  property_name: string | null
  type: string | null
  amount: number | null
  status: string | null
  date: string | null
}

interface Service {
  id: string
  name: string | null
  description: string | null
  category: string | null
  starting_price: number | null
  commission: number | null
  available: boolean | null
  image_url: string | null
}

interface NotificationPrefs {
  email_bookings: boolean
  email_payments: boolean
  email_team: boolean
  push_bookings: boolean
  push_payments: boolean
  push_team: boolean
  sms_bookings: boolean
  sms_payments: boolean
}

// ─── Spinner Component ───────────────────────────────────────────────────────

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// ─── Toggle Component ────────────────────────────────────────────────────────

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-foreground' : 'bg-muted'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

// ─── Feedback Message ────────────────────────────────────────────────────────

function Feedback({ message, type }: { message: string; type: 'success' | 'error' }) {
  if (!message) return null
  return (
    <p className={`text-xs font-medium mt-2 ${type === 'success' ? 'text-green-500' : 'text-destructive'}`}>
      {message}
    </p>
  )
}

// ─── Tab Button ──────────────────────────────────────────────────────────────

const settingsTabs = ['Account', 'Team', 'Roles', 'Payments', 'Services', 'Notifications']

// ─── Main Component ──────────────────────────────────────────────────────────

export function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('Account')

  return (
    <div className="space-y-6">
      <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Settings</p>

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

      {activeTab === 'Account' && <AccountTab userId={user?.id} />}
      {activeTab === 'Team' && <TeamTab />}
      {activeTab === 'Roles' && <RolesTab />}
      {activeTab === 'Payments' && <PaymentsTab />}
      {activeTab === 'Services' && <ServicesTab />}
      {activeTab === 'Notifications' && <NotificationsTab userId={user?.id} />}
    </div>
  )
}

// ─── 1. Account Tab ──────────────────────────────────────────────────────────

function AccountTab({ userId }: { userId: string | undefined }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!userId) return
    const fetchProfile = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone, company')
        .eq('id', userId)
        .single()
      if (!error && data) {
        setFullName(data.full_name || '')
        setEmail(data.email || '')
        setPhone(data.phone || '')
        setCompany(data.company || '')
      }
      setLoading(false)
    }
    fetchProfile()
  }, [userId])

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    setFeedback(null)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, email, phone, company })
      .eq('id', userId)
    setSaving(false)
    if (error) {
      setFeedback({ message: `Error: ${error.message}`, type: 'error' })
    } else {
      setFeedback({ message: 'Profile saved successfully.', type: 'success' })
    }
  }

  if (loading) {
    return (
      <Card className="p-6 max-w-xl">
        <div className="flex items-center gap-3">
          <Spinner />
          <span className="text-sm text-muted-foreground">Loading profile…</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 max-w-xl">
      <h3 className="text-base font-semibold mb-6">Account Settings</h3>
      <div className="space-y-4">
        <Input label="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input label="Phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
        <Input label="Company" value={company} onChange={e => setCompany(e.target.value)} />
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Spinner className="mr-2" />}
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        {feedback && <Feedback message={feedback.message} type={feedback.type} />}
      </div>
    </Card>
  )
}

// ─── 2. Team Tab ────────────────────────────────────────────────────────────

const ROLES = ['Owner', 'House Manager', 'Concierge', 'Agency', 'Partner', 'Guest']

function TeamTab() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Concierge')
  const [inviteLoading, setInviteLoading] = useState(false)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, company, role, avatar_url')
      .order('full_name', { ascending: true })
    if (!error && data) setMembers(data as Profile[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleRoleChange = async (id: string, newRole: string) => {
    setFeedback(null)
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    if (error) {
      setFeedback({ message: `Error updating role: ${error.message}`, type: 'error' })
    } else {
      setFeedback({ message: 'Role updated.', type: 'success' })
      fetchMembers()
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this team member?')) return
    setFeedback(null)
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) {
      setFeedback({ message: `Error removing member: ${error.message}`, type: 'error' })
    } else {
      setFeedback({ message: 'Member removed.', type: 'success' })
      fetchMembers()
    }
  }

  const handleInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setFeedback({ message: 'Name and email are required.', type: 'error' })
      return
    }
    setInviteLoading(true)
    setFeedback(null)
    const { error } = await supabase.from('profiles').insert({
      full_name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
    })
    setInviteLoading(false)
    if (error) {
      setFeedback({ message: `Error inviting member: ${error.message}`, type: 'error' })
    } else {
      setFeedback({ message: 'Member invited successfully.', type: 'success' })
      setInviteName('')
      setInviteEmail('')
      setInviteRole('Concierge')
      setShowInvite(false)
      fetchMembers()
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Spinner />
          <span className="text-sm text-muted-foreground">Loading team…</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold">Team Members</h3>
        <Button size="sm" onClick={() => setShowInvite(!showInvite)}>
          {showInvite ? 'Cancel' : 'Invite member'}
        </Button>
      </div>

      {showInvite && (
        <div className="mb-6 p-4 border border-border rounded-lg space-y-3 bg-muted/20">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Invite New Member</p>
          <Input
            label="Full name"
            value={inviteName}
            onChange={e => setInviteName(e.target.value)}
            placeholder="Jane Smith"
          />
          <Input
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="jane@mybutlr.com"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Role</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="w-full h-10 px-3 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-foreground"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <Button size="sm" onClick={handleInvite} disabled={inviteLoading}>
            {inviteLoading && <Spinner className="mr-2" />}
            {inviteLoading ? 'Sending…' : 'Send Invite'}
          </Button>
        </div>
      )}

      {feedback && <Feedback message={feedback.message} type={feedback.type} />}

      <div className="space-y-0 divide-y divide-border">
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">No team members found.</p>
        )}
        {members.map(member => (
          <div key={member.id} className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{member.full_name || '—'}</p>
              <p className="text-xs text-muted-foreground truncate">{member.email || '—'}</p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <select
                value={member.role || ''}
                onChange={e => handleRoleChange(member.id, e.target.value)}
                className="h-8 px-2 bg-card border border-input rounded-sm text-xs focus:outline-none focus:border-foreground"
              >
                <option value="">Select role</option>
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <Button variant="destructive" size="sm" onClick={() => handleRemove(member.id)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── 3. Roles Tab ────────────────────────────────────────────────────────────

const PERMISSIONS_MATRIX = [
  { permission: 'Full system access', Owner: true, 'House Manager': false, Concierge: false, Agency: false, Partner: false, Guest: false },
  { permission: 'Manage team members', Owner: true, 'House Manager': true, Concierge: false, Agency: true, Partner: false, Guest: false },
  { permission: 'Manage properties', Owner: true, 'House Manager': true, Concierge: false, Agency: true, Partner: false, Guest: false },
  { permission: 'Manage services', Owner: true, 'House Manager': true, Concierge: true, Agency: true, Partner: false, Guest: false },
  { permission: 'View guests', Owner: true, 'House Manager': true, Concierge: true, Agency: true, Partner: true, Guest: false },
  { permission: 'Manage guests', Owner: true, 'House Manager': true, Concierge: true, Agency: true, Partner: false, Guest: false },
  { permission: 'Process payments', Owner: true, 'House Manager': true, Concierge: false, Agency: false, Partner: false, Guest: false },
  { permission: 'View payments', Owner: true, 'House Manager': true, Concierge: false, Agency: true, Partner: true, Guest: false },
  { permission: 'Multi-property access', Owner: true, 'House Manager': false, Concierge: false, Agency: true, Partner: false, Guest: false },
  { permission: 'Portal access', Owner: true, 'House Manager': true, Concierge: true, Agency: true, Partner: true, Guest: true },
  { permission: 'Analytics & reports', Owner: true, 'House Manager': true, Concierge: false, Agency: true, Partner: false, Guest: false },
  { permission: 'System settings', Owner: true, 'House Manager': false, Concierge: false, Agency: false, Partner: false, Guest: false },
]

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Owner: 'Full access to all features, settings, and data across all properties.',
  'House Manager': 'Operations management: properties, team, guests, and payments for assigned properties.',
  Concierge: 'Services and guest management: create/edit services, manage guest interactions.',
  Agency: 'Multi-property access: manage multiple properties, view payments, limited team management.',
  Partner: 'Limited access: view guests and payments for associated properties.',
  Guest: 'Portal only: view own reservations and services, no management capabilities.',
}

function RolesTab() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-base font-semibold mb-2">Roles & Permissions</h3>
        <p className="text-xs text-muted-foreground mb-6">
          Matrix showing what each role can access within the system.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Permission</th>
                <th className="text-center py-2 px-2 font-medium text-foreground">Owner</th>
                <th className="text-center py-2 px-2 font-medium text-foreground">House Mgr</th>
                <th className="text-center py-2 px-2 font-medium text-foreground">Concierge</th>
                <th className="text-center py-2 px-2 font-medium text-foreground">Agency</th>
                <th className="text-center py-2 px-2 font-medium text-foreground">Partner</th>
                <th className="text-center py-2 px-2 font-medium text-foreground">Guest</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS_MATRIX.map(row => (
                <tr key={row.permission} className="border-b border-border/50">
                  <td className="py-2.5 pr-4 text-foreground">{row.permission}</td>
                  {(['Owner', 'House Manager', 'Concierge', 'Agency', 'Partner', 'Guest'] as const).map(role => (
                    <td key={role} className="text-center py-2.5 px-2">
                      {row[role] ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-foreground" />
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-muted" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
          <Card key={role} className="p-4">
            <p className="text-sm font-semibold mb-1">{role}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── 4. Payments Tab ─────────────────────────────────────────────────────────

function PaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('payments')
        .select('id, reservation_id, guest_name, property_name, type, amount, status, date')
        .order('date', { ascending: false })
        .limit(50)
      if (error) {
        setFeedback({ message: `Error loading payments: ${error.message}`, type: 'error' })
      } else {
        setPayments(data as Payment[])
      }
      setLoading(false)
    }
    fetchPayments()
  }, [])

  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const paidCount = payments.filter(p => p.status === 'paid').length
  const pendingCount = payments.filter(p => p.status === 'pending').length

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Spinner />
          <span className="text-sm text-muted-foreground">Loading payments…</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {feedback && <Feedback message={feedback.message} type={feedback.type} />}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">Total Volume</p>
          <p className="text-2xl font-semibold mt-1">€{totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">Paid</p>
          <p className="text-2xl font-semibold mt-1 text-green-500">{paidCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">Pending</p>
          <p className="text-2xl font-semibold mt-1 text-yellow-500">{pendingCount}</p>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="p-6">
        <h3 className="text-base font-semibold mb-4">Recent Payments</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No payments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Guest</th>
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Property</th>
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-right py-2 pr-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-2.5 pr-3 text-foreground">{p.date || '—'}</td>
                    <td className="py-2.5 pr-3 text-foreground">{p.guest_name || '—'}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{p.property_name || '—'}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{p.type || '—'}</td>
                    <td className="py-2.5 pr-3 text-right font-medium text-foreground">
                      €{(p.amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${
                          p.status === 'paid'
                            ? 'bg-green-500/10 text-green-500'
                            : p.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {p.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── 5. Services Tab ─────────────────────────────────────────────────────────

function ServicesTab() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formCommission, setFormCommission] = useState('')
  const [formAvailable, setFormAvailable] = useState(true)

  const resetForm = () => {
    setFormName('')
    setFormDesc('')
    setFormCategory('')
    setFormPrice('')
    setFormCommission('')
    setFormAvailable(true)
    setEditingId(null)
    setShowForm(false)
  }

  const openEdit = (service: Service) => {
    setEditingId(service.id)
    setFormName(service.name || '')
    setFormDesc(service.description || '')
    setFormCategory(service.category || '')
    setFormPrice(service.starting_price?.toString() || '')
    setFormCommission(service.commission?.toString() || '')
    setFormAvailable(service.available ?? true)
    setShowForm(true)
  }

  const fetchServices = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('services')
      .select('id, name, description, category, starting_price, commission, available, image_url')
      .order('name', { ascending: true })
    if (error) {
      setFeedback({ message: `Error loading services: ${error.message}`, type: 'error' })
    } else {
      setServices(data as Service[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const handleSave = async () => {
    if (!formName.trim()) {
      setFeedback({ message: 'Service name is required.', type: 'error' })
      return
    }
    setFormLoading(true)
    setFeedback(null)

    const payload = {
      name: formName.trim(),
      description: formDesc.trim() || null,
      category: formCategory.trim() || null,
      starting_price: formPrice ? parseFloat(formPrice) : null,
      commission: formCommission ? parseFloat(formCommission) : null,
      available: formAvailable,
    }

    const { error } = editingId
      ? await supabase.from('services').update(payload).eq('id', editingId)
      : await supabase.from('services').insert(payload)

    setFormLoading(false)
    if (error) {
      setFeedback({ message: `Error saving service: ${error.message}`, type: 'error' })
    } else {
      setFeedback({ message: editingId ? 'Service updated.' : 'Service created.', type: 'success' })
      resetForm()
      fetchServices()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service?')) return
    setFeedback(null)
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) {
      setFeedback({ message: `Error deleting service: ${error.message}`, type: 'error' })
    } else {
      setFeedback({ message: 'Service deleted.', type: 'success' })
      fetchServices()
    }
  }

  const handleToggleAvailable = async (id: string, current: boolean | null) => {
    const { error } = await supabase.from('services').update({ available: !current }).eq('id', id)
    if (error) {
      setFeedback({ message: `Error: ${error.message}`, type: 'error' })
    } else {
      fetchServices()
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Spinner />
          <span className="text-sm text-muted-foreground">Loading services…</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold">Services</h3>
          <div className="flex gap-2">
            {showForm && <Button variant="secondary" size="sm" onClick={resetForm}>Cancel</Button>}
            {!showForm && <Button size="sm" onClick={() => setShowForm(true)}>Add Service</Button>}
          </div>
        </div>

        {feedback && <Feedback message={feedback.message} type={feedback.type} />}

        {/* Form */}
        {showForm && (
          <div className="mb-6 p-4 border border-border rounded-lg space-y-3 bg-muted/20">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {editingId ? 'Edit Service' : 'New Service'}
            </p>
            <Input label="Name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="City Tour" />
            <Input label="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Private city tour with local guide" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Category" value={formCategory} onChange={e => setFormCategory(e.target.value)} placeholder="Experiences" />
              <Input label="Starting Price (€)" type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="45.00" />
              <Input label="Commission (%)" type="number" value={formCommission} onChange={e => setFormCommission(e.target.value)} placeholder="10" />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground">Available</label>
              <button
                type="button"
                onClick={() => setFormAvailable(!formAvailable)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formAvailable ? 'bg-foreground' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formAvailable ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <Button size="sm" onClick={handleSave} disabled={formLoading}>
              {formLoading && <Spinner className="mr-2" />}
              {formLoading ? 'Saving…' : editingId ? 'Update Service' : 'Create Service'}
            </Button>
          </div>
        )}

        {/* Services List */}
        <div className="space-y-0 divide-y divide-border">
          {services.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">No services yet. Add one to get started.</p>
          )}
          {services.map(service => (
            <div key={service.id} className="py-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{service.name || '—'}</p>
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      service.available ? 'bg-green-500' : 'bg-muted'
                    }`}
                  />
                </div>
                {service.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{service.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  {service.category && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {service.category}
                    </span>
                  )}
                  {service.starting_price != null && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      €{service.starting_price.toFixed(2)}
                    </span>
                  )}
                  {service.commission != null && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {service.commission}% commission
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggleAvailable(service.id, service.available)}
                >
                  {service.available ? 'Disable' : 'Enable'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openEdit(service)}>
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(service.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── 6. Notifications Tab ────────────────────────────────────────────────────

const DEFAULT_PREFS: NotificationPrefs = {
  email_bookings: true,
  email_payments: true,
  email_team: false,
  push_bookings: true,
  push_payments: false,
  push_team: true,
  sms_bookings: false,
  sms_payments: false,
  sms_team: false,
}

const NOTIFICATION_LABELS: Record<keyof NotificationPrefs, string> = {
  email_bookings: 'Email — Booking notifications',
  email_payments: 'Email — Payment alerts',
  email_team: 'Email — Team updates',
  push_bookings: 'Push — Booking notifications',
  push_payments: 'Push — Payment alerts',
  push_team: 'Push — Team updates',
  sms_bookings: 'SMS — Booking notifications',
  sms_payments: 'SMS — Payment alerts',
  sms_team: 'SMS — Team updates',
}

function NotificationsTab({ userId }: { userId: string | undefined }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!userId) return
    const fetchPrefs = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_prefs')
        .eq('id', userId)
        .single()
      if (!error && data && data.notification_prefs) {
        setPrefs({ ...DEFAULT_PREFS, ...(data.notification_prefs as Record<string, boolean>) })
      }
      setLoading(false)
    }
    fetchPrefs()
  }, [userId])

  const handleToggle = (key: keyof NotificationPrefs, value: boolean) => {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    setFeedback(null)
    const { error } = await supabase
      .from('profiles')
      .update({ notification_prefs: prefs })
      .eq('id', userId)
    setSaving(false)
    if (error) {
      setFeedback({ message: `Error: ${error.message}`, type: 'error' })
    } else {
      setFeedback({ message: 'Notification preferences saved.', type: 'success' })
    }
  }

  if (loading) {
    return (
      <Card className="p-6 max-w-xl">
        <div className="flex items-center gap-3">
          <Spinner />
          <span className="text-sm text-muted-foreground">Loading preferences…</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 max-w-xl">
      <h3 className="text-base font-semibold mb-2">Notification Preferences</h3>
      <p className="text-xs text-muted-foreground mb-6">
        Choose how and when you want to receive notifications.
      </p>

      <div className="space-y-0">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Email</p>
        <Toggle enabled={prefs.email_bookings} onChange={v => handleToggle('email_bookings', v)} label={NOTIFICATION_LABELS.email_bookings} />
        <Toggle enabled={prefs.email_payments} onChange={v => handleToggle('email_payments', v)} label={NOTIFICATION_LABELS.email_payments} />
        <Toggle enabled={prefs.email_team} onChange={v => handleToggle('email_team', v)} label={NOTIFICATION_LABELS.email_team} />

        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mt-4 mb-2">Push</p>
        <Toggle enabled={prefs.push_bookings} onChange={v => handleToggle('push_bookings', v)} label={NOTIFICATION_LABELS.push_bookings} />
        <Toggle enabled={prefs.push_payments} onChange={v => handleToggle('push_payments', v)} label={NOTIFICATION_LABELS.push_payments} />
        <Toggle enabled={prefs.push_team} onChange={v => handleToggle('push_team', v)} label={NOTIFICATION_LABELS.push_team} />

        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mt-4 mb-2">SMS</p>
        <Toggle enabled={prefs.sms_bookings} onChange={v => handleToggle('sms_bookings', v)} label={NOTIFICATION_LABELS.sms_bookings} />
        <Toggle enabled={prefs.sms_payments} onChange={v => handleToggle('sms_payments', v)} label={NOTIFICATION_LABELS.sms_payments} />
        <Toggle enabled={prefs.sms_team} onChange={v => handleToggle('sms_team', v)} label={NOTIFICATION_LABELS.sms_team} />
      </div>

      <div className="mt-6">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Spinner className="mr-2" />}
          {saving ? 'Saving…' : 'Save Preferences'}
        </Button>
        {feedback && <Feedback message={feedback.message} type={feedback.type} />}
      </div>
    </Card>
  )
}
