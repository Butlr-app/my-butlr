import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import { readCache, writeCache } from './offline'

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
  template_id: string | null
  reservation_id: string | null
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
  user_id: string | null
  created_at: string
  updated_at: string
}

export interface ServiceProvider {
  id: string
  name: string
  category: string | null
  specialty: string | null
  phone: string | null
  email: string | null
  address: string | null
  visit_days: string | null
  notes: string | null
  is_favorite: boolean
  is_backup: boolean
  property_id: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
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
  partner_id: string | null
  created_at: string
}

export interface Payout {
  id: string
  payment_id: string | null
  reservation_id: string | null
  payee_type: 'villa' | 'partner'
  payee_name: string
  gross_amount: number
  commission_rate: number
  commission_amount: number
  net_amount: number
  status: 'pending' | 'paid'
  paid_at: string | null
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
  onboarding_completed: boolean
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

export interface TaskTemplate {
  id: string
  property_id: string | null
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  trigger_type: 'checkout' | 'recurring'
  recurrence: 'daily' | 'weekly' | 'monthly' | null
  assigned_to: string | null
  checklist_template_id: string | null
  active: boolean
  created_at: string
}

export function useTaskTemplates() {
  return useTable<TaskTemplate>('task_templates')
}

export interface ChecklistTemplate {
  id: string
  name: string
  category: 'cleaning' | 'checkin' | 'checkout' | 'maintenance' | 'other'
  items: string[]
  created_at: string
}

export function useChecklistTemplates() {
  return useTable<ChecklistTemplate>('checklist_templates')
}

export interface TaskChecklistItem {
  id: string
  task_id: string
  label: string
  done: boolean
  position: number
  created_at: string
}

export function useTaskChecklistItems() {
  const base = useTable<TaskChecklistItem>('task_checklist_items')

  const insertMany = async (rows: Partial<TaskChecklistItem>[]) => {
    if (rows.length === 0) return []
    const { data, error } = await supabase
      .from('task_checklist_items')
      .insert(rows as Record<string, unknown>[])
      .select()
    if (error) throw new Error(error.message)
    const inserted = (data ?? []) as TaskChecklistItem[]
    await base.refetch()
    return inserted
  }

  return { ...base, insertMany }
}

export async function generateRecurringTasks(): Promise<number> {
  const { data, error } = await supabase.rpc('generate_recurring_tasks')
  if (error) throw new Error(error.message)
  return (data ?? 0) as number
}

export interface Incident {
  id: string
  property_id: string
  title: string
  description: string | null
  category: 'equipment' | 'plumbing' | 'electrical' | 'damage' | 'security' | 'other'
  urgency: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  photo_url: string | null
  reported_by: string | null
  assigned_to: string | null
  resolution_note: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export function useIncidents() {
  return useTable<Incident>('incidents')
}

export interface WorkOrder {
  id: string
  property_id: string
  provider_id: string
  incident_id: string | null
  task_id: string | null
  title: string
  description: string | null
  status: 'sent' | 'quote_received' | 'validated' | 'completed' | 'cancelled'
  quote_amount: number | null
  final_cost: number | null
  scheduled_date: string | null
  created_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export function useWorkOrders() {
  return useTable<WorkOrder>('work_orders')
}

export interface MaintenancePlan {
  id: string
  property_id: string
  title: string
  category: 'hvac' | 'plumbing' | 'electrical' | 'pool' | 'garden' | 'safety' | 'appliance' | 'other'
  notes: string | null
  interval_months: number
  lead_days: number
  next_due: string
  last_generated: string | null
  assigned_to: string | null
  active: boolean
  created_at: string
}

export function useMaintenancePlans() {
  return useTable<MaintenancePlan>('maintenance_plans')
}

export async function generateMaintenanceTasks(): Promise<number> {
  const { data, error } = await supabase.rpc('generate_maintenance_tasks')
  if (error) throw new Error(error.message)
  return (data ?? 0) as number
}

export interface InventoryItem {
  id: string
  property_id: string
  name: string
  category: 'welcome_products' | 'linen' | 'cleaning' | 'maintenance' | 'food_beverage' | 'other'
  unit: string
  quantity: number
  threshold: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InventoryMovement {
  id: string
  item_id: string
  delta: number
  reason: 'restock' | 'usage' | 'loss' | 'adjustment'
  note: string | null
  created_by: string | null
  created_at: string
}

export function useInventoryItems() {
  return useTable<InventoryItem>('inventory_items')
}

export function useInventoryMovements() {
  return useTable<InventoryMovement>('inventory_movements')
}

export interface Expense {
  id: string
  property_id: string
  label: string
  category: 'cleaning' | 'maintenance' | 'supplies' | 'utilities' | 'staff' | 'other'
  vendor: string | null
  amount: number
  expense_date: string
  note: string | null
  receipt_data: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_by: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export function useExpenses() {
  return useTable<Expense>('expenses')
}

export interface Budget {
  id: string
  property_id: string
  period_month: string
  amount: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export function useBudgets() {
  return useTable<Budget>('budgets')
}

export interface Shift {
  id: string
  property_id: string
  user_id: string
  shift_date: string
  start_time: string
  end_time: string
  type: 'general' | 'cleaning' | 'checkin' | 'checkout' | 'maintenance'
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export function useShifts() {
  return useTable<Shift>('shifts')
}

export interface TimeEntry {
  id: string
  property_id: string
  user_id: string
  shift_id: string | null
  clock_in: string
  clock_out: string | null
  note: string | null
  created_at: string
}

export function useTimeEntries() {
  return useTable<TimeEntry>('time_entries')
}

export interface TeamMember {
  id: string
  full_name: string | null
  email: string | null
  role: string
}

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMembers() {
      const { data } = await supabase.rpc('get_team_members')
      setMembers((data ?? []) as TeamMember[])
      setLoading(false)
    }
    fetchMembers()
  }, [])

