import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, FileCheck2, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { SignaturePad } from '@/components/signature/SignaturePad'
import {
  declineSignature,
  loadSigningCeremony,
  requestSignatureOtp,
  submitSignature,
  verifySignatureOtp,
  type SigningCeremony,
} from '@/lib/signatureApi'
import { signatureFieldLabels } from '@/lib/signatureWorkflow'

type Stage = 'intro' | 'otp' | 'sign' | 'done' | 'declined'

export function SignContract() {
  const { token = '' } = useParams()
  const [stage, setStage] = useState<Stage>('intro')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [ceremonyToken, setCeremonyToken] = useState('')
  const [ceremony, setCeremony] = useState<SigningCeremony | null>(null)
  const [values, setValues] = useState<Record<string, { valueText?: string; valueData?: string }>>({})
  const [documentRead, setDocumentRead] = useState(false)
  const [consent, setConsent] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [showDecline, setShowDecline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ceremony) return
    setValues(current => {
      const next = { ...current }
      ceremony.fields.forEach(field => {
        if (field.field_type === 'name') next[field.id] = { valueText: ceremony.recipient.name }
        if (field.field_type === 'date') next[field.id] = { valueText: new Date().toLocaleDateString('fr-FR') }
      })
      return next
    })
  }, [ceremony])

  const requestCode = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await requestSignatureOtp(token)
      if (result.alreadySigned) {
        setStage('done')
      } else {
        setMaskedEmail(result.maskedEmail ?? '')
        setStage('otp')
      }
    } catch (requestError) {
      setError(message(requestError))
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async () => {
    setBusy(true)
    setError('')
    try {
      const verified = await verifySignatureOtp(token, otp)
      setCeremonyToken(verified.ceremonyToken)
      const loaded = await loadSigningCeremony(token, verified.ceremonyToken)
      setCeremony(loaded)
      setStage(loaded.completed ? 'done' : 'sign')
    } catch (verifyError) {
      setError(message(verifyError))
    } finally {
      setBusy(false)
    }
  }

  const sign = async () => {
    if (!documentRead || !consent) {
      setError('Confirmez la lecture du document et votre consentement.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await submitSignature({
        token,
        ceremonyToken,
        consent,
        values: Object.entries(values).map(([fieldId, value]) => ({ fieldId, ...value })),
      })
      setStage('done')
    } catch (signError) {
      setError(message(signError))
    } finally {
      setBusy(false)
    }
  }

  const decline = async () => {
    setBusy(true)
    setError('')
    try {
      await declineSignature({ token, ceremonyToken, reason: declineReason })
      setStage('declined')
    } catch (declineError) {
      setError(message(declineError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 text-foreground sm:py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-[.16em] text-muted-foreground">My Butlr Sign</p>
            <h1 className="mt-1 text-xl font-bold">Signature électronique sécurisée</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-4 w-4" />
            Document privé
          </div>
        </header>

        {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

        {stage === 'intro' && (
          <Card className="mx-auto max-w-xl p-8 text-center">
            <ShieldCheck className="mx-auto h-10 w-10" />
            <h2 className="mt-4 text-xl font-semibold">Vérifiez votre identité</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Un code à usage unique sera envoyé à l’adresse désignée par l’expéditeur.
              Ce code est valable 10 minutes.
            </p>
            <Button className="mt-6 w-full" onClick={requestCode} disabled={busy}>
              {busy ? 'Envoi…' : 'Recevoir mon code'}
            </Button>
          </Card>
        )}

        {stage === 'otp' && (
          <Card className="mx-auto max-w-xl p-8">
            <h2 className="text-xl font-semibold">Code de vérification</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Saisissez le code envoyé à {maskedEmail}.
            </p>
            <div className="mt-6 space-y-4">
              <Input
                label="Code à 6 chiffres"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <Button className="w-full" onClick={verifyCode} disabled={busy || otp.length !== 6}>
                {busy ? 'Vérification…' : 'Continuer'}
              </Button>
              <button type="button" onClick={requestCode} className="w-full cursor-pointer text-sm text-muted-foreground underline">
                Renvoyer un code
              </button>
            </div>
          </Card>
        )}

        {stage === 'sign' && ceremony && (
          <>
            <Card className="p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{ceremony.envelope.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Signataire : {ceremony.recipient.name} · {ceremony.recipient.email}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expire le {new Date(ceremony.envelope.expiresAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {ceremony.envelope.message && <p className="mt-4 rounded-md bg-muted p-3 text-sm">{ceremony.envelope.message}</p>}
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-border p-4">
                <h2 className="font-semibold">1. Consultez le document</h2>
              </div>
              <iframe
                title="Document à signer"
                src={ceremony.documentUrl}
                className="h-[65vh] min-h-[480px] w-full bg-white"
              />
              <label className="flex cursor-pointer items-start gap-3 border-t border-border p-4 text-sm">
                <input type="checkbox" checked={documentRead} onChange={event => setDocumentRead(event.target.checked)} className="mt-0.5 h-4 w-4" />
                J’ai lu l’intégralité du document présenté ci-dessus.
              </label>
            </Card>

            <Card className="space-y-6 p-5">
              <div>
                <h2 className="font-semibold">2. Complétez vos champs</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les valeurs seront apposées aux emplacements définis dans le PDF final.
                </p>
              </div>
              {ceremony.fields.map(field => (
                <div key={field.id} className="rounded-md border border-border p-4">
                  {['signature', 'initials'].includes(field.field_type) ? (
                    <SignaturePad
                      label={field.label || signatureFieldLabels[field.field_type]}
                      value={values[field.id]?.valueData}
                      onChange={valueData => setValues(current => ({
                        ...current,
                        [field.id]: { valueData },
                      }))}
                    />
                  ) : field.field_type === 'checkbox' ? (
                    <label className="flex cursor-pointer items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={values[field.id]?.valueText === 'true'}
                        onChange={event => setValues(current => ({
                          ...current,
                          [field.id]: { valueText: String(event.target.checked) },
                        }))}
                      />
                      {field.label || 'J’accepte'}
                    </label>
                  ) : (
                    <Input
                      label={field.label || signatureFieldLabels[field.field_type]}
                      value={values[field.id]?.valueText ?? ''}
                      readOnly={field.field_type === 'name' || field.field_type === 'date'}
                      onChange={event => setValues(current => ({
                        ...current,
                        [field.id]: { valueText: event.target.value },
                      }))}
                    />
                  )}
                </div>
              ))}
            </Card>

            <Card className="space-y-4 p-5">
              <h2 className="font-semibold">3. Confirmez et signez</h2>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
                Je reconnais avoir lu le document, j’accepte son contenu et je consens à utiliser
                une signature électronique. Je comprends que mon code OTP, l’horodatage,
                l’empreinte du document et les données techniques seront conservés dans la piste d’audit.
              </label>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button variant="secondary" onClick={() => setShowDecline(value => !value)}>Refuser de signer</Button>
                <Button onClick={sign} disabled={busy || !documentRead || !consent}>
                  <FileCheck2 className="mr-2 h-4 w-4" />
                  {busy ? 'Finalisation…' : 'Signer le document'}
                </Button>
              </div>
              {showDecline && (
                <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
                  <label className="block text-sm font-medium">Motif du refus</label>
                  <textarea value={declineReason} onChange={event => setDeclineReason(event.target.value)} rows={3} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" />
                  <Button variant="secondary" onClick={decline} disabled={busy || declineReason.trim().length < 3}>Confirmer le refus</Button>
                </div>
              )}
            </Card>
          </>
        )}

        {stage === 'done' && (
          <Card className="mx-auto max-w-xl p-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-4 text-xl font-semibold">Signature enregistrée</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Vous recevrez le document final lorsque toutes les parties auront signé.
            </p>
          </Card>
        )}

        {stage === 'declined' && (
          <Card className="mx-auto max-w-xl p-10 text-center">
            <h2 className="text-xl font-semibold">Signature refusée</h2>
            <p className="mt-2 text-sm text-muted-foreground">L’expéditeur a été informé de votre décision.</p>
          </Card>
        )}

        <footer className="text-center text-xs text-muted-foreground">
          Signature électronique simple avec vérification e-mail OTP et piste d’audit.
        </footer>
      </div>
    </main>
  )
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue.'
}
