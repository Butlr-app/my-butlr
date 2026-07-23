const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isGuestToken(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

export function extractInvitationToken(value: string): string | null {
  const input = value.trim();
  if (!input) return null;
  if (isGuestToken(input)) return input.toLowerCase();

  try {
    const url = new URL(input);
    const segments = url.pathname.split('/').filter(Boolean);
    const stayIndex = segments.lastIndexOf('stay');
    const candidate =
      stayIndex >= 0 ? segments[stayIndex + 1] : url.searchParams.get('token');
    return candidate && isGuestToken(candidate) ? candidate.toLowerCase() : null;
  } catch {
    const candidate = input.split('/').filter(Boolean).at(-1);
    return candidate && isGuestToken(candidate) ? candidate.toLowerCase() : null;
  }
}

export function invitationUrl(token: string): string {
  return `https://mybutlr.com/guest/stay/${token}`;
}
