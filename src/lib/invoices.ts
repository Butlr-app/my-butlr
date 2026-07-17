import { supabase } from './supabase'
import { fetchReservationStoreOrders, type StoreOrder, type StoreOrderItem } from './boutique'
import {
  fetchStayReserveByReservation,
  fetchStayServiceRequests,
  stayServiceStatusLabels,
  type StayServiceRequest,
} from './stayReserve'
import type { Reservation } from './types'

export const DEFAULT_INVOICE_VAT_PERCENT = 20

export interface InvoiceLineItem {
  description: string
  unitPrice: number
  quantity: number
  vatPercent: number
  sourceType?: 'concierge' | 'boutique' | 'manual'
  sourceId?: string
}

export interface StayBillableItem {
  id: string
  sourceType: 'concierge' | 'boutique'
  title: string
  category: string | null
  amount: number
  unitPrice: number
  quantity: number
  vatPercent: number
  status: string
  statusLabel: string
  included: boolean
}

export interface InvoiceTotals {
  subtotalHT: number
  totalVAT: number
  totalTTC: number
}

const excludedConciergeStatuses = new Set(['draft', 'cancelled', 'disputed'])
const excludedBoutiqueItemStatuses = new Set(['cancelled', 'refunded', 'draft', 'pending_payment'])
const excludedBoutiqueOrderStatuses = new Set(['cancelled', 'refunded', 'draft'])

export function resolveConciergeRequestAmount(request: StayServiceRequest): number {
  return Number(request.final_amount ?? request.estimated_amount ?? 0)
}

export function resolveBoutiqueItemAmount(item: StoreOrderItem): number {
  if (item.total_price != null && Number(item.total_price) > 0) {
    return Number(item.total_price)
  }
  if (item.unit_price != null && item.quantity > 0) {
    return Number(item.unit_price) * item.quantity
  }
  if (item.quoted_amount != null) {
    return Number(item.quoted_amount)
  }
  return 0
}

export function resolveBoutiqueItemUnitPrice(item: StoreOrderItem): number {
  if (item.unit_price != null) return Number(item.unit_price)
  const total = resolveBoutiqueItemAmount(item)
  return item.quantity > 0 ? total / item.quantity : total
}

export function isBillableConciergeRequest(request: StayServiceRequest): boolean {
  if (excludedConciergeStatuses.has(request.status)) return false
  return resolveConciergeRequestAmount(request) > 0
}

export function isBillableBoutiqueItem(item: StoreOrderItem, order: StoreOrder): boolean {
  if (excludedBoutiqueItemStatuses.has(item.status)) return false
  if (excludedBoutiqueOrderStatuses.has(order.status)) return false
  return resolveBoutiqueItemAmount(item) > 0
}

export function conciergeRequestToBillableItem(request: StayServiceRequest): StayBillableItem {
  const amount = resolveConciergeRequestAmount(request)
  return {
    id: request.id,
    sourceType: 'concierge',
    title: request.title,
    category: request.category ?? null,
    amount,
    unitPrice: amount,
    quantity: 1,
    vatPercent: DEFAULT_INVOICE_VAT_PERCENT,
    status: request.status,
    statusLabel: stayServiceStatusLabels[request.status] ?? request.status,
    included: true,
  }
}

export function boutiqueItemToBillableItem(
  item: StoreOrderItem,
  taxRate = DEFAULT_INVOICE_VAT_PERCENT,
): StayBillableItem {
  const unitPrice = resolveBoutiqueItemUnitPrice(item)
  return {
    id: item.id,
    sourceType: 'boutique',
    title: item.title_snapshot,
    category: null,
    amount: resolveBoutiqueItemAmount(item),
    unitPrice,
    quantity: item.quantity,
    vatPercent: taxRate,
    status: item.status,
    statusLabel: item.status,
    included: true,
  }
}

export function billableItemToLineItem(item: StayBillableItem): InvoiceLineItem {
  const prefix = item.sourceType === 'concierge' ? 'Conciergerie' : 'Boutique'
  const description = item.category
    ? `${prefix} — ${item.title} (${item.category})`
    : `${prefix} — ${item.title}`

  return {
    description,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    vatPercent: item.vatPercent,
    sourceType: item.sourceType,
    sourceId: item.id,
  }
}

export function billableItemsToLineItems(items: StayBillableItem[]): InvoiceLineItem[] {
  return items.filter(item => item.included).map(billableItemToLineItem)
}

