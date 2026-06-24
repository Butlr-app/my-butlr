import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useTasks, useProperties, type Task } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { Plus, Loader2 } from 'lucide-react'

const columns = [
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'done', label: 'Done' },
] as const

const emptyForm = {
  title: '',
  description: '',
  property_id: '',
  priority: 'medium' as Task['priority'],
  due_date: '',
}

export function Tasks() {
  const { data: tasks, loading, insert, update } = useTasks()
  const { data: properties } = useProperties()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await insert({
        ...form,
        property_id: form.property_id || null,
        due_date: form.due_date || null,
        status: 'todo',
      })
      toast('Task created')
      setShowForm(false)
      setForm(emptyForm)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const moveTask = async (taskId: string, newStatus: Task['status']) => {
    try {
      await update(taskId, { status: newStatus })
      toast(`Moved to ${newStatus.replace('_', ' ')}`)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const propertyMap = Object.fromEntries(properties.map(p => [p.id, p.name]))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">Operations Board</p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add task
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id)
          return (
            <div key={col.id} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">{col.label}</p>
                <span className="text-xs font-mono text-muted-foreground">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.map(task => (
                  <Card key={task.id} className="p-3 hover:bg-muted/30 transition-colors">
                    <p className="text-sm font-medium mb-2">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground">
                        {task.property_id ? propertyMap[task.property_id] ?? '—' : '—'}
                      </p>
                      <Badge variant={
                        task.priority === 'high' ? 'destructive' :
                        task.priority === 'medium' ? 'warning' : 'muted'
                      }>
                        {task.priority}
                      </Badge>
                    </div>
                    {task.due_date && (
                      <p className="text-[10px] font-mono text-muted-foreground mb-2">Due: {task.due_date}</p>
                    )}
                    <div className="flex gap-1 flex-wrap">
                      {columns.filter(c => c.id !== col.id).map(c => (
                        <button
                          key={c.id}
                          onClick={() => moveTask(task.id, c.id)}
                          className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </Card>
                ))}
                {colTasks.length === 0 && (
                  <div className="border border-dashed border-border rounded-md p-6 text-center">
                    <p className="text-xs text-muted-foreground">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Task">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Prepare welcome basket" />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Description</label>
            <textarea
              className="w-full h-20 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <Select
            label="Property"
            value={form.property_id}
            onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
            options={[
              { value: '', label: 'No property' },
              ...properties.map(p => ({ value: p.id, label: p.name })),
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as Task['priority'] }))}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
            <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
