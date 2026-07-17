import { describe, expect, it } from 'vitest'
import { isGuestStayPortalPayloadValid } from './guestPortalAccess'

describe('isGuestStayPortalPayloadValid', () => {
  it('rejects null, errors and phantom null reservations', () => {
    expect(isGuestStayPortalPayloadValid(null)).toBe(false)
    expect(isGuestStayPortalPayloadValid({ error: 'not_found' })).toBe(false)
    expect(isGuestStayPortalPayloadValid({
      reservation: { id: null, property_id: null },
      settings: { enabled: true },
    })).toBe(false)
  })

  it('accepts a complete reservation payload', () => {
    expect(isGuestStayPortalPayloadValid({
      reservation: {
        id: '9a09a3a1-cecc-46b0-8686-1028135d70d9',
        property_id: '6a6286aa-381f-48c3-87cc-cab3a2994f86',
        guest_name: 'Guest',
      },
    })).toBe(true)
  })
})
