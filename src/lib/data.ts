import { supabase } from './supabase'
import { fetchPartnersForTasks } from './partners'
import { todayISO } from './dateFormat'

export { todayISO }

export async function getOwnerPropertyIds(_ownerId: string): Promise<string[]> {
  const { data } = await supabase
    .from('properties')
    .select('id')

  return (data ?? []).map(p => p.id)
}

export async function fetchOwnerProperties(_ownerId: string) {
  return supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })
}

export async function syncReservationLifecycle() {
  return supabase.rpc('sync_reservation_lifecycle')
}

export async function fetchOwnerReservations(ownerId: string) {
  const propertyIds = await getOwnerPropertyIds(ownerId)
  if (propertyIds.length === 0) return { data: [], error: null }

  const { error: syncError } = await syncReservationLifecycle()
  if (syncError) {
    console.warn('sync_reservation_lifecycle failed:', syncError.message)
  }

  return supabase
    .from('reservations')
    .select('*, properties(name)')
    .in('property_id', propertyIds)
    .order('arrival', { ascending: true })
}

export async function fetchReservationById(reservationId: string) {
  return supabase
    .from('reservations')
    .select('*, properties(name, max_guests)')
    .eq('id', reservationId)
    .maybeSingle()
}

export async function fetchOwnerPayments(ownerId: string) {
  const propertyIds = await getOwnerPropertyIds(ownerId)
  if (propertyIds.length === 0) return { data: [], error: null }

  const { data: reservations } = await supabase
    .from('reservations')
    .select('id')
    .in('property_id', propertyIds)

  const reservationIds = (reservations ?? []).map(r => r.id)
  if (reservationIds.length === 0) return { data: [], error: null }

  return supabase
    .from('payments')
    .select('*')
    .in('reservation_id', reservationIds)
    .order('date', { ascending: false })
}

export async function fetchOwnerContracts(ownerId: string) {
  const propertyIds = await getOwnerPropertyIds(ownerId)
  if (propertyIds.length === 0) return { data: [], error: null }

  const { data: reservations } = await supabase
    .from('reservations')
    .select('id')
    .in('property_id', propertyIds)

  const reservationIds = (reservations ?? []).map(r => r.id)
  if (reservationIds.length === 0) return { data: [], error: null }

  return supabase
    .from('contracts')
    .select('*, contract_files(*), reservations(guest_name,guest_email,property_id)')
    .in('reservation_id', reservationIds)
    .order('date', { ascending: false })
}

export async function fetchOwnerCalendarEvents(ownerId: string) {
  const propertyIds = await getOwnerPropertyIds(ownerId)
  if (propertyIds.length === 0) return { data: [], error: null }

  return supabase
    .from('calendar_events')
    .select('*, properties(name)')
    .in('property_id', propertyIds)
    .order('start_date', { ascending: true })
}

export async function fetchServices() {
  return supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true })
}

export async function fetchPartners(ownerId: string) {
  return fetchPartnersForTasks(ownerId)
}

