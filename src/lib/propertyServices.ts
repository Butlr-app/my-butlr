import { hasRichContent, normalizeRichContentForSave } from './guideContent'
import { mapCatalogCategoryToStayCategory, type StayServiceRequestDraft } from './stayReserve'
import { supabase } from './supabase'
import type { Service } from './types'

export type { StayServiceRequestDraft }

export type ServicePricingMode = 'fixed' | 'per_person' | 'quote'
export type ServiceOfferMode = 'specific' | 'general'

export const DEFAULT_GENERAL_OFFER_MESSAGE =
  'Votre conciergerie ou house manager vous proposera les meilleures options selon vos dates et disponibilités.'

export const serviceOfferModeLabels: Record<ServiceOfferMode, string> = {
  specific: 'Offre précise',
  general: 'Offre généralisée',
}

export interface PropertyServiceAssignment {
  id: string
  property_id: string
  service_id: string
  enabled: boolean
  sort_order: number
  custom_price: number | null
  custom_description: string | null
  pricing_mode: ServicePricingMode | null
  provider_name: string | null
  includes_text: string | null
  offer_title: string | null
  is_detailed: boolean
  offer_mode: ServiceOfferMode
  general_note: string | null
  updated_at?: string
}

export interface ResolvedServiceOffer {
  mode: ServiceOfferMode
  displayName: string
  pricing: ResolvedServicePricing
  providerLabel: string | null
  includesText: string | null
  conciergeMessage: string | null
  isDetailed: boolean
  isGeneral: boolean
}

export interface ResolvedServicePricing {
  mode: ServicePricingMode
  amount: number | null
  providerName: string | null
  includesText: string | null
  offerTitle: string | null
  displayLabel: string
  isPartnerOffer: boolean
}

export interface PropertyServiceItem {
  service: Service & { image_url?: string | null }
  assignment: PropertyServiceAssignment | null
  enabled: boolean
  pricing: ResolvedServicePricing
  /** @deprecated use pricing.amount */
  effectivePrice: number
}

export const serviceCategoryLabels: Record<string, string> = {
  transport: 'Transport',
  wellness: 'Bien-être & spa',
  activities: 'Activités',
  lifestyle: 'Art de vivre',
  dining: 'Gastronomie',
  family: 'Famille',
  experiences: 'Expériences',
  leisure: 'Loisirs',
  other: 'Autre',
}

/** Noms catalogue globaux (EN) → libellés FR pour le portail voyageur */
export const serviceNameLabels: Record<string, string> = {
  'Private Chef': 'Chef privé',
  'Boat Rental': 'Location de bateau',
  'Helicopter Tour': 'Tour en hélicoptère',
  'Wine Tasting': 'Dégustation de vins',
  Childcare: 'Garde d’enfants',
  'Event Planning': 'Organisation d’événements',
  'Personal Shopper': 'Personal shopper',
  'Airport Transfer': 'Transfert aéroport',
  'Fitness Coach': 'Coach sportif',
  'Wellness & Spa': 'Bien-être & spa',
}

export function localizeServiceName(name: string | null | undefined): string {
  if (!name?.trim()) return ''
  return serviceNameLabels[name.trim()] ?? name.trim()
}

export const servicePricingModeLabels: Record<ServicePricingMode, string> = {
  fixed: 'Prix fixe',
  per_person: 'Par personne',
  quote: 'Sur devis',
}

export function serviceCategoryLabel(category: string | null | undefined): string {
  if (!category) return serviceCategoryLabels.other
  return serviceCategoryLabels[category] ?? category
}

