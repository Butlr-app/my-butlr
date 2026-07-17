import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({
  rpc: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: { rpc },
}))

import { fetchGuestRecommendedProperties } from './postStayMarketplace'

describe('postStayMarketplace', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('returns only the properties exposed by the token-scoped RPC', async () => {
    rpc.mockResolvedValue({
      data: {
        properties: [{
          id: 'property-2',
          name: 'Villa Horizon',
          location: 'Ramatuelle',
          type: 'villa',
          bedrooms: 5,
          max_guests: 10,
          image_url: null,
          tagline: 'Vue mer',
          booking_url: 'https://example.com/villa',
        }],
      },
      error: null,
    })

    const result = await fetchGuestRecommendedProperties('guest-token')

    expect(rpc).toHaveBeenCalledWith('guest_get_recommended_properties', {
      p_token: 'guest-token',
    })
    expect(result.data).toHaveLength(1)
  })

  it('does not expose data when the RPC rejects the stay phase', async () => {
    rpc.mockResolvedValue({
      data: { error: 'stay_not_finished', properties: [] },
      error: null,
    })

    const result = await fetchGuestRecommendedProperties('guest-token')

    expect(result.data).toEqual([])
  })
})
