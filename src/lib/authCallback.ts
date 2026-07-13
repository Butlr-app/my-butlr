import { supabase } from './supabase'

export type AuthCallbackType = 'recovery' | 'magiclink' | 'signup' | 'unknown'

function readHashParams() {
  const hash = window.location.hash.replace(/^#/, '')
  return new URLSearchParams(hash)
}

export function getAuthCallbackType(): AuthCallbackType | null {
  const search = new URLSearchParams(window.location.search)
  const hash = readHashParams()
  const type = search.get('type') ?? hash.get('type')

  if (type === 'recovery') return 'recovery'
  if (type === 'magiclink' || type === 'email') return 'magiclink'
  if (type === 'signup') return 'signup'
  if (search.has('code') || hash.has('access_token') || search.has('token_hash')) {
    return 'unknown'
  }

  return null
}

export function hasAuthCallback() {
  return getAuthCallbackType() !== null
}

export function getAuthCallbackRoute(type: AuthCallbackType | null): string | null {
  if (!type) return null
  if (type === 'recovery') return '/reset-password'
  return '/auth/callback'
}

export async function bootstrapAuthSession(
  type: AuthCallbackType,
): Promise<{ ok: boolean; error?: string }> {
  const search = new URLSearchParams(window.location.search)
  const hash = readHashParams()

  const tokenHash = search.get('token_hash')
  if (tokenHash) {
    const otpTypes = type === 'recovery'
      ? (['recovery'] as const)
      : type === 'magiclink' || type === 'signup'
        ? (['email'] as const)
        : (['email', 'recovery'] as const)

    let lastError = 'Lien invalide ou expiré.'
    for (const otpType of otpTypes) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      })
      if (!error) return { ok: true }
      lastError = error.message
    }
    return { ok: false, error: lastError }
  }

  const code = search.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (session) return { ok: true }

  if (hash.get('access_token')) {
    await new Promise(resolve => window.setTimeout(resolve, 250))
    const { data: { session: retrySession } } = await supabase.auth.getSession()
    if (retrySession) return { ok: true }
  }

  return { ok: false, error: 'Lien invalide ou expiré.' }
}

export function clearAuthCallbackFromUrl() {
  window.history.replaceState({}, document.title, window.location.pathname)
}

// Backward-compatible helpers used by password reset flow
export function hasRecoveryCallback() {
  return getAuthCallbackType() === 'recovery'
}

export async function bootstrapRecoverySession() {
  return bootstrapAuthSession('recovery')
}

export function clearRecoveryCallbackFromUrl() {
  clearAuthCallbackFromUrl()
}
