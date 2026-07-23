import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

const authState = vi.hoisted(() => ({
  user: { id: 'u1', email: 'p@example.com', email_confirmed_at: '2026-01-01' } as {
    id: string
    email: string
    email_confirmed_at: string | null
  } | null,
  profile: { role: 'partner', onboarding_completed: true } as {
    role: string
    onboarding_completed: boolean
  } | null,
  loading: false,
  profileLoading: false,
}))

vi.mock('@/lib/authContext', () => ({
  useAuth: () => authState,
}))

describe('ProtectedRoute partner redirect', () => {
  it('redirige un partner hors de /app vers /partner', () => {
    authState.user = {
      id: 'u1',
      email: 'p@example.com',
      email_confirmed_at: '2026-01-01',
    }
    authState.profile = { role: 'partner', onboarding_completed: true }
    authState.loading = false
    authState.profileLoading = false

    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route
            path="/app"
            element={(
              <ProtectedRoute>
                <div>Owner app</div>
              </ProtectedRoute>
            )}
          />
          <Route path="/partner" element={<div>Partner home</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Partner home')).toBeInTheDocument()
    expect(screen.queryByText('Owner app')).not.toBeInTheDocument()
  })

  it('laisse un owner accéder à /app', () => {
    authState.profile = { role: 'owner', onboarding_completed: true }

    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route
            path="/app"
            element={(
              <ProtectedRoute>
                <div>Owner app</div>
              </ProtectedRoute>
            )}
          />
          <Route path="/partner" element={<div>Partner home</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Owner app')).toBeInTheDocument()
  })
})
