import { supabase } from '@/lib/supabase';
import type {
  GuestCheckin,
  GuestCheckinInput,
  GuestPortalPayload,
  PropertyService,
  StayMessage,
  StayMessagingPayload,
} from '@/types/guest';

export class GuestApiError extends Error {
  constructor(
    message: string,
    public readonly code = 'unknown',
  ) {
    super(message);
    this.name = 'GuestApiError';
  }
}

function payloadError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const error = (payload as Record<string, unknown>).error;
  return typeof error === 'string' ? error : null;
}

async function rpc<T>(name: string, parameters: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, parameters);
  if (error) throw new GuestApiError(error.message, error.code);
  const code = payloadError(data);
  if (code) throw new GuestApiError(code, code);
  return data as T;
}

export function isPortalPayload(value: unknown): value is GuestPortalPayload {
  if (!value || typeof value !== 'object') return false;
  const reservation = (value as Record<string, unknown>).reservation;
  return Boolean(
    reservation &&
      typeof reservation === 'object' &&
      typeof (reservation as Record<string, unknown>).id === 'string' &&
      typeof (reservation as Record<string, unknown>).property_id === 'string',
  );
}

export async function getGuestPortal(token: string): Promise<GuestPortalPayload> {
  const payload = await rpc<unknown>('get_guest_stay_portal', { p_token: token });
  if (!isPortalPayload(payload)) throw new GuestApiError('invalid_portal', 'invalid_portal');
  return {
    ...payload,
    guides: payload.guides ?? [],
    property_services: payload.property_services ?? [],
    service_requests: payload.service_requests ?? [],
    transactions: payload.transactions ?? [],
    recommended_amount: Number(payload.recommended_amount ?? 0),
  };
}

export async function getGuestMessages(token: string): Promise<StayMessagingPayload> {
  const payload = await rpc<Record<string, unknown>>('guest_get_stay_messages', {
    p_token: token,
  });
  return {
    enabled: payload.enabled !== false,
    contact: (payload.contact as StayMessagingPayload['contact']) ?? null,
    messages: ((payload.messages ?? []) as StayMessage[]).sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    ),
    unread_count: Number(payload.unread_count ?? payload.unreadCount ?? 0),
  };
}

export async function sendGuestMessage(token: string, body: string): Promise<void> {
  await rpc('guest_send_stay_message', {
    p_token: token,
    p_body: body.trim(),
    p_message_type: 'text',
    p_payload: {},
  });
}

export async function markGuestMessagesRead(token: string): Promise<void> {
  await rpc('guest_mark_stay_messages_read', { p_token: token });
}

export async function requestGuestService(
  token: string,
  entry: PropertyService,
  input: { requestedDate?: string; notes?: string },
): Promise<void> {
  await rpc('guest_create_stay_service_request', {
    p_token: token,
    p_category: entry.service.category || 'concierge',
    p_title: entry.service.name,
    p_description: input.notes?.trim() || null,
    p_requested_date: input.requestedDate || null,
    p_estimated_amount:
      entry.assignment?.custom_price ?? entry.service.starting_price ?? null,
    p_property_service_id: entry.assignment?.id ?? null,
    p_provider_name: null,
  });
}

export async function getGuestCheckin(token: string): Promise<GuestCheckin | null> {
  const payload = await rpc<{ checkin?: GuestCheckin | null }>('guest_get_checkin', {
    p_token: token,
  });
  return payload.checkin ?? null;
}

export async function submitGuestCheckin(
  token: string,
  input: GuestCheckinInput,
): Promise<GuestCheckin> {
  const payload = await rpc<{ checkin: GuestCheckin }>('guest_submit_checkin', {
    p_token: token,
    p_guest_name: input.guestName.trim(),
    p_guest_email: input.guestEmail?.trim() || null,
    p_guest_phone: input.guestPhone?.trim() || null,
    p_address: input.address?.trim() || null,
    p_nationality: input.nationality?.trim() || null,
    p_id_doc_type: input.idDocType,
    p_id_doc_number: input.idDocNumber.trim(),
    p_num_guests: input.numGuests,
    p_estimated_arrival: input.estimatedArrival,
    p_special_requests: input.specialRequests?.trim() || null,
    p_signature_data: input.signatureData,
    p_rules_accepted: input.rulesAccepted,
  });
  return payload.checkin;
}
