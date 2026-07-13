import { supabase } from './supabase'
import { formatReserveAmount, computeRevenueSplit } from './stayReserve'

export type CatalogItemType = 'product' | 'service' | 'experience' | 'custom_request'

export type CatalogPriceType =
  | 'fixed_price'
  | 'starting_from'
  | 'per_person'
  | 'per_hour'
  | 'per_day'
  | 'custom_quote'
  | 'market_price'

export type StoreOrderStatus =
  | 'draft'
  | 'pending_payment'
  | 'paid'
  | 'pending_quote'
  | 'quoted'
  | 'waiting_client_approval'
  | 'approved'
  | 'assigned_to_provider'
  | 'preparing'
  | 'scheduled'
  | 'in_progress'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'disputed'

export interface CatalogCategory {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
}

export interface CatalogItem {
  id: string
  type: CatalogItemType
  category_id: string
  title: string
  short_description: string | null
  long_description: string | null
  images: string[]
  base_price: number | null
  price_type: CatalogPriceType
  currency: string
  provider_name: string | null
  availability_status: 'available' | 'unavailable' | 'on_request'
  minimum_notice_hours: number
  duration_minutes: number | null
  max_quantity: number
  requires_quote: boolean
  requires_approval: boolean
  is_featured: boolean
  is_active: boolean
}

export interface PropertyCatalogAssignment {
  id: string
  property_id: string
  catalog_item_id: string
  enabled: boolean
  custom_price: number | null
  is_featured: boolean
  sort_order: number
}

export interface BoutiqueCatalogEntry {
  assignment: PropertyCatalogAssignment
  item: CatalogItem
  category: CatalogCategory
}

export interface StoreOrder {
  id: string
  reservation_id: string
  stay_reserve_id: string | null
  property_id: string
  status: StoreOrderStatus
  payment_method: 'stay_reserve' | 'card' | 'mixed'
  subtotal_amount: number
  total_amount: number
  paid_amount: number
  currency: string
  client_notes: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface StoreOrderItem {
  id: string
  order_id: string
  catalog_item_id: string | null
  type: CatalogItemType
  title_snapshot: string
  description_snapshot: string | null
  quantity: number
  unit_price: number | null
  total_price: number | null
  price_type: CatalogPriceType
  provider_name: string | null
  scheduled_date: string | null
  status: string
  requires_quote: boolean
  client_notes: string | null
  quoted_amount: number | null
  created_at: string
}

export interface BoutiqueCartLine {
  catalogItemId: string
  quantity: number
  scheduledDate?: string
  clientNotes?: string
}

export const storeOrderStatusLabels: Record<StoreOrderStatus, string> = {
  draft: 'Brouillon',
  pending_payment: 'En attente de paiement',
  paid: 'Confirmée',
  pending_quote: 'Devis en préparation',
  quoted: 'Devis envoyé',
  waiting_client_approval: 'À valider',
  approved: 'Validée',
  assigned_to_provider: 'Prestataire assigné',
  preparing: 'En préparation',
  scheduled: 'Planifiée',
  in_progress: 'En cours',
  delivered: 'Livrée',
  completed: 'Terminée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
  disputed: 'Litige',
}

export const catalogPriceTypeLabels: Record<CatalogPriceType, string> = {
  fixed_price: '',
  starting_from: 'À partir de',
  per_person: 'Par personne',
  per_hour: 'Par heure',
  per_day: 'Par jour',
  custom_quote: 'Sur devis',
  market_price: 'Prix marché',
}

export function resolveCatalogPrice(
  item: CatalogItem,
  assignment: PropertyCatalogAssignment | null | undefined,
): number | null {
  return assignment?.custom_price ?? item.base_price
}

export function formatCatalogPrice(
  item: CatalogItem,
  assignment: PropertyCatalogAssignment | null | undefined,
  currency = 'EUR',
): string {
  const amount = resolveCatalogPrice(item, assignment)
  if (item.requires_quote || item.price_type === 'custom_quote' || amount == null) {
    return 'Sur devis'
  }
  const prefix = catalogPriceTypeLabels[item.price_type]
  const formatted = formatReserveAmount(amount, currency)
  return prefix ? `${prefix} ${formatted}` : formatted
}

export function isInstantPurchase(item: CatalogItem): boolean {
  return !item.requires_quote
    && item.price_type !== 'custom_quote'
    && item.type === 'product'
}

/** Types vendus via panier Boutique (hors prestations conciergerie). */
export const BOUTIQUE_CATALOG_TYPES: CatalogItemType[] = ['product', 'experience']

export function isBoutiqueCatalogItem(type: CatalogItemType): boolean {
  return BOUTIQUE_CATALOG_TYPES.includes(type)
}

export function filterBoutiqueCatalogEntries(entries: BoutiqueCatalogEntry[]): BoutiqueCatalogEntry[] {
  return entries.filter(entry => isBoutiqueCatalogItem(entry.item.type))
}

export function filterBoutiqueCategories(
  categories: CatalogCategory[],
  catalog: BoutiqueCatalogEntry[],
): CatalogCategory[] {
  const productEntries = filterBoutiqueCatalogEntries(catalog)
  const categoryIds = new Set(productEntries.map(entry => entry.category.id))
  return categories.filter(category => categoryIds.has(category.id))
}

export function parseBoutiqueCatalog(raw: {
  categories?: CatalogCategory[]
  items?: BoutiqueCatalogEntry[]
} | null | undefined) {
  return {
    categories: (raw?.categories ?? []) as CatalogCategory[],
    items: (raw?.items ?? []) as BoutiqueCatalogEntry[],
  }
}

export async function fetchPropertyBoutiqueCatalog(propertyId: string) {
  const { data, error } = await supabase.rpc('get_property_boutique_catalog', {
    p_property_id: propertyId,
  })
  if (error) return { data: { categories: [], items: [] }, error }
  return { data: parseBoutiqueCatalog(data as { categories: CatalogCategory[]; items: BoutiqueCatalogEntry[] }), error: null }
}

export async function fetchGuestBoutiqueCatalog(token: string) {
  const { data, error } = await supabase.rpc('get_guest_boutique_catalog', { p_token: token })
  if (error) return { data: { categories: [], items: [] }, error }
  return { data: parseBoutiqueCatalog(data as { categories: CatalogCategory[]; items: BoutiqueCatalogEntry[] }), error: null }
}

export async function fetchStoreOrders(propertyIds: string[]) {
  if (propertyIds.length === 0) return { data: [] as StoreOrder[], error: null }
  return supabase
    .from('store_orders')
    .select('*, reservations(guest_name, arrival, departure, properties(name))')
    .in('property_id', propertyIds)
    .order('created_at', { ascending: false })
}

export async function fetchStoreOrderItems(orderId: string) {
  return supabase
    .from('store_order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
}

export async function fetchReservationStoreOrders(reservationId: string) {
  return supabase
    .from('store_orders')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: false })
}

