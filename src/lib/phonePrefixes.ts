export interface PhonePrefix {
  code: string
  dial: string
  label: string
  flag: string
}

function flagFromIso(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

export const phonePrefixes: PhonePrefix[] = [
  { code: 'FR', dial: '+33', label: 'France', flag: flagFromIso('FR') },
  { code: 'GB', dial: '+44', label: 'United Kingdom', flag: flagFromIso('GB') },
  { code: 'US', dial: '+1', label: 'United States', flag: flagFromIso('US') },
  { code: 'CH', dial: '+41', label: 'Switzerland', flag: flagFromIso('CH') },
  { code: 'BE', dial: '+32', label: 'Belgium', flag: flagFromIso('BE') },
  { code: 'LU', dial: '+352', label: 'Luxembourg', flag: flagFromIso('LU') },
  { code: 'MC', dial: '+377', label: 'Monaco', flag: flagFromIso('MC') },
  { code: 'IT', dial: '+39', label: 'Italy', flag: flagFromIso('IT') },
  { code: 'ES', dial: '+34', label: 'Spain', flag: flagFromIso('ES') },
  { code: 'PT', dial: '+351', label: 'Portugal', flag: flagFromIso('PT') },
  { code: 'DE', dial: '+49', label: 'Germany', flag: flagFromIso('DE') },
  { code: 'NL', dial: '+31', label: 'Netherlands', flag: flagFromIso('NL') },
  { code: 'AE', dial: '+971', label: 'United Arab Emirates', flag: flagFromIso('AE') },
  { code: 'SA', dial: '+966', label: 'Saudi Arabia', flag: flagFromIso('SA') },
  { code: 'MA', dial: '+212', label: 'Morocco', flag: flagFromIso('MA') },
  { code: 'MU', dial: '+230', label: 'Mauritius', flag: flagFromIso('MU') },
  { code: 'AU', dial: '+61', label: 'Australia', flag: flagFromIso('AU') },
  { code: 'CA', dial: '+1', label: 'Canada', flag: flagFromIso('CA') },
]

export const defaultPhonePrefix = phonePrefixes[0]

export function parsePhoneValue(value: string): { prefix: PhonePrefix; number: string } {
  const trimmed = value.trim()
  if (!trimmed) {
    return { prefix: defaultPhonePrefix, number: '' }
  }

  const sorted = [...phonePrefixes].sort((a, b) => b.dial.length - a.dial.length)
  const match = sorted.find(p => trimmed.startsWith(p.dial))

  if (match) {
    return {
      prefix: match,
      number: trimmed.slice(match.dial.length).trim(),
    }
  }

  return { prefix: defaultPhonePrefix, number: trimmed.replace(/^\+/, '') }
}

export function formatPhoneValue(prefix: PhonePrefix, number: string): string {
  const digits = number.replace(/\s+/g, ' ').trim()
  if (!digits) return ''
  return `${prefix.dial} ${digits}`
}
