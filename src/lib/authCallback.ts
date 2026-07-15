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

async function waitForDetectedSession(timeoutMs = 2000): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return true

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      subscription.unsubscribe()
      resolve(false)
    }, timeoutMs)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        window.clearTimeout(timer)
        subscription.unsubscribe()
        resolve(true)
      }
    })
  })
}

export async function bootstrapAuthSession(
  type: AuthCallbackType,
): Promise<{ ok: boolean; error?: string }> {
  const search = new URLSearchParams(window.location.search)
  const hash = readHashParams()

  if (await waitForDetectedSession()) {
    return { ok: true }
  }

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
    if (!error) return { ok: true }

    if (error.message.toLowerCase().includes('code verifier')) {
      return {
        ok: false,
        error: 'Ouvrez le lien dans le même navigateur où vous l’avez demandé, ou demandez un nouveau lien magique.',
      }
    }

    return { ok: false, error: error.message }
  }

  if (hash.get('access_token')) {
    if (await waitForDetectedSession(500)) {
      return { ok: true }
    }
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (session) return { ok: true }

  return { ok: false, error: 'Lien invalide ou expiré.' }
}

export function clearAuthCallbackFromUrl() {
  window.history.replaceState({}, document.title, window.location.pathname)
}

export function hasRecoveryCallback() {
  return getAuthCallbackType() === 'recovery'
}

export async function bootstrapRecoverySession() {
  return bootstrapAuthSession('recovery')
}

export function clearRecoveryCallbackFromUrl() {
  clearAuthCallbackFromUrl()
}
