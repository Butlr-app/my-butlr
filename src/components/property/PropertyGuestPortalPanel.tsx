import { useEffect, useState } from 'react'
import {
  BookOpen,
  Eye,
  EyeOff,
  Home,
  KeyRound,
  Pencil,
  Plus,
  Settings2,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { GuestPortalPreviewModal } from '@/components/guest/GuestPortalPreviewModal'
import { GuideBlockEditor } from '@/components/guide/GuideBlockEditor'
import { EmergencyContactsEditor } from '@/components/property/EmergencyContactsEditor'
import { useAuth } from '@/lib/authContext'
import {
  createEmptyGuideBlock,
  guideContentSummary,
  hasGuideContent,
  parseGuideContent,
  serializeGuideContent,
  type GuideBlock,
} from '@/lib/guideContent'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { SwitchField } from '@/components/ui/Switch'
import {
  countPublishedGuides,
  defaultGuestPortalSettings,
  deleteGuestGuide,
  fetchGuestPortalSettings,
  fetchPropertyGuides,
  guestGuideCategoryLabels,
  saveGuestGuide,
  saveGuestPortalSettings,
  type GuestGuide,
  type GuestGuideCategory,
  type GuestPortalSettings,
} from '@/lib/guestPortal'
import {
  assessGuestPortalSection,
  guestPortalSetupProgress,
  type GuestPortalSectionId,
  type GuestPortalSectionStatus,
} from '@/lib/guestPortalSetup'

import { fetchEnabledPropertyServices, type PropertyServiceItem } from '@/lib/propertyServices'

type AccentTone = 'neutral' | 'info' | 'success' | 'warning'

const sectionAccent: Record<GuestPortalSectionId, AccentTone> = {
  activation: 'neutral',
  welcome: 'info',
  stay: 'success',
  rules: 'warning',
  guides: 'info',
}

const accentBorderClass: Record<AccentTone, string> = {
  neutral: 'border-l-foreground/70',
  info: 'border-l-info',
  success: 'border-l-success',
  warning: 'border-l-warning',
}

const accentBarClass: Record<AccentTone, string> = {
  neutral: 'bg-foreground/70',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
}

const accentTopBorderClass: Record<AccentTone, string> = {
  neutral: 'border-t-foreground/70',
  info: 'border-t-info',
  success: 'border-t-success',
  warning: 'border-t-warning',
}

const accentSurfaceClass: Record<AccentTone, string> = {
  neutral: 'bg-muted/30',
  info: 'bg-info-soft/50',
  success: 'bg-success-soft/40',
  warning: 'bg-warning-soft/40',
}

interface PropertyGuestPortalPanelProps {
  propertyId: string
  propertyName: string
  propertyImageUrl?: string | null
  onSummaryChange?: (settings: GuestPortalSettings, guides: GuestGuide[]) => void
}

const portalSections: Array<{
  id: GuestPortalSectionId
  label: string
  description: string
  icon: typeof Settings2
}> = [
  {
    id: 'activation',
    label: 'Activation',
    description: 'Modules visibles dans le portail',
    icon: Settings2,
  },
  {
    id: 'welcome',
    label: 'Accueil & Wi-Fi',
    description: 'Message de bienvenue et connexion',
    icon: Home,
  },
  {
    id: 'stay',
    label: 'Arrivée & départ',
    description: 'Consignes check-in / check-out',
    icon: KeyRound,
  },
  {
    id: 'rules',
    label: 'Règlement & urgences',
    description: 'Règles du séjour et contacts',
    icon: ShieldAlert,
  },
  {
    id: 'guides',
    label: 'Guides & infos',
    description: 'Contenus pratiques publiés',
    icon: BookOpen,
  },
]

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm focus:border-info focus:outline-none focus:ring-1 focus:ring-info/20"
      />
    </div>
  )
}

function SubsectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pb-1">
      <span className="shrink-0 text-xs font-mono font-medium uppercase tracking-wider text-foreground">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  )
}

