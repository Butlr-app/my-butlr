export type GuestLanguage = 'fr' | 'en';

export interface GuestReservation {
  id: string;
  guest_name: string;
  guest_email?: string | null;
  guest_phone?: string | null;
  arrival: string;
  departure: string;
  guests_count: number;
  property_id: string;
  property_name: string;
  property_image_url: string | null;
  property_type?: string | null;
  max_guests?: number | null;
  guest_language?: string | null;
}

export interface GuestPortalSettings {
  property_id: string;
  enabled: boolean;
  welcome_message?: string | null;
  wifi_name?: string | null;
  wifi_password?: string | null;
  check_in_instructions?: unknown;
  check_out_instructions?: unknown;
  house_rules?: unknown;
  emergency_contacts?: unknown;
  require_online_checkin?: boolean;
  show_services?: boolean;
  show_messaging?: boolean;
  show_boutique?: boolean;
  message_contact_role?: 'house_manager' | 'concierge';
}

export interface GuestGuide {
  id: string;
  title: string;
  category?: string | null;
  content?: unknown;
  published?: boolean;
  sort_order?: number;
}

export interface PropertyService {
  enabled?: boolean;
  assignment?: {
    id: string;
    custom_price?: number | null;
    offer_mode?: string | null;
    pricing_mode?: string | null;
  } | null;
  service: {
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    starting_price?: number | null;
    image_url?: string | null;
  };
}

export interface StayReserve {
  id: string;
  current_balance: number;
  currency?: string;
  status: string;
}

export interface StayServiceRequest {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  requested_date?: string | null;
  created_at?: string;
}

export interface GuestPortalPayload {
  reservation: GuestReservation;
  settings: GuestPortalSettings;
  guides: GuestGuide[];
  property_services: PropertyService[];
  reserve: StayReserve | null;
  service_requests: StayServiceRequest[];
  transactions: unknown[];
  recommended_amount: number;
}

export interface StayMessageContact {
  role: 'house_manager' | 'concierge';
  full_name: string | null;
  avatar_url: string | null;
}

export interface StayMessage {
  id: string;
  conversation_id: string;
  sender_type: 'guest' | 'staff';
  body: string | null;
  message_type: 'text' | 'image' | string;
  payload?: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface StayMessagingPayload {
  enabled: boolean;
  contact: StayMessageContact | null;
  messages: StayMessage[];
  unread_count?: number;
}

export type IdDocumentType = 'passport' | 'id_card' | 'driver_license';

export interface GuestCheckin {
  id: string;
  reservation_id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  address: string | null;
  nationality: string | null;
  id_doc_type: IdDocumentType;
  id_doc_number: string | null;
  num_guests: number;
  estimated_arrival: string | null;
  special_requests: string | null;
  signature_data: string | null;
  rules_accepted: boolean;
  status: 'pending' | 'completed';
  submitted_at: string | null;
}

export interface GuestCheckinInput {
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  address?: string;
  nationality?: string;
  idDocType: IdDocumentType;
  idDocNumber: string;
  numGuests: number;
  estimatedArrival: string;
  specialRequests?: string;
  signatureData: string;
  rulesAccepted: boolean;
}
