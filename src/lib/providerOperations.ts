import { supabase } from './supabase'

export const PROVIDER_INVOICE_BUCKET = 'provider-invoices'
export const MAX_PROVIDER_INVOICE_SIZE = 15 * 1024 * 1024
export const PROVIDER_INVOICE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type ProviderInvoiceStatus = 'received' | 'approved' | 'paid' | 'rejected'

export interface ProviderInvoice {
  id: string
  owner_id: string
  partner_id: string
  property_id: string
  task_id: string | null
  invoice_number: string | null
  issue_date: string
  due_date: string | null
  amount: number
  currency: string
  status: ProviderInvoiceStatus
  storage_path: string
  file_name: string
  file_size: number
  mime_type: string
  notes: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  properties?: { name: string } | null
  tasks?: { title: string } | null
  partners?: { name: string; category: string | null } | null
}

export interface ProviderInvoiceEvent {
  id: string
  invoice_id: string
  previous_status: ProviderInvoiceStatus | null
  new_status: ProviderInvoiceStatus
  actor_id: string | null
  note: string | null
  created_at: string
  actor?: { full_name: string | null; email: string | null } | null
}

export interface ProviderInvoiceInput {
  partnerId: string
  propertyId: string
  taskId?: string
  invoiceNumber?: string
  issueDate: string
  dueDate?: string
  amount: number
  currency?: string
  notes?: string
  file: File
}

export const providerInvoiceStatusLabels: Record<ProviderInvoiceStatus, string> = {
  received: 'Reçue',
  approved: 'Validée',
  paid: 'Payée',
  rejected: 'Refusée',
}

export const providerInvoiceTransitions: Record<
  ProviderInvoiceStatus,
  ProviderInvoiceStatus[]
> = {
  received: ['approved', 'rejected'],
  approved: ['paid', 'rejected'],
  paid: [],
  rejected: ['received'],
}

function safeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
}

export function validateProviderInvoiceInput(input: ProviderInvoiceInput): string | null {
  if (!input.propertyId) return 'Sélectionnez une villa.'
  if (!input.issueDate) return 'Indiquez la date de facture.'
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return 'Le montant de la facture est invalide.'
  }
  if (!PROVIDER_INVOICE_MIME_TYPES.includes(
    input.file.type as (typeof PROVIDER_INVOICE_MIME_TYPES)[number],
  )) {
    return 'Ajoutez un PDF ou une image JPG, PNG ou WebP.'
  }
  if (input.file.size <= 0 || input.file.size > MAX_PROVIDER_INVOICE_SIZE) {
    return 'La facture doit peser moins de 15 Mo.'
  }
  return null
}

const providerInvoiceSelect = '*, properties(name), tasks(title), partners(name, category)'

export async function fetchProviderInvoices(partnerId: string) {
  return supabase
    .from('provider_invoices')
    .select(providerInvoiceSelect)
    .eq('partner_id', partnerId)
    .order('issue_date', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function fetchOwnerProviderInvoices(propertyIds: string[]) {
  if (propertyIds.length === 0) {
    return { data: [] as ProviderInvoice[], error: null }
  }

  return supabase
    .from('provider_invoices')
    .select(providerInvoiceSelect)
    .in('property_id', propertyIds)
    .order('issue_date', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function fetchProviderInvoiceEvents(invoiceIds: string[]) {
  if (invoiceIds.length === 0) {
    return { data: [] as ProviderInvoiceEvent[], error: null }
  }

  return supabase
    .from('provider_invoice_events')
    .select('*, actor:profiles!provider_invoice_events_actor_id_fkey(full_name, email)')
    .in('invoice_id', invoiceIds)
    .order('created_at', { ascending: false })
}

export async function uploadProviderInvoice(
  input: ProviderInvoiceInput,
  ownerId: string,
) {
  const validationError = validateProviderInvoiceInput(input)
  if (validationError) return { data: null, error: new Error(validationError) }

  const storagePath = `${ownerId}/${input.partnerId}/${crypto.randomUUID()}-${safeFileName(input.file.name)}`
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
      owner_id: ownerId,
      partner_id: input.partnerId,
      property_id: input.propertyId,
      task_id: input.taskId || null,
      invoice_number: input.invoiceNumber?.trim() || null,
      issue_date: input.issueDate,
      due_date: input.dueDate || null,
      amount: input.amount,
      currency: input.currency ?? 'EUR',
      status: 'received',
      storage_path: storagePath,
      file_name: input.file.name,
      file_size: input.file.size,
      mime_type: input.file.type,
      notes: input.notes?.trim() || null,
    })
    .select(providerInvoiceSelect)
    .single()

  if (error) {
    await supabase.storage.from(PROVIDER_INVOICE_BUCKET).remove([storagePath])
  }

  return { data, error }
}

export async function createProviderInvoiceSignedUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(PROVIDER_INVOICE_BUCKET)
    .createSignedUrl(storagePath, 60 * 15)

  if (error || !data?.signedUrl) {
    throw error ?? new Error('Impossible d’ouvrir la facture.')
  }
  return data.signedUrl
}

export async function updateProviderInvoiceStatus(
  invoiceId: string,
  status: ProviderInvoiceStatus,
  note?: string,
) {
  return supabase.rpc('transition_provider_invoice', {
    p_invoice_id: invoiceId,
    p_status: status,
    p_note: note?.trim() || null,
  })
}

export async function deleteProviderInvoice(invoice: ProviderInvoice) {
  const { error: deleteError } = await supabase
    .from('provider_invoices')
    .delete()
    .eq('id', invoice.id)
  if (deleteError) return { error: deleteError, databaseDeleted: false }

  const { error: storageError } = await supabase.storage
    .from(PROVIDER_INVOICE_BUCKET)
    .remove([invoice.storage_path])

  return { error: storageError, databaseDeleted: true }
}
