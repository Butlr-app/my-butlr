const propertyTypeLabels: Record<string, string> = {
  villa: 'villa',
  yacht: 'yacht',
  apartment: 'appartement',
  chalet: 'chalet',
}

const propertyTypeGender: Record<string, 'f' | 'm'> = {
  villa: 'f',
  yacht: 'm',
  apartment: 'm',
  chalet: 'm',
}

import { amenityLabels } from './propertyAmenities'

interface PropertyDescriptionInput {
  name: string
  type: string
  city: string
  country: string
  bedrooms: number
  bathrooms: number
  maxGuests: number
  surfaceSqm?: number
  amenities?: string[]
}

export function generatePropertyDescription(input: PropertyDescriptionInput): string {
  const {
    name,
    type,
    city,
    country,
    bedrooms,
    bathrooms,
    maxGuests,
    surfaceSqm = 0,
    amenities = [],
  } = input

  const typeLabel = propertyTypeLabels[type] ?? 'propriété'
  const gender = propertyTypeGender[type] ?? 'f'
  const article = gender === 'f' ? 'Une' : 'Un'
  const located = gender === 'f' ? 'située' : 'situé'
  const location = [city.trim(), country.trim()].filter(Boolean).join(', ')

  const parts: string[] = []

  if (name.trim()) {
    parts.push(
      `${name.trim()} est ${article.toLowerCase()} ${typeLabel} d'exception${location ? ` ${located} à ${location}` : ''}.`
    )
  } else {
    parts.push(
      `${article} ${typeLabel} d'exception${location ? ` ${located} à ${location}` : ''}.`
    )
  }

  const pronoun = gender === 'f' ? 'Elle' : 'Il'

  const features: string[] = []
  if (bedrooms > 0) features.push(`${bedrooms} chambre${bedrooms > 1 ? 's' : ''}`)
  if (bathrooms > 0) features.push(`${bathrooms} salle${bathrooms > 1 ? 's' : ''} de bain`)
  if (maxGuests > 0) features.push(`jusqu'à ${maxGuests} personne${maxGuests > 1 ? 's' : ''}`)

  if (surfaceSqm > 0) features.push(`${surfaceSqm} m²`)

  if (features.length > 0) {
    const last = features.pop()
    const featureText = features.length > 0
      ? `${features.join(', ')} et ${last}`
      : last
    parts.push(`${pronoun} comprend ${featureText}, dans un cadre premium pensé pour des séjours haut de gamme.`)
  } else {
    parts.push('Un cadre premium pensé pour des séjours haut de gamme et une expérience sur mesure.')
  }

  const amenityText = amenityLabels(amenities)
  if (amenityText.length > 0) {
    parts.push(`Équipements : ${amenityText.join(', ')}.`)
  }

  if (type === 'yacht') {
    parts.push('Idéal pour des croisières privées et une hospitalité d\'exception en mer.')
  } else if (type === 'chalet') {
    parts.push('Parfait pour un séjour montagnard alliant confort, intimité et services premium.')
  } else if (type === 'apartment') {
    parts.push('Idéal pour un séjour urbain ou saisonnier avec services de conciergerie.')
  } else {
    parts.push('Idéal pour des séjours en famille ou entre amis, avec services de conciergerie à la carte.')
  }

  return parts.join(' ')
}

export function canGeneratePropertyDescription(input: Partial<PropertyDescriptionInput>): boolean {
  return Boolean(
    input.name?.trim() ||
    input.city?.trim() ||
    Number(input.bedrooms) > 0 ||
    Number(input.bathrooms) > 0 ||
    Number(input.maxGuests) > 0
  )
}
