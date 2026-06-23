import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState } from 'react'

const settingsTabs = ['Account', 'Team', 'Roles', 'Properties', 'Branding', 'Payments', 'Services', 'Notifications']

export function Settings() {
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

      {activeTab === 'Account' && (
        <Card className="p-6 max-w-xl">
          <h3 className="text-base font-semibold mb-6">Account Settings</h3>
          <div className="space-y-4">
            <Input label="Full name" defaultValue="Jean Dupont" />
            <Input label="Email" type="email" defaultValue="jean@mybutlr.com" />
            <Input label="Phone" type="tel" defaultValue="+33 6 12 34 56 78" />
            <Input label="Company" defaultValue="My Butlr SAS" />
            <Button size="sm">Save changes</Button>
          </div>
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
              { name: 'Jean Dupont', email: 'jean@mybutlr.com', role: 'Owner' },
              { name: 'Sophie Martin', email: 'sophie@mybutlr.com', role: 'House Manager' },
              { name: 'Pierre Duval', email: 'pierre@mybutlr.com', role: 'Concierge' },
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
