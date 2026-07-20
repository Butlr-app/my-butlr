import { supabase } from './supabase'
import {
  partnerCategoryOptions,
  type PartnerRecord,
  type PartnerStatus,
} from './partners'
import {
  PROVIDER_INVOICE_BUCKET,
  PROVIDER_INVOICE_MIME_TYPES,
  MAX_PROVIDER_INVOICE_SIZE,
  createProviderInvoiceSignedUrl,
  type ProviderInvoice,
} from './providerOperations'
import type { TaskPriority, TaskStatus } from './tasks'

export type PartnerCalendarStatus = 'available' | 'busy' | 'blocked'

export interface PartnerCalendarDay {
  id: string
  partner_id: string
  day: string
  status: PartnerCalendarStatus
  note: string | null
  created_at?: string
  updated_at?: string
}

export interface PartnerMission {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  property_id: string | null
  partner_id: string | null
  created_at?: string
  updated_at?: string
  properties?: { name: string; location: string | null } | null
}

export interface PartnerProfileFormInput {
  name: string
  category: string
  location: string
  contact: string
  email: string
  phone: string
  description: string
  serviceAreas: string
  status: PartnerStatus
}

export const partnerCalendarStatusLabels: Record<PartnerCalendarStatus, string> = {
  available: 'Disponible',
  busy: 'Occupé',
  blocked: 'Indisponible',
}

export const partnerMissionStatusLabels: Record<TaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  waiting: 'En attente',
  done: 'Terminée',
}

export function isPartnerProfileComplete(
  partner: Pick<PartnerRecord, 'category' | 'phone' | 'name' | 'onboarding_completed'> | null | undefined,
): boolean {
  if (!partner) return false
  if (partner.onboarding_completed) return true
  return Boolean(
    partner.name?.trim()
    && partner.category?.trim()
    && partner.phone?.trim(),
  )
}

export function partnerProfileToForm(partner: PartnerRecord): PartnerProfileFormInput {
  return {
    name: partner.name ?? '',
    category: partner.category ?? '',
    location: partner.location ?? '',
    contact: partner.contact ?? '',
    email: partner.email ?? '',
    phone: partner.phone ?? '',
    description: partner.description ?? '',
    serviceAreas: partner.service_areas ?? '',
    status: partner.status ?? 'active',
  }
}

export function validatePartnerProfileForm(input: PartnerProfileFormInput): string | null {
  if (!input.name.trim()) return 'Le nom est obligatoire.'
  if (!input.category.trim()) return 'Choisissez une catégorie.'
  if (!partnerCategoryOptions.includes(input.category as (typeof partnerCategoryOptions)[number])) {
    return 'Catégorie invalide.'
  }
  if (!input.phone.trim()) return 'Le téléphone est obligatoire.'
  return null
}

export async function fetchMyPartnerProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null as PartnerRecord | null, error: new Error('Non authentifié.') }

  return supabase
    .from('partners')
    .select('*')
    .eq('profile_id', user.id)
    .eq('source', 'marketplace')
    .maybeSingle()
}

export async function updateMyPartnerProfile(input: PartnerProfileFormInput) {
  const validationError = validatePartnerProfileForm(input)
  if (validationError) return { data: null, error: new Error(validationError) }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Non authentifié.') }

  const payload = {
    name: input.name.trim(),
    category: input.category.trim(),
    location: input.location.trim() || null,
    contact: input.contact.trim() || null,
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    description: input.description.trim() || null,
    service_areas: input.serviceAreas.trim() || null,
    status: input.status,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  }

  return supabase
    .from('partners')
    .update(payload)
    .eq('profile_id', user.id)
    .eq('source', 'marketplace')
    .select('*')
    .single()
}

export async function fetchMyMissions(partnerId: string) {
  return supabase
    .from('tasks')
    .select('*, properties(name, location)')
    .eq('partner_id', partnerId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
}

export async function updateMissionStatus(missionId: string, status: TaskStatus) {
  return supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', missionId)
    .select('*, properties(name, location)')
    .single()
}

export async function fetchMyCalendarDays(partnerId: string, from: string, to: string) {
  return supabase
    .from('partner_calendar_days')
    .select('*')
    .eq('partner_id', partnerId)
    .gte('day', from)
    .lte('day', to)
    .order('day', { ascending: true })
}

export async function upsertCalendarDay(input: {
  partnerId: string
  day: string
  status: PartnerCalendarStatus
  note?: string
}) {
  return supabase
    .from('partner_calendar_days')
    .upsert({
      partner_id: input.partnerId,
      day: input.day,
      status: input.status,
      note: input.note?.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'partner_id,day' })
    .select('*')
    .single()
}

export async function deleteCalendarDay(partnerId: string, day: string) {
  return supabase
    .from('partner_calendar_days')
    .delete()
    .eq('partner_id', partnerId)
    .eq('day', day)
}

export async function fetchMyInvoices(partnerId: string) {
  return supabase
    .from('provider_invoices')
    .select('*, properties(name), tasks(title)')
    .eq('partner_id', partnerId)
    .order('issue_date', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function uploadMyInvoice(input: {
  partnerId: string
  propertyId: string
  propertyOwnerId: string
  taskId?: string
  invoiceNumber?: string
  issueDate: string
  amount: number
  notes?: string
  file: File
}) {
  if (!PROVIDER_INVOICE_MIME_TYPES.includes(
    input.file.type as (typeof PROVIDER_INVOICE_MIME_TYPES)[number],
  )) {
    return { data: null, error: new Error('Ajoutez un PDF ou une image JPG, PNG ou WebP.') }
  }
  if (input.file.size <= 0 || input.file.size > MAX_PROVIDER_INVOICE_SIZE) {
    return { data: null, error: new Error('La facture doit peser moins de 15 Mo.') }
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return { data: null, error: new Error('Montant invalide.') }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Non authentifié.') }

  const safeName = input.file.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')

  const storagePath = `${user.id}/${input.partnerId}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await supabase.storage
    .from(PROVIDER_INVOICE_BUCKET)
    .upload(storagePath, input.file, {
      contentType: input.file.type,
      upsert: false,
    })

  if (uploadError) return { data: null, error: uploadError as unknown as Error }

  const { data, error } = await supabase
    .from('provider_invoices')
    .insert({
      owner_id: input.propertyOwnerId,
      partner_id: input.partnerId,
      property_id: input.propertyId,
      task_id: input.taskId || null,
      invoice_number: input.invoiceNumber?.trim() || null,
      issue_date: input.issueDate,
      amount: input.amount,
      currency: 'EUR',
      status: 'received',
      storage_path: storagePath,
      file_name: input.file.name,
      file_size: input.file.size,
      mime_type: input.file.type,
      notes: input.notes?.trim() || null,
    })
    .select('*, properties(name), tasks(title)')
    .single()

  if (error) {
    await supabase.storage.from(PROVIDER_INVOICE_BUCKET).remove([storagePath])
  }

  return { data: data as ProviderInvoice | null, error }
}

export async function openMyInvoiceFile(storagePath: string) {
  return createProviderInvoiceSignedUrl(storagePath)
}

export async function fetchPropertyOwnerId(propertyId: string) {
  return supabase
    .from('properties')
    .select('owner_id')
    .eq('id', propertyId)
    .maybeSingle()
}

export function homePathForRole(role: string | null | undefined): string {
  if (role === 'partner') return '/partner'
  if (role === 'agency') return '/app/calendar'
  return '/app'
}
