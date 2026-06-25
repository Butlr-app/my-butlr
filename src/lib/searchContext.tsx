import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface SearchFilters {
  propertyType?: string[]
  propertyLocation?: string
  propertyBedrooms?: number
  reservationStatus?: string[]
  reservationDateFrom?: string
  reservationDateTo?: string
  reservationProperty?: string
  paymentStatus?: string[]
  paymentDateFrom?: string
  paymentDateTo?: string
  paymentMinAmount?: number
  paymentMaxAmount?: number
  taskStatus?: string[]
  taskPriority?: string[]
  taskProperty?: string
}

export interface SavedFilter {
  id: string
  name: string
  filters: SearchFilters
  page: string
}

interface SearchContextType {
  query: string
  setQuery: (q: string) => void
  filters: SearchFilters
  setFilters: (f: SearchFilters) => void
  updateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void
  clearFilters: () => void
  savedFilters: SavedFilter[]
  saveFilter: (name: string, page: string) => void
  removeSavedFilter: (id: string) => void
  loadSavedFilter: (filter: SavedFilter) => void
}

const SAVED_FILTERS_KEY = 'butlr-saved-filters'

function loadSavedFiltersFromStorage(): SavedFilter[] {
  try {
    const stored = localStorage.getItem(SAVED_FILTERS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const SearchContext = createContext<SearchContextType>({
  query: '',
  setQuery: () => {},
  filters: {},
  setFilters: () => {},
  updateFilter: () => {},
  clearFilters: () => {},
  savedFilters: [],
  saveFilter: () => {},
  removeSavedFilter: () => {},
  loadSavedFilter: () => {},
})

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('')
  const [filters, setFiltersState] = useState<SearchFilters>({})
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(loadSavedFiltersFromStorage)

  const setFilters = useCallback((f: SearchFilters) => {
    setFiltersState(f)
  }, [])

  const updateFilter = useCallback(<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFiltersState(prev => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFiltersState({})
  }, [])

  const saveFilter = useCallback((name: string, page: string) => {
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      filters: { ...filters },
      page,
    }
    const updated = [...savedFilters, newFilter]
    setSavedFilters(updated)
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated))
  }, [filters, savedFilters])

  const removeSavedFilter = useCallback((id: string) => {
    const updated = savedFilters.filter(f => f.id !== id)
    setSavedFilters(updated)
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated))
  }, [savedFilters])

  const loadSavedFilter = useCallback((filter: SavedFilter) => {
    setFiltersState(filter.filters)
  }, [])

  return (
    <SearchContext.Provider value={{
      query, setQuery, filters, setFilters, updateFilter, clearFilters,
      savedFilters, saveFilter, removeSavedFilter, loadSavedFilter,
    }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  return useContext(SearchContext)
}
