import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from '../authContext'

const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()
const mockGetSession = vi.fn()
const mockGetUser = vi.fn()
const mockOnAuthStateChange = vi.fn()

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSession.mockResolvedValue({ data: { session: null } })
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
})

describe('AuthContext', () => {
  it('starts with loading true and no user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('loads session on mount', async () => {
    const mockUser = { id: 'u1', email: 'test@mybutlr.com' }
    mockGetSession.mockResolvedValue({ data: { session: { user: mockUser } } })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toEqual(mockUser)
  })

  it('signIn calls supabase and returns result', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let signInResult: { error: Error | null } | undefined
    await act(async () => {
      signInResult = await result.current.signIn('test@mybutlr.com', 'pass')
    })

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@mybutlr.com',
      password: 'pass',
    })
    expect(signInResult?.error).toBeNull()
  })

  it('signIn returns error on failure', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: new Error('Invalid credentials') })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let signInResult: { error: Error | null } | undefined
    await act(async () => {
      signInResult = await result.current.signIn('bad@email.com', 'wrong')
    })

    expect(signInResult?.error?.message).toBe('Invalid credentials')
  })

  it('signOut calls supabase', async () => {
    mockSignOut.mockResolvedValue({})

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.signOut()
    })

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('signUp calls supabase with metadata', async () => {
    mockSignUp.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.signUp('new@user.com', 'pass123', 'John Doe', 'owner')
    })

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@user.com',
      password: 'pass123',
      options: { data: { full_name: 'John Doe', role: 'partner' } },
    })
  })
})