export async function guestCheckoutBoutique(
  token: string,
  items: BoutiqueCartLine[],
  paymentMethod: 'stay_reserve' | 'card' = 'stay_reserve',
  clientNotes?: string,
) {
  return supabase.rpc('guest_checkout_boutique', {
    p_token: token,
    p_items: items.map(line => ({
      catalog_item_id: line.catalogItemId,
      quantity: line.quantity,
      scheduled_date: line.scheduledDate ?? null,
      client_notes: line.clientNotes ?? null,
    })),
    p_payment_method: paymentMethod,
    p_client_notes: clientNotes ?? null,
  })
}

export async function guestApproveStoreQuote(token: string, orderItemId: string) {
  return supabase.rpc('guest_approve_store_quote', {
    p_token: token,
    p_order_item_id: orderItemId,
  })
}

export async function quoteStoreOrderItem(
  orderItemId: string,
  quotedAmount: number,
  internalNotes?: string,
) {
  return supabase.rpc('quote_store_order_item', {
    p_order_item_id: orderItemId,
    p_quoted_amount: quotedAmount,
    p_internal_notes: internalNotes ?? null,
  })
}

export async function completeStoreOrder(orderId: string) {
  const { error: itemsError } = await fetchStoreOrderItems(orderId)
  if (itemsError) return { data: null, error: itemsError }

  await supabase
    .from('store_order_items')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .in('status', ['paid', 'preparing', 'delivered', 'in_progress', 'scheduled'])

  return supabase
    .from('store_orders')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select('*')
    .single()
}

export async function fetchCatalogItems(includeInactive = false) {
  let query = supabase
    .from('catalog_items')
    .select('*, catalog_categories(name, slug)')
    .order('title')
  if (!includeInactive) query = query.eq('is_active', true)
  return query
}

