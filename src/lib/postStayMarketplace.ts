import { supabase } from './supabase'

export interface RecommendedProperty {
  id: string
  name: string
  location: string | null
  type: string
  bedrooms: number
  max_guests: number
  image_url: string | null
  tagline: string | null
  booking_url: string
}

export async function fetchGuestRecommendedProperties(token: string) {
  const { data, error } = await supabase.rpc('guest_get_recommended_properties', {
    p_token: token,
  })

  if (error) return { data: [] as RecommendedProperty[], error }

  const payload = data as {
    error?: string
    properties?: RecommendedProperty[]
  } | null

  return {
    data: payload?.error ? [] : (payload?.properties ?? []),
    error: null,
  }
}
