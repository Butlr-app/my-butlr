import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ExportButton } from '@/components/ExportButton'
import { FilterSidebar } from '@/components/FilterSidebar'
import { useTasks, useProperties, useReservations, useTeamMembers, useTaskComments, useTaskTemplates, generateRecurringTasks, type Task, type TeamMember, type TaskTemplate, type Property } from '@/lib/useSupabase'
import { useToast } from '@/components/ui/Toast'
import { useSearch } from '@/lib/searchContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { Plus, Loader2, Pencil, Trash2, Filter, MessageSquare, Send, UserRound, Zap } from 'lucide-react'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useRole } from '@/lib/roleContext'
import { AiTaskSuggestions } from '@/components/ai/AiTaskSuggestions'

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
  assigned_to: '',
}

function memberLabel(m: TeamMember | undefined): string {
  if (!m) return '—'
  return m.full_name || m.email || '—'
}

function TaskComments({ task, members }: { task: Task; members: TeamMember[] }) {
  const { comments, loading, addComment } = useTaskComments(task.id)
  const { toast } = useToast()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    try {
      await addComment(body.trim())
      setBody('')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSending(false)
  }

  return (
    <div className="space-y-4">
      {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No comments yet</p>
        ) : (
          comments.map(c => (
            <div key={c.id} className="border border-border rounded-md p-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium">{memberLabel(memberMap[c.author_id])}</p>
                <p className="text-[10px] tabular-nums text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.body}</p>
            </div>
          ))
        )}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info"
          placeholder="Write a comment…"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={sending || !body.trim()}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  )
}

const emptyTemplateForm = {
  title: '',
  description: '',
  property_id: '',
  priority: 'medium' as TaskTemplate['priority'],
  trigger_type: 'checkout' as TaskTemplate['trigger_type'],
  recurrence: 'weekly' as NonNullable<TaskTemplate['recurrence']>,
  assigned_to: '',
}

