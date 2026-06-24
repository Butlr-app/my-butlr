import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SearchProvider, useSearch } from '../searchContext'

function wrapper({ children }: { children: ReactNode }) {
  return <SearchProvider>{children}</SearchProvider>
}

describe('SearchContext', () => {
  it('defaults to empty query', () => {
    const { result } = renderHook(() => useSearch(), { wrapper })
    expect(result.current.query).toBe('')
  })

  it('updates query', () => {
    const { result } = renderHook(() => useSearch(), { wrapper })

    act(() => {
      result.current.setQuery('villa azure')
    })

    expect(result.current.query).toBe('villa azure')
  })

  it('clears query', () => {
    const { result } = renderHook(() => useSearch(), { wrapper })

    act(() => {
      result.current.setQuery('some search')
    })

    act(() => {
      result.current.setQuery('')
    })

    expect(result.current.query).toBe('')
  })
})
