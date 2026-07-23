import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PartnerRoute } from './PartnerRoute'

const authState = vi.hoisted(() => ({
  user: { id: 'u1', email: 'p@example.com', email_confirmed_at: '2026-01-01' } as {
    id: string
    email: string
    email_confirmed_at: string | null
  } | null,
  profile: { role: 'partner' } as { role: string } | null,
  loading: false,
  profileLoading: false,
}))

vi.mock('@/lib/authContext', () => ({
  useAuth: () => authState,
}))

describe('PartnerRoute', () => {
  it('autorise un partner à accéder à /partner', () => {
    authState.profile = { role: 'partner' }

    render(
      <MemoryRouter initialEntries={['/partner']}>
        <Routes>
          <Route
            path="/partner"
            element={(
              <PartnerRoute>
                <div>Partner space</div>
              </PartnerRoute>
            )}
          />
          <Route path="/app" element={<div>Owner app</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Partner space')).toBeInTheDocument()
  })

  it('redirige un owner vers /app', () => {
    authState.profile = { role: 'owner' }

    render(
      <MemoryRouter initialEntries={['/partner']}>
        <Routes>
          <Route
            path="/partner"
            element={(
              <PartnerRoute>
                <div>Partner space</div>
              </PartnerRoute>
            )}
          />
          <Route path="/app" element={<div>Owner app</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Owner app')).toBeInTheDocument()
    expect(screen.queryByText('Partner space')).not.toBeInTheDocument()
  })
})
