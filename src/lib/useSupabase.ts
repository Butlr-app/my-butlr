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
  description: string | null
  image_url: string | null
  created_at: string
  updated_at: string
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
  status: 'draft' | 'sent' | 'signed' | 'expired'
  date: string
  document_url: string | null
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

export function useReservations() {
  const base = useTable<Reservation>('reservations')
  const [withProperty, setWithProperty] = useState<Reservation[]>([])
  const [propertiesMap, setPropertiesMap] = useState<Record<string, Property>>({})

  useEffect(() => {
    async function enrich() {
      if (base.data.length === 0) {
        setWithProperty([])
        return
      }
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
    }
    enrich()
  }, [base.data])

  return { ...base, data: withProperty, propertiesMap }
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
      const occupiedProps = reservations.filter(r =>
        r.arrival <= today && r.departure >= today && (r.status === 'confirmed' || r.status === 'in_progress')
      ).length
      const occupancyRate = totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0

      setKpis({ activeStays, upcomingArrivals, guestRequests, serviceRevenue, pendingTasks, occupancyRate })
      setLoading(false)
    }
    load()
  }, [])

  return { kpis, loading }
}
