/** Validates the payload returned by get_guest_stay_portal before rendering. */
export function isGuestStayPortalPayloadValid(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const raw = payload as Record<string, unknown>
  if (typeof raw.error === 'string') return false
  const reservation = raw.reservation as { id?: unknown; property_id?: unknown } | undefined
  return Boolean(
    reservation
    && typeof reservation.id === 'string'
    && reservation.id.length > 0
    && typeof reservation.property_id === 'string'
    && reservation.property_id.length > 0,
  )
}
