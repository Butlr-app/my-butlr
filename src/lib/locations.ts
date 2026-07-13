function flagFromIso(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

export interface Country {
  code: string
  name: string
  flag: string
}

export const countries: Country[] = [
  { code: 'FR', name: 'France', flag: flagFromIso('FR') },
  { code: 'MC', name: 'Monaco', flag: flagFromIso('MC') },
  { code: 'GB', name: 'United Kingdom', flag: flagFromIso('GB') },
  { code: 'CH', name: 'Switzerland', flag: flagFromIso('CH') },
  { code: 'IT', name: 'Italy', flag: flagFromIso('IT') },
  { code: 'ES', name: 'Spain', flag: flagFromIso('ES') },
  { code: 'PT', name: 'Portugal', flag: flagFromIso('PT') },
  { code: 'GR', name: 'Greece', flag: flagFromIso('GR') },
  { code: 'BE', name: 'Belgium', flag: flagFromIso('BE') },
  { code: 'NL', name: 'Netherlands', flag: flagFromIso('NL') },
  { code: 'DE', name: 'Germany', flag: flagFromIso('DE') },
  { code: 'LU', name: 'Luxembourg', flag: flagFromIso('LU') },
  { code: 'AE', name: 'United Arab Emirates', flag: flagFromIso('AE') },
  { code: 'SA', name: 'Saudi Arabia', flag: flagFromIso('SA') },
  { code: 'MA', name: 'Morocco', flag: flagFromIso('MA') },
  { code: 'MU', name: 'Mauritius', flag: flagFromIso('MU') },
  { code: 'US', name: 'United States', flag: flagFromIso('US') },
  { code: 'CA', name: 'Canada', flag: flagFromIso('CA') },
  { code: 'AU', name: 'Australia', flag: flagFromIso('AU') },
  { code: 'MV', name: 'Maldives', flag: flagFromIso('MV') },
  { code: 'ID', name: 'Indonesia', flag: flagFromIso('ID') },
  { code: 'TH', name: 'Thailand', flag: flagFromIso('TH') },
]

export const defaultCountry = countries[0]

const fallbackCities: Record<string, string[]> = {
  France: [
    'Paris', 'Saint-Tropez', 'Cannes', 'Nice', 'Antibes', 'Mougins', 'Grasse',
    'Aix-en-Provence', 'Marseille', 'Bordeaux', 'Biarritz', 'Courchevel', 'Megève',
    'Chamonix', 'Annecy', 'Lyon', 'Deauville', 'Île de Ré', 'Cap Ferret',
  ],
  Monaco: ['Monaco', 'Monte Carlo', 'La Condamine', 'Fontvieille'],
  'United Kingdom': ['London', 'Chelsea', 'Kensington', 'Mayfair', 'Cotswolds', 'Edinburgh'],
  Switzerland: ['Geneva', 'Zürich', 'Gstaad', 'Verbier', 'Crans-Montana', 'St. Moritz'],
  Italy: ['Milan', 'Rome', 'Florence', 'Lake Como', 'Portofino', 'Amalfi', 'Sardinia', 'Sicily'],
  Spain: ['Madrid', 'Barcelona', 'Marbella', 'Ibiza', 'Mallorca', 'San Sebastián'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Palm Jumeirah', 'Saadiyat Island'],
}

const cityCache = new Map<string, string[]>()

export async function fetchCitiesForCountry(countryName: string): Promise<string[]> {
  if (cityCache.has(countryName)) {
    return cityCache.get(countryName)!
  }

  try {
    const response = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: countryName }),
    })

    if (response.ok) {
      const json = await response.json() as { error?: boolean; data?: string[] }
      if (!json.error && Array.isArray(json.data) && json.data.length > 0) {
        const cities = [...json.data].sort((a, b) => a.localeCompare(b, 'fr'))
        cityCache.set(countryName, cities)
        return cities
      }
    }
  } catch {
    // fall through to static list
  }

  const fallback = fallbackCities[countryName] ?? []
  cityCache.set(countryName, fallback)
  return fallback
}

export function formatLocation(city: string, country: Country): string {
  return `${city.trim()}, ${country.name}`
}

export function getCountryByCode(code: string): Country | undefined {
  return countries.find(c => c.code === code)
}
