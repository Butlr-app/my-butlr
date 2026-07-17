import { useEffect, useState } from 'react'
import {
  BookOpen,
  Check,
  Copy,
  KeyRound,
  LogOut,
  ShieldAlert,
  Wifi,
} from 'lucide-react'
import { EmergencyContactsPreview, hasEmergencyContactsPreview } from '@/components/guest/EmergencyContactsPreview'
import { GuideContentRenderer } from '@/components/guide/GuideContentRenderer'
import {
  CategoryListRow,
  GoldButton,
  MenuCardRow,
  MobileHeader,
  MobileScreen,
} from '@/components/guest/guestMobileUi'
import { guestMobile } from '@/components/guest/guestMobileStyles'
import {
  guestGuideCategoryLabels,
  type GuestGuide,
  type GuestGuideCategory,
  type GuestPortalSettings,
} from '@/lib/guestPortal'
import { guestPortalCategoryIcon } from '@/components/guest/guestPortalStyles'
import { hasRichContent } from '@/lib/guideContent'

type VillaSection = 'home' | 'wifi' | 'arrival' | 'departure' | 'rules' | 'guide' | 'help'

interface GuestVillaPanelProps {
  settings: GuestPortalSettings
  guides: GuestGuide[]
  includeDraftGuides?: boolean
  initialSection?: VillaSection
  onSectionConsumed?: () => void
}

export function GuestVillaPanel({
  settings,
  guides,
  includeDraftGuides = false,
  initialSection = 'home',
  onSectionConsumed,
}: GuestVillaPanelProps) {
  const [section, setSection] = useState<VillaSection>('home')
  const [copiedField, setCopiedField] = useState<'ssid' | 'password' | null>(null)
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>(null)

  useEffect(() => {
    if (initialSection !== 'home') {
      setSection(initialSection)
      onSectionConsumed?.()
    }
  }, [initialSection, onSectionConsumed])

  const goHome = () => setSection('home')

  const copyText = async (text: string, field: 'ssid' | 'password') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      window.setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  if (section === 'wifi' && (settings.wifi_name || settings.wifi_password)) {
    return (
      <MobileScreen>
        <MobileHeader title="Wi-Fi" onBack={goHome} />
        {settings.wifi_name && (
          <div className={`flex items-center justify-between py-4 ${guestMobile.divider}`}>
            <div>
              <p className={guestMobile.label}>Réseau</p>
              <p className={guestMobile.value}>{settings.wifi_name}</p>
            </div>
            <button
              type="button"
              onClick={() => copyText(settings.wifi_name!, 'ssid')}
              className="rounded-full p-2 active:bg-[#F2F2F7]"
              aria-label="Copier"
            >
              {copiedField === 'ssid' ? <Check className="h-5 w-5 text-[#34C759]" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
        )}
        {settings.wifi_password && (
          <div className={`flex items-center justify-between py-4 ${guestMobile.divider}`}>
            <div>
              <p className={guestMobile.label}>Mot de passe</p>
              <p className="font-mono text-[16px] font-medium">{settings.wifi_password}</p>
            </div>
            <button
              type="button"
              onClick={() => copyText(settings.wifi_password!, 'password')}
              className="rounded-full p-2 active:bg-[#F2F2F7]"
              aria-label="Copier"
            >
              {copiedField === 'password' ? <Check className="h-5 w-5 text-[#34C759]" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
        )}
      </MobileScreen>
    )
  }

  if (section === 'arrival' && hasRichContent(settings.check_in_instructions)) {
    return (
      <MobileScreen>
        <MobileHeader title="Arrivée" onBack={goHome} />
        <GuideContentRenderer content={settings.check_in_instructions!} variant="guest" />
      </MobileScreen>
    )
  }

  if (section === 'departure' && hasRichContent(settings.check_out_instructions)) {
    return (
      <MobileScreen>
        <MobileHeader title="Départ" onBack={goHome} />
        <GuideContentRenderer content={settings.check_out_instructions!} variant="guest" />
      </MobileScreen>
    )
  }

  if (section === 'rules' && hasRichContent(settings.house_rules)) {
    return (
      <MobileScreen>
        <MobileHeader title="Règlement" onBack={goHome} />
        <GuideContentRenderer content={settings.house_rules!} variant="guest" />
      </MobileScreen>
    )
  }

  if (section === 'guide') {
    const guide = guides.find(g => g.id === expandedGuideId)
    if (guide) {
      return (
        <MobileScreen>
          <MobileHeader title={guide.title} onBack={() => setExpandedGuideId(null)} />
          <GuideContentRenderer content={guide.content} variant="guest" />
        </MobileScreen>
      )
    }
  }

  if (section === 'help') {
    return (
      <MobileScreen className="flex min-h-[400px] flex-col">
        <MobileHeader title="Besoin d'aide ?" onBack={goHome} />
        {hasEmergencyContactsPreview(settings.emergency_contact) ? (
          <>
            <p className={`mb-4 ${guestMobile.body}`}>
              En cas d'urgence, contactez immédiatement votre équipe ou les services compétents.
            </p>
            <EmergencyContactsPreview content={settings.emergency_contact} variant="guest" />
          </>
        ) : (
          <p className={guestMobile.body}>
            Votre conciergerie est disponible pour toute question pendant votre séjour.
          </p>
        )}
        <div className="mt-auto pt-8">
          <GoldButton onClick={goHome}>Retour</GoldButton>
        </div>
      </MobileScreen>
    )
  }

  return (
    <MobileScreen>
      <MobileHeader title="Mon séjour" />

      {(settings.wifi_name || settings.wifi_password) && (
        <CategoryListRow
          icon={Wifi}
          title="Wi-Fi"
          subtitle={settings.wifi_name ?? 'Accès internet'}
          onClick={() => setSection('wifi')}
        />
      )}
      {hasRichContent(settings.check_in_instructions) && (
        <CategoryListRow
          icon={KeyRound}
          title="Arrivée"
          subtitle="Instructions et accès"
          onClick={() => setSection('arrival')}
        />
      )}
      {hasRichContent(settings.check_out_instructions) && (
        <CategoryListRow
          icon={LogOut}
          title="Départ"
          subtitle="Check-out et consignes"
          onClick={() => setSection('departure')}
        />
      )}
      {hasRichContent(settings.house_rules) && (
        <CategoryListRow
          icon={BookOpen}
          title="Règlement"
          subtitle="Règles de la maison"
          onClick={() => setSection('rules')}
        />
      )}

      {guides.length > 0 && (
        <>
          <p className="mb-2 mt-5 text-[13px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            Guides locaux
          </p>
          {guides.map(guide => {
            const Icon = guestPortalCategoryIcon(guide.category)
            return (
              <CategoryListRow
                key={guide.id}
                icon={Icon}
                title={guide.title}
                subtitle={
                  includeDraftGuides && !guide.published
                    ? 'Brouillon — non visible pour les voyageurs'
                    : (guestGuideCategoryLabels[guide.category as GuestGuideCategory] ?? guide.category)
                }
                onClick={() => {
                  setExpandedGuideId(guide.id)
                  setSection('guide')
                }}
              />
            )
          })}
        </>
      )}

      <div className="mt-4">
        <MenuCardRow
          icon={ShieldAlert}
          title="Urgence & contacts"
          subtitle="Assistance 24/7"
          onClick={() => setSection('help')}
        />
      </div>
    </MobileScreen>
  )
}

export type { VillaSection }
