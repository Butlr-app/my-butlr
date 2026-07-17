import { Building2, Handshake, Pencil, Trash2, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatDateForDisplay } from '@/lib/dateFormat'
import {
  taskLinkAccentClass,
  taskLinkSummary,
  taskLinkTypeLabels,
  taskPriorityLabels,
  type TaskLinkType,
  type TaskRecord,
  type TaskStatus,
} from '@/lib/tasks'

const statusColumns: Array<{ id: TaskStatus; label: string }> = [
  { id: 'todo', label: 'À faire' },
  { id: 'in_progress', label: 'En cours' },
  { id: 'waiting', label: 'En attente' },
  { id: 'done', label: 'Terminées' },
]

function LinkIcon({ type }: { type: TaskLinkType }) {
  if (type === 'client') return <UserRound className="h-3.5 w-3.5" />
  if (type === 'partner') return <Handshake className="h-3.5 w-3.5" />
  return <Building2 className="h-3.5 w-3.5" />
}

function priorityVariant(priority: string): 'destructive' | 'warning' | 'muted' {
  if (priority === 'high') return 'destructive'
  if (priority === 'medium') return 'warning'
  return 'muted'
}

interface TaskCardProps {
  task: TaskRecord
  dateFormat?: string | null
  busyId?: string | null
  compact?: boolean
  onEdit: (task: TaskRecord) => void
  onDelete: (task: TaskRecord) => void
  onStatusChange: (task: TaskRecord, status: TaskStatus) => void
}

export function TaskCard({
  task,
  dateFormat,
  busyId,
  compact = false,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskCardProps) {
  return (
    <Card
      className={`p-3 transition-colors hover:bg-muted/30 ${taskLinkAccentClass(task.link_type)}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className={`font-medium leading-snug ${compact ? 'text-xs' : 'text-sm'} ${task.status === 'done' ? 'text-muted-foreground line-through' : ''}`}>
          {task.title}
        </p>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onEdit(task)}
            aria-label="Modifier"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
            onClick={() => onDelete(task)}
            disabled={busyId === task.id}
            aria-label="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!compact && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="muted" className="gap-1">
            <LinkIcon type={task.link_type} />
            {taskLinkTypeLabels[task.link_type]}
          </Badge>
          <Badge variant={priorityVariant(task.priority)}>
            {taskPriorityLabels[task.priority]}
          </Badge>
        </div>
      )}

      <p className={`text-muted-foreground ${compact ? 'text-[11px]' : 'text-xs'}`}>
        {taskLinkSummary(task)}
      </p>

      {task.due_date && (
        <p className={`mt-2 font-mono text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
          Échéance {formatDateForDisplay(task.due_date, dateFormat)}
        </p>
      )}

      {task.status !== 'done' && !compact && (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-dashed border-border pt-2">
          {statusColumns
            .filter(column => column.id !== task.status)
            .map(column => (
              <button
                key={column.id}
                type="button"
                disabled={busyId === task.id}
                onClick={() => onStatusChange(task, column.id)}
                className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                → {column.label}
              </button>
            ))}
        </div>
      )}
    </Card>
  )
}
