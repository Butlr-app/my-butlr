import { supabase } from './supabase'

export type PartnerSource = 'manual' | 'marketplace'
export type PartnerStatus = 'active' | 'inactive'

export interface PartnerRecord {
  id: string
  name: string
  category: string | null
  location: string | null
  contact: string | null
  email: string | null
  phone: string | null
  commission: number
  status: PartnerStatus
  rating: number
  bookings_count: number
  source: PartnerSource
  owner_id: string | null
  profile_id: string | null
  notes: string | null
  description?: string | null
  service_areas?: string | null
  onboarding_completed?: boolean
  created_at?: string
  updated_at?: string
}

export interface PartnerFormInput {
  name: string
  category: string
  location: string
  contact: string
  email: string
  phone: string
  commission: string
  status: PartnerStatus
  notes: string
}

export const partnerSourceLabels: Record<PartnerSource, string> = {
  manual: 'Partenaire habituel',
  marketplace: 'Inscrit sur la plateforme',
}

export const partnerStatusLabels: Record<PartnerStatus, string> = {
  active: 'Actif',
  inactive: 'Inactif',
}

export const intervenantPartnerCategories = [
  'Ménage & entretien',
  'Jardinage & espaces verts',
  'Piscine & spa technique',
  'Électricité',
  'Menuiserie',
  'Maintenance & réparations',
  'Sécurité',
  'Autre (technique)',
] as const

export const servicePartnerCategories = [
  'Chef & restauration',
  'Spa & bien-être',
  'Transport',
  'Yacht & mer',
  'Activités & loisirs',
  'Autre (service)',
] as const

export type IntervenantPartnerCategory = (typeof intervenantPartnerCategories)[number]
export type ServicePartnerCategory = (typeof servicePartnerCategories)[number]
export type PartnerKind = 'intervenant' | 'service' | 'unknown'
export type PartnerCategoryScope = 'intervenant' | 'service' | 'all'

/** @deprecated Use intervenantPartnerCategories */
export const technicalPartnerCategories = [
  'Piscine & spa technique',
  'Jardinage & espaces verts',
  'Maintenance & réparations',
] as const

export type TechnicalPartnerCategory = (typeof technicalPartnerCategories)[number]

export const partnerCategoryOptions = [
  ...intervenantPartnerCategories,
  ...servicePartnerCategories,
]

/** Legacy free-text values still treated as intervenants. */
const legacyIntervenantCategories = new Set<string>([
  ...intervenantPartnerCategories,
])

export type IntervenantCategoryFilterId = 'all' | 'cleaning' | 'pool' | 'garden' | 'works'

export const intervenantPartnerCategoryFilters: Array<{
  id: IntervenantCategoryFilterId
  label: string
  /** Exact category match, or null when the filter groups several categories. */
  category: IntervenantPartnerCategory | null
  categories?: readonly string[]
}> = [
  { id: 'all', label: 'Tous', category: null },
  { id: 'cleaning', label: 'Ménage', category: 'Ménage & entretien' },
  { id: 'pool', label: 'Piscine', category: 'Piscine & spa technique' },
  { id: 'garden', label: 'Jardinage', category: 'Jardinage & espaces verts' },
  {
    id: 'works',
    label: 'Travaux',
    category: null,
    categories: ['Électricité', 'Menuiserie', 'Maintenance & réparations'],
  },
]

/** @deprecated Use intervenantPartnerCategoryFilters */
export const technicalPartnerCategoryFilters = intervenantPartnerCategoryFilters

export function partnerCategoriesForScope(scope: PartnerCategoryScope = 'all'): string[] {
  if (scope === 'intervenant') return [...intervenantPartnerCategories]
  if (scope === 'service') return [...servicePartnerCategories]
  return [...partnerCategoryOptions]
}

export function isIntervenantPartnerCategory(
  category: string | null | undefined,
): boolean {
  return Boolean(category && legacyIntervenantCategories.has(category))
}

export function isServicePartnerCategory(
  category: string | null | undefined,
): boolean {
  return Boolean(
    category && (servicePartnerCategories as readonly string[]).includes(category),
  )
}

export function partnerKindFromCategory(
  category: string | null | undefined,
): PartnerKind {
  if (isIntervenantPartnerCategory(category)) return 'intervenant'
  if (isServicePartnerCategory(category)) return 'service'
  return 'unknown'
}

