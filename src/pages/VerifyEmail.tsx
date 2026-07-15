import { Link, useLocation, Navigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/authContext'
import { useState } from 'react'

export function VerifyEmail() {
  const location = useLocation()
  const { resendVerificationEmail } = useAuth()
  const email = (location.state as { email?: string } | null)?.email ?? ''

  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [resendError, setResendError] = useState('')

  if (!email) {
    return <Navigate to="/signup" replace />
  }

  const handleResend = async () => {
    setResendStatus('loading')
    setResendError('')

    const { error } = await resendVerificationEmail(email)

    if (error) {
      setResendStatus('error')
      setResendError(error.message)
    } else {
      setResendStatus('sent')
    }
  }

  return (
    <div className="bg-background text-foreground min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-full bg-info-soft flex items-center justify-center mx-auto mb-6">
          <Mail className="w-6 h-6 text-info" />
        </div>

        <span className="text-xl font-bold tracking-tight">butlr</span>
        <h1 className="text-lg font-semibold mt-4 mb-2">Verify your email</h1>
        <p className="text-sm text-muted-foreground mb-1">
          We sent a confirmation link to
        </p>
        <p className="text-sm font-medium mb-6">{email}</p>

        <div className="rounded-lg border border-border bg-card p-4 text-left mb-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            Open the email and click the link to activate your account.
          </p>
          <p className="text-xs text-muted-foreground">
            Check your spam folder if you don't see it within a few minutes.
          </p>
        </div>

        {resendStatus === 'sent' && (
          <p className="text-xs text-success mb-4">Verification email sent again.</p>
        )}
        {resendStatus === 'error' && resendError && (
          <p className="text-xs text-destructive mb-4">{resendError}</p>
        )}

        <Button
          type="button"
          size="md"
          variant="secondary"
          className="w-full"
          disabled={resendStatus === 'loading' || resendStatus === 'sent'}
          onClick={handleResend}
        >
          {resendStatus === 'loading'
            ? 'Sending...'
            : resendStatus === 'sent'
              ? 'Email sent'
              : 'Resend verification email'}
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Wrong address?{' '}
          <Link to="/signup" className="text-foreground hover:underline">
            Create a new account
          </Link>
        </p>

        <p className="text-center text-sm text-muted-foreground mt-3">
          Already verified?{' '}
          <Link to="/login" className="text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
