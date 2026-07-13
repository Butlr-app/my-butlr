const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'Email rate limit exceeded': 'Trop de demandes d’email. Réessayez dans environ 1 heure, ou contactez le support.',
  'For security purposes, you can only request this once every 60 seconds': 'Veuillez patienter 60 secondes avant de redemander un lien.',
}

export function formatAuthError(message: string): string {
  return AUTH_ERROR_MESSAGES[message] ?? message
}

export function isEmailRateLimitError(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('rate limit') || normalized.includes('once every')
}
