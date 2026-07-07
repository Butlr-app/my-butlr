import { useState } from 'react'
import { useProperties, useTasks, type Task } from '@/lib/useSupabase'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useToast } from '@/components/ui/Toast'
import { Loader2, CheckCircle2, Circle, Play, ChevronRight } from 'lucide-react'

const NEXT_STATUS: Partial<Record<Task['status'], Task['status']>> = {
  todo: 'in_progress',
  in_progress: 'done',
  waiting: 'in_progress',
}

const NEXT_LABEL: Partial<Record<Task['status'], string>> = {
  todo: 'Start',
  in_progress: 'Finish',
  waiting: 'Resume',
}

type Filter = 'active' | 'done'

export function HmTasks() {
  const { data: rawProperties, loading: lProps } = useProperties()
  const { data: rawTasks, loading: lTasks, update } = useTasks()
  const { filterProperties, filterTasks, loading: lRole } = useRoleFilter()
  const { toast } = useToast()
  const [filter, setFilter] = useState<Filter>('active')
  const [busyId, setBusyId] = useState<string | null>(null)

  const loading = lProps || lTasks || lRole

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const properties = filterProperties(rawProperties)
  const propertyName = (id: string | null) =>
    (id && properties.find(p => p.id === id)?.name) ?? 'Property'

  const tasks = filterTasks(rawTasks)
    .filter(t => (filter === 'done' ? t.status === 'done' : t.status !== 'done'))
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))

  const advance = async (t: Task) => {
    const next = NEXT_STATUS[t.status]
    if (!next) return
    setBusyId(t.id)
    try {
      await update(t.id, { status: next })
      toast(next === 'done' ? 'Task completed' : 'Task started')
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tasks</h1>
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
            {f === 'active' ? 'Active' : 'Done'}
          </button>
        ))}
      </div>

      <div className="px-5 mt-4 pb-8 space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-2xl border border-gray-100">
            <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">{filter === 'done' ? 'No completed tasks' : 'No active tasks'}</p>
          </div>
        ) : (
          tasks.map(t => (
            <div key={t.id} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="flex items-start gap-3">
                {t.status === 'done' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                ) : t.status === 'in_progress' ? (
                  <Play className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{t.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {propertyName(t.property_id)}
                    {t.due_date ? ` · due ${new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                  </p>
                  {t.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{t.description}</p>}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${
                  t.priority === 'high' ? 'text-red-500' : t.priority === 'medium' ? 'text-amber-500' : 'text-gray-400'
                }`}>
                  {t.priority}
                </span>
              </div>
              {NEXT_STATUS[t.status] && (
                <button
                  onClick={() => advance(t)}
                  disabled={busyId === t.id}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-semibold active:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {busyId === t.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      {NEXT_LABEL[t.status]}
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
