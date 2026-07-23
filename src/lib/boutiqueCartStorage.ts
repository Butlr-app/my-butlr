import type { BoutiqueCartLine } from '@/lib/boutique'

const PREFIX = 'butlr-boutique-cart:'

function storageKey(key: string): string {
  return `${PREFIX}${key}`
}

export function loadBoutiqueCart(key: string): BoutiqueCartLine[] {
  if (!key) return []
  try {
    const raw = localStorage.getItem(storageKey(key))
    if (!raw) return []
    const parsed = JSON.parse(raw) as BoutiqueCartLine[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      line =>
        typeof line.catalogItemId === 'string'
        && typeof line.quantity === 'number'
        && line.quantity > 0,
    )
  } catch {
    return []
  }
}

export function saveBoutiqueCart(key: string, cart: BoutiqueCartLine[]): void {
  if (!key) return
  try {
    if (cart.length === 0) {
      localStorage.removeItem(storageKey(key))
      return
    }
    localStorage.setItem(storageKey(key), JSON.stringify(cart))
  } catch {
    // quota or private mode
  }
}

export function clearBoutiqueCart(key: string): void {
  if (!key) return
  try {
    localStorage.removeItem(storageKey(key))
  } catch {
    // ignore
  }
}

export function pruneBoutiqueCart(
  cart: BoutiqueCartLine[],
  validItemIds: Set<string>,
): BoutiqueCartLine[] {
  return cart.filter(line => validItemIds.has(line.catalogItemId))
}
