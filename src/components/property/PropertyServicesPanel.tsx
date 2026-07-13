import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Pencil, Settings2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Switch, SwitchField } from '@/components/ui/Switch'
import { GuideBlockEditor } from '@/components/guide/GuideBlockEditor'
import { GuideContentRenderer } from '@/components/guide/GuideContentRenderer'
import {
  countEnabledPropertyServices,
  fetchCatalogServices,
  fetchPropertyServiceAssignments,
  getServiceDescriptionContent,
  getServiceDisplayName,
  hasServiceCustomization,
  isGeneralServiceOffer,
  isServiceDetailed,
  mergePropertyServices,
  resolveServiceOffer,
  resolveServicePricing,
  savePropertyServiceAssignment,
  serviceCategoryLabel,
  serviceOfferModeLabels,
  servicePricingModeLabels,
  DEFAULT_GENERAL_OFFER_MESSAGE,
  type PropertyServiceAssignment,
  type PropertyServiceItem,
  type ServiceOfferMode,
  type ServicePricingMode,
} from '@/lib/propertyServices'
import { hasRichContent, parseGuideContent, serializeGuideContent } from '@/lib/guideContent'

interface PropertyServicesPanelProps {
  propertyId: string
  propertyName: string
  userId?: string | null
}

function groupByCategory(items: PropertyServiceItem[]) {
  const groups = new Map<string, PropertyServiceItem[]>()
  for (const item of items) {
    const key = item.service.category ?? 'other'
    const current = groups.get(key) ?? []
    current.push(item)
    groups.set(key, current)
  }
  return [...groups.entries()].sort(([a], [b]) => (
    serviceCategoryLabel(a).localeCompare(serviceCategoryLabel(b), 'fr')
  ))
}

