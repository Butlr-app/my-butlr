import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState, useEffect } from 'react'
import { useProfile } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { Loader2 } from 'lucide-react'

const settingsTabs = ['Account', 'Team', 'Roles', 'Properties', 'Branding', 'Payments', 'Services', 'Notifications']

export function Settings() {
  const [activeTab, setActiveTab] = useState('Account')
  const { profile, loading, updateProfile } = useProfile()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    company: '',
  })

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
    setSaving(true)
    try {
      await updateProfile(form)
      toast('Profile updated')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

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

      {activeTab === 'Account' && (
        <Card className="p-6 max-w-xl">
          <h3 className="text-base font-semibold mb-6">Account Settings</h3>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <Input label="Full name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              <Input label="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save changes
              </Button>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'Team' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold">Team Members</h3>
            <Button size="sm">Invite member</Button>
          </div>
          <div className="space-y-3">
            {[
              { name: profile?.full_name ?? 'You', email: profile?.email ?? '', role: profile?.role ?? 'Owner' },
            ].map(member => (
              <div key={member.email} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{member.role}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab !== 'Account' && activeTab !== 'Team' && (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">{activeTab} settings</p>
          <Button variant="secondary" size="sm" className="mt-4">Configure</Button>
        </Card>
      )}
    </div>
  )
}
