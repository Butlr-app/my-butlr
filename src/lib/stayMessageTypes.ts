import {
  formatCatalogPrice,
  type BoutiqueCatalogEntry,
} from '@/lib/boutique'
import {
  localizeServiceName,
  resolveServiceOffer,
  serviceCategoryLabel,
  type PropertyServiceItem,
} from '@/lib/propertyServices'

export type StayMessageType = 'text' | 'image' | 'product_card' | 'service_card'

export interface StayMessageProductPayload {
  catalog_item_id: string
  title: string
  image_url?: string | null
  price_label?: string | null
  subtitle?: string | null
}

export interface StayMessageServicePayload {
  property_service_id: string
  service_id: string
  title: string
  image_url?: string | null
  category?: string | null
  price_label?: string | null
  subtitle?: string | null
}

export interface StayMessageImagePayload {
  storage_path: string
  image_url?: string
}

export type StayMessagePayload =
  | StayMessageProductPayload
  | StayMessageServicePayload
  | StayMessageImagePayload
  | Record<string, unknown>

export interface StayMessageInput {
  body?: string
  messageType?: StayMessageType
  payload?: StayMessagePayload
}

export function buildProductCardPayload(entry: BoutiqueCatalogEntry): StayMessageProductPayload {
  const { item, assignment, category } = entry
  return {
    catalog_item_id: item.id,
    title: item.title,
    image_url: item.images[0] ?? null,
    price_label: formatCatalogPrice(item, assignment, item.currency),
    subtitle: category.name,
  }
}

export function buildServiceCardPayload(item: PropertyServiceItem): StayMessageServicePayload {
  const assignmentId = item.assignment?.id
  if (!assignmentId) {
    throw new Error('Service non assigné à la villa.')
  }
  const offer = resolveServiceOffer(item.service, item.assignment)
  const name = localizeServiceName(offer.displayName || item.assignment?.offer_title || item.service.name)
  const subtitleParts = [
    offer.pricing.providerName,
    offer.pricing.includesText,
  ].filter(Boolean)

  return {
    property_service_id: assignmentId,
    service_id: item.service.id,
    title: name,
    image_url: item.service.image_url ?? null,
    category: serviceCategoryLabel(item.service.category ?? 'other'),
    price_label: offer.pricing.displayLabel || item.pricing.displayLabel || 'Sur devis',
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(' · ') : null,
  }
}

export function messagePreviewLabel(
  messageType: StayMessageType,
  body: string | null | undefined,
  payload: StayMessagePayload,
): string {
  if (messageType === 'product_card') {
    const card = payload as StayMessageProductPayload
    return `Produit : ${card.title ?? 'Suggestion boutique'}`
  }
  if (messageType === 'service_card') {
    const card = payload as StayMessageServicePayload
    return `Activité : ${card.title ?? 'Suggestion conciergerie'}`
  }
  if (messageType === 'image') {
    return body?.trim() ? body.trim() : 'Photo'
  }
  return body?.trim() ?? ''
}

export function parseStayMessagePayload(raw: unknown): StayMessagePayload {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as StayMessagePayload
      }
    } catch {
      return {}
    }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as StayMessagePayload
  }
  return {}
}
