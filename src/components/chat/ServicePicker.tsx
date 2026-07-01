import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useServices, type Service } from '@/lib/useSupabase'
import { Loader2, Search, ConciergeBell } from 'lucide-react'

interface ServicePickerProps {
  open: boolean
  onClose: () => void
  onSelect: (service: Service) => void
}

export function ServicePicker({ open, onClose, onSelect }: ServicePickerProps) {
  const { data: services, loading } = useServices()
  const [search, setSearch] = useState('')

  const filtered = services.filter(s =>
    s.available && s.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <Modal open={open} onClose={onClose} title="Share a Service">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search services..."
            className="w-full h-9 pl-9 pr-3 bg-muted border-0 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <ConciergeBell className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No services found</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.map(svc => (
              <button
                key={svc.id}
                onClick={() => { onSelect(svc); onClose() }}
                className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-colors"
              >
                {svc.image_url ? (
                  <img src={svc.image_url} alt="" className="w-10 h-10 rounded-md object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                    <ConciergeBell className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{svc.name}</p>
                  {svc.description && (
                    <p className="text-xs text-muted-foreground truncate">{svc.description}</p>
                  )}
                </div>
                <span className="text-xs font-medium shrink-0">
                  {svc.starting_price > 0 ? `€${Number(svc.starting_price).toLocaleString()}` : 'Free'}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}
