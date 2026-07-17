import { supabase } from './supabase'
import { propertyTeamRoleLabels, type PropertyTeamRole } from './propertyTeam'
import { createStayMessageSignedUrl } from './uploadStayMessageImage'
import {
  parseStayMessagePayload,
  type StayMessageInput,
  type StayMessagePayload,
  type StayMessageType,
} from './stayMessageTypes'

export type { StayMessageInput, StayMessagePayload, StayMessageType } from './stayMessageTypes'
export {
  buildProductCardPayload,
  buildServiceCardPayload,
  messagePreviewLabel,
} from './stayMessageTypes'

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
  body: string | null
  message_type: StayMessageType
  payload: StayMessagePayload
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

export function normalizeStayMessage(raw: Record<string, unknown>): StayMessage {
  const messageType = (raw.message_type as StayMessageType) ?? 'text'
  const payload = parseStayMessagePayload(raw.payload)

  return {
    id: String(raw.id),
    conversation_id: String(raw.conversation_id),
    sender_type: raw.sender_type as StayMessage['sender_type'],
    sender_user_id: (raw.sender_user_id as string | null) ?? null,
    body: (raw.body as string | null) ?? null,
    message_type: messageType,
    payload,
    read_at: (raw.read_at as string | null) ?? null,
    created_at: String(raw.created_at),
  }
}

export async function resolveStayMessageImageUrls(messages: StayMessage[]): Promise<StayMessage[]> {
  return Promise.all(
    messages.map(async message => {
      if (message.message_type !== 'image') return message
      const storagePath = String((message.payload as { storage_path?: string }).storage_path ?? '')
      if (!storagePath) return message
      const imageUrl = await createStayMessageSignedUrl(storagePath)
      if (!imageUrl) return message
      return {
        ...message,
        payload: { ...message.payload, image_url: imageUrl },
      }
    }),
  )
}

export async function parseStayMessagingPayload(
  raw: Record<string, unknown> | null | undefined,
): Promise<StayMessagingPayload> {
  if (!raw || raw.enabled === false) {
    return { enabled: false, conversation: null, contact: null, messages: [], unreadCount: 0 }
  }
  const messages = await resolveStayMessageImageUrls(
    ((raw.messages ?? []) as Record<string, unknown>[]).map(normalizeStayMessage),
  )
  return {
    enabled: true,
    conversation: (raw.conversation as StayConversation) ?? null,
    contact: (raw.contact as StayMessageContact) ?? null,
    messages,
    unreadCount: Number(raw.unread_count ?? 0),
  }
}

export async function guestGetStayMessages(token: string) {
  const { data, error } = await supabase.rpc('guest_get_stay_messages', { p_token: token })
  if (error) return { data: await parseStayMessagingPayload(null), error }
  if ((data as { error?: string })?.error) {
    return { data: await parseStayMessagingPayload(null), error: new Error('Messages indisponibles.') }
  }
  return { data: await parseStayMessagingPayload(data as Record<string, unknown>), error: null }
}

export async function guestSendStayMessage(token: string, input: StayMessageInput) {
  return supabase.rpc('guest_send_stay_message', {
    p_token: token,
    p_body: input.body ?? null,
    p_message_type: input.messageType ?? 'text',
    p_payload: input.payload ?? {},
  })
}

export async function guestMarkStayMessagesRead(token: string) {
  return supabase.rpc('guest_mark_stay_messages_read', { p_token: token })
}

export async function staffSendStayMessage(conversationId: string, input: StayMessageInput) {
  return supabase.rpc('staff_send_stay_message', {
    p_conversation_id: conversationId,
    p_body: input.body ?? null,
    p_message_type: input.messageType ?? 'text',
    p_payload: input.payload ?? {},
  })
}

export function stayMessageRpcError(result: unknown): string | null {
  const code = (result as { error?: string })?.error
  if (!code) return null
  switch (code) {
    case 'empty_body':
    case 'invalid_message':
      return 'Message invalide.'
    case 'forbidden':
      return 'Accès refusé.'
    case 'not_found':
      return 'Conversation introuvable.'
    default:
      return 'Envoi impossible.'
  }
}

export async function staffMarkStayMessagesRead(conversationId: string) {
  return supabase.rpc('staff_mark_stay_messages_read', { p_conversation_id: conversationId })
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

  if (error || !data?.length) {
    return { data: (data ?? []) as StayConversationWithMeta[], error }
  }

  const conversationIds = data.map(conversation => conversation.id)
  const { data: unreadRows, error: unreadError } = await supabase
    .from('stay_messages')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .eq('sender_type', 'guest')
    .is('read_at', null)

  if (unreadError) {
    return { data: data as StayConversationWithMeta[], error: unreadError }
  }

  const unreadByConversation = new Map<string, number>()
  for (const row of unreadRows ?? []) {
    unreadByConversation.set(
      row.conversation_id,
      (unreadByConversation.get(row.conversation_id) ?? 0) + 1,
    )
  }

  return {
    data: data.map(conversation => ({
      ...conversation,
      unread_staff_count: unreadByConversation.get(conversation.id) ?? 0,
    })) as StayConversationWithMeta[],
    error: null,
  }
}

export async function fetchConversationMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('stay_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  const messages = await resolveStayMessageImageUrls(
    ((data ?? []) as Record<string, unknown>[]).map(normalizeStayMessage),
  )

  return {
    data: messages,
    error,
  }
}

export function teamRoleLabel(role: string): string {
  return propertyTeamRoleLabels[role as PropertyTeamRole] ?? role
}