export function PropertyServicesPanel({
  propertyId,
  propertyName,
  userId,
}: PropertyServicesPanelProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [items, setItems] = useState<PropertyServiceItem[]>([])
  const [editingItem, setEditingItem] = useState<PropertyServiceItem | null>(null)
  const [editForm, setEditForm] = useState({
    pricingMode: 'fixed' as ServicePricingMode,
    customPrice: '',
    providerName: '',
    includesText: '',
    offerTitle: '',
    offerMode: 'specific' as ServiceOfferMode,
    generalNote: DEFAULT_GENERAL_OFFER_MESSAGE,
    isDetailed: false,
    blocks: parseGuideContent(''),
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    Promise.all([
      fetchCatalogServices(),
      fetchPropertyServiceAssignments(propertyId),
    ]).then(([servicesResult, assignmentsResult]) => {
      if (cancelled) return

      if (servicesResult.error) {
        setError(servicesResult.error.message)
        setItems([])
      } else if (assignmentsResult.error) {
        setError(assignmentsResult.error.message)
        setItems([])
      } else {
        setItems(mergePropertyServices(
          (servicesResult.data ?? []) as PropertyServiceItem['service'][],
          (assignmentsResult.data ?? []) as PropertyServiceAssignment[],
        ))
      }

      setLoading(false)
    })

    return () => { cancelled = true }
  }, [propertyId])

  const enabledCount = countEnabledPropertyServices(items)
  const groupedItems = useMemo(() => groupByCategory(items), [items])

  const updateItemFromSaved = (serviceId: string, saved: PropertyServiceAssignment) => {
    setItems(current => current.map(entry => {
      if (entry.service.id !== serviceId) return entry
      const pricing = resolveServicePricing(entry.service, saved)
      return {
        ...entry,
        assignment: saved,
        enabled: saved.enabled,
        pricing,
        effectivePrice: pricing.amount ?? 0,
      }
    }))
  }

  const openEditModal = (item: PropertyServiceItem) => {
    const pricing = resolveServicePricing(item.service, item.assignment)
    setEditingItem(item)
    setEditForm({
      pricingMode: pricing.mode,
      customPrice: item.assignment?.custom_price != null
        ? String(item.assignment.custom_price)
        : pricing.amount != null ? String(pricing.amount) : '',
      providerName: item.assignment?.provider_name ?? item.service.provider_name ?? '',
      includesText: item.assignment?.includes_text ?? item.service.includes_text ?? '',
      offerTitle: item.assignment?.offer_title ?? '',
      offerMode: item.assignment?.offer_mode ?? 'specific',
      generalNote: item.assignment?.general_note ?? DEFAULT_GENERAL_OFFER_MESSAGE,
      isDetailed: isServiceDetailed(item.assignment),
      blocks: parseGuideContent(item.assignment?.custom_description ?? ''),
    })
  }

  const handleToggle = async (item: PropertyServiceItem, enabled: boolean) => {
    setSaving(true)
    setError('')
    setSuccess('')

    const assignment = item.assignment
    const { data, error: saveError } = await savePropertyServiceAssignment({
      property_id: propertyId,
      service_id: item.service.id,
      enabled,
      sort_order: assignment?.sort_order ?? items.indexOf(item),
      custom_price: assignment?.custom_price ?? null,
      custom_description: assignment?.custom_description ?? null,
      pricing_mode: assignment?.pricing_mode ?? null,
      provider_name: assignment?.provider_name ?? null,
      includes_text: assignment?.includes_text ?? null,
      offer_title: assignment?.offer_title ?? null,
      is_detailed: assignment?.is_detailed ?? false,
      offer_mode: assignment?.offer_mode ?? 'specific',
      general_note: assignment?.general_note ?? null,
    })

    setSaving(false)

    if (saveError || !data) {
      setError(saveError?.message ?? 'Impossible de mettre à jour le service.')
      return
    }

    updateItemFromSaved(item.service.id, data as PropertyServiceAssignment)
    setSuccess(enabled ? `${item.service.name} activé.` : `${item.service.name} désactivé.`)
  }

  const handleSaveDetails = async () => {
    if (!editingItem) return

    const customPrice = editForm.customPrice.trim()
      ? Number.parseFloat(editForm.customPrice.replace(',', '.'))
      : null

    if (
      editForm.pricingMode !== 'quote'
      && customPrice != null
      && (Number.isNaN(customPrice) || customPrice < 0)
    ) {
      setError('Le prix est invalide.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const { data, error: saveError } = await savePropertyServiceAssignment({
      property_id: propertyId,
      service_id: editingItem.service.id,
      enabled: editingItem.enabled,
      sort_order: editingItem.assignment?.sort_order ?? items.indexOf(editingItem),
      custom_price: editForm.pricingMode === 'quote' ? null : customPrice,
      custom_description: hasRichContent(serializeGuideContent(editForm.blocks))
        ? serializeGuideContent(editForm.blocks)
        : null,
      pricing_mode: editForm.pricingMode,
      provider_name: editForm.providerName,
      includes_text: editForm.includesText,
      offer_title: editForm.offerTitle,
      is_detailed: editForm.isDetailed,
      offer_mode: editForm.offerMode,
      general_note: editForm.offerMode === 'general' ? editForm.generalNote : null,
    })

    setSaving(false)

    if (saveError || !data) {
      setError(saveError?.message ?? 'Impossible d’enregistrer le service.')
      return
    }

    updateItemFromSaved(editingItem.service.id, data as PropertyServiceAssignment)
    setEditingItem(null)
    setSuccess(`${editingItem.service.name} mis à jour.`)
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement des services…</p>
  }

  const catalogPricing = editingItem
    ? resolveServicePricing(editingItem.service, null)
    : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{propertyName}</p>
          <p className="text-xs text-muted-foreground">
            {enabledCount} service{enabledCount > 1 ? 's' : ''} activé{enabledCount > 1 ? 's' : ''}
            {' · '}
            {items.length} au catalogue
          </p>
        </div>
        <Link
          to="/app/settings"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-all hover:bg-muted"
        >
          <Settings2 className="mr-1.5 h-4 w-4" />
          Catalogue conciergerie (global)
          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
        </Link>
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

      <Card className="p-5 space-y-2">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Catalogue conciergerie</p>
        <p className="text-sm text-muted-foreground">
          Chaque prestation peut être une offre précise (chef nommé, tarif défini) ou une offre généralisée
          proposée par la conciergerie / house manager selon les disponibilités.
          Les demandes voyageur passent par l&apos;onglet Conciergerie du portail.
        </p>
      </Card>

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Aucun service dans le catalogue global.</p>
          <Link
            to="/app/settings"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-all hover:bg-muted"
          >
            Créer des services dans les paramètres
          </Link>
        </Card>
      ) : (
        groupedItems.map(([category, categoryItems]) => (
          <Card key={category} className="p-5 space-y-3">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {serviceCategoryLabel(category)}
            </p>
            <div className="divide-y divide-border">
              {categoryItems.map(item => {
                const description = getServiceDescriptionContent(item.service, item.assignment)
                const hasCustomDescription = Boolean(
                  item.assignment?.custom_description && hasRichContent(item.assignment.custom_description),
                )
                const displayName = getServiceDisplayName(item.service, item.assignment)
                const offer = resolveServiceOffer(item.service, item.assignment)
                const detailed = offer.isDetailed
                const customized = hasServiceCustomization(item.assignment)
                const isGeneral = isGeneralServiceOffer(item.assignment)

                return (
                  <div
                    key={item.service.id}
                    className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                        {item.service.image_url ? (
                          <img
                            src={item.service.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-mono text-muted-foreground">
                            IMG
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{displayName}</p>
                          {displayName !== item.service.name && (
                            <span className="text-xs text-muted-foreground">({item.service.name})</span>
                          )}
                          {item.enabled && <Badge variant="success">Actif</Badge>}
                          {!item.enabled && customized && <Badge variant="muted">Configuré</Badge>}
                          {item.enabled && (
                            <Badge variant={isGeneral ? 'warning' : 'success'}>
                              {serviceOfferModeLabels[offer.mode]}
                            </Badge>
                          )}
                          {item.enabled && !isGeneral && (
                            <Badge variant={detailed ? 'success' : 'muted'}>
                              {detailed ? 'Fiche détaillée' : 'Fiche simple'}
                            </Badge>
                          )}
                          {!isGeneral && offer.pricing.mode === 'quote' && <Badge variant="muted">Sur devis</Badge>}
                          {!isGeneral && offer.pricing.isPartnerOffer && (
                            <Badge variant="muted">Prestataire My Butlr</Badge>
                          )}
                          {detailed && hasCustomDescription && <Badge variant="muted">Contenu enrichi</Badge>}
                          {!item.service.available && <Badge variant="warning">Catalogue inactif</Badge>}
                        </div>
                        {offer.providerLabel && (
                          <p className="mt-1 text-xs font-medium text-foreground">
                            {offer.providerLabel}
                          </p>
                        )}
                        {isGeneral && offer.conciergeMessage && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {offer.conciergeMessage}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {description && !hasRichContent(description)
                            ? description
                            : item.service.description ?? 'Aucune description.'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>
                            Tarif : <span className="font-medium text-foreground">{offer.pricing.displayLabel}</span>
                          </span>
                          {!isGeneral && offer.includesText && (
                            <span>Inclus : {offer.includesText}</span>
                          )}
                          <span>Commission {item.service.commission ?? 0}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEditModal(item)}
                        disabled={saving}
                        aria-label={`Modifier ${item.service.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={enabled => void handleToggle(item, enabled)}
                        disabled={saving || !item.service.available}
                        aria-label={item.enabled ? `Désactiver ${item.service.name}` : `Activer ${item.service.name}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        ))
      )}

      <Modal
        open={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title={editingItem ? `Personnaliser · ${editingItem.service.name}` : 'Service'}
        className="max-w-3xl"
      >
        {editingItem && catalogPricing && (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p>
                Catalogue : {servicePricingModeLabels[catalogPricing.mode]}
                {catalogPricing.mode !== 'quote' && (
                  <> · {catalogPricing.displayLabel}</>
                )}
                {' · '}
                Commission {editingItem.service.commission ?? 0}%
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Type d’offre</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(serviceOfferModeLabels) as ServiceOfferMode[]).map(mode => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={editForm.offerMode === mode ? 'primary' : 'secondary'}
                    onClick={() => setEditForm(current => ({ ...current, offerMode: mode }))}
                  >
                    {serviceOfferModeLabels[mode]}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Précise : chef ou prestataire identifié avec tarif défini.
                Généralisée : la conciergerie ou le house manager propose selon les disponibilités.
              </p>
            </div>

            <Input
              label={editForm.offerMode === 'general' ? 'Intitulé affiché' : 'Titre de l’offre (optionnel)'}
              value={editForm.offerTitle}
              onChange={event => setEditForm(current => ({
                ...current,
                offerTitle: event.target.value,
              }))}
              placeholder={editForm.offerMode === 'general'
                ? 'Ex. Chef privé à domicile'
                : 'Ex. Repas asiatique 3 services'}
            />

            {editForm.offerMode === 'general' && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Message conciergerie</label>
                <textarea
                  rows={3}
                  value={editForm.generalNote}
                  onChange={event => setEditForm(current => ({
                    ...current,
                    generalNote: event.target.value,
                  }))}
                  className="w-full px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
                />
                <p className="text-xs text-muted-foreground">
                  Explique au voyageur que l’équipe conciergerie proposera les options disponibles.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {editForm.offerMode === 'general' ? 'Tarif indicatif' : 'Mode tarifaire'}
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(servicePricingModeLabels) as ServicePricingMode[]).map(mode => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={editForm.pricingMode === mode ? 'primary' : 'secondary'}
                    onClick={() => setEditForm(current => ({ ...current, pricingMode: mode }))}
                  >
                    {servicePricingModeLabels[mode]}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Sur devis pour les expériences premium (hélicoptère). Par personne pour les prestations type Airbnb
                (chef, massage…).
              </p>
            </div>

            {editForm.pricingMode !== 'quote' && (
              <Input
                label={editForm.pricingMode === 'per_person' ? 'Prix par personne (€)' : 'Prix (€)'}
                type="number"
                min="0"
                step="0.01"
                value={editForm.customPrice}
                onChange={event => setEditForm(current => ({
                  ...current,
                  customPrice: event.target.value,
                }))}
                placeholder={String(editingItem.service.starting_price ?? '')}
              />
            )}

            {editForm.offerMode === 'specific' && (
              <>
                <Input
                  label="Prestataire My Butlr (optionnel)"
                  value={editForm.providerName}
                  onChange={event => setEditForm(current => ({
                    ...current,
                    providerName: event.target.value,
                  }))}
                  placeholder="Ex. Chef Remi"
                />

                <Input
                  label="Inclus dans l’offre (optionnel)"
                  value={editForm.includesText}
                  onChange={event => setEditForm(current => ({
                    ...current,
                    includesText: event.target.value,
                  }))}
                  placeholder="Ex. Courses incluses, menu 3 plats, service table"
                />
              </>
            )}

            {editForm.offerMode === 'general' && editForm.pricingMode !== 'quote' && (
              <p className="text-xs text-muted-foreground">
                Le tarif affiché est indicatif ; la conciergerie confirmera le devis final selon les disponibilités.
              </p>
            )}

            <SwitchField
              checked={editForm.isDetailed}
              onCheckedChange={isDetailed => setEditForm(current => ({ ...current, isDetailed }))}
              label="Fiche détaillée dans le portail"
              description={
                editForm.offerMode === 'general'
                  ? 'Ajoutez une présentation enrichie en complément du message conciergerie.'
                  : 'Désactivé : carte simple (titre, tarif, prestataire, inclus). Activé : description enrichie visible par le voyageur.'
              }
            />

            {editForm.isDetailed ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Description détaillée</p>
                <p className="text-xs text-muted-foreground">
                  Présentation complète : texte, étapes, listes, images et vidéos.
                </p>
                <GuideBlockEditor
                  blocks={editForm.blocks}
                  onChange={blocks => setEditForm(current => ({ ...current, blocks }))}
                  propertyId={propertyId}
                  userId={userId}
                />
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                {editForm.offerMode === 'general'
                  ? 'Fiche simple : intitulé, tarif indicatif et message conciergerie affichés au voyageur.'
                  : 'Fiche simple : titre, tarif, prestataire et éléments inclus affichés au voyageur.'}
              </div>
            )}

            {editForm.isDetailed && hasRichContent(serializeGuideContent(editForm.blocks)) && (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Aperçu</p>
                <div className="rounded-md border border-border bg-card p-4">
                  <GuideContentRenderer content={serializeGuideContent(editForm.blocks)} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditingItem(null)}>Annuler</Button>
              <Button onClick={() => void handleSaveDetails()} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
