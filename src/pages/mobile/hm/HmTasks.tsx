import { useEffect, useState } from 'react'
import { useProperties, useTasks, type Task, type Property } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from '@/i18n/LanguageContext'
import { useCachedRows, useOnlineStatus, queueOp, getPendingTaskStatus, SYNC_EVENT } from '@/lib/offline'
import { Loader2, CheckCircle2, Circle, Play, ChevronRight, CloudOff } from 'lucide-react'

const NEXT_STATUS: Partial<Record<Task['status'], Task['status']>> = {
  todo: 'in_progress',
  in_progress: 'done',
  waiting: 'in_progress',
}

const NEXT_LABEL_KEY: Partial<Record<Task['status'], string>> = {
  todo: 'hm.start',
  in_progress: 'hm.finish',
  waiting: 'hm.resume',
}

type Filter = 'active' | 'done'

export function HmTasks() {
  const { data: rawProperties, loading: lProps, error: eProps } = useProperties()
  const { data: rawTasks, loading: lTasks, error: eTasks, update, refetch } = useTasks()
  const { filterProperties, filterTasks, loading: lRole } = useRoleFilter()
  const { toast } = useToast()
  const { t, language } = useTranslation()
  const online = useOnlineStatus()
  const [filter, setFilter] = useState<Filter>('active')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, setPending] = useState<Record<string, string>>(() => getPendingTaskStatus())

  const propertyRows = useCachedRows<Property>('properties', rawProperties, lProps, eProps)
  const taskRows = useCachedRows<Task>('tasks', rawTasks, lTasks, eTasks)

  useEffect(() => {
    const onSynced = () => {
      setPending(getPendingTaskStatus())
      refetch()
    }
    window.addEventListener(SYNC_EVENT, onSynced)
    return () => window.removeEventListener(SYNC_EVENT, onSynced)
  }, [refetch])

  const loading = lProps || lTasks || lRole

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const properties = filterProperties(propertyRows.rows)
  const propertyName = (id: string | null) =>
    (id && properties.find(p => p.id === id)?.name) ?? 'Property'

  const tasks = filterTasks(taskRows.rows)
    .map(t => (pending[t.id] ? { ...t, status: pending[t.id] as Task['status'] } : t))
    .filter(t => (filter === 'done' ? t.status === 'done' : t.status !== 'done'))
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))

  const advance = async (task: Task) => {
    const next = NEXT_STATUS[task.status]
    if (!next) return
    if (!online) {
      queueOp({ kind: 'task_update', id: task.id, changes: { status: next } })
      setPending(getPendingTaskStatus())
      toast(t('hm.savedOffline'))
      return
    }
    setBusyId(task.id)
    try {
      await update(task.id, { status: next })
      toast(next === 'done' ? t('hm.taskCompleted') : t('hm.taskStarted'))
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('hm.nav.tasks')}</h1>
      </div>

      {/* Filter pills */}
      <div className="px-5 flex gap-2">
        {(['active', 'done'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {f === 'active' ? t('hm.active') : t('hm.doneFilter')}
          </button>
        ))}
      </div>

      <div className="px-5 mt-4 pb-8 space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-2xl border border-gray-100">
            <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">{filter === 'done' ? t('hm.noCompletedTasks') : t('hm.noActiveTasks')}</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="flex items-start gap-3">
                {task.status === 'done' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                ) : task.status === 'in_progress' ? (
                  <Play className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {propertyName(task.property_id)}
                    {task.due_date ? ` · ${t('hm.due')} ${new Date(task.due_date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' })}` : ''}
                  </p>
                  {task.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 mt-1">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${
                    task.priority === 'high' ? 'text-red-500' : task.priority === 'medium' ? 'text-amber-500' : 'text-gray-400'
                  }`}>
                    {t(`tasks.${task.priority}`)}
                  </span>
                  {pending[task.id] && <CloudOff className="w-3.5 h-3.5 text-gray-400" />}
                </div>
              </div>
              {NEXT_STATUS[task.status] && (
                <button
                  onClick={() => advance(task)}
                  disabled={busyId === task.id}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-semibold active:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {busyId === task.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      {t(NEXT_LABEL_KEY[task.status] ?? '')}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
