import { useEffect, useState } from 'react'
import { GuestPortalPreview } from '@/components/guest/GuestPortalPreview'
import type { GuestGuide, GuestPortalSettings } from '@/lib/guestPortal'
import type { PropertyServiceItem } from '@/lib/propertyServices'

interface PreviewPayload {
  propertyName: string
  propertyImageUrl?: string | null
  settings: GuestPortalSettings
  guides: GuestGuide[]
  propertyServices?: PropertyServiceItem[]
  includeDraftGuides?: boolean
}

export function GuestPortalPreviewPage() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('guest-portal-preview')
    if (!raw) return
    try {
      setPayload(JSON.parse(raw) as PreviewPayload)
    } catch {
      setPayload(null)
    }
  }, [])

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1614] px-6 text-center">
        <div className="max-w-sm">
          <p className="font-['Cormorant_Garamond',Georgia,serif] text-2xl font-semibold text-white">
            Aperçu indisponible
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Ouvrez l’aperçu depuis la configuration du portail voyageur.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1A1614]">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col">
        <div className="flex shrink-0 items-center justify-center px-4 py-3">
          <span className="rounded-full bg-white/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            Aperçu voyageur
          </span>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden rounded-t-[2rem] shadow-[0_-8px_40px_rgba(0,0,0,0.4)]">
          <GuestPortalPreview
            propertyName={payload.propertyName}
            propertyImageUrl={payload.propertyImageUrl}
            settings={payload.settings}
            guides={payload.guides}
            propertyServices={payload.propertyServices ?? []}
            includeDraftGuides={payload.includeDraftGuides ?? false}
          />
        </div>
      </div>
    </div>
  )
}