export async function fetchCatalogItemById(id: string) {
  return supabase
    .from('catalog_items')
    .select('*, catalog_categories(name, slug)')
    .eq('id', id)
    .maybeSingle()
}

export async function fetchCatalogItemPropertyIds(catalogItemId: string) {
  return supabase
    .from('property_catalog_items')
    .select('property_id')
    .eq('catalog_item_id', catalogItemId)
    .eq('enabled', true)
}

export interface CatalogItemInput {
  type: CatalogItemType
  category_id: string
  title: string
  short_description?: string | null
  long_description?: string | null
  base_price?: number | null
  price_type: CatalogPriceType
  provider_name?: string | null
  requires_quote: boolean
  is_featured: boolean
  is_active: boolean
  max_quantity?: number
  minimum_notice_hours?: number
  images?: string[]
  property_ids?: string[]
}

function catalogItemPayload(input: Omit<CatalogItemInput, 'property_ids'>) {
  return {
    type: input.type,
    category_id: input.category_id,
    title: input.title.trim(),
    short_description: input.short_description?.trim() || null,
    long_description: input.long_description?.trim() || null,
    images: input.images ?? [],
    base_price: input.requires_quote ? null : (input.base_price ?? null),
    price_type: input.requires_quote ? 'custom_quote' as const : input.price_type,
    provider_name: input.provider_name?.trim() || null,
    requires_quote: input.requires_quote,
    is_featured: input.is_featured,
    is_active: input.is_active,
    max_quantity: input.max_quantity ?? 99,
    minimum_notice_hours: input.minimum_notice_hours ?? 0,
    updated_at: new Date().toISOString(),
  }
}

export async function syncCatalogItemProperties(catalogItemId: string, propertyIds: string[]) {
  const { data: existing, error: fetchError } = await supabase
    .from('property_catalog_items')
    .select('property_id')
    .eq('catalog_item_id', catalogItemId)

  if (fetchError) return { error: fetchError }

  const current = new Set((existing ?? []).map(row => row.property_id))
  const next = new Set(propertyIds)
  const toRemove = [...current].filter(id => !next.has(id))
  const toAdd = [...next].filter(id => !current.has(id))

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('property_catalog_items')
      .delete()
      .eq('catalog_item_id', catalogItemId)
      .in('property_id', toRemove)
    if (error) return { error }
  }

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('property_catalog_items')
      .insert(toAdd.map((propertyId, index) => ({
        property_id: propertyId,
        catalog_item_id: catalogItemId,
        enabled: true,
        is_featured: false,
        sort_order: index,
      })))
    if (error) return { error }
  }

  return { error: null }
}

export async function createCatalogItem(input: CatalogItemInput) {
  const { property_ids = [], ...fields } = input
  const { data, error } = await supabase
    .from('catalog_items')
    .insert(catalogItemPayload(fields))
    .select('*')
    .single()

  if (error || !data) return { data: null, error }

  if (property_ids.length > 0) {
    const { error: syncError } = await syncCatalogItemProperties(data.id, property_ids)
    if (syncError) return { data: null, error: syncError }
  }

  return { data, error: null }
}

export async function updateCatalogItem(id: string, input: CatalogItemInput) {
  const { property_ids = [], ...fields } = input
  const { data, error } = await supabase
    .from('catalog_items')
    .update(catalogItemPayload(fields))
    .eq('id', id)
    .select('*')
    .single()

  if (error) return { data: null, error }

  const { error: syncError } = await syncCatalogItemProperties(id, property_ids)
  if (syncError) return { data: null, error: syncError }

  return { data, error: null }
}

export async function fetchCatalogCategories() {
  return supabase
    .from('catalog_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
}

export function cartLineTotal(
  entry: BoutiqueCatalogEntry,
  quantity: number,
): number | null {
  const price = resolveCatalogPrice(entry.item, entry.assignment)
  if (price == null || entry.item.requires_quote) return null
  return price * quantity
}

export function cartEstimatedTotal(
  lines: BoutiqueCartLine[],
  catalog: BoutiqueCatalogEntry[],
): { total: number; hasQuote: boolean } {
  let total = 0
  let hasQuote = false
  for (const line of lines) {
    const entry = catalog.find(e => e.item.id === line.catalogItemId)
    if (!entry) continue
    const lineTotal = cartLineTotal(entry, line.quantity)
    if (lineTotal == null) {
      hasQuote = true
    } else {
      total += lineTotal
    }
  }
  return { total, hasQuote }
}

export { computeRevenueSplit }
