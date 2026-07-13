import { Input } from '@/components/ui/Input'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import { cn } from '@/lib/utils'

interface AddressInputProps {
  street: string
  line2: string
  postalCode: string
  countryCode?: string
  onStreetChange: (value: string) => void
  onLine2Change: (value: string) => void
  onPostalCodeChange: (value: string) => void
  city?: string
  onCityChange?: (value: string) => void
  required?: boolean
  className?: string
}

export function AddressInput({
  street,
  line2,
  postalCode,
  countryCode = 'FR',
  onStreetChange,
  onLine2Change,
  onPostalCodeChange,
  city = '',
  onCityChange,
  required = false,
  className,
}: AddressInputProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm font-medium text-foreground">Adresse complète</p>

      <AddressAutocomplete
        label="Numéro et voie"
        name="addressStreet"
        placeholder="123 Chemin des Oliviers"
        value={street}
        onChange={onStreetChange}
        onSelect={suggestion => {
          onStreetChange(suggestion.street)
          if (suggestion.postalCode) onPostalCodeChange(suggestion.postalCode)
          if (suggestion.city && onCityChange) onCityChange(suggestion.city)
        }}
        context={[postalCode, city].filter(Boolean).join(' ')}
        enabled={countryCode === 'FR'}
        required={required}
      />

      <Input
        label="Complément d'adresse (optionnel)"
        name="addressLine2"
        placeholder="Villa, résidence, bâtiment..."
        value={line2}
        onChange={e => onLine2Change(e.target.value)}
      />

      <Input
        label="Code postal"
        name="postalCode"
        placeholder="83310"
        value={postalCode}
        onChange={e => onPostalCodeChange(e.target.value)}
        required={required}
      />
    </div>
  )
}
