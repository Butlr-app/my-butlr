import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { useAuth } from '@/lib/authContext'
import { fetchOwnerTasks } from '@/lib/data'
import type { Task } from '@/lib/types'

const columns = [
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'done', label: 'Done' },
] as const

export function Tasks() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    if (!user) return

    fetchOwnerTasks(user.id).then(({ data }) => {
      setTasks((data as Task[]) ?? [])
      setLoading(false)
    })
  }, [user])

  if (loading) return <LoadingState />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Operations Board</p>
        <Button size="sm" disabled>Add task</Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Operational tasks for your properties will appear here."
        />
      ) : (
        <div className="grid lg:grid-cols-4 gap-4">
          {columns.map(col => (
            <div key={col.id} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">{col.label}</p>
                <span className="text-xs font-mono text-muted-foreground">
                  {tasks.filter(t => t.status === col.id).length}
                </span>
              </div>
              <div className="space-y-2">
                {tasks.filter(t => t.status === col.id).map(task => (
                  <Card key={task.id} className="p-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <p className="text-sm font-medium mb-2">{task.title}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{task.properties?.name}</p>
                      <Badge variant={
                        task.priority === 'high' ? 'destructive' :
                        task.priority === 'medium' ? 'warning' : 'muted'
                      }>
                        {task.priority}
                      </Badge>
                    </div>
                  </Card>
                ))}
                {tasks.filter(t => t.status === col.id).length === 0 && (
                  <div className="border border-dashed border-border rounded-md p-6 text-center">
                    <p className="text-xs text-muted-foreground">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
