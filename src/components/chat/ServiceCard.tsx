import { ConciergeBell, Sparkles } from 'lucide-react'
import type { ServiceMessageMeta } from '@/lib/useSupabase'

interface ServiceCardProps {
  meta: ServiceMessageMeta
  isMe: boolean
}

export function ServiceCard({ meta, isMe }: ServiceCardProps) {
  return (
    <div className={`w-56 rounded-xl overflow-hidden bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 ${
      isMe ? 'ring-1 ring-white/25' : 'ring-1 ring-slate-200 dark:ring-slate-700'
    }`}>
      {meta.image_url ? (
        <div className="relative">
          <img src={meta.image_url} alt={meta.service_name} className="w-full h-32 object-cover" />
          <span className="absolute top-2 left-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
            <Sparkles className="w-2.5 h-2.5" /> Service
          </span>
        </div>
      ) : (
        <div className="w-full h-24 flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40">
          <ConciergeBell className="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>
      )}
      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold leading-snug">{meta.service_name}</p>
        {meta.description && (
          <p className="text-xs line-clamp-2 text-slate-500 dark:text-slate-400">
            {meta.description}
          </p>
        )}
        {meta.price != null && meta.price > 0 && (
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            From &euro;{Number(meta.price).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}
