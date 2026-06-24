import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/lib/authContext'
import { supabase } from '@/lib/supabase'
import { Building2, Home, Settings2, CheckCircle2 } from 'lucide-react'

interface CompanyInfo {
  company_name: string
  address: string
  siret: string
  rcs: string
  email: string
  phone: string
}

interface FirstProperty {
  name: string
  address: string
  type: string
  bedrooms: string
  surface_m2: string
}

interface Preferences {
  language: string
  currency: string
  timezone: string
}

const STEPS = [
  { label: 'Company', icon: Building2 },
  { label: 'Property', icon: Home },
  { label: 'Preferences', icon: Settings2 },
  { label: 'Confirmation', icon: CheckCircle2 },
]

export function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [company, setCompany] = useState<CompanyInfo>({
    company_name: '',
    address: '',
    siret: '',
    rcs: '',
    email: '',
    phone: '',
  })

  const [property, setProperty] = useState<FirstProperty>({
    name: '',
    address: '',
    type: 'villa',
    bedrooms: '3',
    surface_m2: '150',
  })

  const [prefs, setPrefs] = useState<Preferences>({
    language: 'fr',
    currency: 'EUR',
    timezone: 'Europe/Paris',
  })

  const next = () => setStep(s => Math.min(s + 1, 3))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  const finish = async () => {
    if (!user) return
    setSaving(true)

    try {
      await supabase
        .from('profiles')
        .update({
          company: company.company_name,
          phone: company.phone,
          onboarding_completed: true,
        })
        .eq('id', user.id)

      await supabase.from('properties').insert({
        owner_id: user.id,
        name: property.name || 'My First Property',
        location: property.address,
        type: property.type,
        bedrooms: parseInt(property.bedrooms) || 3,
        surface_m2: parseInt(property.surface_m2) || 150,
        status: 'active',
      })

      navigate('/app')
    } catch {
      navigate('/app')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dark bg-background text-foreground min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <span className="text-xl font-bold tracking-tight">butlr</span>
          <p className="text-sm text-muted-foreground mt-2">Let's set up your account</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  i === step ? 'bg-foreground text-background' :
                  i < step ? 'bg-muted text-foreground' :
                  'bg-muted/50 text-muted-foreground'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-px ${i < step ? 'bg-foreground' : 'bg-border'}`} />
                )}
              </div>
            )
          })}
        </div>

        <Card>
          <CardContent>
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Company Information</h2>
                <p className="text-sm text-muted-foreground">Tell us about your company. This will be used on invoices and contracts.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Company Name"
                    placeholder="SAS My Company"
                    value={company.company_name}
                    onChange={e => setCompany(p => ({ ...p, company_name: e.target.value }))}
                  />
                  <Input
                    label="Address"
                    placeholder="123 Rue de la Paix, Paris"
                    value={company.address}
                    onChange={e => setCompany(p => ({ ...p, address: e.target.value }))}
                  />
                  <Input
                    label="SIRET"
                    placeholder="123 456 789 00001"
                    value={company.siret}
                    onChange={e => setCompany(p => ({ ...p, siret: e.target.value }))}
                  />
                  <Input
                    label="RCS"
                    placeholder="Paris B 123 456 789"
                    value={company.rcs}
                    onChange={e => setCompany(p => ({ ...p, rcs: e.target.value }))}
                  />
                  <Input
                    label="Email"
                    type="email"
                    placeholder="contact@company.com"
                    value={company.email}
                    onChange={e => setCompany(p => ({ ...p, email: e.target.value }))}
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    placeholder="+33 1 23 45 67 89"
                    value={company.phone}
                    onChange={e => setCompany(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Your First Property</h2>
                <p className="text-sm text-muted-foreground">Add your first property to get started. You can add more later.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Property Name"
                    placeholder="Villa Azure"
                    value={property.name}
                    onChange={e => setProperty(p => ({ ...p, name: e.target.value }))}
                  />
                  <Input
                    label="Address"
                    placeholder="Cannes, France"
                    value={property.address}
                    onChange={e => setProperty(p => ({ ...p, address: e.target.value }))}
                  />
                  <Select
                    label="Type"
                    value={property.type}
                    onChange={e => setProperty(p => ({ ...p, type: e.target.value }))}
                    options={[
                      { value: 'villa', label: 'Villa' },
                      { value: 'yacht', label: 'Yacht' },
                      { value: 'apartment', label: 'Apartment' },
                      { value: 'chalet', label: 'Chalet' },
                    ]}
                  />
                  <Input
                    label="Bedrooms"
                    type="number"
                    placeholder="3"
                    value={property.bedrooms}
                    onChange={e => setProperty(p => ({ ...p, bedrooms: e.target.value }))}
                  />
                  <Input
                    label="Surface (m²)"
                    type="number"
                    placeholder="150"
                    value={property.surface_m2}
                    onChange={e => setProperty(p => ({ ...p, surface_m2: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Preferences</h2>
                <p className="text-sm text-muted-foreground">Configure your display and regional preferences.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <Select
                    label="Language"
                    value={prefs.language}
                    onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
                    options={[
                      { value: 'fr', label: 'Français' },
                      { value: 'en', label: 'English' },
                      { value: 'es', label: 'Español' },
                      { value: 'it', label: 'Italiano' },
                      { value: 'de', label: 'Deutsch' },
                    ]}
                  />
                  <Select
                    label="Currency"
                    value={prefs.currency}
                    onChange={e => setPrefs(p => ({ ...p, currency: e.target.value }))}
                    options={[
                      { value: 'EUR', label: 'EUR (€)' },
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'GBP', label: 'GBP (£)' },
                      { value: 'CHF', label: 'CHF' },
                    ]}
                  />
                  <Select
                    label="Timezone"
                    value={prefs.timezone}
                    onChange={e => setPrefs(p => ({ ...p, timezone: e.target.value }))}
                    options={[
                      { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
                      { value: 'Europe/London', label: 'Europe/London (GMT)' },
                      { value: 'America/New_York', label: 'America/New_York (EST)' },
                      { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
                      { value: 'Pacific/Tahiti', label: 'Pacific/Tahiti' },
                    ]}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 text-center py-4">
                <CheckCircle2 className="w-12 h-12 mx-auto text-foreground" />
                <h2 className="text-lg font-semibold">You're all set!</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Your account is configured. Click "Go to Dashboard" to start managing your properties.
                </p>
                <div className="text-left bg-muted/50 rounded-lg p-4 mt-4 text-sm space-y-2">
                  {company.company_name && <p><span className="text-muted-foreground">Company:</span> {company.company_name}</p>}
                  {property.name && <p><span className="text-muted-foreground">Property:</span> {property.name} ({property.type})</p>}
                  <p><span className="text-muted-foreground">Language:</span> {prefs.language.toUpperCase()}</p>
                  <p><span className="text-muted-foreground">Currency:</span> {prefs.currency}</p>
                  <p><span className="text-muted-foreground">Timezone:</span> {prefs.timezone}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6 pt-4 border-t border-border">
              <Button
                variant="secondary"
                size="sm"
                onClick={prev}
                disabled={step === 0}
              >
                Back
              </Button>
              {step < 3 ? (
                <Button size="sm" onClick={next}>
                  Continue
                </Button>
              ) : (
                <Button size="sm" onClick={finish} disabled={saving}>
                  {saving ? 'Setting up...' : 'Go to Dashboard'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          You can update these settings anytime from the Settings page.
        </p>
      </div>
    </div>
  )
}
