import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useAuth } from '@/lib/authContext'
import { useProfile } from '@/lib/useSupabase'
import { supabase } from '@/lib/supabase'
import { useTranslation, type Language } from '@/i18n/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import type { Role } from '@/lib/roleContext'
import {
  Building2, Home, Settings2, CheckCircle2, User, Users, ConciergeBell,
  Briefcase, Star, BookOpen, Bell, Handshake, Sparkles, ArrowRight,
  ArrowLeft, Loader2, Crown, ClipboardList, Calendar, CreditCard,
  MessageSquare, Shield, Globe,
} from 'lucide-react'

type StepDef = {
  id: string
  icon: typeof Building2
  labelKey: string
}

const ROLE_STEPS: Record<Role, StepDef[]> = {
  owner: [
    { id: 'welcome', icon: Crown, labelKey: 'onboarding.steps.welcome' },
    { id: 'company', icon: Building2, labelKey: 'onboarding.steps.company' },
    { id: 'property', icon: Home, labelKey: 'onboarding.steps.property' },
    { id: 'team', icon: Users, labelKey: 'onboarding.steps.team' },
    { id: 'preferences', icon: Settings2, labelKey: 'onboarding.steps.preferences' },
    { id: 'done', icon: CheckCircle2, labelKey: 'onboarding.steps.done' },
  ],
  house_manager: [
    { id: 'welcome', icon: ClipboardList, labelKey: 'onboarding.steps.welcome' },
    { id: 'profile', icon: User, labelKey: 'onboarding.steps.profile' },
    { id: 'workspace', icon: Calendar, labelKey: 'onboarding.steps.workspace' },
    { id: 'preferences', icon: Settings2, labelKey: 'onboarding.steps.preferences' },
    { id: 'done', icon: CheckCircle2, labelKey: 'onboarding.steps.done' },
  ],
  concierge: [
    { id: 'welcome', icon: ConciergeBell, labelKey: 'onboarding.steps.welcome' },
    { id: 'profile', icon: User, labelKey: 'onboarding.steps.profile' },
    { id: 'workflow', icon: Briefcase, labelKey: 'onboarding.steps.workflow' },
    { id: 'preferences', icon: Settings2, labelKey: 'onboarding.steps.preferences' },
    { id: 'done', icon: CheckCircle2, labelKey: 'onboarding.steps.done' },
  ],
  agency: [
    { id: 'welcome', icon: Globe, labelKey: 'onboarding.steps.welcome' },
    { id: 'company', icon: Building2, labelKey: 'onboarding.steps.company' },
    { id: 'portal', icon: Briefcase, labelKey: 'onboarding.steps.portal' },
    { id: 'preferences', icon: Settings2, labelKey: 'onboarding.steps.preferences' },
    { id: 'done', icon: CheckCircle2, labelKey: 'onboarding.steps.done' },
  ],
  partner: [
    { id: 'welcome', icon: Handshake, labelKey: 'onboarding.steps.welcome' },
    { id: 'business', icon: Star, labelKey: 'onboarding.steps.business' },
    { id: 'services', icon: ConciergeBell, labelKey: 'onboarding.steps.services' },
    { id: 'preferences', icon: Settings2, labelKey: 'onboarding.steps.preferences' },
    { id: 'done', icon: CheckCircle2, labelKey: 'onboarding.steps.done' },
  ],
  guest: [
    { id: 'welcome', icon: Sparkles, labelKey: 'onboarding.steps.welcome' },
    { id: 'profile', icon: User, labelKey: 'onboarding.steps.profile' },
    { id: 'discover', icon: BookOpen, labelKey: 'onboarding.steps.discover' },
    { id: 'done', icon: CheckCircle2, labelKey: 'onboarding.steps.done' },
  ],
}

const ROLE_TITLES: Record<Role, string> = {
  owner: 'onboarding.title.owner',
  house_manager: 'onboarding.title.houseManager',
  concierge: 'onboarding.title.concierge',
  agency: 'onboarding.title.agency',
  partner: 'onboarding.title.partner',
  guest: 'onboarding.title.guest',
}

