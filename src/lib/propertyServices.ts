import { hasRichContent, normalizeRichContentForSave } from './guideContent'
import { mapCatalogCategoryToStayCategory, type StayServiceRequestDraft } from './stayReserve'
import { supabase } from './supabase'
import type { Service, ServiceOptionChoice, ServiceOptionGroup } from './types'

export type { StayServiceRequestDraft, ServiceOptionChoice, ServiceOptionGroup }

export type ServicePricingMode = 'fixed' | 'per_person' | 'quote'
export type ServiceOfferMode = 'specific' | 'general'
export type ServiceBookingMode = 'quote' | 'direct'

/** Selected choice ids keyed by option group id */
export type ServiceSelectedOptions = Record<string, string>

export const SERVICE_OPTION_PRESETS: Array<{
  id: string
  label: string
  group: ServiceOptionGroup
}> = [
  {
    id: 'airport',
    label: 'Aéroport (transfert)',
    group: {
      id: 'airport',
      label: 'Aéroport',
      required: true,
      choices: [
        { id: 'nice', label: 'Nice Côte d’Azur (NCE)', price: 120 },
        { id: 'cannes', label: 'Cannes Mandelieu (CEQ)', price: 90 },
        { id: 'monaco', label: 'Héliport Monaco', price: 180 },
      ],
    },
  },
  {
    id: 'car_model',
    label: 'Modèle de voiture',
    group: {
      id: 'model',
      label: 'Modèle',
      required: true,
      choices: [
        { id: 'compact', label: 'Citadine', price: 80 },
        { id: 'suv', label: 'SUV', price: 150 },
        { id: 'luxury', label: 'Berline luxe', price: 250 },
      ],
    },
  },
  {
    id: 'boat',
    label: 'Type de bateau',
    group: {
      id: 'boat',
      label: 'Bateau',
      required: true,
      choices: [
        { id: 'rib', label: 'Semi-rigide', price: 450 },
        { id: 'dayboat', label: 'Dayboat', price: 900 },
        { id: 'yacht', label: 'Yacht', price: 2500 },
      ],
    },
  },
]

function slugifyOptionId(value: string): string {
  const base = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `opt-${Math.random().toString(36).slice(2, 8)}`
}

export function createEmptyOptionGroup(label = 'Nouvelle option'): ServiceOptionGroup {
  return {
    id: slugifyOptionId(label),
    label,
    required: true,
    choices: [{ id: 'choice-1', label: 'Option 1', price: 0 }],
  }
}

export function normalizeServiceOptions(raw: unknown): ServiceOptionGroup[] {
  if (!Array.isArray(raw)) return []
  const groups: ServiceOptionGroup[] = []

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const group = entry as Partial<ServiceOptionGroup>
    const label = typeof group.label === 'string' ? group.label.trim() : ''
    if (!label) continue
    const choicesRaw = Array.isArray(group.choices) ? group.choices : []
    const choices: ServiceOptionChoice[] = []
    for (const choice of choicesRaw) {
      if (!choice || typeof choice !== 'object') continue
      const c = choice as Partial<ServiceOptionChoice>
      const choiceLabel = typeof c.label === 'string' ? c.label.trim() : ''
      if (!choiceLabel) continue
      const price = Number(c.price)
      choices.push({
        id: typeof c.id === 'string' && c.id.trim()
          ? c.id.trim()
          : slugifyOptionId(choiceLabel),
        label: choiceLabel,
        price: Number.isFinite(price) && price >= 0 ? price : 0,
      })
    }
    if (choices.length === 0) continue
    groups.push({
      id: typeof group.id === 'string' && group.id.trim()
        ? group.id.trim()
        : slugifyOptionId(label),
      label,
      required: group.required !== false,
      choices,
    })
  }

  return groups
}

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
  booking_mode: ServiceBookingMode | null
  /** NULL/undefined inherits catalog options; [] clears; otherwise overrides */
  options?: ServiceOptionGroup[] | null
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

