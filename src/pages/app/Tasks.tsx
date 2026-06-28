import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ExportButton } from '@/components/ExportButton'
import { FilterSidebar } from '@/components/FilterSidebar'
import { useTasks, useProperties, useNotifications, type Task } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { Plus, Loader2, Pencil, Trash2, Filter } from 'lucide-react'
import { useRoleFilter } from '@/lib/useRoleFilter'

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
  const { data: rawTasks, loading, insert, update, remove } = useTasks()
  const { data: properties } = useProperties()
  const { insertNotification } = useNotifications()
  const { toast } = useToast()
  const { query, filters } = useSearch()
  const { t } = useTranslation()
  const { filterTasks } = useRoleFilter()
  const tasks = filterTasks(rawTasks)
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingStatus, setEditingStatus] = useState<Task['status']>('todo')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  const filtered = tasks.filter(tk => {
    if (query) {
      const q = query.toLowerCase()
      if (!(tk.title.toLowerCase().includes(q) || (tk.description ?? '').toLowerCase().includes(q))) return false
    }
    if (filters.taskStatus && filters.taskStatus.length > 0 && !filters.taskStatus.includes(tk.status)) return false
    if (filters.taskPriority && filters.taskPriority.length > 0 && !filters.taskPriority.includes(tk.priority)) return false
    return true
  })

  const exportColumns: { key: string; label: string }[] = [
    { key: 'title', label: t('tasks.title') },
    { key: 'description', label: 'Description' },
    { key: 'status', label: t('common.status') },
    { key: 'priority', label: t('tasks.priority') },
    { key: 'due_date', label: t('tasks.dueDate') },
  ]

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (t: Task) => {
    setEditingId(t.id)
    setEditingStatus(t.status)
    setForm({
      title: t.title,
      description: t.description ?? '',
      property_id: t.property_id ?? '',
      priority: t.priority,
      due_date: t.due_date ?? '',
    })
    setErrors({})
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      if (editingId) {
        await update(editingId, {
          ...form,
          property_id: form.property_id || null,
          due_date: form.due_date || null,
          status: editingStatus,
        })
        toast('Task updated')
      } else {
        await insert({
          ...form,
          property_id: form.property_id || null,
          due_date: form.due_date || null,
          status: 'todo',
        })
        await insertNotification({
          user_id: null,
          type: 'task',
          title: 'New task assigned',
          message: `Task: ${form.title}${form.due_date ? ` (due ${form.due_date})` : ''}`,
          data: { title: form.title },
          related_id: null,
        }).catch(() => {})
        toast('Task created')
      }
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
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

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast('Task deleted')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setDeleteTarget(null)
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
    <div className="flex">
    <div className="flex-1 min-w-0 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">{t('tasks.title')}</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-1" /> {t('common.filter')}
          </Button>
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={exportColumns} filename={`tasks-${new Date().toISOString().split('T')[0]}`} />
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> {t('tasks.addTask')}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {columns.map(col => {
          const colTasks = filtered.filter(t => t.status === col.id)
          return (
            <div key={col.id} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground">{col.label}</p>
                <span className="text-xs font-mono text-muted-foreground">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.map(task => (
                  <Card key={task.id} className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium flex-1">{task.title}</p>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <button onClick={() => openEdit(task)} className="text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => setDeleteTarget({ id: task.id, title: task.title })} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Task' : 'New Task'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input label="Title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Prepare welcome basket" />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          {editingId && (
            <Select
              label="Status"
              value={editingStatus}
              onChange={e => setEditingStatus(e.target.value as Task['status'])}
              options={columns.map(c => ({ value: c.id, label: c.label }))}
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingId ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete task"
        message={`Delete "${deleteTarget?.title}"? This action cannot be undone.`}
      />
    </div>
    <FilterSidebar page="tasks" open={showFilters} onClose={() => setShowFilters(false)} />
    </div>
  )
}
