import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CUSTOM_AMENITY_PREFIX,
  amenityLabel,
  customAmenityId,
  propertyAmenities,
} from '@/lib/propertyAmenities'

interface AmenityPickerProps {
  value: string[]
  onChange: (value: string[]) => void
  className?: string
}

export function AmenityPicker({ value, onChange, className }: AmenityPickerProps) {
  const [expanded, setExpanded] = useState(false)
  const [customAmenity, setCustomAmenity] = useState('')

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  }

  const customValues = value.filter(id => id.startsWith(CUSTOM_AMENITY_PREFIX))

  const visibleAmenities = useMemo(() => {
    if (expanded) return [...propertyAmenities]

    const initial = propertyAmenities.slice(0, 12)
    const selectedOutsideInitial = propertyAmenities.filter(
      amenity => value.includes(amenity.id) && !initial.some(item => item.id === amenity.id),
    )

    return [...initial, ...selectedOutsideInitial]
  }, [expanded, value])

  const addCustomAmenity = () => {
    const label = customAmenity.trim().replace(/\s+/g, ' ')
    if (!label) return

    const id = customAmenityId(label)
    const alreadyExists = value.some(item => amenityLabel(item).toLocaleLowerCase('fr') === label.toLocaleLowerCase('fr'))

    if (!alreadyExists) onChange([...value, id])
    setCustomAmenity('')
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-foreground">Équipements</label>
        {value.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {value.length} sélectionné{value.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleAmenities.map(amenity => {
          const selected = value.includes(amenity.id)
          return (
            <button
              key={amenity.id}
              type="button"
              onClick={() => toggle(amenity.id)}
              aria-pressed={selected}
              className={cn(
                'min-h-10 px-3 py-2 rounded-full text-xs font-medium border transition-colors cursor-pointer',
                selected
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
              )}
            >
              {amenity.label}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setExpanded(current => !current)}
        className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={expanded}
      >
        {expanded ? (
          <>
            <ChevronUp className="h-4 w-4" />
            Voir moins
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" />
            Voir {propertyAmenities.length - 12} équipements de plus
          </>
        )}
      </button>

      {customValues.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Équipements personnalisés</p>
          <div className="flex flex-wrap gap-2">
            {customValues.map(id => (
              <span
                key={id}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-foreground bg-foreground px-3 py-2 text-xs font-medium text-background"
              >
                {amenityLabel(id)}
                <button
                  type="button"
                  onClick={() => onChange(value.filter(item => item !== id))}
                  aria-label={`Supprimer ${amenityLabel(id)}`}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-background/20"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={customAmenity}
          onChange={event => setCustomAmenity(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addCustomAmenity()
            }
          }}
          maxLength={50}
          placeholder="Ajouter un autre équipement…"
          aria-label="Nouvel équipement personnalisé"
          className={cn(
            'h-10 min-w-0 flex-1 rounded-sm border border-input bg-card px-3 text-sm',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20',
          )}
        />
        <button
          type="button"
          onClick={addCustomAmenity}
          disabled={!customAmenity.trim()}
          className={cn(
            'inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-card px-3 text-xs font-medium transition-colors',
            'hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>
    </div>
  )
}
