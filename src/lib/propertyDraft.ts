const DRAFT_KEY = 'butlr-onboarding-property-draft'

export interface PropertyDraft {
  propertyName: string
  countryCode: string
  city: string
  propertyType: string
  bedrooms: number
  bathrooms: number
  maxGuests: number
  addressStreet: string
  addressLine2: string
  postalCode: string
  surfaceSqm: number
  amenities: string[]
  description: string
}

export function savePropertyDraft(draft: PropertyDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

export function loadPropertyDraft(): PropertyDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PropertyDraft
  } catch {
    return null
  }
}

export function clearPropertyDraft() {
  sessionStorage.removeItem(DRAFT_KEY)
}