function AccentPanel({
  accent,
  children,
  className = '',
  dimmed,
}: {
  accent: AccentTone
  children: React.ReactNode
  className?: string
  dimmed?: boolean
}) {
  return (
    <Card
      className={`overflow-hidden border-l-[4px] p-0 ${accentBorderClass[accent]} ${
        dimmed ? 'opacity-90' : ''
      } ${className}`}
    >
      <div className={`h-1 w-full ${accentBarClass[accent]}`} aria-hidden />
      <div className="p-5">{children}</div>
    </Card>
  )
}

function SectionStatusDot({ status }: { status: GuestPortalSectionStatus }) {
  if (status === 'complete') {
    return <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-success" title="Complet" />
  }
  if (status === 'partial') {
    return <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-warning" title="À compléter" />
  }
  return <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-border" title="Non renseigné" />
}

function sectionStatusLabel(status: GuestPortalSectionStatus): string {
  if (status === 'complete') return 'Complet'
  if (status === 'partial') return 'À compléter'
  return 'Non renseigné'
}

function SectionHeader({
  title,
  description,
  status,
  accent,
}: {
  title: string
  description: string
  status?: GuestPortalSectionStatus
  accent: AccentTone
}) {
  return (
    <div className={`rounded-lg border border-border border-l-[4px] px-4 py-3 ${accentBorderClass[accent]} ${accentSurfaceClass[accent]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {status && (
          <Badge variant={status === 'complete' ? 'success' : status === 'partial' ? 'warning' : 'muted'}>
            {sectionStatusLabel(status)}
          </Badge>
        )}
      </div>
    </div>
  )
}

const categoryOptions = Object.entries(guestGuideCategoryLabels).map(([value, label]) => ({
  value,
  label,
}))

export function PropertyGuestPortalPanel({
  propertyId,
  propertyName,
  propertyImageUrl,
  onSummaryChange,
}: PropertyGuestPortalPanelProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeSection, setActiveSection] = useState<GuestPortalSectionId>('activation')
  const [settings, setSettings] = useState<GuestPortalSettings>(() =>
    defaultGuestPortalSettings(propertyId),
  )
  const [guides, setGuides] = useState<GuestGuide[]>([])
  const [propertyServices, setPropertyServices] = useState<PropertyServiceItem[]>([])
  const [showWifiPassword, setShowWifiPassword] = useState(false)
  const [guideModalOpen, setGuideModalOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [includeDraftGuides, setIncludeDraftGuides] = useState(false)
  const [editingGuide, setEditingGuide] = useState<GuestGuide | null>(null)
  const [guideForm, setGuideForm] = useState<{
    title: string
    category: GuestGuideCategory
    blocks: GuideBlock[]
    published: boolean
  }>({
    title: '',
    category: 'general',
    blocks: [createEmptyGuideBlock('text')],
    published: true,
  })

  const activeMeta = portalSections.find(section => section.id === activeSection) ?? portalSections[0]
  const activeIndex = portalSections.findIndex(section => section.id === activeSection)
  const setupProgress = guestPortalSetupProgress(settings, guides)
  const sectionStatuses = Object.fromEntries(
    portalSections.map(section => [
      section.id,
      assessGuestPortalSection(section.id, settings, guides),
    ]),
  ) as Record<GuestPortalSectionId, GuestPortalSectionStatus>

  useEffect(() => {
    if (loading) return
    onSummaryChange?.(settings, guides)
  }, [loading, settings, guides, onSummaryChange])

  useEffect(() => {
    if (!previewOpen) return
    fetchEnabledPropertyServices(propertyId).then(({ data }) => {
      setPropertyServices(data)
    })
  }, [previewOpen, propertyId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setSuccess('')

    Promise.all([
      fetchGuestPortalSettings(propertyId),
      fetchPropertyGuides(propertyId),
      fetchEnabledPropertyServices(propertyId),
    ]).then(([settingsResult, guidesResult, servicesResult]) => {
      if (cancelled) return
      if (settingsResult.error) setError(settingsResult.error.message)
      else setSettings(settingsResult.data)

      if (guidesResult.error) setError(guidesResult.error.message)
      else setGuides((guidesResult.data ?? []) as GuestGuide[])

      if (!servicesResult.error) setPropertyServices(servicesResult.data)

      setLoading(false)
    })

    return () => { cancelled = true }
  }, [propertyId])

  const handleSaveSettings = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    const { data, error: saveError } = await saveGuestPortalSettings(settings)
    setSaving(false)
    if (saveError || !data) {
      setError(saveError?.message ?? 'Impossible d’enregistrer la configuration.')
      return
    }
    setSettings(data as GuestPortalSettings)
    setSuccess('Configuration enregistrée.')
  }

  const openGuideModal = (guide?: GuestGuide) => {
    if (guide) {
      setEditingGuide(guide)
      setGuideForm({
        title: guide.title,
        category: (guide.category as GuestGuideCategory) || 'general',
        blocks: parseGuideContent(guide.content),
        published: guide.published,
      })
    } else {
      setEditingGuide(null)
      setGuideForm({
        title: '',
        category: 'general',
        blocks: [createEmptyGuideBlock('text')],
        published: true,
      })
    }
    setGuideModalOpen(true)
  }

  const handleSaveGuide = async () => {
    if (!guideForm.title.trim()) {
      setError('Le titre du guide est requis.')
      return
    }
    if (!hasGuideContent(guideForm.blocks)) {
      setError('Ajoutez au moins un contenu au guide (texte, étape, liste, image ou vidéo).')
      return
    }

    const content = serializeGuideContent(guideForm.blocks)

    setSaving(true)
    setError('')
    const { data, error: saveError } = await saveGuestGuide({
      id: editingGuide?.id,
      property_id: propertyId,
      title: guideForm.title,
      category: guideForm.category,
      content,
      published: guideForm.published,
      sort_order: editingGuide?.sort_order ?? guides.length,
    })
    setSaving(false)

    if (saveError || !data) {
      setError(saveError?.message ?? 'Impossible d’enregistrer le guide.')
      return
    }

    const savedGuide = data as GuestGuide
    setGuides(current => editingGuide
      ? current.map(guide => guide.id === savedGuide.id ? savedGuide : guide)
      : [...current, savedGuide])
    setGuideModalOpen(false)
    setSuccess(editingGuide ? 'Guide mis à jour.' : 'Guide ajouté.')
  }

  const handleDeleteGuide = async (guideId: string) => {
    setSaving(true)
    setError('')
    const { error: deleteError } = await deleteGuestGuide(guideId)
    setSaving(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setGuides(current => current.filter(guide => guide.id !== guideId))
    setSuccess('Guide supprimé.')
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement de la configuration…</p>
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className={`h-1 w-full ${settings.enabled ? 'bg-success' : 'bg-muted-foreground/40'}`} aria-hidden />
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-4">
          <div className="flex min-w-0 items-start gap-3">
            {propertyImageUrl ? (
              <img
                src={propertyImageUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                {propertyName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{propertyName}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={settings.enabled ? 'success' : 'muted'}>
                  {settings.enabled ? 'Portail actif' : 'Portail désactivé'}
                </Badge>
                <span>{countPublishedGuides(guides)} guide{countPublishedGuides(guides) > 1 ? 's' : ''} publié{countPublishedGuides(guides) > 1 ? 's' : ''}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPreviewOpen(true)}>
              <Eye className="mr-1.5 h-4 w-4" />
              Aperçu mobile
            </Button>
          </div>
        </div>
        <div className="grid gap-px border-t border-border bg-border sm:grid-cols-3">
          <div className="border-l-[3px] border-l-info bg-card px-4 py-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Avancement</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{setupProgress.percent}%</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-info transition-all"
                style={{ width: `${setupProgress.percent}%` }}
              />
            </div>
          </div>
          <div className="border-l-[3px] border-l-success bg-card px-4 py-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Sections</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {setupProgress.complete}/{setupProgress.total}
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${(setupProgress.complete / setupProgress.total) * 100}%` }}
              />
            </div>
          </div>
          <div className="border-l-[3px] border-l-warning bg-card px-4 py-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Modules invité</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {[settings.show_services, settings.show_boutique ?? true, settings.show_messaging ?? true].filter(Boolean).length}
            </p>
            <div className="mt-2 flex gap-1">
              {[settings.show_services, settings.show_boutique ?? true, settings.show_messaging ?? true].map((on, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full ${on ? 'bg-warning' : 'bg-muted'}`}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md border border-success/30 bg-success-soft p-3 text-sm text-success">
          {success}
        </p>
      )}

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <nav
          aria-label="Sections du portail invité"
          className="xl:w-64 xl:shrink-0"
        >
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border bg-muted/30 px-3 py-2">
              <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Organisation
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto p-2 xl:flex-col xl:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {portalSections.map((section, index) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                const status = sectionStatuses[section.id]
                const accent = sectionAccent[section.id]
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`relative flex min-w-[12rem] shrink-0 cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors xl:min-w-0 xl:w-full ${
                      isActive
                        ? `border-foreground/20 ${accentSurfaceClass[accent]} shadow-sm ring-1 ring-border`
                        : 'border-transparent bg-card hover:border-border hover:bg-muted/60'
                    }`}
                  >
                    {isActive && (
                      <span
                        className={`absolute bottom-2 left-0 top-2 w-1 rounded-r-full ${accentBarClass[accent]}`}
                        aria-hidden
                      />
                    )}
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                      isActive ? `${accentBarClass[accent]} text-white` : 'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </span>
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="block text-sm font-medium">{section.label}</span>
                        {!isActive && <SectionStatusDot status={status} />}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {section.description}
                      </span>
                      {!isActive && status !== 'complete' && (
                        <span
                          className={`mt-2 block h-0.5 w-full max-w-[4rem] rounded-full ${
                            status === 'partial' ? 'bg-warning' : 'bg-border'
                          }`}
                          aria-hidden
                        />
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>
        </nav>

        <div className="min-w-0 flex-1 space-y-5 xl:border-l xl:border-border xl:pl-6">
          <SectionHeader
            title={activeMeta.label}
            description={activeMeta.description}
            status={sectionStatuses[activeSection]}
            accent={sectionAccent[activeSection]}
          />

          <div className={`space-y-4 rounded-xl border border-border border-t-[3px] p-4 sm:p-5 ${accentTopBorderClass[sectionAccent[activeSection]]} ${accentSurfaceClass[sectionAccent[activeSection]]}/25`}>
          {activeSection === 'activation' && (
            <Card className="divide-y divide-border border-0 bg-card p-0 shadow-none">
              <div className="space-y-1 p-5">
                <SubsectionLabel>Portail</SubsectionLabel>
                <SwitchField
                  checked={settings.enabled}
                  onCheckedChange={enabled => setSettings(current => ({ ...current, enabled }))}
                  label="Portail voyageur activé"
                  description="Les voyageurs pourront accéder au contenu de cette propriété."
                />
                <SwitchField
                  checked={settings.require_online_checkin}
                  onCheckedChange={require_online_checkin => setSettings(current => ({ ...current, require_online_checkin }))}
                  label="Check-in en ligne obligatoire"
                  description="Demande les informations voyageur avant l’arrivée."
                />
              </div>

              <div className="space-y-1 p-5">
                <SubsectionLabel>Modules invité</SubsectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border border-l-[3px] border-l-info bg-background p-3">
                    <SwitchField
                      checked={settings.show_services}
                      onCheckedChange={show_services => setSettings(current => ({ ...current, show_services }))}
                      label="Conciergerie"
                      description="Chef, transport, bien-être, devis."
                    />
                  </div>
                  <div className="rounded-lg border border-border border-l-[3px] border-l-warning bg-background p-3">
                    <SwitchField
                      checked={settings.show_boutique ?? true}
                      onCheckedChange={show_boutique => setSettings(current => ({ ...current, show_boutique }))}
                      label="Boutique"
                      description="Paniers, boissons, cadeaux."
                    />
                  </div>
                  <div className="rounded-lg border border-border border-l-[3px] border-l-success bg-background p-3 sm:col-span-2">
                    <SwitchField
                      checked={settings.show_messaging ?? true}
                      onCheckedChange={show_messaging => setSettings(current => ({ ...current, show_messaging }))}
                      label="Messagerie séjour"
                      description="Contact direct avec l’équipe depuis le portail."
                    />
                  </div>
                </div>
                {(settings.show_boutique ?? true) && (
                  <div className="pt-3">
                    <TextArea
                      label="Message d’accueil boutique"
                      value={settings.boutique_welcome_text ?? ''}
                      onChange={value => setSettings(current => ({ ...current, boutique_welcome_text: value }))}
                      rows={3}
                      placeholder="Commandez des produits pour votre villa…"
                    />
                  </div>
                )}
                {(settings.show_messaging ?? true) && (
                  <div className="pt-3">
                    <Select
                      label="Contact messagerie"
                      value={settings.message_contact_role ?? 'house_manager'}
                      onChange={event => setSettings(current => ({
                        ...current,
                        message_contact_role: event.target.value as 'house_manager' | 'concierge',
                      }))}
                      options={[
                        { value: 'house_manager', label: 'House manager' },
                        { value: 'concierge', label: 'Conciergerie' },
                      ]}
                    />
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeSection === 'welcome' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <AccentPanel accent="info">
                <SubsectionLabel>Message d’accueil</SubsectionLabel>
                <div className="space-y-4">
                <Input
                  label="Titre de bienvenue"
                  value={settings.welcome_title ?? ''}
                  onChange={event => setSettings(current => ({ ...current, welcome_title: event.target.value }))}
                  placeholder="Bienvenue"
                />
                <TextArea
                  label="Message de bienvenue"
                  value={settings.welcome_message ?? ''}
                  onChange={value => setSettings(current => ({ ...current, welcome_message: value }))}
                  placeholder="Nous sommes ravis de vous accueillir…"
                />
                </div>
              </AccentPanel>

              <AccentPanel accent="success">
                <SubsectionLabel>Connexion Wi-Fi</SubsectionLabel>
                <div className="space-y-4">
                <Input
                  label="Nom du réseau"
                  value={settings.wifi_name ?? ''}
                  onChange={event => setSettings(current => ({ ...current, wifi_name: event.target.value }))}
                  placeholder="VillaGuest"
                />
                <div className="relative">
                  <Input
                    label="Mot de passe"
                    type={showWifiPassword ? 'text' : 'password'}
                    value={settings.wifi_password ?? ''}
                    onChange={event => setSettings(current => ({ ...current, wifi_password: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-9 text-muted-foreground"
                    onClick={() => setShowWifiPassword(current => !current)}
                    aria-label={showWifiPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showWifiPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                </div>
              </AccentPanel>
            </div>
          )}

          {activeSection === 'stay' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <AccentPanel accent="success">
                <SubsectionLabel>Arrivée</SubsectionLabel>
                <p className="mb-4 text-sm text-muted-foreground">
                  Instructions check-in : texte, étapes, listes, images et vidéos.
                </p>
                <GuideBlockEditor
                  blocks={parseGuideContent(settings.check_in_instructions ?? '')}
                  onChange={blocks => setSettings(current => ({
                    ...current,
                    check_in_instructions: serializeGuideContent(blocks),
                  }))}
                  propertyId={propertyId}
                  userId={user?.id}
                />
              </AccentPanel>
              <AccentPanel accent="warning">
                <SubsectionLabel>Départ</SubsectionLabel>
                <p className="mb-4 text-sm text-muted-foreground">
                  Instructions check-out : texte, étapes, listes, images et vidéos.
                </p>
                <GuideBlockEditor
                  blocks={parseGuideContent(settings.check_out_instructions ?? '')}
                  onChange={blocks => setSettings(current => ({
                    ...current,
                    check_out_instructions: serializeGuideContent(blocks),
                  }))}
                  propertyId={propertyId}
                  userId={user?.id}
                />
              </AccentPanel>
            </div>
          )}

          {activeSection === 'rules' && (
            <div className="space-y-4">
              <AccentPanel accent="warning">
                <SubsectionLabel>Règlement intérieur</SubsectionLabel>
                <GuideBlockEditor
                  blocks={parseGuideContent(settings.house_rules ?? '')}
                  onChange={blocks => setSettings(current => ({
                    ...current,
                    house_rules: serializeGuideContent(blocks),
                  }))}
                  propertyId={propertyId}
                  userId={user?.id}
                />
              </AccentPanel>
              <AccentPanel accent="neutral">
                <SubsectionLabel>Contacts d’urgence</SubsectionLabel>
                <EmergencyContactsEditor
                  value={settings.emergency_contact}
                  onChange={emergency_contact => setSettings(current => ({ ...current, emergency_contact }))}
                  propertyId={propertyId}
                  userId={user?.id}
                />
              </AccentPanel>
            </div>
          )}

          {activeSection === 'guides' && (
            <AccentPanel accent="info" className="shadow-none">
              <SubsectionLabel>Guides publiés</SubsectionLabel>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Contenus affichés dans le portail : piscine, parking, adresses locales…
                </p>
                <Button size="sm" variant="secondary" onClick={() => openGuideModal()}>
                  <Plus className="mr-1 h-4 w-4" />
                  Ajouter un guide
                </Button>
              </div>

              {guides.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <p className="mt-3 text-sm font-medium">Aucun guide publié</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ajoutez des contenus pratiques : piscine, parking, adresses locales…
                  </p>
                  <Button size="sm" className="mt-4" variant="secondary" onClick={() => openGuideModal()}>
                    <Plus className="mr-1 h-4 w-4" />
                    Créer le premier guide
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {guides.map(guide => (
                    <div
                      key={guide.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border border-l-[3px] border-l-info bg-background px-3 py-3"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{guide.title}</p>
                          <Badge variant="muted">
                            {guestGuideCategoryLabels[guide.category as GuestGuideCategory] ?? guide.category}
                          </Badge>
                          <Badge variant={guide.published ? 'success' : 'warning'}>
                            {guide.published ? 'Publié' : 'Brouillon'}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {guideContentSummary(guide.content)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openGuideModal(guide)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDeleteGuide(guide.id)}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccentPanel>
          )}

          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-border pt-4">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={activeIndex <= 0}
              onClick={() => setActiveSection(portalSections[Math.max(0, activeIndex - 1)].id)}
            >
              Section précédente
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={activeIndex >= portalSections.length - 1}
              onClick={() => setActiveSection(portalSections[Math.min(portalSections.length - 1, activeIndex + 1)].id)}
            >
              Section suivante
            </Button>
          </div>
        </div>
      </div>

      <div className={`sticky bottom-0 z-10 mt-2 overflow-hidden rounded-xl border border-border bg-card/95 shadow-[var(--shadow-2)] backdrop-blur-sm`}>
        <div className={`h-0.5 w-full ${accentBarClass[sectionAccent[activeSection]]}`} aria-hidden />
        <div className="flex flex-wrap items-center justify-between gap-3 p-3">
          <p className="text-xs text-muted-foreground">
            {setupProgress.percent}% configuré · section {activeIndex + 1}/{portalSections.length}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPreviewOpen(true)}>
              <Eye className="mr-1.5 h-4 w-4" />
              Aperçu
            </Button>
            <Button size="sm" className="shadow-[var(--shadow-1)]" onClick={handleSaveSettings} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer la configuration'}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        title={editingGuide ? 'Modifier le guide' : 'Nouveau guide'}
        className="max-w-3xl"
      >
        <div className="space-y-4">
          <Input
            label="Titre"
            value={guideForm.title}
            onChange={event => setGuideForm(current => ({ ...current, title: event.target.value }))}
            required
          />
          <Select
            label="Catégorie"
            value={guideForm.category}
            onChange={event => setGuideForm(current => ({
              ...current,
              category: event.target.value as GuestGuideCategory,
            }))}
            options={categoryOptions}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Contenu</p>
            <p className="text-xs text-muted-foreground">
              Composez le guide avec des blocs : texte, étapes, listes, images et vidéos.
            </p>
            <GuideBlockEditor
              blocks={guideForm.blocks}
              onChange={blocks => setGuideForm(current => ({ ...current, blocks }))}
              propertyId={propertyId}
              userId={user?.id}
            />
          </div>
          <SwitchField
            checked={guideForm.published}
            onCheckedChange={published => setGuideForm(current => ({ ...current, published }))}
            label="Publier dans le portail"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setGuideModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveGuide} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer le guide'}
            </Button>
          </div>
        </div>
      </Modal>

      <GuestPortalPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        propertyName={propertyName}
        propertyImageUrl={propertyImageUrl}
        settings={settings}
        guides={guides}
        propertyServices={propertyServices}
        includeDraftGuides={includeDraftGuides}
        onIncludeDraftGuidesChange={setIncludeDraftGuides}
      />
    </div>
  )
}
