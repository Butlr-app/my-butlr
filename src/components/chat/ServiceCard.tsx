import { ConciergeBell } from 'lucide-react'
import type { ServiceMessageMeta } from '@/lib/useSupabase'

interface ServiceCardProps {
  meta: ServiceMessageMeta
  isMe: boolean
}

export function ServiceCard({ meta, isMe }: ServiceCardProps) {
  return (
    <div className={`rounded-lg overflow-hidden border ${
      isMe ? 'border-background/20' : 'border-border'
    }`}>
      {meta.image_url ? (
        <img src={meta.image_url} alt={meta.service_name} className="w-full h-28 object-cover" />
      ) : (
        <div className={`w-full h-20 flex items-center justify-center ${
          isMe ? 'bg-background/10' : 'bg-muted'
        }`}>
          <ConciergeBell className={`w-6 h-6 ${isMe ? 'text-background/40' : 'text-muted-foreground'}`} />
        </div>
      )}
      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold">{meta.service_name}</p>
        {meta.description && (
          <p className={`text-xs line-clamp-2 ${isMe ? 'text-background/70' : 'text-muted-foreground'}`}>
            {meta.description}
          </p>
        )}
        {meta.price != null && meta.price > 0 && (
          <p className="text-xs font-medium">
            From &euro;{Number(meta.price).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}
