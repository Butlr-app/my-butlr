import { useEffect, useState } from 'react'
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { fetchEnabledPropertyServices, type PropertyServiceItem } from '@/lib/propertyServices'

interface PropertyGuestPortalPanelProps {
  propertyId: string
  propertyName: string
  propertyImageUrl?: string | null
}

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
        className="w-full px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
      />
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
}: PropertyGuestPortalPanelProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{propertyName}</p>
          <p className="text-xs text-muted-foreground">
            {settings.enabled ? 'Portail actif' : 'Portail désactivé'}
            {' · '}
            {countPublishedGuides(guides)} guide{countPublishedGuides(guides) > 1 ? 's' : ''} publié{countPublishedGuides(guides) > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setPreviewOpen(true)}>
            <Eye className="mr-1.5 h-4 w-4" />
            Aperçu
          </Button>
          <Button size="sm" className="shadow-[var(--shadow-1)]" onClick={handleSaveSettings} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 space-y-1 divide-y divide-border">
          <p className="pb-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Activation</p>
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
          <SwitchField
            checked={settings.show_services}
            onCheckedChange={show_services => setSettings(current => ({ ...current, show_services }))}
            label="Afficher la Conciergerie"
            description="Prestations sur mesure (chef, transport, bien-être) — demandes via devis."
          />
          <SwitchField
            checked={settings.show_boutique ?? true}
            onCheckedChange={show_boutique => setSettings(current => ({ ...current, show_boutique }))}
            label="Afficher la Boutique"
            description="Produits et packs commandables au panier (courses, champagne, arrivée)."
          />
          <SwitchField
            checked={settings.show_messaging ?? true}
            onCheckedChange={show_messaging => setSettings(current => ({ ...current, show_messaging }))}
            label="Messagerie séjour"
            description="Permet au voyageur d'écrire à l'équipe depuis le portail."
          />
          {(settings.show_messaging ?? true) && (
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
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Accueil</p>
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
        </Card>

        <Card className="p-5 space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Wi-Fi</p>
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
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 space-y-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Arrivée</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Instructions check-in avec texte, étapes, listes, images et vidéos.
            </p>
          </div>
          <GuideBlockEditor
            blocks={parseGuideContent(settings.check_in_instructions ?? '')}
            onChange={blocks => setSettings(current => ({
              ...current,
              check_in_instructions: serializeGuideContent(blocks),
            }))}
            propertyId={propertyId}
            userId={user?.id}
          />
        </Card>
        <Card className="p-5 space-y-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Départ</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Instructions check-out avec texte, étapes, listes, images et vidéos.
            </p>
          </div>
          <GuideBlockEditor
            blocks={parseGuideContent(settings.check_out_instructions ?? '')}
            onChange={blocks => setSettings(current => ({
              ...current,
              check_out_instructions: serializeGuideContent(blocks),
            }))}
            propertyId={propertyId}
            userId={user?.id}
          />
        </Card>
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Urgences</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Contacts utiles et consignes en cas d’urgence.
          </p>
        </div>
        <EmergencyContactsEditor
          value={settings.emergency_contact}
          onChange={emergency_contact => setSettings(current => ({ ...current, emergency_contact }))}
          propertyId={propertyId}
          userId={user?.id}
        />
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Règlement intérieur</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Règles du séjour avec texte, étapes, listes, images et vidéos.
          </p>
        </div>
        <GuideBlockEditor
          blocks={parseGuideContent(settings.house_rules ?? '')}
          onChange={blocks => setSettings(current => ({
            ...current,
            house_rules: serializeGuideContent(blocks),
          }))}
          propertyId={propertyId}
          userId={user?.id}
        />
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Guides & infos</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Contenus affichés dans le portail (piscine, parking, adresses locales…).
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => openGuideModal()}>
            <Plus className="mr-1 h-4 w-4" />
            Ajouter un guide
          </Button>
        </div>

        {guides.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun guide pour l’instant.</p>
        ) : (
          <div className="space-y-2">
            {guides.map(guide => (
              <div
                key={guide.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-3"
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
      </Card>

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
