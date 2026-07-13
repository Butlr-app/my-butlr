import { supabase } from './supabase'
import { propertyTeamRoleLabels, type PropertyTeamRole } from './propertyTeam'

export type MessageContactRole = 'house_manager' | 'concierge'

export interface StayConversation {
  id: string
  reservation_id: string
  property_id: string
  recipient_role: MessageContactRole
  recipient_user_id: string | null
  guest_name: string | null
  status: 'open' | 'closed'
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export interface StayMessage {
  id: string
  conversation_id: string
  sender_type: 'guest' | 'staff'
  sender_user_id: string | null
  body: string
  read_at: string | null
  created_at: string
}

export interface StayMessageContact {
  role: MessageContactRole
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
}

export interface StayMessagingPayload {
  enabled: boolean
  conversation: StayConversation | null
  contact: StayMessageContact | null
  messages: StayMessage[]
  unreadCount: number
}

export const messageContactRoleLabels: Record<MessageContactRole, string> = {
  house_manager: 'House manager',
  concierge: 'Conciergerie',
}

export function messageContactHeading(role: MessageContactRole, name?: string | null): string {
  if (name?.trim()) return name.trim()
  return role === 'house_manager' ? 'Votre house manager' : 'Votre conciergerie'
}

export function messageContactSubtitle(role: MessageContactRole): string {
  return role === 'house_manager'
    ? 'Coordination villa et services sur place'
    : 'Services, demandes et assistance séjour'
}

export function parseStayMessagingPayload(raw: Record<string, unknown> | null | undefined): StayMessagingPayload {
  if (!raw || raw.enabled === false) {
    return { enabled: false, conversation: null, contact: null, messages: [], unreadCount: 0 }
  }
  return {
    enabled: true,
    conversation: (raw.conversation as StayConversation) ?? null,
    contact: (raw.contact as StayMessageContact) ?? null,
    messages: (raw.messages ?? []) as StayMessage[],
    unreadCount: Number(raw.unread_count ?? 0),
  }
}

export async function guestGetStayMessages(token: string) {
  const { data, error } = await supabase.rpc('guest_get_stay_messages', { p_token: token })
  if (error) return { data: parseStayMessagingPayload(null), error }
  if ((data as { error?: string })?.error) {
    return { data: parseStayMessagingPayload(null), error: new Error('Messages indisponibles.') }
  }
  return { data: parseStayMessagingPayload(data as Record<string, unknown>), error: null }
}

export async function guestSendStayMessage(token: string, body: string) {
  return supabase.rpc('guest_send_stay_message', { p_token: token, p_body: body })
}

export async function guestMarkStayMessagesRead(token: string) {
  return supabase.rpc('guest_mark_stay_messages_read', { p_token: token })
}

export async function staffSendStayMessage(conversationId: string, body: string) {
  return supabase.rpc('staff_send_stay_message', {
    p_conversation_id: conversationId,
    p_body: body,
  })
}

export interface StayConversationWithMeta extends StayConversation {
  reservations?: {
    guest_name: string
    arrival: string
    departure: string
    properties?: { name: string } | null
  } | null
  unread_staff_count?: number
}

export async function fetchPropertyStayConversations(propertyIds: string[]) {
  if (propertyIds.length === 0) return { data: [] as StayConversationWithMeta[], error: null }

  const { data, error } = await supabase
    .from('stay_conversations')
    .select('*, reservations(guest_name, arrival, departure, properties(name))')
    .in('property_id', propertyIds)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  return { data: (data ?? []) as StayConversationWithMeta[], error }
}

export async function fetchConversationMessages(conversationId: string) {
  return supabase
    .from('stay_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
}

export function teamRoleLabel(role: string): string {
  return propertyTeamRoleLabels[role as PropertyTeamRole] ?? role
}
