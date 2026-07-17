import { CheckCircle2, Circle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatDateForDisplay } from '@/lib/dateFormat'
import {
  groupTasksForTodo,
  taskLinkAccentClass,
  taskLinkSummary,
  taskLinkTypeLabels,
  taskPriorityLabels,
  taskStatusDotClass,
  taskTodoSectionLabels,
  taskTodoSectionOrder,
  type TaskRecord,
  type TaskStatus,
  type TaskTodoSection,
} from '@/lib/tasks'

interface TaskTodoViewProps {
  tasks: TaskRecord[]
  todayIso: string
  dateFormat?: string | null
  showDone: boolean
  busyId?: string | null
  onEdit: (task: TaskRecord) => void
  onToggleDone: (task: TaskRecord) => void
}

const activeSections: TaskTodoSection[] = ['overdue', 'today', 'week', 'later', 'no_date']

function sectionAccent(section: TaskTodoSection): string {
  if (section === 'overdue') return 'text-destructive'
  if (section === 'today') return 'text-info'
  if (section === 'done') return 'text-muted-foreground'
  return 'text-foreground'
}

export function TaskTodoView({
  tasks,
  todayIso,
  dateFormat,
  showDone,
  busyId,
  onEdit,
  onToggleDone,
}: TaskTodoViewProps) {
  const groups = groupTasksForTodo(tasks, todayIso)
  const sections = showDone ? taskTodoSectionOrder : activeSections
  const visibleCount = sections.reduce((total, section) => total + groups[section].length, 0)

  if (visibleCount === 0) {
    return (
      <Card className="border-dashed p-8 text-center">
        <p className="text-sm font-medium">Rien à faire pour l’instant</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Les tâches actives apparaîtront ici, triées par échéance et priorité.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {sections.map(section => {
        const sectionTasks = groups[section]
        if (sectionTasks.length === 0) return null

        return (
          <section key={section} className="space-y-2">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className={`text-sm font-semibold ${sectionAccent(section)}`}>
                {taskTodoSectionLabels[section]}
              </h2>
              <span className="text-xs font-mono text-muted-foreground">
                {sectionTasks.length}
              </span>
            </div>

            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {sectionTasks.map(task => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30 ${taskLinkAccentClass(task.link_type)}`}
                >
                  <button
                    type="button"
                    disabled={busyId === task.id}
                    onClick={() => onToggleDone(task)}
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={task.status === 'done' ? 'Marquer comme à faire' : 'Marquer comme terminée'}
                  >
                    {task.status === 'done'
                      ? <CheckCircle2 className="h-5 w-5 text-success" />
                      : <Circle className="h-5 w-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-medium ${task.status === 'done' ? 'text-muted-foreground line-through' : ''}`}>
                        {task.title}
                      </p>
                      <span className={`h-2 w-2 rounded-full ${taskStatusDotClass(task.status as TaskStatus)}`} />
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {taskLinkSummary(task)}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="muted">{taskLinkTypeLabels[task.link_type]}</Badge>
                      <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'warning' : 'muted'}>
                        {taskPriorityLabels[task.priority]}
                      </Badge>
                      {task.due_date && (
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {formatDateForDisplay(task.due_date, dateFormat)}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