export function buildInvoiceClientRef(reservation: Reservation): string {
  const property = reservation.properties?.name ?? 'Villa'
  return `${property} — séjour ${reservation.arrival} → ${reservation.departure}`
}

export function buildInvoiceClientAddress(reservation: Reservation): string {
  const lines = [
    reservation.guest_email,
    reservation.guest_phone,
  ].filter(Boolean)
  return lines.join('\n')
}

export function computeInvoiceTotals(items: InvoiceLineItem[]): InvoiceTotals {
  const subtotalHT = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const totalVAT = items.reduce(
    (sum, item) => sum + (item.unitPrice * item.quantity * item.vatPercent) / 100,
    0,
  )
  return {
    subtotalHT,
    totalVAT,
    totalTTC: subtotalHT + totalVAT,
  }
}

export function mergeStayLineItems(
  currentItems: InvoiceLineItem[],
  stayItems: InvoiceLineItem[],
): InvoiceLineItem[] {
  const manualItems = currentItems.filter(item => item.sourceType === 'manual' || !item.sourceType)
  const merged = [...stayItems, ...manualItems.filter(item => item.description.trim() || item.unitPrice > 0)]

  if (merged.length === 0) {
    return [{ description: '', unitPrice: 0, quantity: 1, vatPercent: DEFAULT_INVOICE_VAT_PERCENT, sourceType: 'manual' }]
  }

  return merged
}

async function fetchConciergeRequestsForReservation(reservationId: string) {
  const { data: reserve } = await fetchStayReserveByReservation(reservationId)
  if (reserve?.id) {
    const { data, error } = await fetchStayServiceRequests(reserve.id)
    if (!error && data && data.length > 0) {
      return data as StayServiceRequest[]
    }
  }

  const { data, error } = await supabase
    .from('stay_service_requests')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as StayServiceRequest[]
}

async function fetchBoutiqueItemsForReservation(reservationId: string) {
  const { data: orders, error } = await fetchReservationStoreOrders(reservationId)
  if (error || !orders?.length) return [] as Array<{ item: StoreOrderItem; taxRate: number }>

  const results: Array<{ item: StoreOrderItem; taxRate: number }> = []

  for (const order of orders as StoreOrder[]) {
    if (excludedBoutiqueOrderStatuses.has(order.status)) continue

    const { data: orderItems } = await supabase
      .from('store_order_items')
      .select('*, catalog_items(tax_rate)')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true })

    for (const rawItem of orderItems ?? []) {
      const item = rawItem as StoreOrderItem & { catalog_items?: { tax_rate?: number } | null }
      if (!isBillableBoutiqueItem(item, order)) continue

      const taxRate = item.catalog_items?.tax_rate != null
        ? Number(item.catalog_items.tax_rate)
        : DEFAULT_INVOICE_VAT_PERCENT

      results.push({ item, taxRate })
    }
  }

  return results
}

export async function fetchStayBillableItems(reservationId: string) {
  const [conciergeRequests, boutiqueItems] = await Promise.all([
    fetchConciergeRequestsForReservation(reservationId),
    fetchBoutiqueItemsForReservation(reservationId),
  ])

  const items: StayBillableItem[] = [
    ...conciergeRequests
      .filter(isBillableConciergeRequest)
      .map(conciergeRequestToBillableItem),
    ...boutiqueItems.map(({ item, taxRate }) => boutiqueItemToBillableItem(item, taxRate)),
  ]

  return { data: items, error: null }
}

export async function buildInvoicePrefillFromReservation(reservationId: string) {
  const { data: reservation, error: reservationError } = await supabase
    .from('reservations')
    .select('*, properties(name, max_guests)')
    .eq('id', reservationId)
    .maybeSingle()

  if (reservationError) {
    return { reservation: null, billableItems: [] as StayBillableItem[], lineItems: [] as InvoiceLineItem[], error: reservationError }
  }

  if (!reservation) {
    return {
      reservation: null,
      billableItems: [] as StayBillableItem[],
      lineItems: [] as InvoiceLineItem[],
      error: new Error('Réservation introuvable.'),
    }
  }

  const { data: billableItems } = await fetchStayBillableItems(reservationId)
  const lineItems = billableItemsToLineItems(billableItems)

  return {
    reservation: reservation as Reservation,
    billableItems,
    lineItems,
    error: null,
  }
}
