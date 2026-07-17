import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/authContext'
import { useRole } from '@/lib/roleContext'
import { usePermissions } from '@/lib/permissionsContext'
import {
  DEFAULT_HOUSE_MANAGER_PERMISSIONS,
  HOUSE_MANAGER_CONFIGURABLE_CAPABILITIES,
  capabilityDescriptions,
  capabilityLabels,
  formatMaskedAmount,
  type AppCapability,
  type PermissionMap,
} from '@/lib/permissions'
import {
  dateFormatLabels,
  dateFormats,
  type DateFormat,
} from '@/lib/dateFormat'

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

interface NotificationPrefs {
  email_bookings: boolean
  email_payments: boolean
  email_team: boolean
  push_bookings: boolean
  push_payments: boolean
  push_team: boolean
  sms_bookings: boolean
  sms_payments: boolean
  sms_team: boolean
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

const settingsTabs = [
  { id: 'Account', label: 'Compte' },
  { id: 'Team', label: 'Équipe' },
  { id: 'Roles', label: 'Rôles' },
  { id: 'Payments', label: 'Paiements' },
  { id: 'Notifications', label: 'Notifications' },
] as const

// ─── Main Component ──────────────────────────────────────────────────────────

export function Settings() {
  const { user, refreshProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') === 'Roles' ? 'Roles' : 'Account'
  })

  return (
    <div className="space-y-6">
      <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Paramètres</p>

      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {settingsTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Account' && (
        <AccountTab userId={user?.id} refreshProfile={refreshProfile} />
      )}
      {activeTab === 'Team' && <TeamTab />}
      {activeTab === 'Roles' && <RolesTab />}
      {activeTab === 'Payments' && <PaymentsTab />}
      {activeTab === 'Notifications' && <NotificationsTab userId={user?.id} />}

      <Card className="flex flex-wrap items-center justify-between gap-3 border-dashed p-4">
        <p className="text-xs text-muted-foreground">
          La gestion des services de conciergerie a été déplacée vers sa propre page.
        </p>
        <Link to="/app/services">
          <Button variant="secondary" size="sm">Gérer la conciergerie</Button>
        </Link>
      </Card>
    </div>
  )
}

// ─── 1. Account Tab ──────────────────────────────────────────────────────────

