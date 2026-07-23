import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { localeForDateFormat, formatDateForDisplay } from '@/lib/dateFormat'
import {
  buildMonthCalendarCells,
  sortTasksForDisplay,
  taskDueOnDate,
  taskLinkAccentClass,
  taskLinkSummary,
  taskPriorityLabels,
  taskStatusDotClass,
  type TaskRecord,
  type TaskStatus,
} from '@/lib/tasks'

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

interface TaskCalendarViewProps {
  tasks: TaskRecord[]
  todayIso: string
  dateFormat?: string | null
  onEdit: (task: TaskRecord) => void
}

export function TaskCalendarView({
  tasks,
  todayIso,
  dateFormat,
  onEdit,
}: TaskCalendarViewProps) {
  const [cursor, setCursor] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  const cells = useMemo(() => buildMonthCalendarCells(cursor), [cursor])
  const scheduledTasks = useMemo(
    () => tasks.filter(task => task.due_date).sort(sortTasksForDisplay),
    [tasks],
  )
  const unscheduledTasks = useMemo(
    () => tasks.filter(task => !task.due_date && task.status !== 'done').sort(sortTasksForDisplay),
    [tasks],
  )

  const monthLabel = cursor.toLocaleDateString(localeForDateFormat(dateFormat), {
    month: 'long',
    year: 'numeric',
  })

  const shiftMonth = (delta: number) => {
    setCursor(current => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold capitalize">{monthLabel}</p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map(day => (
            <div
              key={day}
              className="border-r border-border px-2 py-3 text-center text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell, index) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[92px] border-b border-r border-border bg-muted/20 last:border-r-0"
                />
              )
            }

            const dayTasks = scheduledTasks.filter(task => taskDueOnDate(task, cell.iso))
            const isToday = cell.iso === todayIso

            return (
              <div
                key={cell.iso}
                className={`min-h-[92px] border-b border-r border-border p-1.5 last:border-r-0 ${isToday ? 'bg-info/5' : ''}`}
              >
                <p className={`mb-1 text-xs font-mono ${isToday ? 'font-semibold text-info' : 'text-muted-foreground'}`}>
                  {cell.day}
                </p>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map(task => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onEdit(task)}
                      className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] hover:bg-muted/60 ${taskLinkAccentClass(task.link_type)} ${task.status === 'done' ? 'opacity-60 line-through' : ''}`}
                    >
                      {task.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">+{dayTasks.length - 3} autres</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Échéances du mois</h3>
          {scheduledTasks.filter(task => {
            const [year, month] = task.due_date!.split('-').map(Number)
            return year === cursor.getFullYear() && month === cursor.getMonth() + 1
          }).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune tâche planifiée ce mois-ci.</p>
          ) : (
            <div className="space-y-2">
              {scheduledTasks
                .filter(task => {
                  const [year, month] = task.due_date!.split('-').map(Number)
                  return year === cursor.getFullYear() && month === cursor.getMonth() + 1
                })
                .map(task => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onEdit(task)}
                    className="flex w-full items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-left hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${taskStatusDotClass(task.status as TaskStatus)}`} />
                        <p className={`truncate text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {taskLinkSummary(task)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-mono text-muted-foreground">
                        {formatDateForDisplay(task.due_date!, dateFormat)}
                      </p>
                      <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'warning' : 'muted'}>
                        {taskPriorityLabels[task.priority]}
                      </Badge>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Sans échéance</h3>
          {unscheduledTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Toutes les tâches actives ont une date.</p>
          ) : (
            <div className="space-y-2">
              {unscheduledTasks.map(task => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onEdit(task)}
                  className="flex w-full items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-left hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {taskLinkSummary(task)}
                    </p>
                  </div>
                  <Badge variant="muted">{taskPriorityLabels[task.priority]}</Badge>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
