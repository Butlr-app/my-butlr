import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  Mail,
  RotateCw,
  Send,
  ShieldCheck,
  XCircle,
  CalendarDays,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, LoadingState } from '@/components/EmptyState'
import { SignatureEnvelopeWizard } from '@/components/signature/SignatureEnvelopeWizard'
import { useAuth } from '@/lib/authContext'
import { createContractFileSignedUrl } from '@/lib/contractFiles'
import { formatDateForDisplay } from '@/lib/dateFormat'
import {
  fetchContractSignatureData,
  resendSignatureInvitation,
  sendSignatureEnvelope,
  voidSignatureEnvelope,
} from '@/lib/signatureApi'
import {
  envelopeProgress,
  signatureStatusLabels,
} from '@/lib/signatureWorkflow'
import { useReservationDetail } from '@/lib/reservationDetailContext'
import { supabase } from '@/lib/supabase'
import type {
  Contract,
  SignatureEnvelope,
  SignatureRecipient,
} from '@/lib/types'

const recipientStatusLabels: Record<SignatureRecipient['status'], string> = {
  pending: 'En attente',
  invited: 'Invitation envoyée',
  otp_verified: 'Identité vérifiée',
  signed: 'Signé',
  declined: 'Refusé',
  expired: 'Expiré',
  cancelled: 'Annulé',
}