function TaskAutomations({ properties, members }: { properties: Property[]; members: TeamMember[] }) {
  const { data: templates, loading, insert, update, remove } = useTaskTemplates()
  const { toast } = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyTemplateForm)
  const [saving, setSaving] = useState(false)
  const propertyMap = Object.fromEntries(properties.map(p => [p.id, p.name]))
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyTemplateForm)
    setShowForm(true)
  }

  const openEdit = (tpl: TaskTemplate) => {
    setEditingId(tpl.id)
    setForm({
      title: tpl.title,
      description: tpl.description ?? '',
      property_id: tpl.property_id ?? '',
      priority: tpl.priority,
      trigger_type: tpl.trigger_type,
      recurrence: tpl.recurrence ?? 'weekly',
      assigned_to: tpl.assigned_to ?? '',
    })
    setShowForm(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { toast('Title is required', 'error'); return }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      property_id: form.property_id || null,
      priority: form.priority,
      trigger_type: form.trigger_type,
      recurrence: form.trigger_type === 'recurring' ? form.recurrence : null,
      assigned_to: form.assigned_to || null,
    }
    try {
      if (editingId) {
        await update(editingId, payload)
        toast('Template updated')
      } else {
        await insert({ ...payload, active: true })
        toast('Template created')
      }
      setShowForm(false)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
    setSaving(false)
  }

  const toggleActive = async (tpl: TaskTemplate) => {
    try {
      await update(tpl.id, { active: !tpl.active })
      toast(tpl.active ? 'Template paused' : 'Template activated')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const deleteTemplate = async (tpl: TaskTemplate) => {
    try {
      await remove(tpl.id)
      toast('Template deleted')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const triggerLabel = (tpl: TaskTemplate) =>
    tpl.trigger_type === 'checkout' ? 'On check-out' : `Recurring (${tpl.recurrence})`

  if (showForm) {
    return (
      <form onSubmit={submit} className="space-y-4">
        <Input label="Title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Cleaning after check-out" />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Description</label>
          <textarea
            className="w-full h-16 px-3 py-2 bg-card border border-input rounded-sm text-sm focus:outline-none focus:border-info"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Trigger"
            value={form.trigger_type}
            onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value as TaskTemplate['trigger_type'] }))}
            options={[
              { value: 'checkout', label: 'On check-out' },
              { value: 'recurring', label: 'Recurring' },
            ]}
          />
          {form.trigger_type === 'recurring' ? (
            <Select
              label="Frequency"
              value={form.recurrence}
              onChange={e => setForm(f => ({ ...f, recurrence: e.target.value as NonNullable<TaskTemplate['recurrence']> }))}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
          ) : (
            <div />
          )}
        </div>
        <Select
          label="Property"
          value={form.property_id}
          onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
          options={[
            { value: '', label: 'All properties' },
            ...properties.map(p => ({ value: p.id, label: p.name })),
          ]}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Priority"
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskTemplate['priority'] }))}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
          />
          <Select
            label="Assigned to"
            value={form.assigned_to}
            onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
            options={[
              { value: '', label: 'Unassigned' },
              ...members.map(m => ({ value: m.id, label: `${memberLabel(m)} (${m.role.replace('_', ' ')})` })),
            ]}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Back</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {editingId ? 'Save changes' : 'Create template'}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Check-out templates create a task at each reservation departure. Recurring templates create one task per period.
      </p>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : templates.length === 0 ? (
          <p className="text-xs text-muted-foreground">No templates yet</p>
        ) : (
          templates.map(tpl => (
            <div key={tpl.id} className="border border-border rounded-md p-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{tpl.title}</p>
                  <Badge variant={tpl.active ? 'success' : 'muted'}>{tpl.active ? 'Active' : 'Paused'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {triggerLabel(tpl)} · {tpl.property_id ? propertyMap[tpl.property_id] ?? '—' : 'All properties'}
                  {tpl.assigned_to ? ` · ${memberLabel(memberMap[tpl.assigned_to])}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleActive(tpl)} className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground transition-colors">
                  {tpl.active ? 'Pause' : 'Activate'}
                </button>
                <button onClick={() => openEdit(tpl)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => deleteTemplate(tpl)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> New template
        </Button>
      </div>
    </div>
  )
}

export function Tasks() {
  const { data: rawTasks, loading, insert, update, remove, refetch } = useTasks()
  const { data: properties } = useProperties()
  const { data: reservations } = useReservations()
  const { toast } = useToast()
  const { query, filters } = useSearch()
  const { t } = useTranslation()
  const { filterTasks, filterReservations } = useRoleFilter()
  const { members } = useTeamMembers()
  const { actualRole } = useRole()
  const tasks = filterTasks(rawTasks)
  const [commentsTask, setCommentsTask] = useState<Task | null>(null)
  const [showAutomations, setShowAutomations] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingStatus, setEditingStatus] = useState<Task['status']>('todo')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    generateRecurringTasks()
      .then(count => { if (count > 0) refetch() })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      assigned_to: t.assigned_to ?? '',
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
          assigned_to: form.assigned_to || null,
          status: editingStatus,
        })
        toast('Task updated')
      } else {
        await insert({
          ...form,
          property_id: form.property_id || null,
          due_date: form.due_date || null,
          assigned_to: form.assigned_to || null,
          status: 'todo',
        })
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
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

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
        <p className="text-xs font-semibold tracking-tight text-muted-foreground">{t('tasks.title')}</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-1" /> {t('common.filter')}
          </Button>
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={exportColumns} filename={`tasks-${new Date().toISOString().split('T')[0]}`} />
          {actualRole === 'owner' && (
            <Button variant="secondary" size="sm" onClick={() => setShowAutomations(true)}>
              <Zap className="w-4 h-4 mr-1" /> Automation
            </Button>
          )}
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> {t('tasks.addTask')}
          </Button>
        </div>
      </div>

      {/* AI Task Suggestions */}
      <AiTaskSuggestions
        reservations={filterReservations(reservations).map(r => ({
          guest_name: r.guest_name,
          arrival: r.arrival,
          departure: r.departure,
          property_name: r.property?.name,
          status: r.status,
        }))}
        existingTasks={tasks.map(t => ({ title: t.title, status: t.status }))}
        onAccept={async (title, description) => {
          try {
            await insert({ title, description, property_id: null, priority: 'medium', due_date: null, status: 'todo' })
            toast(t('ai.tasksCreated'))
          } catch (err) {
            toast((err as Error).message, 'error')
          }
        }}
      />

      <div className="grid lg:grid-cols-4 gap-4">
        {columns.map(col => {
          const colTasks = filtered.filter(t => t.status === col.id)
          return (
            <div key={col.id} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold tracking-tight text-muted-foreground">{col.label}</p>
                <span className="text-xs tabular-nums text-muted-foreground">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.map(task => (
                  <Card key={task.id} className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium flex-1">{task.title}</p>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <button onClick={() => setCommentsTask(task)} className="text-muted-foreground hover:text-foreground transition-colors" title="Comments">
                          <MessageSquare className="w-3 h-3" />
                        </button>
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
                      <div className="flex items-center gap-1">
                        {task.template_id && (
                          <Badge variant="muted">
                            <Zap className="w-2.5 h-2.5 mr-0.5" /> Auto
                          </Badge>
                        )}
                        <Badge variant={
                          task.priority === 'high' ? 'destructive' :
                          task.priority === 'medium' ? 'warning' : 'muted'
                        }>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                    {task.assigned_to && (
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <UserRound className="w-3 h-3" /> {memberLabel(memberMap[task.assigned_to])}
                      </p>
                    )}
                    {task.due_date && (
                      <p className="text-[10px] tabular-nums text-muted-foreground mb-2">Due: {task.due_date}</p>
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
          <Select
            label="Assigned to"
            value={form.assigned_to}
            onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
            options={[
              { value: '', label: 'Unassigned' },
              ...members.map(m => ({ value: m.id, label: `${memberLabel(m)} (${m.role.replace('_', ' ')})` })),
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

      <Modal open={!!commentsTask} onClose={() => setCommentsTask(null)} title={commentsTask?.title ?? ''}>
        {commentsTask && <TaskComments task={commentsTask} members={members} />}
      </Modal>

      <Modal open={showAutomations} onClose={() => setShowAutomations(false)} title="Task automation">
        <TaskAutomations properties={properties} members={members} />
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
