import type { Role } from './roleContext'

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  role: Role | null
  onboarding_completed: boolean
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
}

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
  address: string | null
  surface_m2: number | null
  amenities: string[] | null
  created_at: string
}

export interface Reservation {
  id: string
  property_id: string
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  arrival: string
  departure: string
  guests_count: number
  status: string
  payment_status: string
  contract_status: string
  contract_mode: 'to_prepare' | 'already_done' | 'concierge' | 'none'
  booking_kind: 'guest' | 'owner_stay' | 'marketing_event' | 'blocked_dates' | 'other'
  total_amount: number
  notes: string | null
  portal_access_token?: string | null
  properties?: { name: string; max_guests?: number } | null
}

export interface Task {
  id: string
  property_id: string | null
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  properties?: { name: string } | null
}

export interface Service {
  id: string
  name: string
  description: string | null
  category: string | null
  starting_price: number
  commission: number
  available: boolean
  image_url?: string | null
  pricing_mode?: 'fixed' | 'per_person' | 'quote' | null
  provider_name?: string | null
  includes_text?: string | null
}

export interface Payment {
  id: string
  reservation_id?: string | null
  guest_name: string
  property_name: string | null
  type: string
  amount: number
  status: string
  date: string | null
  notes?: string | null
}

export interface Contract {
  id: string
  reservation_id?: string | null
  guest_name: string
  property_name: string | null
  type: string
  status: string
  date: string | null
  document_url?: string | null
  analysis_status?: 'not_required' | 'pending' | 'processing' | 'completed' | 'partial' | 'failed'
  extracted_data?: Record<string, string[]>
  contract_files?: ContractFile[]
  signing_status?: SignatureEnvelopeStatus | 'not_started'
  locked_pdf_sha256?: string | null
  signing_expires_at?: string | null
  active_signature_envelope_id?: string | null
  signature_envelopes?: SignatureEnvelope[]
  reservations?: Pick<Reservation, 'guest_name' | 'guest_email' | 'property_id'> | null
}

export interface ContractFile {
  id: string
  reservation_id: string
  file_name: string
  mime_type: string
  storage_path: string
  source: 'owner_upload' | 'concierge_upload' | 'generated'
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed'
  extracted_data: Record<string, string[]>
  extraction_error: string | null
  content_sha256?: string | null
  file_role?: 'source' | 'signing_snapshot' | 'signed_final' | 'audit_certificate'
  created_at: string
}

export type SignatureEnvelopeStatus =
  | 'draft'
  | 'sent'
  | 'partially_signed'
  | 'finalizing'
  | 'completed'
  | 'expired'
  | 'voided'
  | 'declined'

export type SignatureRecipientStatus =
  | 'pending'
  | 'invited'
  | 'otp_verified'
  | 'signed'
  | 'declined'
  | 'expired'
  | 'cancelled'

export type SignatureFieldType =
  | 'signature'
  | 'initials'
  | 'name'
  | 'date'
  | 'checkbox'
  | 'text'

export interface SignatureRecipient {
  id: string
  envelope_id: string
  name: string
  email: string
  role: 'owner' | 'guest' | 'concierge' | 'agency' | 'witness' | 'other'
  signing_order: number
  status: SignatureRecipientStatus
  last_invited_at: string | null
  viewed_at: string | null
  otp_verified_at: string | null
  signed_at: string | null
  declined_at: string | null
  decline_reason: string | null
}

export interface SignatureField {
  id: string
  envelope_id?: string
  recipient_id?: string
  field_type: SignatureFieldType
  page_number: number
  x: number
  y: number
  width: number
  height: number
  required: boolean
  label: string | null
}

export interface SignatureEvent {
  id: string
  envelope_id: string
  recipient_id: string | null
  event_type: string
  actor_email: string | null
  document_sha256: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface SignatureEnvelope {
  id: string
  contract_id: string
  reservation_id: string
  property_id: string
  source_file_id: string | null
  source_storage_path: string
  source_sha256: string
  final_file_id: string | null
  title: string
  message: string | null
  status: SignatureEnvelopeStatus
  signing_order: 'sequential' | 'parallel'
  expires_at: string
  sent_at: string | null
  completed_at: string | null
  created_at: string
  signature_recipients?: SignatureRecipient[]
  signature_fields?: SignatureField[]
  signature_events?: SignatureEvent[]
}

export interface Partner {
  id: string
  name: string
  category: string | null
  location: string | null
  contact: string | null
  commission: number
  status: string
  rating: number
  bookings_count: number
}

export interface CalendarEvent {
  id: string
  property_id: string | null
  reservation_id?: string | null
  title: string
  type: string
  start_date: string
  end_date: string
  notes: string | null
  properties?: { name: string } | null
}
