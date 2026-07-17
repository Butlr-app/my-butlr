import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, LayoutGrid, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { TaskCalendarView } from '@/components/tasks/TaskCalendarView'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { TaskKanbanView } from '@/components/tasks/TaskKanbanView'
import { TaskTodoView } from '@/components/tasks/TaskTodoView'
import { consumeAssistantDraft, taskDraftToFormPrefill } from '@/lib/assistantDraft'
import { useAuth } from '@/lib/authContext'
import { todayISO } from '@/lib/data'
import {
  deleteTask,
  fetchOwnerTasks,
  updateTaskStatus,
  type TaskFormInput,
  type TaskLinkType,
  type TaskRecord,
  type TaskStatus,
} from '@/lib/tasks'

type TaskView = 'kanban' | 'todo' | 'calendar'

const viewOptions: Array<{ id: TaskView; label: string; icon: typeof LayoutGrid }> = [
  { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { id: 'todo', label: 'To-do', icon: ListTodo },
  { id: 'calendar', label: 'Calendrier', icon: CalendarDays },
]

const linkFilters: Array<{ id: 'all' | TaskLinkType; label: string }> = [
  { id: 'all', label: 'Toutes' },
  { id: 'client', label: 'Client' },
  { id: 'property', label: 'Villa' },
  { id: 'partner', label: 'Prestataire' },
]

export function Tasks() {
  const { user, profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [view, setView] = useState<TaskView>('todo')
  const [linkFilter, setLinkFilter] = useState<'all' | TaskLinkType>('all')
  const [showDone, setShowDone] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null)
  const [taskPrefill, setTaskPrefill] = useState<Partial<TaskFormInput> | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('create') !== 'task') return
    const draft = consumeAssistantDraft()
    setEditingTask(null)
    setTaskPrefill(draft ? taskDraftToFormPrefill(draft) : null)
    setModalOpen(true)
    const cleaned = new URLSearchParams(searchParams)
    cleaned.delete('create')
    setSearchParams(cleaned, { replace: true })
  }, [searchParams, setSearchParams])

  const loadTasks = async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await fetchOwnerTasks(user.id)
    if (error) {
      console.error('fetchOwnerTasks', error)
    }
    setTasks((data as TaskRecord[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadTasks()
  }, [user?.id])

  const filteredTasks = useMemo(
    () => linkFilter === 'all' ? tasks : tasks.filter(task => task.link_type === linkFilter),
    [tasks, linkFilter],
  )

  const activeCount = useMemo(
    () => filteredTasks.filter(task => task.status !== 'done').length,
    [filteredTasks],
  )

  const openCreate = () => {
    setEditingTask(null)
    setTaskPrefill(null)
    setModalOpen(true)
  }

  const openEdit = (task: TaskRecord) => {
    setEditingTask(task)
    setTaskPrefill(null)
    setModalOpen(true)
  }

  const handleSaved = (task: TaskRecord) => {
    setTasks(current => {
      const exists = current.some(item => item.id === task.id)
      if (exists) {
        return current.map(item => item.id === task.id ? task : item)
      }
      return [task, ...current]
    })
    setTaskPrefill(null)
  }

  const handleStatusChange = async (task: TaskRecord, status: TaskStatus) => {
    setBusyId(task.id)
    const { data, error } = await updateTaskStatus(task.id, status)
    setBusyId(null)
    if (!error && data) {
      setTasks(current => current.map(item => item.id === task.id ? (data as TaskRecord) : item))
    }
  }

  const handleToggleDone = async (task: TaskRecord) => {
    const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    await handleStatusChange(task, nextStatus)
  }

  const handleDelete = async (task: TaskRecord) => {
    if (!confirm(`Supprimer la tâche « ${task.title} » ?`)) return
    setBusyId(task.id)
    const { error } = await deleteTask(task.id)
    setBusyId(null)
    if (!error) {
      setTasks(current => current.filter(item => item.id !== task.id))
    }
  }

  if (loading) return <LoadingState label="Chargement des tâches…" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
            Opérations
          </p>
          <h1 className="mt-1 text-lg font-semibold">Tâches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivez les actions liées à un client, une villa ou un prestataire.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          Nouvelle tâche
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {viewOptions.map(option => {
            const Icon = option.icon
            const selected = view === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setView(option.id)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? 'border-foreground/20 bg-foreground text-background'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{activeCount} active{activeCount > 1 ? 's' : ''}</span>
          {view === 'todo' && (
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showDone}
                onChange={event => setShowDone(event.target.checked)}
                className="rounded border-border"
              />
              Afficher terminées
            </label>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {linkFilters.map(filter => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setLinkFilter(filter.id)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              linkFilter === filter.id
                ? 'border-foreground/20 bg-muted text-foreground ring-1 ring-border'
                : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            {filter.label}
            {' '}
            ({filter.id === 'all' ? tasks.length : tasks.filter(task => task.link_type === filter.id).length})
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState
          title="Aucune tâche"
          description="Créez une tâche opérationnelle rattachée à un séjour, une villa ou un prestataire."
          action={<Button size="sm" onClick={openCreate}>Créer une tâche</Button>}
        />
      ) : (
        <>
          {view === 'kanban' && (
            <TaskKanbanView
              tasks={filteredTasks}
              dateFormat={profile?.date_format}
              busyId={busyId}
              onEdit={openEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          )}

          {view === 'todo' && (
            <TaskTodoView
              tasks={filteredTasks}
              todayIso={todayISO()}
              dateFormat={profile?.date_format}
              showDone={showDone}
              busyId={busyId}
              onEdit={openEdit}
              onToggleDone={handleToggleDone}
            />
          )}

          {view === 'calendar' && (
            <TaskCalendarView
              tasks={filteredTasks}
              todayIso={todayISO()}
              dateFormat={profile?.date_format}
              onEdit={openEdit}
            />
          )}
        </>
      )}

      <TaskFormModal
        open={modalOpen}
        task={editingTask}
        initialLinkType={taskPrefill?.linkType}
        initialPartnerId={taskPrefill?.partnerId}
        initialPropertyId={taskPrefill?.propertyId}
        initialPrefill={editingTask ? undefined : taskPrefill ?? undefined}
        onClose={() => {
          setModalOpen(false)
          setEditingTask(null)
          setTaskPrefill(null)
        }}
        onSaved={handleSaved}
      />
    </div>
  )
}