export function formatServicePrice(value: number | null | undefined): string {
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

export function formatPricingDisplay(
  mode: ServicePricingMode,
  amount: number | null | undefined,
): string {
  if (mode === 'quote') return 'Sur devis'
  if (amount == null || Number.isNaN(Number(amount))) return 'Sur devis'
  if (mode === 'per_person') return `${formatServicePrice(amount)} / personne`
  return `À partir de ${formatServicePrice(amount)}`
}

export function resolveServicePricingMode(
  service: Service,
  assignment: PropertyServiceAssignment | null,
): ServicePricingMode {
  const mode = assignment?.pricing_mode ?? service.pricing_mode ?? 'fixed'
  if (mode === 'fixed' || mode === 'per_person' || mode === 'quote') return mode
  return 'fixed'
}

export function resolveServicePricing(
  service: Service,
  assignment: PropertyServiceAssignment | null,
): ResolvedServicePricing {
  const mode = resolveServicePricingMode(service, assignment)
  const providerName = assignment?.provider_name?.trim()
    || service.provider_name?.trim()
    || null
  const includesText = assignment?.includes_text?.trim()
    || service.includes_text?.trim()
    || null
  const offerTitle = assignment?.offer_title?.trim() || null

  let amount: number | null = null
  if (mode !== 'quote') {
    const raw = assignment?.custom_price ?? service.starting_price
    amount = raw != null ? Number(raw) : null
  }

  return {
    mode,
    amount,
    providerName,
    includesText,
    offerTitle,
    displayLabel: formatPricingDisplay(mode, amount),
    isPartnerOffer: Boolean(providerName),
  }
}

export function resolveServiceOfferMode(
  assignment: PropertyServiceAssignment | null,
): ServiceOfferMode {
  return assignment?.offer_mode === 'general' ? 'general' : 'specific'
}

export function isGeneralServiceOffer(assignment: PropertyServiceAssignment | null): boolean {
  return resolveServiceOfferMode(assignment) === 'general'
}

export function resolveServiceOffer(
  service: Service,
  assignment: PropertyServiceAssignment | null,
): ResolvedServiceOffer {
  const offerMode = resolveServiceOfferMode(assignment)
  const pricing = resolveServicePricing(service, assignment)
  const isDetailed = isServiceDetailed(assignment)
  const displayName = getServiceDisplayName(service, assignment)

  if (offerMode === 'general') {
    const indicativePrice = pricing.mode === 'quote'
      ? 'Sur devis'
      : pricing.amount != null
        ? `${pricing.displayLabel} · indicatif`
        : 'Tarif sur demande'

    return {
      mode: 'general',
      displayName,
      pricing: {
        ...pricing,
        displayLabel: indicativePrice,
        providerName: null,
        includesText: null,
        isPartnerOffer: false,
      },
      providerLabel: null,
      includesText: null,
      conciergeMessage: assignment?.general_note?.trim() || DEFAULT_GENERAL_OFFER_MESSAGE,
      isDetailed,
      isGeneral: true,
    }
  }

  return {
    mode: 'specific',
    displayName,
    pricing,
    providerLabel: pricing.providerName,
    includesText: pricing.includesText,
    conciergeMessage: null,
    isDetailed,
    isGeneral: false,
  }
}

export function isServiceDetailed(assignment: PropertyServiceAssignment | null): boolean {
  return Boolean(assignment?.is_detailed)
}

export function getServiceDisplayName(
  service: Service,
  assignment: PropertyServiceAssignment | null,
): string {
  const custom = assignment?.offer_title?.trim()
  if (custom) return custom
  return localizeServiceName(service.name) || service.name
}

export function getServiceSummaryText(
  service: Service,
  _assignment: PropertyServiceAssignment | null,
): string {
  if (service.description?.trim()) return service.description.trim()
  return service.name
}

export function hasServiceCustomization(assignment: PropertyServiceAssignment | null): boolean {
  if (!assignment) return false
  return Boolean(
    assignment.custom_price != null
    || assignment.pricing_mode
    || assignment.provider_name?.trim()
    || assignment.includes_text?.trim()
    || assignment.offer_title?.trim()
    || assignment.is_detailed
    || assignment.offer_mode === 'general'
    || assignment.general_note?.trim()
    || (assignment.custom_description && hasRichContent(assignment.custom_description)),
  )
}

export function getEffectiveServicePrice(
  service: Service,
  assignment: PropertyServiceAssignment | null,
): number {
  const pricing = resolveServicePricing(service, assignment)
  return pricing.amount ?? 0
}

export function getServiceDescriptionContent(
  service: Service,
  assignment: PropertyServiceAssignment | null,
): string {
  if (assignment?.custom_description && hasRichContent(assignment.custom_description)) {
    return assignment.custom_description
  }
  if (assignment?.custom_description?.trim()) {
    return assignment.custom_description
  }
  return service.description?.trim() ?? ''
}

export async function fetchCatalogServices() {
  return supabase
    .from('services')
    .select(`
      id,
      name,
      description,
      category,
      starting_price,
      commission,
      available,
      image_url,
      pricing_mode,
      provider_name,
      includes_text
    `)
    .order('category', { ascending: true })
    .order('name', { ascending: true })
}

export async function fetchPropertyServiceAssignments(propertyId: string) {
  return supabase
    .from('property_services')
    .select('*')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
}

export function mergePropertyServices(
  services: (Service & { image_url?: string | null })[],
  assignments: PropertyServiceAssignment[],
): PropertyServiceItem[] {
  const assignmentByServiceId = new Map(
    assignments.map(assignment => [assignment.service_id, assignment]),
  )

  return services.map(service => {
    const assignment = assignmentByServiceId.get(service.id) ?? null
    const enabled = assignment?.enabled ?? false
    const pricing = resolveServicePricing(service, assignment)
    return {
      service,
      assignment,
      enabled,
      pricing,
      effectivePrice: pricing.amount ?? 0,
    }
  })
}

export function countEnabledPropertyServices(items: PropertyServiceItem[]): number {
  return items.filter(item => item.enabled).length
}

export async function savePropertyServiceAssignment(input: {
  property_id: string
  service_id: string
  enabled: boolean
  sort_order?: number
  custom_price?: number | null
  custom_description?: string | null
  pricing_mode?: ServicePricingMode | null
  provider_name?: string | null
  includes_text?: string | null
  offer_title?: string | null
  is_detailed?: boolean
  offer_mode?: ServiceOfferMode
  general_note?: string | null
}) {
  const payload = {
    property_id: input.property_id,
    service_id: input.service_id,
    enabled: input.enabled,
    sort_order: input.sort_order ?? 0,
    custom_price: input.pricing_mode === 'quote' ? null : (input.custom_price ?? null),
    custom_description: normalizeRichContentForSave(input.custom_description ?? null),
    pricing_mode: input.pricing_mode ?? null,
    provider_name: input.provider_name?.trim() || null,
    includes_text: input.includes_text?.trim() || null,
    offer_title: input.offer_title?.trim() || null,
    is_detailed: input.is_detailed ?? false,
    offer_mode: input.offer_mode ?? 'specific',
    general_note: input.offer_mode === 'general'
      ? (input.general_note?.trim() || DEFAULT_GENERAL_OFFER_MESSAGE)
      : (input.general_note?.trim() || null),
    updated_at: new Date().toISOString(),
  }

  return supabase
    .from('property_services')
    .upsert(payload, { onConflict: 'property_id,service_id' })
    .select('*')
    .single()
}

export async function fetchEnabledPropertyServices(propertyId: string) {
  const [servicesResult, assignmentsResult] = await Promise.all([
    fetchCatalogServices(),
    fetchPropertyServiceAssignments(propertyId),
  ])

  if (servicesResult.error) {
    return { data: [] as PropertyServiceItem[], error: servicesResult.error }
  }
  if (assignmentsResult.error) {
    return { data: [] as PropertyServiceItem[], error: assignmentsResult.error }
  }

  const items = mergePropertyServices(
    (servicesResult.data ?? []) as PropertyServiceItem['service'][],
    (assignmentsResult.data ?? []) as PropertyServiceAssignment[],
  ).filter(item => item.enabled && item.service.available)

  return { data: items, error: null }
}

export async function deletePropertyServiceAssignment(propertyId: string, serviceId: string) {
  return supabase
    .from('property_services')
    .delete()
    .eq('property_id', propertyId)
    .eq('service_id', serviceId)
}

export function buildStayServiceRequestDraft(item: PropertyServiceItem): StayServiceRequestDraft {
  const offer = resolveServiceOffer(item.service, item.assignment)
  const descriptionParts = [
    offer.includesText ? `Inclus : ${offer.includesText}` : null,
    offer.conciergeMessage,
    !offer.isGeneral && offer.providerLabel ? `Prestataire : ${offer.providerLabel}` : null,
  ].filter(Boolean)

  return {
    category: mapCatalogCategoryToStayCategory(item.service.category),
    title: offer.displayName,
    description: descriptionParts.join('\n\n') || `Demande pour ${offer.displayName}`,
    estimatedAmount: offer.pricing.mode !== 'quote' && offer.pricing.amount != null
      ? offer.pricing.amount
      : undefined,
    propertyServiceId: item.assignment?.id,
    providerName: offer.providerLabel ?? offer.pricing.providerName ?? undefined,
  }
}
