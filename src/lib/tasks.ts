import { supabase } from './supabase'
import { getOwnerPropertyIds } from './data'

export type TaskLinkType = 'client' | 'property' | 'partner'
export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface TaskRecord {
  id: string
  owner_id?: string | null
  property_id: string | null
  reservation_id: string | null
  partner_id: string | null
  link_type: TaskLinkType
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  created_at?: string
  updated_at?: string
  properties?: { name: string } | null
  reservations?: {
    id: string
    guest_name: string
    arrival: string
    departure: string
    properties?: { name: string } | null
  } | null
  partners?: { name: string; category: string | null } | null
}

export interface TaskFormInput {
  linkType: TaskLinkType
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string
  propertyId: string
  reservationId: string
  partnerId: string
}

export const taskLinkTypeLabels: Record<TaskLinkType, string> = {
  client: 'Client / séjour',
  property: 'Villa',
  partner: 'Prestataire',
}

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  waiting: 'En attente',
  done: 'Terminée',
}

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
}

const taskSelect = `
  *,
  properties(name),
  reservations(id, guest_name, arrival, departure, properties(name)),
  partners(name, category)
`

export function validateTaskInput(input: TaskFormInput): string | null {
  if (!input.title.trim()) {
    return 'Le titre de la tâche est obligatoire.'
  }

  if (input.linkType === 'property' && !input.propertyId) {
    return 'Sélectionnez une villa.'
  }

  if (input.linkType === 'client' && !input.reservationId) {
    return 'Sélectionnez un séjour client.'
  }

  if (input.linkType === 'partner' && !input.partnerId) {
    return 'Sélectionnez un prestataire.'
  }

  if (input.linkType === 'partner' && !input.propertyId) {
    return 'Sélectionnez la villa concernée.'
  }

  return null
}

export function buildTaskPayload(input: TaskFormInput) {
  return {
    link_type: input.linkType,
    title: input.title.trim(),
    description: input.description.trim() || null,
    status: input.status,
    priority: input.priority,
    due_date: input.dueDate || null,
    property_id: input.linkType === 'property' || input.linkType === 'partner'
      ? input.propertyId
      : null,
    reservation_id: input.linkType === 'client' ? input.reservationId : null,
    partner_id: input.linkType === 'partner' ? input.partnerId : null,
    updated_at: new Date().toISOString(),
  }
}

export function taskLinkSummary(task: TaskRecord): string {
  if (task.link_type === 'client') {
    const guest = task.reservations?.guest_name ?? 'Client'
    const property = task.reservations?.properties?.name
    return property ? `${guest} · ${property}` : guest
  }
  if (task.link_type === 'partner') {
    const partner = task.partners?.name ?? 'Prestataire'
    return task.properties?.name ? `${partner} · ${task.properties.name}` : partner
  }
  return task.properties?.name ?? 'Villa'
}

export function taskDueOnDate(task: TaskRecord, isoDate: string): boolean {
  return task.due_date === isoDate
}

export type TaskTodoSection = 'overdue' | 'today' | 'week' | 'later' | 'no_date' | 'done'

export const taskTodoSectionLabels: Record<TaskTodoSection, string> = {
  overdue: 'En retard',
  today: 'Aujourd\'hui',
  week: 'Cette semaine',
  later: 'Plus tard',
  no_date: 'Sans échéance',
  done: 'Terminées',
}

export const taskTodoSectionOrder: TaskTodoSection[] = [
  'overdue',
  'today',
  'week',
  'later',
  'no_date',
  'done',
]

const priorityOrder: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return isoDate

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function sortTasksForDisplay(a: TaskRecord, b: TaskRecord): number {
  const priorityDiff = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
  if (priorityDiff !== 0) return priorityDiff

  if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
  if (a.due_date) return -1
  if (b.due_date) return 1

  return (b.created_at ?? '').localeCompare(a.created_at ?? '')
}

export function taskTodoSection(task: TaskRecord, todayIso: string): TaskTodoSection {
  if (task.status === 'done') return 'done'
  if (!task.due_date) return 'no_date'
  if (task.due_date < todayIso) return 'overdue'
  if (task.due_date === todayIso) return 'today'

  const weekEnd = addDaysToIsoDate(todayIso, 7)
  if (task.due_date <= weekEnd) return 'week'
  return 'later'
}

export function groupTasksForTodo(tasks: TaskRecord[], todayIso: string) {
  const groups = Object.fromEntries(
    taskTodoSectionOrder.map(section => [section, [] as TaskRecord[]]),
  ) as Record<TaskTodoSection, TaskRecord[]>

  for (const task of tasks) {
    groups[taskTodoSection(task, todayIso)].push(task)
  }

  for (const section of taskTodoSectionOrder) {
    groups[section].sort(sortTasksForDisplay)
  }

  return groups
}

export interface MonthCalendarCell {
  day: number
  iso: string
}

export function buildMonthCalendarCells(cursor: Date): Array<MonthCalendarCell | null> {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDay = new Date(year, month, 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<MonthCalendarCell | null> = Array(mondayOffset).fill(null)

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      day,
      iso: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    })
  }

  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function taskLinkAccentClass(linkType: TaskLinkType): string {
  if (linkType === 'client') return 'border-l-[3px] border-l-violet-500'
  if (linkType === 'partner') return 'border-l-[3px] border-l-amber-500'
  return 'border-l-[3px] border-l-info'
}

export function taskStatusDotClass(status: TaskStatus): string {
  if (status === 'done') return 'bg-success'
  if (status === 'in_progress') return 'bg-info'
  if (status === 'waiting') return 'bg-warning'
  return 'bg-muted-foreground'
}

export async function fetchOwnerTasks(_ownerId: string) {
  return supabase
    .from('tasks')
    .select(taskSelect)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
}

export async function fetchPartnerTasks(partnerId: string) {
  return supabase
    .from('tasks')
    .select(taskSelect)
    .eq('partner_id', partnerId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
}

export async function fetchOwnerPartnerTasks(propertyIds?: string[]) {
  let query = supabase
    .from('tasks')
    .select(taskSelect)
    .eq('link_type', 'partner')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (propertyIds && propertyIds.length > 0) {
    query = query.in('property_id', propertyIds)
  }

  return query
}

export async function fetchTaskReservationOptions(ownerId: string) {
  const propertyIds = await getOwnerPropertyIds(ownerId)
  if (propertyIds.length === 0) return { data: [], error: null }

  return supabase
    .from('reservations')
    .select('id, guest_name, arrival, departure, property_id, properties(name)')
    .in('property_id', propertyIds)
    .eq('booking_kind', 'guest')
    .neq('status', 'cancelled')
    .order('arrival', { ascending: false })
}

export async function saveTask(input: TaskFormInput, taskId?: string) {
  const payload = buildTaskPayload(input)

  if (taskId) {
    return supabase
      .from('tasks')
      .update(payload)
      .eq('id', taskId)
      .select(taskSelect)
      .single()
  }

  return supabase
    .from('tasks')
    .insert(payload)
    .select(taskSelect)
    .single()
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  return supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select(taskSelect)
    .single()
}

export async function deleteTask(taskId: string) {
  return supabase.from('tasks').delete().eq('id', taskId)
}
