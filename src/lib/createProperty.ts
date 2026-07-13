import { supabase } from './supabase'
import type { Property } from './types'

type ExtraFields = Record<string, unknown>

function extractMissingColumn(message: string): string | null {
  const match = message.match(/column\s+\S*?\.?"?(\w+)"?\s+does not exist/i)
  return match ? match[1] : null
}

async function updateExtrasResilient(
  id: string,
  ownerId: string,
  fields: ExtraFields,
): Promise<{ property: Property | null; missingColumns: string[]; error: Error | null }> {
  const payload: ExtraFields = { ...fields }
  const missingColumns: string[] = []

  for (;;) {
    if (Object.keys(payload).length === 0) {
      return { property: null, missingColumns, error: null }
    }

    const { data, error } = await supabase
      .from('properties')
      .update(payload)
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select('*')
      .single()

    if (!error) {
      return { property: data as Property, missingColumns, error: null }
    }

    const missing = error.code === '42703' ? extractMissingColumn(error.message) : null
    if (missing && missing in payload) {
      missingColumns.push(missing)
      delete payload[missing]
      continue
    }

    return { property: null, missingColumns, error: error as unknown as Error }
  }
}

export interface CreatePropertyInput {
  ownerId: string
  name: string
  location: string
  type: string
  bedrooms: number
  bathrooms: number
  maxGuests: number
  description?: string | null
  address?: string | null
  surfaceSqm?: number | null
  amenities?: string[]
}

export async function createOwnerProperty(input: CreatePropertyInput) {
  const bedrooms = Math.max(0, Math.floor(input.bedrooms))
  const bathrooms = Math.max(0, Math.floor(input.bathrooms))
  const maxGuests = Math.max(0, Math.floor(input.maxGuests))

  const corePayload = {
    owner_id: input.ownerId,
    name: input.name.trim(),
    location: input.location,
    type: input.type,
    bedrooms,
    bathrooms,
    max_guests: maxGuests,
    description: input.description?.trim() || null,
    status: 'active' as const,
  }

  const { data: property, error: insertError } = await supabase
    .from('properties')
    .insert(corePayload)
    .select('id, bedrooms, bathrooms, max_guests')
    .single()

  if (insertError || !property) {
    return { property: null, error: insertError ?? new Error('Failed to create property') }
  }

  const extras: ExtraFields = {}
  if (input.address?.trim()) extras.address = input.address.trim()
  if (input.surfaceSqm && input.surfaceSqm > 0) extras.surface_m2 = Math.floor(input.surfaceSqm)
  if (input.amenities && input.amenities.length > 0) extras.amenities = input.amenities

  let missingColumns: string[] = []

  if (Object.keys(extras).length > 0) {
    const result = await updateExtrasResilient(property.id, input.ownerId, extras)
    if (result.error) {
      return { property, error: result.error, missingColumns: result.missingColumns }
    }
    missingColumns = result.missingColumns
  }

  return { property, error: null, missingColumns }
}

export interface UpdatePropertyInput {
  id: string
  ownerId: string
  name: string
  location: string
  type: string
  status: string
  bedrooms: number
  bathrooms: number
  maxGuests: number
  description?: string | null
  address?: string | null
  surfaceSqm?: number | null
  amenities?: string[]
  imageUrl?: string | null
}

export async function updateOwnerProperty(input: UpdatePropertyInput) {
  const bedrooms = Math.max(0, Math.floor(input.bedrooms))
  const bathrooms = Math.max(0, Math.floor(input.bathrooms))
  const maxGuests = Math.max(0, Math.floor(input.maxGuests))

  const corePayload = {
    name: input.name.trim(),
    location: input.location.trim(),
    type: input.type,
    status: input.status,
    bedrooms,
    bathrooms,
    max_guests: maxGuests,
    description: input.description?.trim() || null,
  }

  const { data: property, error: updateError } = await supabase
    .from('properties')
    .update(corePayload)
    .eq('id', input.id)
    .eq('owner_id', input.ownerId)
    .select('*')
    .single()

  if (updateError || !property) {
    return { property: null, error: updateError ?? new Error('Failed to update property') }
  }

  const extras: ExtraFields = {}
  extras.address = input.address?.trim() || null
  extras.surface_m2 = input.surfaceSqm && input.surfaceSqm > 0 ? Math.floor(input.surfaceSqm) : null
  extras.amenities = input.amenities ?? []
  if (input.imageUrl !== undefined) extras.image_url = input.imageUrl

  const result = await updateExtrasResilient(input.id, input.ownerId, extras)

  if (result.error) {
    return { property: property as Property, error: result.error, missingColumns: result.missingColumns }
  }

  return {
    property: (result.property ?? property) as Property,
    error: null,
    missingColumns: result.missingColumns,
  }
}
