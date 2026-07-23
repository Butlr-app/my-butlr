import type { TaskFormInput, TaskLinkType, TaskPriority } from './tasks'

export const ASSISTANT_DRAFT_STORAGE_KEY = 'butlr-assistant-draft'

export type AssistantTaskCategoryHint = 'pool' | 'garden' | 'works' | 'cleaning'

export interface AssistantTaskDraft {
  kind: 'task'
  title: string
  description?: string
  dueDate?: string
  dueTime?: string
  linkType?: TaskLinkType
  priority?: TaskPriority
  propertyId?: string
  partnerId?: string
  reservationId?: string
  categoryHint?: AssistantTaskCategoryHint
}

export type AssistantDraft = AssistantTaskDraft

export function isAssistantTaskDraft(value: unknown): value is AssistantTaskDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Record<string, unknown>
  return draft.kind === 'task' && typeof draft.title === 'string' && draft.title.trim().length > 0
}

export function stashAssistantDraft(draft: AssistantDraft) {
  sessionStorage.setItem(ASSISTANT_DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

export function peekAssistantDraft(): AssistantDraft | null {
  const raw = sessionStorage.getItem(ASSISTANT_DRAFT_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return isAssistantTaskDraft(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function consumeAssistantDraft(): AssistantDraft | null {
  const draft = peekAssistantDraft()
  sessionStorage.removeItem(ASSISTANT_DRAFT_STORAGE_KEY)
  return draft
}

export function clearAssistantDraft() {
  sessionStorage.removeItem(ASSISTANT_DRAFT_STORAGE_KEY)
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(base: Date, days: number) {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next
}

function resolveRelativeDueDate(message: string, now = new Date()): string | undefined {
  const q = message.toLowerCase()
  if (/\baujourd['’]?hui\b|\btoday\b/.test(q)) return toIsoDate(now)
  if (/\bdemain\b|\btomorrow\b/.test(q)) return toIsoDate(addDays(now, 1))
  if (/\baprès[- ]?demain\b/.test(q)) return toIsoDate(addDays(now, 2))

  const numeric = q.match(/\ble\s+(\d{1,2})(?:\/(\d{1,2})(?:\/(\d{2,4}))?)?\b/)
  if (numeric) {
    const day = Number(numeric[1])
    const month = numeric[2] ? Number(numeric[2]) - 1 : now.getMonth()
    let year = numeric[3] ? Number(numeric[3]) : now.getFullYear()
    if (numeric[3] && numeric[3].length === 2) year += 2000
    const candidate = new Date(year, month, day)
    if (!Number.isNaN(candidate.getTime())) return toIsoDate(candidate)
  }

  return undefined
}

function resolveDueTime(message: string): string | undefined {
  const match = message.match(/(?:^|[\s,;])(?:à|a)\s*(\d{1,2})\s*[:h]\s*(\d{2})\b/i)
    ?? message.match(/(?:^|[\s,;])(?:à|a)\s*(\d{1,2})\s*h\b/i)
    ?? message.match(/\b(\d{1,2})\s*h\s*(\d{2})\b/i)
  if (!match) return undefined
  const hours = Number(match[1])
  const minutes = Number(match[2] ?? '0')
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined
  return `${pad(hours)}:${pad(minutes)}`
}

function resolveCategoryHint(message: string): AssistantTaskCategoryHint | undefined {
  const q = message.toLowerCase()
  if (/m[eé]nage|nettoyage|housekeep|femme de m[eé]nage/.test(q)) return 'cleaning'
  if (/piscin|spa technique/.test(q)) return 'pool'
  if (/jardin|paysag|espace.?vert|tonte/.test(q)) return 'garden'
  if (/travaux|maintenance|r[eé]par|plomb|[eé]lectric|menuis|artisan/.test(q)) return 'works'
  return undefined
}

function buildTitle(message: string, categoryHint?: AssistantTaskCategoryHint): string {
  const cleaned = message
    .replace(/^(ajoute|ajoutez|crée|cree|créé|créez|creez|planifie|planifiez|créer|creer)\s+(une?\s+)?/i, '')
    .replace(/\b(demain|aujourd['’]?hui|après[- ]?demain|le\s+\d{1,2}(?:\/\d{1,2}(?:\/\d{2,4})?)?)\b/gi, '')
    .replace(/\b(?:à|a)\s*\d{1,2}\s*[h:]\s*\d{0,2}\b/gi, '')
    .replace(/\b\d{1,2}\s*h\s*\d{0,2}\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (cleaned.length >= 4) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  if (categoryHint === 'cleaning') return 'Intervention ménage'
  if (categoryHint === 'pool') return 'Intervention pisciniste'
  if (categoryHint === 'garden') return 'Intervention jardinage'
  if (categoryHint === 'works') return 'Intervention maintenance'
  return 'Nouvelle tâche'
}

function buildDescription(dueTime?: string, message?: string): string | undefined {
  const parts: string[] = []
  if (dueTime) parts.push(`Horaires : ${dueTime}`)
  if (message && /\bpour\s+le\s+spa\b/i.test(message)) parts.push('Lieu : spa')
  return parts.length > 0 ? parts.join('\n') : undefined
}

/** Local fallback when the edge function does not return a structured draft. */
export function parseAssistantTaskDraft(
  message: string,
  now = new Date(),
): AssistantTaskDraft | null {
  const q = message.toLowerCase().trim()
  if (!q) return null

  const wantsTask = /t[aâ]che|intervention|rappel|ajoute|ajoutez|cr[eé]e|planifi|rdv|rendez[- ]?vous/.test(q)
  const technical = Boolean(resolveCategoryHint(q))
  if (!wantsTask && !technical) return null
  if (!wantsTask && technical && !/ajout|crée|cree|planifi|intervention|facture/.test(q)) return null

  const categoryHint = resolveCategoryHint(q)
  const dueDate = resolveRelativeDueDate(message, now)
  const dueTime = resolveDueTime(message)
  const title = buildTitle(message, categoryHint)
  const description = buildDescription(dueTime, message)
  const linkType: TaskLinkType = categoryHint || /prestataire|piscin|jardin|artisan|m[eé]nage|[eé]lectric|menuis/.test(q)
    ? 'partner'
    : /client|voyageur|s[eé]jour|r[eé]servation/.test(q)
      ? 'client'
      : 'property'

  return {
    kind: 'task',
    title,
    description,
    dueDate,
    dueTime,
    linkType,
    priority: /urgent|asap|prioritaire|important/.test(q) ? 'high' : 'medium',
    categoryHint,
  }
}

export function taskDraftToFormPrefill(draft: AssistantTaskDraft): Partial<TaskFormInput> {
  const descriptionParts = [draft.description?.trim()].filter(Boolean) as string[]
  if (draft.dueTime && !descriptionParts.some(part => part.includes(draft.dueTime!))) {
    descriptionParts.unshift(`Horaires : ${draft.dueTime}`)
  }

  return {
    title: draft.title.trim(),
    description: descriptionParts.join('\n'),
    dueDate: draft.dueDate ?? '',
    linkType: draft.linkType,
    priority: draft.priority,
    propertyId: draft.propertyId,
    partnerId: draft.partnerId,
    reservationId: draft.reservationId,
  }
}

export function categoryHintToPartnerCategory(
  hint: AssistantTaskCategoryHint | undefined,
): string | null {
  if (hint === 'cleaning') return 'Ménage & entretien'
  if (hint === 'pool') return 'Piscine & spa technique'
  if (hint === 'garden') return 'Jardinage & espaces verts'
  if (hint === 'works') return 'Maintenance & réparations'
  return null
}

export function sanitizeAssistantTaskDraft(raw: unknown): AssistantTaskDraft | null {
  if (!isAssistantTaskDraft(raw)) return null
  const title = raw.title.trim().slice(0, 160)
  if (!title) return null

  const linkType = raw.linkType === 'client' || raw.linkType === 'property' || raw.linkType === 'partner'
    ? raw.linkType
    : undefined
  const priority = raw.priority === 'low' || raw.priority === 'medium' || raw.priority === 'high'
    ? raw.priority
    : undefined
  const categoryHint = raw.categoryHint === 'pool'
    || raw.categoryHint === 'garden'
    || raw.categoryHint === 'works'
    || raw.categoryHint === 'cleaning'
    ? raw.categoryHint
    : undefined

  const dueDate = typeof raw.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dueDate)
    ? raw.dueDate
    : undefined
  const dueTime = typeof raw.dueTime === 'string' && /^\d{2}:\d{2}$/.test(raw.dueTime)
    ? raw.dueTime
    : undefined

  return {
    kind: 'task',
    title,
    description: typeof raw.description === 'string' ? raw.description.trim().slice(0, 1000) : undefined,
    dueDate,
    dueTime,
    linkType,
    priority,
    propertyId: typeof raw.propertyId === 'string' ? raw.propertyId : undefined,
    partnerId: typeof raw.partnerId === 'string' ? raw.partnerId : undefined,
    reservationId: typeof raw.reservationId === 'string' ? raw.reservationId : undefined,
    categoryHint,
  }
}
