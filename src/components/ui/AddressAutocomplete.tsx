import { useEffect, useId, useRef, useState } from 'react'
import { Check, Loader2, MapPin } from 'lucide-react'
import {
  searchFrenchAddresses,
  type AddressSuggestion,
} from '@/lib/addressAutocomplete'
import { cn } from '@/lib/utils'

interface AddressAutocompleteProps {
  label?: string
  name?: string
  value: string
  onChange: (value: string) => void
  onSelect?: (suggestion: AddressSuggestion) => void
  context?: string
  enabled?: boolean
  placeholder?: string
  required?: boolean
  className?: string
}

export function AddressAutocomplete({
  label = 'Adresse',
  name = 'address',
  value,
  onChange,
  onSelect,
  context = '',
  enabled = true,
  placeholder = 'Commencez à saisir une adresse…',
  required = false,
  className,
}: AddressAutocompleteProps) {
  const listId = useId()
  const requestId = useRef(0)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [selectedValue, setSelectedValue] = useState('')

  useEffect(() => {
    const query = value.trim()

    if (!enabled || query.length < 3 || query === selectedValue) {
      setSuggestions([])
      setOpen(false)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const currentRequest = ++requestId.current

    const timer = window.setTimeout(async () => {
      setLoading(true)

      try {
        const results = await searchFrenchAddresses(query, context, controller.signal)
        if (currentRequest !== requestId.current) return

        setSuggestions(results)
        setActiveIndex(-1)
        setOpen(results.length > 0)
      } catch (error) {
        if ((error as Error).name !== 'AbortError' && currentRequest === requestId.current) {
          setSuggestions([])
          setOpen(false)
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [context, enabled, selectedValue, value])

  const chooseSuggestion = (suggestion: AddressSuggestion) => {
    setSelectedValue(suggestion.fullText)
    onChange(suggestion.fullText)
    onSelect?.(suggestion)
    setSuggestions([])
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(index => Math.min(index + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(index => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      chooseSuggestion(suggestions[activeIndex])
    } else if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className={cn('relative space-y-1.5', className)}>
      {label && (
        <label htmlFor={`${listId}-input`} className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <div className="relative">
        <MapPin
          aria-hidden="true"
          className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={`${listId}-input`}
          name={name}
          value={value}
          onChange={event => {
            setSelectedValue('')
            onChange(event.target.value)
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true)
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 100)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          className={cn(
            'h-10 w-full rounded-sm border border-input bg-card py-2 pl-9 pr-9 text-sm transition-colors',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20',
          )}
        />
        {loading && (
          <Loader2
            aria-label="Recherche en cours"
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        )}
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.fullText}-${index}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseSuggestion(suggestion)}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-sm',
                activeIndex === index && 'bg-muted',
              )}
            >
              <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{suggestion.fullText}</span>
              {selectedValue === suggestion.fullText && (
                <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
              )}
            </li>
          ))}
        </ul>
      )}

      {enabled && (
        <p className="text-xs text-muted-foreground">
          Suggestions d’adresses françaises fournies par l’IGN.
        </p>
      )}
    </div>
  )
}
