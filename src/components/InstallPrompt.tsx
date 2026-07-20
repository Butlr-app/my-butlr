import { useEffect, useState } from 'react'
import { Download, X, Share } from 'lucide-react'
import { useTranslation } from '@/i18n/LanguageContext'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'butlr-install-dismissed'
const CONSENT_KEY = 'butlr_cookie_consent'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
}

export function InstallPrompt() {
  const { t } = useTranslation()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [iosHint, setIosHint] = useState(false)
  const [consentDecided, setConsentDecided] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(CONSENT_KEY) !== null
  )

  useEffect(() => {
    const onConsent = () => setConsentDecided(true)
    window.addEventListener('butlr-consent-changed', onConsent)
    return () => window.removeEventListener('butlr-consent-changed', onConsent)
  }, [])

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === 'true') return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    const onInstalled = () => setVisible(false)
    window.addEventListener('appinstalled', onInstalled)

    // iOS Safari never fires beforeinstallprompt — show manual instructions instead.
    if (isIos()) {
      setIosHint(true)
      setVisible(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, 'true')
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setVisible(false)
  }

  if (!visible || !consentDecided) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-lg shrink-0">
          b
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{t('pwa.installTitle')}</p>
          {iosHint ? (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
              {t('pwa.iosInstall')} <Share className="w-3.5 h-3.5 inline" /> {t('pwa.iosInstall2')}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">{t('pwa.installBody')}</p>
          )}
          {!iosHint && (
            <button
              onClick={install}
              className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Download className="w-3.5 h-3.5" /> {t('pwa.install')}
            </button>
          )}
        </div>
        <button onClick={dismiss} className="p-1 rounded hover:bg-muted shrink-0" aria-label={t('common.close')}>
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
