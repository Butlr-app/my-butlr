export type AssistantTaskCategoryHint = 'pool' | 'garden' | 'works' | 'cleaning'

export interface AssistantTaskDraft {
  kind: 'task'
  title: string
  description?: string
  dueDate?: string
  dueTime?: string
  linkType?: 'client' | 'property' | 'partner'
  priority?: 'low' | 'medium' | 'high'
  categoryHint?: AssistantTaskCategoryHint
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(base: Date, days: number) {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next
}

function resolveRelativeDueDate(message: string, now = new Date()): string | undefined {
  const q = message.toLowerCase()
  if (/\baujourd['’]?hui\b/.test(q)) return toIsoDate(now)
  if (/\bdemain\b/.test(q)) return toIsoDate(addDays(now, 1))
  if (/\baprès[- ]?demain\b/.test(q)) return toIsoDate(addDays(now, 2))
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
    .replace(/\b(demain|aujourd['’]?hui|après[- ]?demain)\b/gi, '')
    .replace(/\b(?:à|a)\s*\d{1,2}\s*[h:]\s*\d{0,2}\b/gi, '')
    .replace(/\b\d{1,2}\s*h\s*\d{0,2}\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (cleaned.length >= 4) return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  if (categoryHint === 'cleaning') return 'Intervention ménage'
  if (categoryHint === 'pool') return 'Intervention pisciniste'
  if (categoryHint === 'garden') return 'Intervention jardinage'
  if (categoryHint === 'works') return 'Intervention maintenance'
  return 'Nouvelle tâche'
}

export function parseAssistantTaskDraft(message: string, now = new Date()): AssistantTaskDraft | null {
  const q = message.toLowerCase().trim()
  if (!q) return null

  const wantsTask = /t[aâ]che|intervention|rappel|ajoute|ajoutez|cr[eé]e|planifi|rdv|rendez[- ]?vous/.test(q)
  const categoryHint = resolveCategoryHint(q)
  if (!wantsTask && !categoryHint) return null
  if (!wantsTask && categoryHint && !/ajout|crée|cree|planifi|intervention/.test(q)) return null

  const dueDate = resolveRelativeDueDate(message, now)
  const dueTime = resolveDueTime(message)
  const title = buildTitle(message, categoryHint)
  const descriptionParts: string[] = []
  if (dueTime) descriptionParts.push(`Horaires : ${dueTime}`)
  if (/\bpour\s+le\s+spa\b/i.test(message)) descriptionParts.push('Lieu : spa')

  return {
    kind: 'task',
    title,
    description: descriptionParts.length > 0 ? descriptionParts.join('\n') : undefined,
    dueDate,
    dueTime,
    linkType: categoryHint || /prestataire|piscin|jardin|artisan|m[eé]nage|[eé]lectric|menuis/.test(q)
      ? 'partner'
      : 'property',
    priority: /urgent|asap|prioritaire|important/.test(q) ? 'high' : 'medium',
    categoryHint,
  }
}

export function sanitizeAssistantTaskDraft(raw: unknown): AssistantTaskDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const draft = raw as Record<string, unknown>
  if (draft.kind !== 'task' || typeof draft.title !== 'string') return null
  const title = draft.title.trim().slice(0, 160)
  if (!title) return null

  const linkType = draft.linkType === 'client' || draft.linkType === 'property' || draft.linkType === 'partner'
    ? draft.linkType
    : undefined
  const priority = draft.priority === 'low' || draft.priority === 'medium' || draft.priority === 'high'
    ? draft.priority
    : undefined
  const categoryHint = draft.categoryHint === 'pool'
    || draft.categoryHint === 'garden'
    || draft.categoryHint === 'works'
    || draft.categoryHint === 'cleaning'
    ? draft.categoryHint
    : undefined
  const dueDate = typeof draft.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate)
    ? draft.dueDate
    : undefined
  const dueTime = typeof draft.dueTime === 'string' && /^\d{2}:\d{2}$/.test(draft.dueTime)
    ? draft.dueTime
    : undefined

  return {
    kind: 'task',
    title,
    description: typeof draft.description === 'string' ? draft.description.trim().slice(0, 1000) : undefined,
    dueDate,
    dueTime,
    linkType,
    priority,
    categoryHint,
  }
}

export function taskCreatePath(draft: AssistantTaskDraft): string {
  if (draft.categoryHint || draft.linkType === 'partner') {
    return '/app/operations?tab=tasks&create=task'
  }
  return '/app/tasks?create=task'
}
