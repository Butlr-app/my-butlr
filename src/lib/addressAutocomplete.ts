export interface AddressSuggestion {
  fullText: string
  street: string
  city: string
  postalCode: string
  longitude: number
  latitude: number
}

interface GeoplateformeResult {
  fulltext?: string
  street?: string
  city?: string
  zipcode?: string
  x?: number
  y?: number
}

interface GeoplateformeResponse {
  status?: string
  results?: GeoplateformeResult[]
}

export async function searchFrenchAddresses(
  query: string,
  context = '',
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 3) return []

  const text = [normalizedQuery, context.trim()]
    .filter(Boolean)
    .join(' ')

  const params = new URLSearchParams({
    text,
    type: 'StreetAddress',
    maximumResponses: '6',
  })

  const response = await fetch(
    `https://data.geopf.fr/geocodage/completion/?${params.toString()}`,
    { signal },
  )

  if (!response.ok) {
    throw new Error('Le service de recherche d’adresse est momentanément indisponible.')
  }

  const data = await response.json() as GeoplateformeResponse

  return (data.results ?? [])
    .filter(result => Boolean(result.fulltext))
    .map(result => ({
      fullText: result.fulltext ?? '',
      street: result.street ?? result.fulltext?.split(',')[0] ?? '',
      city: result.city ?? '',
      postalCode: result.zipcode ?? '',
      longitude: result.x ?? 0,
      latitude: result.y ?? 0,
    }))
}