export const serviceBookingModeLabels: Record<ServiceBookingMode, string> = {
  quote: 'Sur devis',
  direct: 'Achat direct',
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

export function resolveServiceOptions(
  service: Service,
  assignment: PropertyServiceAssignment | null,
): ServiceOptionGroup[] {
  if (assignment && 'options' in assignment && assignment.options !== null && assignment.options !== undefined) {
    return normalizeServiceOptions(assignment.options)
  }
  return normalizeServiceOptions(service.options)
}

export function computeOptionsStartingFrom(
  groups: ServiceOptionGroup[],
): number {
  return groups.reduce((sum, group) => {
    if (!group.required || group.choices.length === 0) return sum
    const min = Math.min(...group.choices.map(c => Number(c.price) || 0))
    return sum + (Number.isFinite(min) ? min : 0)
  }, 0)
}

export function sumSelectedOptionPrices(
  groups: ServiceOptionGroup[],
  selected: ServiceSelectedOptions,
): number | null {
  let total = 0
  for (const group of groups) {
    const choiceId = selected[group.id]?.trim()
    if (!choiceId) {
      if (group.required) return null
      continue
    }
    const choice = group.choices.find(c => c.id === choiceId)
    if (!choice) return null
    total += Number(choice.price) || 0
  }
  return total
}

export function areServiceOptionsComplete(
  groups: ServiceOptionGroup[],
  selected: ServiceSelectedOptions,
): boolean {
  return sumSelectedOptionPrices(groups, selected) != null
}

export function formatSelectedOptionsSummary(
  groups: ServiceOptionGroup[],
  selected: ServiceSelectedOptions,
): string {
  const lines: string[] = []
  for (const group of groups) {
    const choiceId = selected[group.id]
    if (!choiceId) continue
    const choice = group.choices.find(c => c.id === choiceId)
    if (!choice) continue
    lines.push(`${group.label} : ${choice.label}`)
  }
  return lines.join('\n')
}

export function defaultSelectedServiceOptions(
  groups: ServiceOptionGroup[],
): ServiceSelectedOptions {
  const selected: ServiceSelectedOptions = {}
  for (const group of groups) {
    if (group.required && group.choices[0]) {
      selected[group.id] = group.choices[0].id
    }
  }
  return selected
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
  const options = resolveServiceOptions(service, assignment)
  const optionsFrom = computeOptionsStartingFrom(options)

  let amount: number | null = null
  if (mode !== 'quote') {
    const raw = assignment?.custom_price ?? service.starting_price
    const base = raw != null ? Number(raw) : 0
    if (options.length > 0) {
      amount = (Number.isFinite(base) ? base : 0) + optionsFrom
    } else {
      amount = raw != null ? Number(raw) : null
    }
  }

  return {
    mode,
    amount,
    providerName,
    includesText,
    offerTitle,
    displayLabel: options.length > 0 && mode !== 'quote'
      ? formatPricingDisplay(mode, amount)
      : formatPricingDisplay(mode, amount),
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

export function resolveServiceBookingMode(
  service: Service,
  assignment: PropertyServiceAssignment | null,
): ServiceBookingMode {
  if (isGeneralServiceOffer(assignment)) return 'quote'
  const pricing = resolveServicePricing(service, assignment)
  const options = resolveServiceOptions(service, assignment)
  const hasPricedOptions = options.some(g => g.choices.some(c => Number(c.price) > 0))
  if (
    pricing.mode === 'quote'
    || ((pricing.amount == null || pricing.amount <= 0) && !hasPricedOptions)
  ) {
    return 'quote'
  }
  const raw = assignment?.booking_mode ?? service.booking_mode ?? 'quote'
  return raw === 'direct' ? 'direct' : 'quote'
}

export function canDirectBookService(
  service: Service,
  assignment: PropertyServiceAssignment | null,
): boolean {
  return resolveServiceBookingMode(service, assignment) === 'direct'
}

export function computeServiceAmount(
  service: Service,
  assignment: PropertyServiceAssignment | null,
  quantity = 1,
  selected: ServiceSelectedOptions = {},
): number | null {
  const pricing = resolveServicePricing(service, assignment)
  if (pricing.mode === 'quote') return null

  const options = resolveServiceOptions(service, assignment)
  const optionsTotal = sumSelectedOptionPrices(options, selected)
  if (optionsTotal == null) return null

  const baseRaw = assignment?.custom_price ?? service.starting_price
  const base = baseRaw != null ? Number(baseRaw) : 0
  const unit = (Number.isFinite(base) ? base : 0) + optionsTotal
  if (unit <= 0) return null

  const qty = Math.max(1, quantity)
  if (pricing.mode === 'per_person') return unit * qty
  return unit
}

export function computeDirectServiceAmount(
  service: Service,
  assignment: PropertyServiceAssignment | null,
  quantity = 1,
  selected: ServiceSelectedOptions = {},
): number | null {
  if (!canDirectBookService(service, assignment)) return null
  return computeServiceAmount(service, assignment, quantity, selected)
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
      booking_mode,
      provider_name,
      includes_text,
      options
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
  booking_mode?: ServiceBookingMode | null
  options?: ServiceOptionGroup[] | null
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
    booking_mode: input.offer_mode === 'general' || input.pricing_mode === 'quote'
      ? 'quote'
      : (input.booking_mode ?? null),
    ...(input.options !== undefined
      ? { options: input.options == null ? null : normalizeServiceOptions(input.options) }
      : {}),
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

export function buildStayServiceRequestDraft(
  item: PropertyServiceItem,
  selected: ServiceSelectedOptions = {},
): StayServiceRequestDraft {
  const offer = resolveServiceOffer(item.service, item.assignment)
  const options = resolveServiceOptions(item.service, item.assignment)
  const optionsSummary = formatSelectedOptionsSummary(options, selected)
  const optionsTotal = sumSelectedOptionPrices(options, selected)
  const baseRaw = item.assignment?.custom_price ?? item.service.starting_price
  const base = baseRaw != null ? Number(baseRaw) : 0
  const estimated = options.length > 0 && optionsTotal != null
    ? (Number.isFinite(base) ? base : 0) + optionsTotal
    : offer.pricing.mode !== 'quote' && offer.pricing.amount != null
      ? offer.pricing.amount
      : undefined

  const descriptionParts = [
    offer.includesText ? `Inclus : ${offer.includesText}` : null,
    offer.conciergeMessage,
    !offer.isGeneral && offer.providerLabel ? `Prestataire : ${offer.providerLabel}` : null,
    optionsSummary || null,
  ].filter(Boolean)

  return {
    category: mapCatalogCategoryToStayCategory(item.service.category),
    title: offer.displayName,
    description: descriptionParts.join('\n\n') || `Demande pour ${offer.displayName}`,
    estimatedAmount: estimated,
    propertyServiceId: item.assignment?.id,
    providerName: offer.providerLabel ?? offer.pricing.providerName ?? undefined,
  }
}
