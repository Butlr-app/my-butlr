import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

const CONSENT_KEY = 'butlr_cookie_consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY)
    if (!consent) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    window.dispatchEvent(new Event('butlr-consent-changed'))
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined')
    window.dispatchEvent(new Event('butlr-consent-changed'))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border p-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <p className="text-sm text-muted-foreground flex-1">
          We use cookies to improve your experience. By continuing to use this site, you agree to our{' '}
          <a href="/privacy-policy" className="text-foreground underline hover:text-foreground/80">Privacy Policy</a>.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={decline}>
            Decline
          </Button>
          <Button variant="primary" size="sm" onClick={accept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}