  return { members, loading }
}

export interface TaskComment {
  id: string
  task_id: string
  author_id: string
  body: string
  created_at: string
}

export function useTaskComments(taskId: string | null) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(false)

  const fetchComments = useCallback(async () => {
    if (!taskId) { setComments([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    setComments((data ?? []) as TaskComment[])
    setLoading(false)
  }, [taskId])

  useEffect(() => { fetchComments() }, [fetchComments])

  const addComment = async (body: string) => {
    if (!taskId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('task_comments')
      .insert({ task_id: taskId, author_id: user.id, body })
      .select()
      .single()
    if (error) throw new Error(error.message)
    setComments(prev => [...prev, data as TaskComment])
    return data as TaskComment
  }

  const removeComment = async (id: string) => {
    const { error } = await supabase.from('task_comments').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  return { comments, loading, addComment, removeComment, refetch: fetchComments }
}

export function usePartners() {
  return useTable<Partner>('partners')
}

// Resolves the `partners` row linked to the signed-in account (partners.user_id).
// RLS lets a partner read only their own row, so this returns null for accounts
// that are not linked to a partner (e.g. an owner previewing the portal).
export function useCurrentPartner() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setPartner(null)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('partners')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    setPartner((data as Partner) ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { partner, loading, refetch: fetch }
}

// Aggregates the data a signed-in partner needs for their portal, scoped to
// their own `partners` row. `service_requests` and `payments` are already
// restricted server-side by RLS, but we also filter by partner.id so an owner
// previewing the portal (who can read everything) sees an empty, unlinked view.
export function usePartnerPortal() {
  const { partner, loading: partnerLoading, refetch } = useCurrentPartner()
  const { requests, loading: requestsLoading, updateRequest } = useServiceRequests()
  const { data: payments, loading: paymentsLoading } = usePayments()

  const bookings = partner ? requests.filter(r => r.partner_id === partner.id) : []
  const myPayments = partner ? payments.filter(p => p.partner_id === partner.id) : []

  return {
    partner,
    bookings,
    payments: myPayments,
    loading: partnerLoading || requestsLoading || paymentsLoading,
    updateRequest,
    refetch,
  }
}

export function useServiceProviders() {
  return useTable<ServiceProvider>('service_providers')
}

export interface ProviderRating {
  id: string
  provider_id: string
  work_order_id: string | null
  property_id: string
  rating: number
  comment: string | null
  created_by: string | null
  created_at: string
}

export function useProviderRatings() {
  return useTable<ProviderRating>('provider_ratings')
}

export interface Document {
  id: string
  property_id: string
  title: string
  category: 'manual' | 'warranty' | 'contract' | 'insurance' | 'certificate' | 'floorplan' | 'other'
  file_url: string
  file_name: string | null
  notes: string | null
  uploaded_by: string | null
  created_at: string
}

export function useDocuments() {
  return useTable<Document>('documents')
}

export function usePayments() {
  return useTable<Payment>('payments')
}

export function usePayouts() {
  const base = useTable<Payout>('payouts')

  const insertMany = async (rows: Partial<Payout>[]) => {
    if (rows.length === 0) return []
    const { data: inserted, error } = await supabase
      .from('payouts')
      .insert(rows as Record<string, unknown>[])
      .select()
    if (error) throw new Error(error.message)
    await base.refetch()
    return (inserted ?? []) as Payout[]
  }

  return { ...base, insertMany }
}

export function useContracts() {
  return useTable<Contract>('contracts')
}

export function useCalendarEvents() {
  return useTable<CalendarEvent>('calendar_events')
}

// ─── Guides ──────────────────────────────────────────────────────────────────

export interface Guide {
  id: string
  property_id: string | null
  title: string
  category: 'general' | 'spa' | 'home_automation' | 'entertainment' | 'security' | 'kitchen' | 'pool' | 'heating_cooling' | 'wifi_tech' | 'outdoor' | 'keys_access' | 'cleaning'
  content: string | null
  icon: string | null
  published: boolean
  sort_order: number
  created_at: string
  updated_at: string
  property?: Property
}

export function useGuides(propertyId?: string) {
  const [data, setData] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('guides')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }
    const { data: rows } = await query
    setData((rows ?? []) as Guide[])
    setLoading(false)
  }, [propertyId])

  useEffect(() => { fetch() }, [fetch])

  const insert = async (row: Partial<Guide>) => {
    const { data: inserted, error } = await supabase
      .from('guides')
      .insert(row as Record<string, unknown>)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setData(prev => [inserted as Guide, ...prev])
    return inserted as Guide
  }

  const update = async (id: string, changes: Partial<Guide>) => {
    const { data: updated, error } = await supabase
      .from('guides')
      .update({ ...changes, updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setData(prev => prev.map(r => r.id === id ? (updated as Guide) : r))
    return updated as Guide
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('guides').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setData(prev => prev.filter(r => r.id !== id))
  }

  return { data, loading, refetch: fetch, insert, update, remove }
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
  type: 'reservation' | 'task' | 'payment' | 'system' | 'service_request' | 'incident' | 'work_order' | 'inspection' | 'inventory' | 'expense'
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
    const channelName = `notifications-realtime-${crypto.randomUUID()}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, async (payload) => {
        const notif = payload.new as Notification
        const { data: { user } } = await supabase.auth.getUser()
        if (notif.user_id !== null && notif.user_id !== user?.id) return
        setNotifications(prev => (prev.some(n => n.id === notif.id) ? prev : [notif, ...prev]))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, (payload) => {
        const notif = payload.new as Notification
        setNotifications(prev => prev.map(n => (n.id === notif.id ? { ...n, ...notif } : n)))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications' }, (payload) => {
        const removed = payload.old as { id: string }
        setNotifications(prev => prev.filter(n => n.id !== removed.id))
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
  const { data, error } = await supabase.rpc('get_contract_by_token', { p_token: token })
  if (error) return null
  const rows = (data ?? []) as Contract[]
  return rows.length > 0 ? rows[0] : null
}

export async function signContractByToken(token: string, signerName: string, signerRole: string, signatureData: string) {
  const { error } = await supabase.rpc('sign_contract_by_token', {
    p_token: token,
    p_signer_name: signerName,
    p_signer_role: signerRole,
    p_signature_data: signatureData,
  })
  if (error) throw new Error(error.message)
}

// ─── Property Images ─────────────────────────────────────────────────────────

export interface PropertyImage {
  id: string
  property_id: string
  url: string
  storage_path: string
  caption: string | null
  sort_order: number
  created_at: string
}

export function usePropertyImages(propertyId: string | undefined) {
  const [images, setImages] = useState<PropertyImage[]>([])
  const [loading, setLoading] = useState(true)

  const fetchImages = useCallback(async () => {
    if (!propertyId) { setImages([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('property_images')
      .select('*')
      .eq('property_id', propertyId)
      .order('sort_order', { ascending: true })
    setImages((data ?? []) as PropertyImage[])
    setLoading(false)
  }, [propertyId])

  useEffect(() => { fetchImages() }, [fetchImages])

  const addImage = async (image: Omit<PropertyImage, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('property_images')
      .insert(image)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setImages(prev => [...prev, data as PropertyImage])
    return data as PropertyImage
  }

  const removeImage = async (id: string) => {
    const { error } = await supabase.from('property_images').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setImages(prev => prev.filter(img => img.id !== id))
  }

  return { images, loading, addImage, removeImage, refetch: fetchImages }
}

// ─── Service Requests ────────────────────────────────────────────────────────

export type ServiceRequestStatus = 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled'

export interface ServiceRequest {
  id: string
  reservation_id: string | null
  guest_user_id: string | null
  service_id: string | null
  service_name: string
  details: string | null
  preferred_date: string | null
  preferred_time: string | null
  status: ServiceRequestStatus
  partner_id: string | null
  quoted_price: number | null
  created_at: string
  updated_at: string
}

export function useServiceRequests(reservationId?: string) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('service_requests').select('*').order('created_at', { ascending: false })
    if (reservationId) {
      query = query.eq('reservation_id', reservationId)
    }
    const { data } = await query
    setRequests((data ?? []) as ServiceRequest[])
    setLoading(false)
  }, [reservationId])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  useEffect(() => {
    const channel = supabase
      .channel(`service-requests-${reservationId ?? 'all'}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, (payload) => {
        const row = payload.new as ServiceRequest
        const removed = payload.old as ServiceRequest
        if (reservationId && row?.reservation_id !== reservationId && removed?.reservation_id !== reservationId) return
        setRequests(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(r => r.id !== removed.id)
          if (payload.eventType === 'UPDATE') return prev.map(r => (r.id === row.id ? row : r))
          if (prev.some(r => r.id === row.id)) return prev
          return [row, ...prev]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [reservationId])

  const addRequest = async (req: Partial<ServiceRequest>) => {
    const { data, error } = await supabase
      .from('service_requests')
      .insert(req as Record<string, unknown>)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setRequests(prev => (prev.some(r => r.id === (data as ServiceRequest).id) ? prev : [data as ServiceRequest, ...prev]))
    // Notify staff (broadcast notification) that a new service request came in.
    await supabase.from('notifications').insert({
      user_id: null,
      type: 'service_request',
      title: 'New service request',
      message: `${(data as ServiceRequest).service_name} requested by a guest`,
      related_id: (data as ServiceRequest).id,
      read: false,
    })
    return data as ServiceRequest
  }

  const updateRequest = async (id: string, patch: Partial<ServiceRequest>) => {
    const { data, error } = await supabase
      .from('service_requests')
      .update({ ...patch, updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    const updated = data as ServiceRequest
    setRequests(prev => prev.map(r => (r.id === id ? updated : r)))
    // Notify the guest of a status change on their request.
    if (patch.status && updated.guest_user_id) {
      await supabase.from('notifications').insert({
        user_id: updated.guest_user_id,
        type: 'service_request',
        title: 'Service request update',
        message: `Your "${updated.service_name}" request is now ${patch.status.replace('_', ' ')}`,
        related_id: updated.id,
        read: false,
      })
    }
    return updated
  }

  return { requests, loading, addRequest, updateRequest, refetch: fetchRequests }
}

// ─── Messages ────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'voice' | 'service'

export interface ServiceMessageMeta {
  service_id: string
  service_name: string
  description?: string
  price?: number
  image_url?: string
}

export interface Message {
  id: string
  reservation_id: string | null
  sender_id: string
  sender_name: string
  sender_role: string | null
  content: string
  message_type: MessageType
  attachment_url: string | null
  metadata: ServiceMessageMeta | Record<string, unknown>
  read: boolean
  created_at: string
}

export function useMessages(reservationId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMessages = useCallback(async () => {
    if (!reservationId) { setMessages([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: true })
    setMessages((data ?? []) as Message[])
    setLoading(false)
  }, [reservationId])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  useEffect(() => {
    if (!reservationId) return
    const channel = supabase
      .channel(`messages-${reservationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `reservation_id=eq.${reservationId}`,
      }, (payload) => {
        const incoming = payload.new as Message
        setMessages(prev => (prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]))
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `reservation_id=eq.${reservationId}`,
      }, (payload) => {
        const updated = payload.new as Message
        setMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [reservationId])

  const sendMessage = async (msg: Omit<Message, 'id' | 'read' | 'created_at'>) => {
    const payload = {
      ...msg,
      message_type: msg.message_type ?? 'text',
      metadata: msg.metadata && Object.keys(msg.metadata).length > 0 ? msg.metadata : {},
    }
    const { data, error } = await supabase
      .from('messages')
      .insert(payload)
      .select()
      .single()
    if (error) throw new Error(error.message)
    const inserted = data as Message
    setMessages(prev => (prev.some(m => m.id === inserted.id) ? prev : [...prev, inserted]))
    return inserted
  }

  const markRead = useCallback(async (currentUserId: string | undefined) => {
    if (!reservationId || !currentUserId) return
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('reservation_id', reservationId)
      .neq('sender_id', currentUserId)
      .eq('read', false)
    if (!error) {
      setMessages(prev => prev.map(m => (m.sender_id !== currentUserId ? { ...m, read: true } : m)))
    }
  }, [reservationId])

  return { messages, loading, sendMessage, markRead, refetch: fetchMessages }
}

export interface Conversation {
  reservation_id: string
  guest_name: string
  property_name: string | null
  last_message: string
  last_at: string
  unread: number
}

// Manager-side: one conversation per reservation that has messages.
export function useConversations(currentUserId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const build = useCallback(async () => {
    setLoading(true)
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
    const messages = (msgs ?? []) as Message[]

    const reservationIds = [...new Set(messages.map(m => m.reservation_id).filter(Boolean))] as string[]
    let resMap: Record<string, { guest_name: string; property_id: string | null }> = {}
    let propMap: Record<string, string> = {}
    if (reservationIds.length > 0) {
      const { data: res } = await supabase
        .from('reservations')
        .select('id, guest_name, property_id')
        .in('id', reservationIds)
      for (const r of (res ?? []) as Array<{ id: string; guest_name: string; property_id: string | null }>) {
        resMap[r.id] = { guest_name: r.guest_name, property_id: r.property_id }
      }
      const propIds = [...new Set(Object.values(resMap).map(r => r.property_id).filter(Boolean))] as string[]
      if (propIds.length > 0) {
        const { data: props } = await supabase.from('properties').select('id, name').in('id', propIds)
        for (const p of (props ?? []) as Array<{ id: string; name: string }>) propMap[p.id] = p.name
      }
    }

    const grouped: Record<string, Conversation> = {}
    for (const m of messages) {
      if (!m.reservation_id) continue
      const res = resMap[m.reservation_id]
      const conv = grouped[m.reservation_id] ?? {
        reservation_id: m.reservation_id,
        guest_name: res?.guest_name ?? 'Guest',
        property_name: res?.property_id ? propMap[res.property_id] ?? null : null,
        last_message: '',
        last_at: m.created_at,
        unread: 0,
      }
      const msgType = (m as Message).message_type ?? 'text'
      conv.last_message = msgType === 'voice' ? '[voice]' : msgType === 'image' ? '[image]' : msgType === 'service' ? '[service]' : m.content
      conv.last_at = m.created_at
      if (!m.read && currentUserId && m.sender_id !== currentUserId) conv.unread += 1
      grouped[m.reservation_id] = conv
    }

    setConversations(Object.values(grouped).sort((a, b) => b.last_at.localeCompare(a.last_at)))
    setLoading(false)
  }, [currentUserId])

  useEffect(() => { build() }, [build])

  useEffect(() => {
    const channel = supabase
      .channel('conversations-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { build() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [build])

  return { conversations, loading, refetch: build }
}

// Global unread message count for the topbar badge (messages addressed to me, unread).
export function useUnreadMessages(currentUserId: string | undefined) {
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    if (!currentUserId) { setCount(0); return }
    const { count: c } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', currentUserId)
      .eq('read', false)
    setCount(c ?? 0)
  }, [currentUserId])

  useEffect(() => { fetchCount() }, [fetchCount])

  useEffect(() => {
    const channel = supabase
      .channel('unread-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { fetchCount() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchCount])

  return count
}

// ─── Check-ins ───────────────────────────────────────────────────────────────

export interface Checkin {
  id: string
  reservation_id: string
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  address: string | null
  nationality: string | null
  id_doc_type: 'passport' | 'id_card' | 'driver_license'
  id_doc_number: string | null
  num_guests: number
  estimated_arrival: string | null
  special_requests: string | null
  id_document_url: string | null
  signature_data: string | null
  rules_accepted: boolean
  status: 'pending' | 'completed'
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export type CheckinInput = Omit<Checkin, 'id' | 'created_at' | 'updated_at'>

export function useCheckin(reservationId: string | undefined) {
  const [checkin, setCheckin] = useState<Checkin | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCheckin = useCallback(async () => {
    if (!reservationId) { setCheckin(null); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('reservation_id', reservationId)
      .maybeSingle()
    setCheckin((data ?? null) as Checkin | null)
    setLoading(false)
  }, [reservationId])

  useEffect(() => { fetchCheckin() }, [fetchCheckin])

  const submitCheckin = async (input: CheckinInput) => {
    const { data, error } = await supabase
      .from('checkins')
      .upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: 'reservation_id' })
      .select()
      .single()
    if (error) throw new Error(error.message)
    setCheckin(data as Checkin)
    return data as Checkin
  }

  return { checkin, loading, submitCheckin, refetch: fetchCheckin }
}

export function useCheckins() {
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCheckins = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .order('created_at', { ascending: false })
    setCheckins((data ?? []) as Checkin[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCheckins() }, [fetchCheckins])

  return { checkins, loading, refetch: fetchCheckins }
}

// ─── Role Assignments ────────────────────────────────────────────────────────

export interface RoleAssignment {
  id: string
  user_id: string
  property_id: string
  role: string
  created_at: string
}

export function useRoleAssignments(userId: string | undefined) {
  const [assignments, setAssignments] = useState<RoleAssignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!userId) { setAssignments([]); setLoading(false); return }
      const { data, error } = await supabase
        .from('role_assignments')
        .select('*')
        .eq('user_id', userId)
      if (error) {
        setAssignments(readCache<RoleAssignment>(`role_assignments:${userId}`) ?? [])
      } else {
        const rows = (data ?? []) as RoleAssignment[]
        setAssignments(rows)
        writeCache(`role_assignments:${userId}`, rows)
      }
      setLoading(false)
    }
    load()
  }, [userId])

  const assignedPropertyIds = assignments.map(a => a.property_id)

  return { assignments, loading, assignedPropertyIds }
}

// ─── Role Permissions ─────────────────────────────────────────────────────────

export interface PagePermission {
  view: boolean
  edit: boolean
}

export type RolePermissions = Record<string, Record<string, PagePermission>>

const CONFIGURABLE_PAGES = ['payments', 'partners', 'contracts', 'invoices', 'reports', 'notifications'] as const
export type ConfigurablePage = typeof CONFIGURABLE_PAGES[number]
export { CONFIGURABLE_PAGES }

export const DEFAULT_PERMISSIONS: RolePermissions = {
  house_manager: {
    payments: { view: true, edit: true },
    partners: { view: true, edit: false },
    contracts: { view: true, edit: true },
    invoices: { view: true, edit: true },
    reports: { view: true, edit: false },
    notifications: { view: true, edit: true },
  },
  concierge: {
    payments: { view: true, edit: false },
    partners: { view: true, edit: false },
    contracts: { view: true, edit: false },
    invoices: { view: true, edit: false },
    reports: { view: false, edit: false },
    notifications: { view: true, edit: false },
  },
}

export function useRolePermissions() {
  const [permissions, setPermissions] = useState<RolePermissions>(DEFAULT_PERMISSIONS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resolvedOwnerId, setResolvedOwnerId] = useState<string | null>(null)

  useEffect(() => {
    async function resolveOwner() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      // Check if user has role_assignments (i.e. they're a staff member, not the owner)
      const { data: assignments } = await supabase
        .from('role_assignments')
        .select('property_id')
        .eq('user_id', user.id)
        .limit(1)
      if (assignments && assignments.length > 0) {
        // Resolve owner_id from the assigned property
        const { data: property } = await supabase
          .from('properties')
          .select('owner_id')
          .eq('id', assignments[0].property_id)
          .maybeSingle()
        setResolvedOwnerId(property?.owner_id ?? user.id)
      } else {
        // User IS the owner
        setResolvedOwnerId(user.id)
      }
    }
    resolveOwner()
  }, [])

  const fetchPermissions = useCallback(async () => {
    if (!resolvedOwnerId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permissions')
      .eq('owner_id', resolvedOwnerId)
      .maybeSingle()
    if (!error && data?.permissions) {
      setPermissions(data.permissions as RolePermissions)
    }
    setLoading(false)
  }, [resolvedOwnerId])

  useEffect(() => { fetchPermissions() }, [fetchPermissions])

  const savePermissions = async (updated: RolePermissions) => {
    if (!resolvedOwnerId) return
    setSaving(true)
    const { error } = await supabase
      .from('role_permissions')
      .upsert(
        { owner_id: resolvedOwnerId, permissions: updated, updated_at: new Date().toISOString() },
        { onConflict: 'owner_id' }
      )
    if (!error) {
      setPermissions(updated)
    }
    setSaving(false)
    return error
  }

  return { permissions, loading, saving, savePermissions, DEFAULT_PERMISSIONS }
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

// ─── Inspections ─────────────────────────────────────────────────────────────

export interface Inspection {
  id: string
  property_id: string | null
  inspector_name: string
  inspection_type: 'check_in' | 'check_out' | 'routine'
  status: 'in_progress' | 'completed'
  notes: string | null
  signature_data: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  property?: Property
}

export interface InspectionRoom {
  id: string
  inspection_id: string
  room_name: string
  reference_photo_url: string | null
  current_photo_url: string | null
  status: 'pending' | 'ok' | 'issue_found'
  notes: string | null
  created_at: string
}

export interface InspectionReport {
  id: string
  inspection_id: string
  room_name: string | null
  title: string
  description: string | null
  severity: 'minor' | 'moderate' | 'major'
  photo_url: string | null
  is_known_issue: boolean
  resolved: boolean
  created_at: string
  updated_at: string
}

export function useInspections() {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInspections = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('inspections')
      .select('*')
      .order('created_at', { ascending: false })
    const rows = (data ?? []) as Inspection[]

    const propIds = [...new Set(rows.map(r => r.property_id).filter(Boolean))] as string[]
    if (propIds.length > 0) {
      const { data: props } = await supabase.from('properties').select('*').in('id', propIds)
      const map: Record<string, Property> = {}
      for (const p of (props ?? []) as Property[]) map[p.id] = p
      setInspections(rows.map(r => ({ ...r, property: r.property_id ? map[r.property_id] : undefined })))
    } else {
      setInspections(rows)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchInspections() }, [fetchInspections])

  const enrichWithProperty = async (row: Inspection): Promise<Inspection> => {
    if (!row.property_id) return row
    const existing = inspections.find(i => i.property_id === row.property_id && i.property)
    if (existing?.property) return { ...row, property: existing.property }
    const { data: props } = await supabase.from('properties').select('*').eq('id', row.property_id).single()
    return props ? { ...row, property: props as Property } : row
  }

  const insert = async (row: Partial<Inspection>) => {
    const { data, error } = await supabase.from('inspections').insert(row as Record<string, unknown>).select().single()
    if (error) throw new Error(error.message)
    const enriched = await enrichWithProperty(data as Inspection)
    setInspections(prev => [enriched, ...prev])
    return enriched
  }

  const update = async (id: string, changes: Partial<Inspection>) => {
    const { data, error } = await supabase
      .from('inspections')
      .update({ ...changes, updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    const enriched = await enrichWithProperty(data as Inspection)
    setInspections(prev => prev.map(i => i.id === id ? enriched : i))
    return enriched
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('inspections').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setInspections(prev => prev.filter(r => r.id !== id))
  }

  return { inspections, loading, insert, update, remove, refetch: fetchInspections }
}

export function useInspectionRooms(inspectionId: string | undefined) {
  const [rooms, setRooms] = useState<InspectionRoom[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRooms = useCallback(async () => {
    if (!inspectionId) { setRooms([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('inspection_rooms')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true })
    setRooms((data ?? []) as InspectionRoom[])
    setLoading(false)
  }, [inspectionId])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  const addRoom = async (room: Omit<InspectionRoom, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('inspection_rooms').insert(room as Record<string, unknown>).select().single()
    if (error) throw new Error(error.message)
    setRooms(prev => [...prev, data as InspectionRoom])
    return data as InspectionRoom
  }

  const updateRoom = async (id: string, changes: Partial<InspectionRoom>) => {
    const { data, error } = await supabase
      .from('inspection_rooms')
      .update(changes as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setRooms(prev => prev.map(r => r.id === id ? (data as InspectionRoom) : r))
    return data as InspectionRoom
  }

  const removeRoom = async (id: string) => {
    const { error } = await supabase.from('inspection_rooms').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setRooms(prev => prev.filter(r => r.id !== id))
  }

  return { rooms, loading, addRoom, updateRoom, removeRoom, refetch: fetchRooms }
}

export function useInspectionReports(inspectionId: string | undefined) {
  const [reports, setReports] = useState<InspectionReport[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReports = useCallback(async () => {
    if (!inspectionId) { setReports([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('inspection_reports')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: false })
    setReports((data ?? []) as InspectionReport[])
    setLoading(false)
  }, [inspectionId])

  useEffect(() => { fetchReports() }, [fetchReports])

  const addReport = async (report: Omit<InspectionReport, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase.from('inspection_reports').insert(report as Record<string, unknown>).select().single()
    if (error) throw new Error(error.message)
    setReports(prev => [data as InspectionReport, ...prev])
    return data as InspectionReport
  }

  const updateReport = async (id: string, changes: Partial<InspectionReport>) => {
    const { data, error } = await supabase
      .from('inspection_reports')
      .update({ ...changes, updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setReports(prev => prev.map(r => r.id === id ? (data as InspectionReport) : r))
    return data as InspectionReport
  }

  const removeReport = async (id: string) => {
    const { error } = await supabase.from('inspection_reports').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setReports(prev => prev.filter(r => r.id !== id))
  }

  return { reports, loading, addReport, updateReport, removeReport, refetch: fetchReports }
}

// ─── Push notifications ────────────────────────────────────────────────────

const PUSH_STORAGE_KEY = 'butlr-push-enabled'

type PushPermissionState = NotificationPermission | 'unsupported'

interface PushNotificationRow {
  id: string
  user_id: string | null
  title: string
  message: string | null
  type: string
}

function pushSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Manages opt-in browser push notifications. Requests permission, persists the
 * user's choice, and surfaces an OS-level notification whenever a new row lands
 * in the `notifications` table (via Supabase Realtime). Only fires for rows
 * addressed to the current user (or broadcast rows with a null user_id). When a
 * service worker is controlling the page it uses registration.showNotification
 * (required for true push on mobile); otherwise the Notification constructor.
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermissionState>(
    pushSupported() ? Notification.permission : 'unsupported'
  )
  const [enabled, setEnabled] = useState(
    () => pushSupported() && localStorage.getItem(PUSH_STORAGE_KEY) === 'true'
  )
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const userIdRef = useRef<string | null>(null)

  const show = useCallback(async (title: string, body: string, url: string) => {
    if (!pushSupported() || Notification.permission !== 'granted') return
    const options: NotificationOptions = {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'butlr-notification',
      data: { url },
    }
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.showNotification(title, options)
        return
      }
    }
    new Notification(title, options)
  }, [])

  const enable = useCallback(async () => {
    if (!pushSupported()) return false
    const result = await Notification.requestPermission()
    setPermission(result)
    const ok = result === 'granted'
    setEnabled(ok)
    localStorage.setItem(PUSH_STORAGE_KEY, String(ok))
    if (ok) await show('Notifications enabled', "You'll now receive alerts from My Butlr.", '/app/notifications')
    return ok
  }, [show])

  const disable = useCallback(() => {
    setEnabled(false)
    localStorage.setItem(PUSH_STORAGE_KEY, 'false')
  }, [])

  useEffect(() => {
    if (!pushSupported()) return
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) userIdRef.current = data.user?.id ?? null
    })
    const channel = supabase
      .channel(`push-notifications-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        if (!enabledRef.current || Notification.permission !== 'granted') return
        const row = payload.new as PushNotificationRow
        // Only notify for rows addressed to this user (or broadcast rows).
        if (row.user_id !== null && row.user_id !== userIdRef.current) return
        show(row.title, row.message ?? '', '/app/notifications')
      })
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [show])

  return {
    supported: pushSupported(),
    permission,
    enabled: enabled && permission === 'granted',
    enable,
    disable,
  }
}
