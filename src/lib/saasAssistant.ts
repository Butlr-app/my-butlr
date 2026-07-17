import { supabase } from './supabase'
import {
  sanitizeAssistantTaskDraft,
  type AssistantDraft,
} from './assistantDraft'

export interface SaasAssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: SaasAssistantAction[]
  quickReplies?: string[]
  liveData?: boolean
}

export interface SaasAssistantAction {
  type: 'navigate'
  path: string
  label: string
}

export interface SaasAssistantContext {
  currentPath?: string
  userName?: string | null
  userRole?: string | null
}

export interface SaasSnapshotSummary {
  properties: { count: number }
  reservations: {
    inHouse: number
    arrivingThisWeek: number
    departingThisWeek: number
  }
  messaging: { unreadFromGuests: number }
  concierge: { pendingQuotes: number }
  boutique: { pendingQuotes: number }
}

interface SaasAssistantResponse {
  reply: string
  quickReplies?: string[]
  actions?: SaasAssistantAction[]
  draft?: AssistantDraft | null
  source?: 'ai' | 'data' | 'fallback'
  snapshot?: SaasSnapshotSummary | null
}

export async function sendSaasAssistantMessage(
  messages: Pick<SaasAssistantMessage, 'role' | 'content'>[],
  context: SaasAssistantContext,
): Promise<SaasAssistantResponse> {
  const { data, error } = await supabase.functions.invoke<SaasAssistantResponse>('saas-assistant', {
    body: {
      messages,
      currentPath: context.currentPath,
      userName: context.userName ?? undefined,
      userRole: context.userRole ?? undefined,
    },
  })

  if (error) {
    throw new Error(error.message || 'Assistant indisponible.')
  }
  if (!data?.reply) {
    throw new Error('Réponse assistant vide.')
  }

  return {
    ...data,
    draft: sanitizeAssistantTaskDraft(data.draft),
  }
}

export const SAAS_ASSISTANT_STARTERS = [
  'Résumé de ma situation',
  'Combien de réservations cette semaine ?',
  'Messages non lus',
  'Devis en attente',
] as const