export function ContractDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()
  const { openReservation } = useReservationDetail()
  const [loading, setLoading] = useState(true)
  const [contract, setContract] = useState<Contract | null>(null)
  const [envelopes, setEnvelopes] = useState<SignatureEnvelope[]>([])
  const [wizardOpen, setWizardOpen] = useState(searchParams.get('signature') === '1')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    const [{ data, error: contractError }, signatureResult] = await Promise.all([
      supabase
        .from('contracts')
        .select('*, contract_files(*), reservations(guest_name,guest_email,property_id)')
        .eq('id', id)
        .single(),
      fetchContractSignatureData(id),
    ])
    setContract(data as Contract | null)
    setEnvelopes(signatureResult.envelopes)
    setError(contractError?.message ?? signatureResult.error?.message ?? '')
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const action = async (key: string, callback: () => Promise<unknown>, success: string) => {
    setBusy(key)
    setError('')
    try {
      await callback()
      setNotice(success)
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Action impossible.')
    } finally {
      setBusy('')
    }
  }

  const openFile = async (storagePath: string) => {
    await action(storagePath, async () => {
      const url = await createContractFileSignedUrl(storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    }, '')
  }

  if (loading) return <LoadingState />
  if (!contract) {
    return <EmptyState title="Contrat introuvable" description="Ce contrat n’existe pas ou vous n’y avez pas accès." />
  }

  const activeEnvelope = envelopes[0]

  return (
    <div className="space-y-6">
      <Link to="/app/contracts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Contrats
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-[.14em] text-muted-foreground">Contrat de location</p>
          <h1 className="mt-1 text-2xl font-bold">{contract.guest_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{contract.property_name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={contract.status === 'signed' ? 'success' : contract.status === 'sent' ? 'info' : 'muted'}>
            {contract.status}
          </Badge>
          <Button onClick={() => setWizardOpen(true)} disabled={!contract.contract_files?.some(file => file.mime_type === 'application/pdf')}>
            <Send className="mr-2 h-4 w-4" />
            Nouvelle demande
          </Button>
          {contract.reservation_id && (
            <Button variant="secondary" onClick={() => openReservation(contract.reservation_id!)}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Réservation
            </Button>
          )}
        </div>
      </div>

      {(error || notice) && (
        <p role={error ? 'alert' : 'status'} className={error ? 'text-sm text-destructive' : 'text-sm text-success'}>
          {error || notice}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Signature</p>
          <p className="mt-2 text-lg font-semibold">
            {signatureStatusLabels[contract.signing_status ?? 'not_started']}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Progression</p>
          <p className="mt-2 text-lg font-semibold">
            {activeEnvelope ? `${envelopeProgress(activeEnvelope.signature_recipients ?? [])}%` : '—'}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Expiration</p>
          <p className="mt-2 text-lg font-semibold">
            {activeEnvelope ? formatDateForDisplay(activeEnvelope.expires_at, profile?.date_format) : '—'}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Documents privés</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sources, instantanés et versions signées.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(contract.contract_files ?? []).map(file => (
            <button
              key={file.id}
              type="button"
              onClick={() => openFile(file.storage_path)}
              disabled={busy === file.storage_path}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border p-3 text-left hover:bg-muted"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{file.file_name}</span>
                <span className="text-xs text-muted-foreground">
                  {file.file_role === 'signed_final' ? 'Version finale signée' : file.file_role === 'signing_snapshot' ? 'Document verrouillé' : 'Source'}
                </span>
              </span>
              <Download className="h-4 w-4 shrink-0" />
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        {envelopes.map(envelope => (
          <Card key={envelope.id} className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{envelope.title}</h2>
                  <Badge variant={envelope.status === 'completed' ? 'success' : envelope.status === 'declined' ? 'destructive' : 'info'}>
                    {signatureStatusLabels[envelope.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Créée le {formatDateForDisplay(envelope.created_at, profile?.date_format)}
                  {' · '}
                  {envelope.signing_order === 'parallel' ? 'En parallèle' : 'Ordre séquentiel'}
                </p>
              </div>
              <div className="flex gap-2">
                {envelope.status === 'draft' && (
                  <Button size="sm" onClick={() => action(`send-${envelope.id}`, () => sendSignatureEnvelope(envelope.id), 'Invitations envoyées.')} disabled={busy === `send-${envelope.id}`}>
                    <Send className="mr-2 h-4 w-4" />
                    Envoyer
                  </Button>
                )}
                {!['completed', 'voided', 'expired'].includes(envelope.status) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Annuler cette demande de signature ?')) {
                        action(`void-${envelope.id}`, () => voidSignatureEnvelope(envelope.id), 'Demande annulée.')
                      }
                    }}
                    disabled={busy === `void-${envelope.id}`}
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Parties</p>
                {(envelope.signature_recipients ?? []).map(recipient => (
                  <div key={recipient.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {recipient.status === 'signed'
                        ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                        : recipient.status === 'declined'
                          ? <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                          : <Clock3 className="h-5 w-5 shrink-0 text-muted-foreground" />}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{recipient.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{recipient.email} · {recipientStatusLabels[recipient.status]}</p>
                      </div>
                    </div>
                    {!['signed', 'declined', 'cancelled'].includes(recipient.status) && envelope.status !== 'draft' && (
                      <button
                        type="button"
                        onClick={() => action(`resend-${recipient.id}`, () => resendSignatureInvitation(envelope.id, recipient.id), `Invitation renvoyée à ${recipient.email}.`)}
                        aria-label={`Renvoyer à ${recipient.email}`}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Piste d’audit</p>
                <div className="max-h-72 space-y-3 overflow-y-auto">
                  {(envelope.signature_events ?? []).map(event => (
                    <div key={event.id} className="flex gap-3 text-sm">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{eventLabel(event.event_type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.actor_email ? `${event.actor_email} · ` : ''}
                          {new Date(event.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(envelope.signature_events?.length ?? 0) === 0 && (
                    <p className="text-sm text-muted-foreground">Aucun événement.</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {envelopes.length === 0 && (
          <Card className="p-10 text-center">
            <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">Aucune demande de signature</p>
            <p className="mt-1 text-sm text-muted-foreground">Préparez les parties et placez leurs champs sur le PDF.</p>
          </Card>
        )}
      </div>

      <SignatureEnvelopeWizard
        open={wizardOpen}
        contract={contract}
        onClose={() => setWizardOpen(false)}
        onCreated={() => {
          setWizardOpen(false)
          setNotice('Demande de signature créée.')
          load()
        }}
      />
    </div>
  )
}

function eventLabel(eventType: string) {
  const labels: Record<string, string> = {
    envelope_created: 'Demande créée',
    invitation_sent: 'Invitation envoyée',
    invitation_failed: 'Échec de l’invitation',
    document_viewed: 'Document consulté',
    otp_sent: 'Code OTP envoyé',
    otp_failed: 'Code OTP incorrect',
    otp_verified: 'Identité vérifiée',
    consent_accepted: 'Consentement accepté',
    recipient_signed: 'Document signé',
    recipient_declined: 'Signature refusée',
    envelope_partially_signed: 'Signature partielle',
    envelope_completed: 'Document finalisé',
    envelope_voided: 'Demande annulée',
    hash_mismatch: 'Intégrité du document compromise',
    finalization_failed: 'Échec de la finalisation',
  }
  return labels[eventType] ?? eventType
}