/** Prefer intervenant helper; kept for existing imports. */
export function isTechnicalPartnerCategory(
  category: string | null | undefined,
): category is TechnicalPartnerCategory {
  return isIntervenantPartnerCategory(category)
}

export function matchesIntervenantCategoryFilter(
  category: string | null | undefined,
  filterId: IntervenantCategoryFilterId,
): boolean {
  if (!isIntervenantPartnerCategory(category)) return false
  if (filterId === 'all') return true

  const match = intervenantPartnerCategoryFilters.find(item => item.id === filterId)
  if (!match) return false
  if (match.categories) return match.categories.includes(category as string)
  return Boolean(match.category && category === match.category)
}

/** @deprecated Use matchesIntervenantCategoryFilter */
export function matchesTechnicalCategoryFilter(
  category: string | null | undefined,
  filterId: IntervenantCategoryFilterId,
): boolean {
  return matchesIntervenantCategoryFilter(category, filterId)
}

export function validatePartnerInput(input: PartnerFormInput): string | null {
  if (!input.name.trim()) {
    return 'Le nom du partenaire est obligatoire.'
  }

  const commission = Number(input.commission)
  if (Number.isNaN(commission) || commission < 0 || commission > 100) {
    return 'La commission doit être entre 0 et 100 %.'
  }

  return null
}

export function buildPartnerPayload(input: PartnerFormInput, ownerId: string) {
  return {
    name: input.name.trim(),
    category: input.category.trim() || null,
    location: input.location.trim() || null,
    contact: input.contact.trim() || null,
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    commission: Math.round(Number(input.commission) || 0),
    status: input.status,
    notes: input.notes.trim() || null,
    source: 'manual' as const,
    owner_id: ownerId,
    updated_at: new Date().toISOString(),
  }
}

export function partnerToFormInput(partner: PartnerRecord): PartnerFormInput {
  return {
    name: partner.name,
    category: partner.category ?? '',
    location: partner.location ?? '',
    contact: partner.contact ?? '',
    email: partner.email ?? '',
    phone: partner.phone ?? '',
    commission: String(partner.commission ?? 0),
    status: partner.status,
    notes: partner.notes ?? '',
  }
}

export function canManageManualPartner(partner: PartnerRecord, ownerId?: string | null): boolean {
  if (!ownerId || partner.source !== 'manual') return false
  return partner.owner_id === ownerId || partner.owner_id === null
}

export async function fetchManualPartners(ownerId: string) {
  return supabase
    .from('partners')
    .select('*')
    .eq('source', 'manual')
    .or(`owner_id.eq.${ownerId},owner_id.is.null`)
    .order('name', { ascending: true })
}

export async function fetchMarketplacePartners() {
  return supabase
    .from('partners')
    .select('*')
    .eq('source', 'marketplace')
    .order('name', { ascending: true })
}

export async function fetchPartnersForTasks(ownerId: string) {
  const [manualResult, marketplaceResult] = await Promise.all([
    fetchManualPartners(ownerId),
    fetchMarketplacePartners(),
  ])

  const manual = (manualResult.data ?? []) as PartnerRecord[]
  const marketplace = (marketplaceResult.data ?? []) as PartnerRecord[]

  return {
    data: [...manual, ...marketplace],
    error: manualResult.error ?? marketplaceResult.error,
  }
}

export async function saveManualPartner(input: PartnerFormInput, ownerId: string, partnerId?: string) {
  const payload = buildPartnerPayload(input, ownerId)

  if (partnerId) {
    return supabase
      .from('partners')
      .update(payload)
      .eq('id', partnerId)
      .eq('source', 'manual')
      .or(`owner_id.eq.${ownerId},owner_id.is.null`)
      .select('*')
      .single()
  }

  return supabase
    .from('partners')
    .insert(payload)
    .select('*')
    .single()
}

export async function deleteManualPartner(partnerId: string, ownerId: string) {
  return supabase
    .from('partners')
    .delete()
    .eq('id', partnerId)
    .eq('source', 'manual')
    .or(`owner_id.eq.${ownerId},owner_id.is.null`)
}

export function partnerDisplayContact(partner: PartnerRecord): string {
  return partner.contact
    || partner.email
    || partner.phone
    || '—'
}

export function partnerSelectLabel(partner: PartnerRecord): string {
  const base = partner.category ? `${partner.name} · ${partner.category}` : partner.name
  if (partner.source === 'marketplace') {
    return `${base} (plateforme)`
  }
  return base
}
