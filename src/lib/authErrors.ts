const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'Email rate limit exceeded': 'Trop de demandes d’email. Réessayez dans environ 1 heure, ou contactez le support.',
  'For security purposes, you can only request this once every 60 seconds': 'Veuillez patienter 60 secondes avant de redemander un lien.',
  'PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared. For SSR frameworks (Next.js, SvelteKit, etc.), use @supabase/ssr on both the server and client to store the code verifier in cookies.':
    'Ouvrez le lien dans le même navigateur où vous l’avez demandé, ou redemandez un lien magique.',
}

export function formatAuthError(message: string): string {
  return AUTH_ERROR_MESSAGES[message] ?? message
}

export function isEmailRateLimitError(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('rate limit') || normalized.includes('once every')
}