function AccountTab({
  userId,
  refreshProfile,
}: {
  userId: string | undefined
  refreshProfile: (options?: { silent?: boolean }) => Promise<void>
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [dateFormat, setDateFormat] = useState<DateFormat>('DD/MM/YYYY')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!userId) return
    const fetchProfile = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone, company, date_format')
        .eq('id', userId)
        .single()
      if (!error && data) {
        setFullName(data.full_name || '')
        setEmail(data.email || '')
        setPhone(data.phone || '')
        setCompany(data.company || '')
        setDateFormat((data.date_format as DateFormat | null) ?? 'DD/MM/YYYY')
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
      .update({ full_name: fullName, email, phone, company, date_format: dateFormat })
      .eq('id', userId)
    setSaving(false)
    if (error) {
      setFeedback({ message: `Erreur : ${error.message}`, type: 'error' })
    } else {
      await refreshProfile({ silent: true })
      setFeedback({ message: 'Profil enregistré avec succès.', type: 'success' })
    }
  }

  if (loading) {
    return (
      <Card className="p-6 max-w-xl">
        <div className="flex items-center gap-3">
          <Spinner />
          <span className="text-sm text-muted-foreground">Chargement du profil…</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 max-w-xl">
      <h3 className="text-base font-semibold mb-6">Paramètres du compte</h3>
      <div className="space-y-4">
        <Input label="Nom complet" value={fullName} onChange={e => setFullName(e.target.value)} />
        <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <PhoneInput label="Téléphone" value={phone} onChange={setPhone} />
        <Input label="Société" value={company} onChange={e => setCompany(e.target.value)} />
        <Select
          label="Format des dates"
          value={dateFormat}
          onChange={event => setDateFormat(event.target.value as DateFormat)}
          options={dateFormats.map(format => ({
            value: format,
            label: dateFormatLabels[format],
          }))}
        />
        <p className="text-xs text-muted-foreground">
          Ce format sera utilisé dans les formulaires, les réservations et le calendrier.
        </p>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Spinner className="mr-2" />}
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
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

function RolesTab() {
  const { role } = useRole()
  const {
    ownerHouseManagerTemplate,
    saveOwnerHouseManagerTemplate,
    loading: permissionsLoading,
  } = usePermissions()
  const [draft, setDraft] = useState<PermissionMap>(DEFAULT_HOUSE_MANAGER_PERMISSIONS)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (ownerHouseManagerTemplate) setDraft(ownerHouseManagerTemplate)
  }, [ownerHouseManagerTemplate])

  if (role !== 'owner') {
    return (
      <Card className="p-6">
        <h3 className="text-base font-semibold mb-2">Rôles & permissions</h3>
        <p className="text-sm text-muted-foreground">
          Seul le propriétaire peut définir ce que voit le house manager.
        </p>
      </Card>
    )
  }

  const toggle = (key: AppCapability, value: boolean) => {
    setDraft(current => ({
      ...current,
      [key]: value,
      properties_delete: false,
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setFeedback(null)
    const { error } = await saveOwnerHouseManagerTemplate(draft)
    setSaving(false)
    if (error) {
      setFeedback({ message: error, type: 'error' })
      return
    }
    setFeedback({ message: 'Droits house manager enregistrés.', type: 'success' })
  }

  const handleReset = () => {
    setDraft({ ...DEFAULT_HOUSE_MANAGER_PERMISSIONS })
    setFeedback(null)
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold mb-1">Droits du house manager</h3>
          <p className="text-sm text-muted-foreground">
            Par défaut : mêmes accès que vous, sauf les montants des réservations et les contrats.
            La suppression de propriété est toujours interdite.
          </p>
        </div>

        {permissionsLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {HOUSE_MANAGER_CONFIGURABLE_CAPABILITIES.map(key => (
              <div key={key} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{capabilityLabels[key]}</p>
                  {capabilityDescriptions[key] && (
                    <p className="text-xs text-muted-foreground mt-0.5">{capabilityDescriptions[key]}</p>
                  )}
                </div>
                <Switch
                  checked={Boolean(draft[key])}
                  onCheckedChange={value => toggle(key, value)}
                  aria-label={capabilityLabels[key]}
                />
              </div>
            ))}
            <div className="flex items-start justify-between gap-4 px-4 py-3 bg-muted/30">
              <div>
                <p className="text-sm font-medium">{capabilityLabels.properties_delete}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Toujours désactivé pour le house manager.
                </p>
              </div>
              <Switch checked={false} disabled aria-label="Suppression propriété interdite" />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving || permissionsLoading}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button variant="secondary" onClick={handleReset} disabled={saving}>
            Réinitialiser les défauts
          </Button>
        </div>
        {feedback && <Feedback message={feedback.message} type={feedback.type} />}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm font-semibold mb-1">Propriétaire</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Accès complet à toutes les fonctionnalités, y compris contrats, montants et suppression.
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-semibold mb-1">House manager</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Invité avec les droits ci-dessus. Configurez la visibilité selon votre organisation.
          </p>
        </Card>
      </div>
    </div>
  )
}

// ─── 4. Payments Tab ─────────────────────────────────────────────────────────

function PaymentsTab() {
  const { can } = usePermissions()
  const canViewAmounts = can('reservation_amounts')
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
          <p className="text-2xl font-semibold mt-1">
            {formatMaskedAmount(totalAmount, canViewAmounts)}
          </p>
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
                      {formatMaskedAmount(p.amount, canViewAmounts)}
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

// ─── 5. Notifications Tab ────────────────────────────────────────────────────

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
