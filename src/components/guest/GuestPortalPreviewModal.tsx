import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SwitchField } from '@/components/ui/Switch'
import { GuestPortalPreview } from '@/components/guest/GuestPortalPreview'
import type { GuestGuide, GuestPortalSettings } from '@/lib/guestPortal'
import type { PropertyServiceItem } from '@/lib/propertyServices'

interface GuestPortalPreviewModalProps {
  open: boolean
  onClose: () => void
  propertyName: string
  propertyImageUrl?: string | null
  settings: GuestPortalSettings
  guides: GuestGuide[]
  propertyServices?: PropertyServiceItem[]
  includeDraftGuides: boolean
  onIncludeDraftGuidesChange: (value: boolean) => void
}

export function GuestPortalPreviewModal({
  open,
  onClose,
  propertyName,
  propertyImageUrl,
  settings,
  guides,
  propertyServices = [],
  includeDraftGuides,
  onIncludeDraftGuidesChange,
}: GuestPortalPreviewModalProps) {
  const openInNewTab = () => {
    const payload = {
      propertyName,
      propertyImageUrl,
      settings,
      guides,
      propertyServices,
      includeDraftGuides,
    }
    sessionStorage.setItem('guest-portal-preview', JSON.stringify(payload))
    window.open('/guest/preview', '_blank', 'noopener,noreferrer')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Aperçu du portail voyageur"
      className="max-w-4xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Prévisualisation mobile avec vos modifications en cours (même non enregistrées).
          </p>
          <Button size="sm" variant="secondary" onClick={openInNewTab}>
            <ExternalLink className="mr-1.5 h-4 w-4" />
            Ouvrir en plein écran
          </Button>
        </div>

        <SwitchField
          checked={includeDraftGuides}
          onCheckedChange={onIncludeDraftGuidesChange}
          label="Inclure les guides brouillon"
          description="Les voyageurs ne verront que les guides publiés."
        />

        <div className="mx-auto max-w-[430px]">
          <div className="rounded-[2.75rem] border-[11px] border-[#1A1614] bg-[#1A1614] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="mb-2 flex justify-center pt-1">
              <div className="h-1.5 w-[72px] rounded-full bg-[#3D3530]" />
            </div>
            <div className="overflow-hidden rounded-[2rem]">
              <GuestPortalPreview
              propertyName={propertyName}
              propertyImageUrl={propertyImageUrl}
              settings={settings}
              guides={guides}
              propertyServices={propertyServices}
              includeDraftGuides={includeDraftGuides}
            />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
