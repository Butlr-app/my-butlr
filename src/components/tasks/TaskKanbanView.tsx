import { TaskCard } from '@/components/tasks/TaskCard'
import { taskStatusLabels, type TaskRecord, type TaskStatus } from '@/lib/tasks'

const columns: Array<{ id: TaskStatus; label: string }> = [
  { id: 'todo', label: taskStatusLabels.todo },
  { id: 'in_progress', label: taskStatusLabels.in_progress },
  { id: 'waiting', label: taskStatusLabels.waiting },
  { id: 'done', label: taskStatusLabels.done },
]

interface TaskKanbanViewProps {
  tasks: TaskRecord[]
  dateFormat?: string | null
  busyId?: string | null
  onEdit: (task: TaskRecord) => void
  onDelete: (task: TaskRecord) => void
  onStatusChange: (task: TaskRecord, status: TaskStatus) => void
}

export function TaskKanbanView({
  tasks,
  dateFormat,
  busyId,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskKanbanViewProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {columns.map(col => {
        const columnTasks = tasks.filter(task => task.status === col.id)

        return (
          <div key={col.id} className="space-y-3">
            <div className="flex items-center justify-between border-b border-border px-1 pb-2">
              <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">
                {col.label}
              </p>
              <span className="text-xs font-mono text-muted-foreground">
                {columnTasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {columnTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  dateFormat={dateFormat}
                  busyId={busyId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                />
              ))}
              {columnTasks.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-6 text-center">
                  <p className="text-xs text-muted-foreground">Aucune tâche</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