const ROLE_SUBTITLES: Record<Role, string> = {
  owner: 'onboarding.subtitle.owner',
  house_manager: 'onboarding.subtitle.houseManager',
  concierge: 'onboarding.subtitle.concierge',
  agency: 'onboarding.subtitle.agency',
  partner: 'onboarding.subtitle.partner',
  guest: 'onboarding.subtitle.guest',
}

interface ProfileForm {
  full_name: string
  phone: string
  avatar_url: string
}

interface CompanyForm {
  company_name: string
  address: string
  siret: string
  rcs: string
  email: string
  phone: string
}

interface PropertyForm {
  name: string
  address: string
  type: string
  bedrooms: string
  surface_m2: string
}

interface BusinessForm {
  company_name: string
  specialty: string
  location: string
  phone: string
  email: string
}

interface PrefsForm {
  language: string
  currency: string
  timezone: string
}

interface InviteForm {
  email: string
  role: string
}

interface ServiceSelection {
  [key: string]: boolean
}

const SERVICE_CATEGORIES = [
  { key: 'chef', icon: '👨‍🍳', labelKey: 'onboarding.services.chef' },
  { key: 'spa', icon: '💆', labelKey: 'onboarding.services.spa' },
  { key: 'cleaning', icon: '🧹', labelKey: 'onboarding.services.cleaning' },
  { key: 'transport', icon: '🚗', labelKey: 'onboarding.services.transport' },
  { key: 'security', icon: '🔒', labelKey: 'onboarding.services.security' },
  { key: 'yacht', icon: '⛵', labelKey: 'onboarding.services.yacht' },
  { key: 'excursion', icon: '🏔️', labelKey: 'onboarding.services.excursion' },
  { key: 'childcare', icon: '👶', labelKey: 'onboarding.services.childcare' },
]

function FeatureCard({ icon: Icon, title, description }: { icon: typeof Building2; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  )
}

