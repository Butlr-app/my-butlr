import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Property {
  id: string
  owner_id: string | null
  name: string
  location: string | null
  type: 'villa' | 'yacht' | 'apartment' | 'chalet'
  status: 'active' | 'inactive' | 'maintenance'
  bedrooms: number
  bathrooms: number
  max_guests: number
  surface_m2: number
  units: number
  description: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface PropertyAmenity {
  id: string
  property_id: string
  amenity_key: string
  created_at: string
}

export interface PropertyRoom {
  id: string
  property_id: string
  room_type: string
  room_name: string | null
  variant: 'private' | 'shared'
  bedding: Array<{ type: string; count: number }>
  created_at: string
}

export interface Reservation {
  id: string
  property_id: string | null
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  arrival: string
  departure: string
  guests_count: number
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded'
  contract_status: 'none' | 'draft' | 'sent' | 'signed'
  total_amount: number
  notes: string | null
  created_at: string
  updated_at: string
  property?: Property
}

export interface Service {
  id: string
  name: string
  description: string | null
  category: string | null
  starting_price: number
  commission: number
  available: boolean
  image_url: string | null
  created_at: string
}

export interface Task {
  id: string
  property_id: string | null
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'waiting' | 'done'
  priority: 'low' | 'medium' | 'high'
  assigned_to: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  property?: Property
}

export interface Partner {
  id: string
  name: string
  category: string | null
  location: string | null
  contact: string | null
  email: string | null
  phone: string | null
  commission: number
  status: 'active' | 'inactive'
  rating: number
  bookings_count: number
  created_at: string
}

export interface Payment {
  id: string
  reservation_id: string | null
  guest_name: string
  property_name: string | null
  type: 'booking' | 'deposit' | 'service' | 'commission'
  amount: number
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  date: string
  created_at: string
}

export interface Contract {
  id: string
  reservation_id: string | null
  guest_name: string
  property_name: string | null
  type: 'rental' | 'service' | 'partnership'
  status: 'draft' | 'sent' | 'signed' | 'archived' | 'expired'
  date: string
  document_url: string | null
  signing_token: string | null
  created_at: string
}

export interface CalendarEvent {
  id: string
  property_id: string | null
  title: string
  type: 'reservation' | 'maintenance' | 'cleaning' | 'service' | 'owner'
  start_date: string
  end_date: string
  notes: string | null
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  role: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// ─── Generic hook ────────────────────────────────────────────────────────────

function useTable<T>(table: string) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: rows, error: err } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
    if (err) {
      setError(err.message)
      setData([])
    } else {
      setData((rows ?? []) as T[])
    }
    setLoading(false)
  }, [table])

  useEffect(() => { fetch() }, [fetch])

  const insert = async (row: Partial<T>) => {
    const { data: inserted, error: err } = await supabase
      .from(table)
      .insert(row as Record<string, unknown>)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setData(prev => [inserted as T, ...prev])
    return inserted as T
  }

  const update = async (id: string, changes: Partial<T>) => {
    const { data: updated, error: err } = await supabase
      .from(table)
      .update(changes as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()
    if (err) throw new Error(err.message)
    setData(prev => prev.map(r => (r as Record<string, unknown>).id === id ? (updated as T) : r))
    return updated as T
  }

  const remove = async (id: string) => {
    const { error: err } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    setData(prev => prev.filter(r => (r as Record<string, unknown>).id !== id))
  }

  return { data, loading, error, refetch: fetch, insert, update, remove }
}

// ─── Specific hooks ──────────────────────────────────────────────────────────

export function useProperties() {
  return useTable<Property>('properties')
}

