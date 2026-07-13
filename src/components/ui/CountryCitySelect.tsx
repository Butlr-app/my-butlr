import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  countries,
  defaultCountry,
  fetchCitiesForCountry,
  getCountryByCode,
} from '@/lib/locations'

interface CountryCitySelectProps {
  countryCode: string
  city: string
  onCountryChange: (countryCode: string) => void
  onCityChange: (city: string) => void
  required?: boolean
  className?: string
}

const MAX_SUGGESTIONS = 8

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text

  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return text

  return (
    <>
      {text.slice(0, index)}
      <span className="text-foreground font-medium">{text.slice(index, index + query.length)}</span>
      {text.slice(index + query.length)}
    </>
  )
}

export function CountryCitySelect({
  countryCode,
  city,
  onCountryChange,
  onCityChange,
  required,
  className,
}: CountryCitySelectProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [cities, setCities] = useState<string[]>([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [cityError, setCityError] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)

  const selectedCountry = getCountryByCode(countryCode) ?? defaultCountry

  useEffect(() => {
    let cancelled = false

    async function loadCities() {
      setLoadingCities(true)
      setCityError('')
      const result = await fetchCitiesForCountry(selectedCountry.name)

      if (cancelled) return

      setCities(result)
      setLoadingCities(false)

      if (result.length === 0) {
        setCityError('No cities found — type your city manually.')
      }
    }

    loadCities()
    return () => { cancelled = true }
  }, [selectedCountry.name])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCountryChange = (code: string) => {
    onCountryChange(code)
    onCityChange('')
    setOpen(false)
  }

  const filteredCities = city.trim()
    ? cities.filter(c => c.toLowerCase().includes(city.toLowerCase())).slice(0, MAX_SUGGESTIONS)
    : cities.slice(0, MAX_SUGGESTIONS)

  const showDropdown = open && !loadingCities && (filteredCities.length > 0 || city.trim().length > 0)

  const selectCity = (value: string) => {
    onCityChange(value)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown') setOpen(true)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(i => Math.min(i + 1, filteredCities.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filteredCities[highlightIndex]) {
      e.preventDefault()
      selectCity(filteredCities[highlightIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    setHighlightIndex(0)
  }, [city, filteredCities.length])

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">Country</label>
        <select
          value={countryCode}
          onChange={e => handleCountryChange(e.target.value)}
          required={required}
          className="w-full h-10 px-3 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20"
        >
          {countries.map(country => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5" ref={containerRef}>
        <label className="block text-sm font-medium text-foreground">City</label>
        <div className="relative">
          <input
            type="text"
            value={city}
            onChange={e => {
              onCityChange(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={loadingCities ? 'Loading cities...' : 'Search or type a city'}
            required={required}
            disabled={loadingCities}
            autoComplete="off"
            className="w-full h-10 px-3 bg-card border border-input rounded-sm text-sm transition-colors focus:outline-none focus:border-info focus:ring-1 focus:ring-info/20 placeholder:text-muted-foreground disabled:opacity-60"
          />
          {loadingCities && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
          )}

          {showDropdown && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg overflow-hidden">
              {filteredCities.length > 0 ? (
                <ul className="max-h-52 overflow-y-auto py-1">
                  {filteredCities.map((item, index) => (
                    <li key={item}>
                      <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => selectCity(item)}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
                          index === highlightIndex && 'bg-muted text-foreground'
                        )}
                      >
                        {highlightMatch(item, city)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No match — press Enter to use "{city.trim()}"
                </div>
              )}

              {city.trim() && filteredCities.length > 0 && (
                <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground bg-muted/30">
                  {filteredCities.length} suggestion{filteredCities.length > 1 ? 's' : ''}
                  {cities.length > MAX_SUGGESTIONS ? ` · ${cities.length} cities in ${selectedCountry.name}` : ''}
                </div>
              )}
            </div>
          )}
        </div>

        {!loadingCities && !open && cities.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {cities.length} cities available in {selectedCountry.name}
          </p>
        )}
        {cityError && (
          <p className="text-xs text-muted-foreground">{cityError}</p>
        )}
      </div>
    </div>
  )
}

export function useLocationFields(initialLocation = '') {
  const [countryCode, setCountryCode] = useState(defaultCountry.code)
  const [city, setCity] = useState('')

  useEffect(() => {
    if (!initialLocation) return

    const match = countries.find(c => initialLocation.includes(c.name))
    if (match) {
      setCountryCode(match.code)
      setCity(initialLocation.replace(`, ${match.name}`, '').trim())
    } else {
      setCity(initialLocation)
    }
  }, [initialLocation])

  const country = getCountryByCode(countryCode) ?? defaultCountry

  return {
    countryCode,
    city,
    country,
    setCountryCode,
    setCity,
    locationLabel: city.trim() ? `${city.trim()}, ${country.name}` : '',
    isValid: Boolean(city.trim()),
  }
}