export function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, loading: profileLoading, updateProfile } = useProfile()
  const { t, setLanguage } = useTranslation()
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [animateIn, setAnimateIn] = useState(true)

  const detectedRole: Role = (profile?.role as Role) ?? 'owner'
  const steps = ROLE_STEPS[detectedRole]
  const currentStep = steps[step]
  const totalSteps = steps.length
  const progress = ((step + 1) / totalSteps) * 100

  const [profileForm, setProfileForm] = useState<ProfileForm>({ full_name: '', phone: '', avatar_url: '' })
  const [company, setCompany] = useState<CompanyForm>({ company_name: '', address: '', siret: '', rcs: '', email: '', phone: '' })
  const [property, setProperty] = useState<PropertyForm>({ name: '', address: '', type: 'villa', bedrooms: '3', surface_m2: '150' })
  const [business, setBusiness] = useState<BusinessForm>({ company_name: '', specialty: '', location: '', phone: '', email: '' })
  const [prefs, setPrefs] = useState<PrefsForm>({ language: 'fr', currency: 'EUR', timezone: 'Europe/Paris' })
  const [invites, setInvites] = useState<InviteForm[]>([{ email: '', role: 'house_manager' }])
  const [selectedServices, setSelectedServices] = useState<ServiceSelection>({})

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name ?? '',
        phone: profile.phone ?? '',
        avatar_url: profile.avatar_url ?? '',
      })
      if (profile.company) {
        setCompany(prev => ({ ...prev, company_name: profile.company ?? '' }))
        setBusiness(prev => ({ ...prev, company_name: profile.company ?? '' }))
      }
      if (profile.email) {
        setCompany(prev => ({ ...prev, email: profile.email ?? '' }))
        setBusiness(prev => ({ ...prev, email: profile.email ?? '' }))
      }
    }
  }, [profile])

  const animateStep = (newStep: number) => {
    setAnimateIn(false)
    setTimeout(() => {
      setStep(newStep)
      setAnimateIn(true)
    }, 150)
  }

  const next = () => {
    if (step < totalSteps - 1) animateStep(step + 1)
  }
  const prev = () => {
    if (step > 0) animateStep(step - 1)
  }

  const addInvite = () => setInvites(prev => [...prev, { email: '', role: 'concierge' }])
  const removeInvite = (i: number) => setInvites(prev => prev.filter((_, idx) => idx !== i))
  const updateInvite = (i: number, field: keyof InviteForm, value: string) =>
    setInvites(prev => prev.map((inv, idx) => idx === i ? { ...inv, [field]: value } : inv))

  const toggleService = (key: string) =>
    setSelectedServices(prev => ({ ...prev, [key]: !prev[key] }))

  const finish = async () => {
    if (!user) return
    setSaving(true)

    try {
      const profileUpdates: Record<string, unknown> = {
        onboarding_completed: true,
      }
      if (profileForm.full_name) profileUpdates.full_name = profileForm.full_name
      if (profileForm.phone) profileUpdates.phone = profileForm.phone
      if (profileForm.avatar_url) profileUpdates.avatar_url = profileForm.avatar_url

      if (detectedRole === 'owner' || detectedRole === 'agency') {
        if (company.company_name) profileUpdates.company = company.company_name
        if (company.phone) profileUpdates.phone = company.phone
      }

      if (detectedRole === 'partner') {
        if (business.company_name) profileUpdates.company = business.company_name
        if (business.phone) profileUpdates.phone = business.phone
      }

      await updateProfile(profileUpdates as Parameters<typeof updateProfile>[0])

      if (prefs.language === 'fr' || prefs.language === 'en') {
        setLanguage(prefs.language as Language)
      }
      localStorage.setItem('butlr-currency', prefs.currency)
      localStorage.setItem('butlr-timezone', prefs.timezone)

      if ((detectedRole === 'owner') && property.name) {
        await supabase.from('properties').insert({
          owner_id: user.id,
          name: property.name,
          location: property.address || null,
          type: property.type,
          bedrooms: parseInt(property.bedrooms) || 3,
          surface_m2: parseInt(property.surface_m2) || 150,
          status: 'active',
        })
      }

      if (detectedRole === 'owner' && invites.length > 0) {
        for (const inv of invites) {
          if (inv.email.trim()) {
            await supabase.auth.admin.inviteUserByEmail(inv.email).catch(() => {})
          }
        }
      }

      const enabledServices = Object.entries(selectedServices)
        .filter(([, v]) => v)
        .map(([k]) => k)
      if ((detectedRole === 'owner' || detectedRole === 'partner') && enabledServices.length > 0) {
        const serviceInserts = enabledServices.map(key => {
          const cat = SERVICE_CATEGORIES.find(c => c.key === key)
          return {
            name: cat ? t(cat.labelKey) : key,
            category: key,
            starting_price: 0,
            commission: 15,
            available: true,
          }
        })
        try { await supabase.from('services').insert(serviceInserts) } catch { /* ignore */ }
      }

      toast(t('onboarding.done.successToast'), 'success')
      navigate('/app')
    } catch {
      navigate('/app')
    } finally {
      setSaving(false)
    }
  }

  if (profileLoading) {
    return (
      <div className="bg-background text-foreground min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const renderWelcome = () => {
    const roleIcon: Record<Role, typeof Building2> = {
      owner: Crown,
      house_manager: ClipboardList,
      concierge: ConciergeBell,
      agency: Globe,
      partner: Handshake,
      guest: Sparkles,
    }
    const Icon = roleIcon[detectedRole]

    return (
      <div className="space-y-6 text-center py-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto">
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t(ROLE_TITLES[detectedRole])}</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {t(ROLE_SUBTITLES[detectedRole])}
          </p>
        </div>

        {detectedRole === 'owner' && (
          <div className="grid gap-3 text-left mt-4">
            <FeatureCard icon={Building2} title={t('onboarding.features.owner.properties')} description={t('onboarding.features.owner.propertiesDesc')} />
            <FeatureCard icon={Calendar} title={t('onboarding.features.owner.reservations')} description={t('onboarding.features.owner.reservationsDesc')} />
            <FeatureCard icon={CreditCard} title={t('onboarding.features.owner.payments')} description={t('onboarding.features.owner.paymentsDesc')} />
            <FeatureCard icon={Users} title={t('onboarding.features.owner.team')} description={t('onboarding.features.owner.teamDesc')} />
          </div>
        )}

        {detectedRole === 'house_manager' && (
          <div className="grid gap-3 text-left mt-4">
            <FeatureCard icon={ClipboardList} title={t('onboarding.features.manager.tasks')} description={t('onboarding.features.manager.tasksDesc')} />
            <FeatureCard icon={Calendar} title={t('onboarding.features.manager.calendar')} description={t('onboarding.features.manager.calendarDesc')} />
            <FeatureCard icon={Building2} title={t('onboarding.features.manager.properties')} description={t('onboarding.features.manager.propertiesDesc')} />
            <FeatureCard icon={MessageSquare} title={t('onboarding.features.manager.messages')} description={t('onboarding.features.manager.messagesDesc')} />
          </div>
        )}

        {detectedRole === 'concierge' && (
          <div className="grid gap-3 text-left mt-4">
            <FeatureCard icon={ConciergeBell} title={t('onboarding.features.concierge.requests')} description={t('onboarding.features.concierge.requestsDesc')} />
            <FeatureCard icon={Briefcase} title={t('onboarding.features.concierge.services')} description={t('onboarding.features.concierge.servicesDesc')} />
            <FeatureCard icon={ClipboardList} title={t('onboarding.features.concierge.tasks')} description={t('onboarding.features.concierge.tasksDesc')} />
            <FeatureCard icon={Handshake} title={t('onboarding.features.concierge.partners')} description={t('onboarding.features.concierge.partnersDesc')} />
          </div>
        )}

        {detectedRole === 'agency' && (
          <div className="grid gap-3 text-left mt-4">
            <FeatureCard icon={Building2} title={t('onboarding.features.agency.availability')} description={t('onboarding.features.agency.availabilityDesc')} />
            <FeatureCard icon={ConciergeBell} title={t('onboarding.features.agency.booking')} description={t('onboarding.features.agency.bookingDesc')} />
            <FeatureCard icon={MessageSquare} title={t('onboarding.features.agency.inquiries')} description={t('onboarding.features.agency.inquiriesDesc')} />
          </div>
        )}

        {detectedRole === 'partner' && (
          <div className="grid gap-3 text-left mt-4">
            <FeatureCard icon={ConciergeBell} title={t('onboarding.features.partner.services')} description={t('onboarding.features.partner.servicesDesc')} />
            <FeatureCard icon={CreditCard} title={t('onboarding.features.partner.earnings')} description={t('onboarding.features.partner.earningsDesc')} />
            <FeatureCard icon={Star} title={t('onboarding.features.partner.reputation')} description={t('onboarding.features.partner.reputationDesc')} />
          </div>
        )}

        {detectedRole === 'guest' && (
          <div className="grid gap-3 text-left mt-4">
            <FeatureCard icon={ConciergeBell} title={t('onboarding.features.guest.services')} description={t('onboarding.features.guest.servicesDesc')} />
            <FeatureCard icon={BookOpen} title={t('onboarding.features.guest.guides')} description={t('onboarding.features.guest.guidesDesc')} />
            <FeatureCard icon={MessageSquare} title={t('onboarding.features.guest.messages')} description={t('onboarding.features.guest.messagesDesc')} />
          </div>
        )}
      </div>
    )
  }

  const renderProfile = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('onboarding.profile.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('onboarding.profile.subtitle')}</p>
      </div>
      <ImageUpload
        variant="avatar"
        storagePath="avatars"
        currentUrl={profileForm.avatar_url || null}
        onUploaded={(url) => setProfileForm(p => ({ ...p, avatar_url: url }))}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        <Input
          label={t('onboarding.profile.fullName')}
          placeholder="Jean Dupont"
          value={profileForm.full_name}
          onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
        />
        <Input
          label={t('onboarding.profile.phone')}
          type="tel"
          placeholder="+33 6 12 34 56 78"
          value={profileForm.phone}
          onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
        />
      </div>
    </div>
  )

  const renderCompany = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('onboarding.company.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('onboarding.company.subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        <Input
          label={t('onboarding.company.name')}
          placeholder="SAS My Company"
          value={company.company_name}
          onChange={e => setCompany(p => ({ ...p, company_name: e.target.value }))}
        />
        <Input
          label={t('onboarding.company.address')}
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
          label={t('onboarding.company.email')}
          type="email"
          placeholder="contact@company.com"
          value={company.email}
          onChange={e => setCompany(p => ({ ...p, email: e.target.value }))}
        />
        <Input
          label={t('onboarding.company.phone')}
          type="tel"
          placeholder="+33 1 23 45 67 89"
          value={company.phone}
          onChange={e => setCompany(p => ({ ...p, phone: e.target.value }))}
        />
      </div>
    </div>
  )

  const renderProperty = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('onboarding.property.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('onboarding.property.subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        <Input
          label={t('onboarding.property.name')}
          placeholder="Villa Azure"
          value={property.name}
          onChange={e => setProperty(p => ({ ...p, name: e.target.value }))}
        />
        <Input
          label={t('onboarding.property.address')}
          placeholder="Cannes, France"
          value={property.address}
          onChange={e => setProperty(p => ({ ...p, address: e.target.value }))}
        />
        <Select
          label={t('onboarding.property.type')}
          value={property.type}
          onChange={e => setProperty(p => ({ ...p, type: e.target.value }))}
          options={[
            { value: 'villa', label: 'Villa' },
            { value: 'yacht', label: 'Yacht' },
            { value: 'apartment', label: t('properties.apartment') },
            { value: 'chalet', label: 'Chalet' },
          ]}
        />
        <Input
          label={t('onboarding.property.bedrooms')}
          type="number"
          placeholder="3"
          value={property.bedrooms}
          onChange={e => setProperty(p => ({ ...p, bedrooms: e.target.value }))}
        />
        <Input
          label={t('onboarding.property.surface')}
          type="number"
          placeholder="150"
          value={property.surface_m2}
          onChange={e => setProperty(p => ({ ...p, surface_m2: e.target.value }))}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">{t('onboarding.property.hint')}</p>
    </div>
  )

  const renderTeam = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('onboarding.team.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('onboarding.team.subtitle')}</p>
      </div>
      <div className="space-y-3 mt-2">
        {invites.map((inv, i) => (
          <div key={i} className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label={i === 0 ? t('onboarding.team.email') : undefined}
                type="email"
                placeholder="colleague@company.com"
                value={inv.email}
                onChange={e => updateInvite(i, 'email', e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                label={i === 0 ? t('onboarding.team.role') : undefined}
                value={inv.role}
                onChange={e => updateInvite(i, 'role', e.target.value)}
                options={[
                  { value: 'house_manager', label: 'House Manager' },
                  { value: 'concierge', label: 'Concierge' },
                  { value: 'partner', label: t('onboarding.team.partner') },
                ]}
              />
            </div>
            {invites.length > 1 && (
              <button
                onClick={() => removeInvite(i)}
                className="h-10 px-2 text-muted-foreground hover:text-destructive transition-colors"
              >
                &times;
              </button>
            )}
          </div>
        ))}
        <Button variant="secondary" size="sm" onClick={addInvite}>
          + {t('onboarding.team.addMore')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t('onboarding.team.hint')}</p>
    </div>
  )

  const renderWorkspace = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('onboarding.workspace.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('onboarding.workspace.subtitle')}</p>
      </div>
      <div className="grid gap-3 mt-2">
        <FeatureCard icon={Building2} title={t('onboarding.workspace.properties')} description={t('onboarding.workspace.propertiesDesc')} />
        <FeatureCard icon={ClipboardList} title={t('onboarding.workspace.tasks')} description={t('onboarding.workspace.tasksDesc')} />
        <FeatureCard icon={Calendar} title={t('onboarding.workspace.calendar')} description={t('onboarding.workspace.calendarDesc')} />
        <FeatureCard icon={Bell} title={t('onboarding.workspace.notifications')} description={t('onboarding.workspace.notificationsDesc')} />
        <FeatureCard icon={Handshake} title={t('onboarding.workspace.partners')} description={t('onboarding.workspace.partnersDesc')} />
      </div>
    </div>
  )

  const renderWorkflow = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('onboarding.workflow.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('onboarding.workflow.subtitle')}</p>
      </div>
      <div className="grid gap-3 mt-2">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold shrink-0">1</div>
          <div>
            <p className="text-sm font-semibold">{t('onboarding.workflow.step1')}</p>
            <p className="text-xs text-muted-foreground">{t('onboarding.workflow.step1Desc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold shrink-0">2</div>
          <div>
            <p className="text-sm font-semibold">{t('onboarding.workflow.step2')}</p>
            <p className="text-xs text-muted-foreground">{t('onboarding.workflow.step2Desc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold shrink-0">3</div>
          <div>
            <p className="text-sm font-semibold">{t('onboarding.workflow.step3')}</p>
            <p className="text-xs text-muted-foreground">{t('onboarding.workflow.step3Desc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold shrink-0">4</div>
          <div>
            <p className="text-sm font-semibold">{t('onboarding.workflow.step4')}</p>
            <p className="text-xs text-muted-foreground">{t('onboarding.workflow.step4Desc')}</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderPortal = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('onboarding.portal.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('onboarding.portal.subtitle')}</p>
      </div>
      <div className="grid gap-3 mt-2">
        <FeatureCard icon={Building2} title={t('onboarding.portal.availability')} description={t('onboarding.portal.availabilityDesc')} />
        <FeatureCard icon={ConciergeBell} title={t('onboarding.portal.booking')} description={t('onboarding.portal.bookingDesc')} />
        <FeatureCard icon={MessageSquare} title={t('onboarding.portal.inquiries')} description={t('onboarding.portal.inquiriesDesc')} />
        <FeatureCard icon={Shield} title={t('onboarding.portal.secure')} description={t('onboarding.portal.secureDesc')} />
      </div>
    </div>
  )

  const renderBusiness = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('onboarding.business.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('onboarding.business.subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        <Input
          label={t('onboarding.business.companyName')}
          placeholder="My Services SARL"
          value={business.company_name}
          onChange={e => setBusiness(p => ({ ...p, company_name: e.target.value }))}
        />
        <Input
          label={t('onboarding.business.specialty')}
          placeholder={t('onboarding.business.specialtyPlaceholder')}
          value={business.specialty}
          onChange={e => setBusiness(p => ({ ...p, specialty: e.target.value }))}
        />
        <Input
          label={t('onboarding.business.location')}
          placeholder="Cannes, Antibes, Nice"
          value={business.location}
          onChange={e => setBusiness(p => ({ ...p, location: e.target.value }))}
        />
        <Input
          label={t('onboarding.business.phone')}
          type="tel"
          placeholder="+33 6 12 34 56 78"
          value={business.phone}
          onChange={e => setBusiness(p => ({ ...p, phone: e.target.value }))}
        />
        <Input
          label={t('onboarding.business.email')}
          type="email"
          placeholder="contact@myservices.com"
          value={business.email}
          onChange={e => setBusiness(p => ({ ...p, email: e.target.value }))}
        />
      </div>
    </div>
  )

  const renderServices = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('onboarding.serviceSelect.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('onboarding.serviceSelect.subtitle')}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
        {SERVICE_CATEGORIES.map(cat => {
          const isSelected = selectedServices[cat.key]
          return (
            <button
              key={cat.key}
              onClick={() => toggleService(cat.key)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.3)]'
                  : 'border-border bg-card hover:border-foreground/20'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium text-center">{t(cat.labelKey)}</span>
              {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t('onboarding.serviceSelect.hint')}</p>
    </div>
  )

  const renderDiscover = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('onboarding.discover.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('onboarding.discover.subtitle')}</p>
      </div>
      <div className="grid gap-3 mt-2">
        <FeatureCard icon={ConciergeBell} title={t('onboarding.discover.services')} description={t('onboarding.discover.servicesDesc')} />
        <FeatureCard icon={BookOpen} title={t('onboarding.discover.guides')} description={t('onboarding.discover.guidesDesc')} />
        <FeatureCard icon={MessageSquare} title={t('onboarding.discover.messages')} description={t('onboarding.discover.messagesDesc')} />
        <FeatureCard icon={Bell} title={t('onboarding.discover.notifications')} description={t('onboarding.discover.notificationsDesc')} />
      </div>
    </div>
  )

  const renderPreferences = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('onboarding.preferences.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('onboarding.preferences.subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        <Select
          label={t('onboarding.preferences.language')}
          value={prefs.language}
          onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
          options={[
            { value: 'fr', label: 'Français' },
            { value: 'en', label: 'English' },
          ]}
        />
        <Select
          label={t('onboarding.preferences.currency')}
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
          label={t('onboarding.preferences.timezone')}
          value={prefs.timezone}
          onChange={e => setPrefs(p => ({ ...p, timezone: e.target.value }))}
          options={[
            { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
            { value: 'Europe/London', label: 'Europe/London (GMT)' },
            { value: 'America/New_York', label: 'America/New York (EST)' },
            { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
            { value: 'Pacific/Tahiti', label: 'Pacific/Tahiti' },
          ]}
        />
      </div>
    </div>
  )

  const renderDone = () => {
    const summaryItems: { label: string; value: string }[] = []

    if (profileForm.full_name) summaryItems.push({ label: t('onboarding.done.name'), value: profileForm.full_name })

    if ((detectedRole === 'owner' || detectedRole === 'agency') && company.company_name) {
      summaryItems.push({ label: t('onboarding.done.company'), value: company.company_name })
    }
    if (detectedRole === 'partner' && business.company_name) {
      summaryItems.push({ label: t('onboarding.done.company'), value: business.company_name })
    }
    if (detectedRole === 'owner' && property.name) {
      summaryItems.push({ label: t('onboarding.done.property'), value: `${property.name} (${property.type})` })
    }

    const enabledServices = Object.entries(selectedServices).filter(([, v]) => v).length
    if (enabledServices > 0) {
      summaryItems.push({ label: t('onboarding.done.services'), value: `${enabledServices} ${t('onboarding.done.selected')}` })
    }

    const validInvites = invites.filter(i => i.email.trim()).length
    if (validInvites > 0) {
      summaryItems.push({ label: t('onboarding.done.invitations'), value: `${validInvites} ${t('onboarding.done.members')}` })
    }

    summaryItems.push({ label: t('onboarding.done.language'), value: prefs.language.toUpperCase() })
    summaryItems.push({ label: t('onboarding.done.currency'), value: prefs.currency })

    return (
      <div className="space-y-4 text-center py-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{t('onboarding.done.title')}</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {t('onboarding.done.subtitle')}
        </p>
        {summaryItems.length > 0 && (
          <div className="text-left bg-muted/50 rounded-xl p-4 mt-4 space-y-2">
            {summaryItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderStepContent = () => {
    const stepId = currentStep.id

    switch (stepId) {
      case 'welcome': return renderWelcome()
      case 'profile': return renderProfile()
      case 'company': return renderCompany()
      case 'property': return renderProperty()
      case 'team': return renderTeam()
      case 'workspace': return renderWorkspace()
      case 'workflow': return renderWorkflow()
      case 'portal': return renderPortal()
      case 'business': return renderBusiness()
      case 'services': return renderServices()
      case 'discover': return renderDiscover()
      case 'preferences': return renderPreferences()
      case 'done': return renderDone()
      default: return null
    }
  }

  const isLastStep = step === totalSteps - 1

  return (
    <div className="bg-background text-foreground min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="font-luxury text-2xl font-semibold tracking-tight">
            butlr<span className="text-primary">.</span>
          </span>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide font-medium">
            {t('onboarding.setupYourAccount')}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t('onboarding.stepOf').replace('{current}', String(step + 1)).replace('{total}', String(totalSteps))}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {steps.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.id} className="flex items-center gap-1.5">
                <button
                  onClick={() => i < step ? animateStep(i) : undefined}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    i === step
                      ? 'bg-foreground text-background shadow-sm'
                      : i < step
                        ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                        : 'bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t(s.labelKey)}</span>
                </button>
                {i < steps.length - 1 && (
                  <div className={`w-4 lg:w-8 h-px transition-colors ${i < step ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Card content */}
        <Card>
          <CardContent>
            <div
              className={`transition-all duration-200 ${
                animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              {renderStepContent()}
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-4 border-t border-border">
              <Button
                variant="secondary"
                size="sm"
                onClick={prev}
                disabled={step === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                {t('onboarding.back')}
              </Button>
              {isLastStep ? (
                <Button size="sm" onClick={finish} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      {t('onboarding.settingUp')}
                    </>
                  ) : (
                    <>
                      {t('onboarding.goToDashboard')}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              ) : (
                <Button size="sm" onClick={next}>
                  {t('onboarding.continue')}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skip link */}
        <div className="text-center mt-4">
          <button
            onClick={() => {
              if (user) {
                supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id).then(() => navigate('/app'))
              }
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            {t('onboarding.skipForNow')}
          </button>
        </div>
      </div>
    </div>
  )
}