export function usePropertyAmenities(propertyId: string | undefined) {
  const [amenityKeys, setAmenityKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAmenities = useCallback(async () => {
    if (!propertyId) { setAmenityKeys([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('property_amenities')
      .select('amenity_key')
      .eq('property_id', propertyId)
    setAmenityKeys((data ?? []).map(r => (r as PropertyAmenity).amenity_key))
    setLoading(false)
  }, [propertyId])

  useEffect(() => { fetchAmenities() }, [fetchAmenities])

  const saveAmenities = async (keys: string[]) => {
    if (!propertyId) return
    const { error: delError } = await supabase.from('property_amenities').delete().eq('property_id', propertyId)
    if (delError) throw new Error(delError.message)
    if (keys.length > 0) {
      const { error: insError } = await supabase.from('property_amenities').insert(
        keys.map(k => ({ property_id: propertyId, amenity_key: k }))
      )
      if (insError) throw new Error(insError.message)
    }
    setAmenityKeys(keys)
  }

  return { amenityKeys, loading, saveAmenities, refetch: fetchAmenities }
}

export function usePropertyRooms(propertyId: string | undefined) {
  const [rooms, setRooms] = useState<PropertyRoom[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRooms = useCallback(async () => {
    if (!propertyId) { setRooms([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('property_rooms')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: true })
    setRooms((data ?? []) as PropertyRoom[])
    setLoading(false)
  }, [propertyId])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  const addRoom = async (room: Omit<PropertyRoom, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('property_rooms')
      .insert(room)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setRooms(prev => [...prev, data as PropertyRoom])
    return data as PropertyRoom
  }

  const updateRoom = async (id: string, changes: Partial<PropertyRoom>) => {
    const { data, error } = await supabase
      .from('property_rooms')
      .update(changes as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setRooms(prev => prev.map(r => r.id === id ? (data as PropertyRoom) : r))
    return data as PropertyRoom
  }

  const removeRoom = async (id: string) => {
    const { error } = await supabase.from('property_rooms').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setRooms(prev => prev.filter(r => r.id !== id))
  }

  return { rooms, loading, addRoom, updateRoom, removeRoom, refetch: fetchRooms }
}

export function useReservations() {
  const base = useTable<Reservation>('reservations')
  const [withProperty, setWithProperty] = useState<Reservation[]>([])
  const [enriching, setEnriching] = useState(true)
  const [propertiesMap, setPropertiesMap] = useState<Record<string, Property>>({})

  useEffect(() => {
    async function enrich() {
      if (base.loading) return
      if (base.data.length === 0) {
        setWithProperty([])
        setEnriching(false)
        return
      }
      setEnriching(true)
      const propIds = [...new Set(base.data.map(r => r.property_id).filter(Boolean))]
      if (propIds.length > 0) {
        const { data: props } = await supabase
          .from('properties')
          .select('*')
          .in('id', propIds)
        const map: Record<string, Property> = {}
        for (const p of (props ?? []) as Property[]) map[p.id] = p
        setPropertiesMap(map)
        setWithProperty(base.data.map(r => ({ ...r, property: r.property_id ? map[r.property_id] : undefined })))
      } else {
        setWithProperty(base.data)
      }
      setEnriching(false)
    }
    enrich()
  }, [base.data, base.loading])

  return { ...base, loading: base.loading || enriching, data: withProperty, propertiesMap }
}

export function useServices() {
  return useTable<Service>('services')
}

export function useTasks() {
  return useTable<Task>('tasks')
}

export function usePartners() {
  return useTable<Partner>('partners')
}

export function usePayments() {
  return useTable<Payment>('payments')
}

export function useContracts() {
  return useTable<Contract>('contracts')
}

export function useCalendarEvents() {
  return useTable<CalendarEvent>('calendar_events')
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data as Profile | null)
      setLoading(false)
    }
    load()
  }, [])

  const updateProfile = async (changes: Partial<Profile>) => {
    if (!profile) return
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(changes)
      .eq('id', profile.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setProfile(updated as Profile)
  }

  return { profile, loading, updateProfile }
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface Notification {
  id: string
  user_id: string | null
  type: 'reservation' | 'task' | 'payment' | 'system'
  title: string
  message: string | null
  read: boolean
  data: Record<string, unknown> | null
  related_id: string | null
  created_at: string
}

export interface Invoice {
  id: string
  user_id: string | null
  invoice_number: string
  client_name: string
  client_address: string | null
  client_city: string | null
  client_email: string | null
  items: Array<{ description: string; unitPrice: number; quantity: number; vatRate: number }>
  total_ht: number
  total_ttc: number
  vat_rate: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  is_recurring: boolean
  recurring_interval: 'monthly' | 'quarterly' | 'yearly' | null
  due_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ContractSignature {
  id: string
  contract_id: string
  signer_role: string
  signer_name: string
  signed_at: string | null
  signature_data: string | null
  token: string
  created_at: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data ?? []) as Notification[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read).map(n => n.id)
    if (unread.length === 0) return
    await supabase.from('notifications').update({ read: true }).in('id', unread)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const insertNotification = async (notif: Omit<Notification, 'id' | 'created_at' | 'read'>) => {
    const { error } = await supabase.from('notifications').insert({ ...notif, read: false })
    if (error) throw new Error(error.message)
  }

  return { notifications, loading, unreadCount, markAsRead, markAllRead, insertNotification, refetch: fetchNotifications }
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export function useInvoices() {
  return useTable<Invoice>('invoices')
}

export async function getNextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `FC-${year}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1)

  let seq = 1
  if (data && data.length > 0) {
    const last = (data[0] as Invoice).invoice_number
    const parts = last.split('-')
    const num = parseInt(parts[2], 10)
    if (!isNaN(num)) seq = num + 1
  }
  return `FC-${year}-${String(seq).padStart(3, '0')}`
}

// ─── Contract Signatures ─────────────────────────────────────────────────────

export function useContractSignatures(contractId: string | undefined) {
  const [signatures, setSignatures] = useState<ContractSignature[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSignatures = useCallback(async () => {
    if (!contractId) { setSignatures([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('contract_signatures')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: true })
    setSignatures((data ?? []) as ContractSignature[])
    setLoading(false)
  }, [contractId])

  useEffect(() => { fetchSignatures() }, [fetchSignatures])

  return { signatures, loading, refetch: fetchSignatures }
}

export async function getContractByToken(token: string) {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('signing_token', token)
    .single()
  if (error) return null
  return data as Contract
}

export async function signContract(contractId: string, signerName: string, signerRole: string, signatureData: string) {
  const { error: sigError } = await supabase
    .from('contract_signatures')
    .insert({ contract_id: contractId, signer_name: signerName, signer_role: signerRole, signature_data: signatureData, signed_at: new Date().toISOString() })
  if (sigError) throw new Error(sigError.message)

  const { error: updateError } = await supabase
    .from('contracts')
    .update({ status: 'signed' })
    .eq('id', contractId)
  if (updateError) throw new Error(updateError.message)
}

// ─── Dashboard KPIs ──────────────────────────────────────────────────────────

export interface DashboardKPIs {
  activeStays: number
  upcomingArrivals: number
  guestRequests: number
  serviceRevenue: number
  pendingTasks: number
  occupancyRate: number
}

export function useDashboardKPIs() {
  const [kpis, setKpis] = useState<DashboardKPIs>({
    activeStays: 0,
    upcomingArrivals: 0,
    guestRequests: 0,
    serviceRevenue: 0,
    pendingTasks: 0,
    occupancyRate: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]

      const [resResult, taskResult, payResult, propResult] = await Promise.all([
        supabase.from('reservations').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('properties').select('*'),
      ])

      const reservations = (resResult.data ?? []) as Reservation[]
      const tasks = (taskResult.data ?? []) as Task[]
      const payments = (payResult.data ?? []) as Payment[]
      const properties = (propResult.data ?? []) as Property[]

      const activeStays = reservations.filter(r =>
        r.status === 'in_progress' || (r.status === 'confirmed' && r.arrival <= today && r.departure >= today)
      ).length

      const upcomingArrivals = reservations.filter(r =>
        (r.status === 'confirmed' || r.status === 'pending') && r.arrival > today
      ).length

      const guestRequests = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress').length
      const pendingTasks = tasks.filter(t => t.status === 'todo').length

      const serviceRevenue = payments
        .filter(p => p.type === 'service' && p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.amount), 0)

      const totalProps = properties.length
      const occupiedProps = new Set(
        reservations
          .filter(r => r.arrival <= today && r.departure >= today && (r.status === 'confirmed' || r.status === 'in_progress'))
          .map(r => r.property_id)
          .filter(Boolean)
      ).size
      const occupancyRate = totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0

      setKpis({ activeStays, upcomingArrivals, guestRequests, serviceRevenue, pendingTasks, occupancyRate })
      setLoading(false)
    }
    load()
  }, [])

  return { kpis, loading }
}
