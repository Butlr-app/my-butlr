export interface AddressParts {
  street: string
  line2?: string | null
  postalCode: string
  city: string
  country: string
}

export function formatFullAddress(parts: AddressParts): string {
  const lines = [
    parts.street.trim(),
    parts.line2?.trim(),
    [parts.postalCode.trim(), parts.city.trim()].filter(Boolean).join(' '),
    parts.country.trim(),
  ].filter(Boolean)

  return lines.join('\n')
}
