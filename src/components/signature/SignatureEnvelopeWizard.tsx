import { useEffect, useMemo, useState } from 'react'
import { FileText, Plus, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { PdfFieldEditor } from './PdfFieldEditor'
import { SignaturePad } from './SignaturePad'
import { useAuth } from '@/lib/authContext'
import { createContractFileSignedUrl } from '@/lib/contractFiles'
import { createSignatureEnvelope } from '@/lib/signatureApi'
import {
  createFieldDraft,
  createRecipientDraft,
  validateEnvelopeDraft,
  type SignatureFieldDraft,
  type SignatureRecipientDraft,
} from '@/lib/signatureWorkflow'
import type { Contract } from '@/lib/types'

interface SignatureEnvelopeWizardProps {
  open: boolean
  contract: Contract
  onClose: () => void
  onCreated: (envelopeId: string) => void
}

const steps = ['Document', 'Parties', 'Champs', 'Envoi']

export function SignatureEnvelopeWizard({
  open,
  contract,
  onClose,
  onCreated,
}: SignatureEnvelopeWizardProps) {
  const { profile, user } = useAuth()
  const [step, setStep] = useState(0)
  const [sourceFileId, setSourceFileId] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')
  const [recipients, setRecipients] = useState<SignatureRecipientDraft[]>([])
  const [fields, setFields] = useState<SignatureFieldDraft[]>([])
  const [title, setTitle] = useState(`Contrat de location — ${contract.guest_name}`)
  const [message, setMessage] = useState('Merci de consulter et signer ce contrat de location.')
  const [signingOrder, setSigningOrder] = useState<'sequential' | 'parallel'>('sequential')
  const [expiresAt, setExpiresAt] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 14)
    return date.toISOString().slice(0, 10)
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [signLocally, setSignLocally] = useState(true)
  const [ownerSignature, setOwnerSignature] = useState('')
  const [ownerInitials, setOwnerInitials] = useState('')
  const [ownerConsent, setOwnerConsent] = useState(false)

  const pdfFiles = useMemo(
    () => (contract.contract_files ?? []).filter(file => file.mime_type === 'application/pdf'),
    [contract.contract_files],
  )

  useEffect(() => {
    if (!open) return
    const initialRecipients: SignatureRecipientDraft[] = []
    if (contract.reservations?.guest_email) {
      initialRecipients.push(createRecipientDraft({
        name: contract.guest_name,
        email: contract.reservations.guest_email,
        role: 'guest',
        signingOrder: 1,
      }))
    }
    if (profile?.email || user?.email) {
      const ownerEmail = profile?.email ?? user?.email ?? ''
      if (!initialRecipients.some(item => item.email === ownerEmail)) {
        initialRecipients.push(createRecipientDraft({
          name: profile?.full_name ?? 'Propriétaire',
          email: ownerEmail,
          role: 'owner',
          signingOrder: initialRecipients.length + 1,
        }))
      }
    }
    setRecipients(initialRecipients.length ? initialRecipients : [createRecipientDraft()])
    setSourceFileId(pdfFiles.at(-1)?.id ?? '')
    setStep(0)
    setFields([])
    setError('')
    setSignLocally(true)
    setOwnerSignature('')
    setOwnerInitials('')
    setOwnerConsent(false)
  }, [
    open,
    contract.guest_name,
    contract.reservations,
    pdfFiles,
    profile?.email,
    profile?.full_name,
    user?.email,
  ])

  const ownerEmail = (profile?.email ?? user?.email ?? '').toLowerCase()
  const localOwner = recipients.find(recipient =>
    recipient.role === 'owner'
    && recipient.email.trim().toLowerCase() === ownerEmail
  )

  useEffect(() => {
    if (!sourceFileId) {
      setDocumentUrl('')
      return
    }
    const file = pdfFiles.find(item => item.id === sourceFileId)
    if (!file) return
    createContractFileSignedUrl(file.storage_path)
      .then(setDocumentUrl)
      .catch(openError => setError(openError instanceof Error ? openError.message : 'PDF inaccessible.'))
  }, [sourceFileId, pdfFiles])

  const goNext = () => {
    setError('')
    if (step === 0 && !sourceFileId) {
      setError('Sélectionnez un document PDF.')
      return
    }
    if (step === 1) {
      const invalid = recipients.some(recipient =>
        !recipient.name.trim()
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email.trim())
      )
      if (invalid) {
        setError('Renseignez un nom et une adresse e-mail valide pour chaque partie.')
        return
      }
      if (fields.length === 0) {
        setFields(recipients.flatMap((recipient, index) => [
          createFieldDraft({
            recipientKey: recipient.key,
            fieldType: 'signature',
            index: index * 2,
          }),
          createFieldDraft({
            recipientKey: recipient.key,
            fieldType: 'initials',
            index: index * 2 + 1,
          }),
        ]))
      }
    }
    setStep(current => Math.min(steps.length - 1, current + 1))
  }

  const handleCreate = async (sendNow: boolean) => {
    const validationError = validateEnvelopeDraft({
      title,
      sourceFileId,
      recipients,
      fields,
    })
    if (validationError) {
      setError(validationError)
      return
    }
    if (signLocally && localOwner && (!ownerSignature || !ownerInitials || !ownerConsent)) {
      setError('Ajoutez votre signature, votre paraphe et confirmez votre consentement.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await createSignatureEnvelope({
        contractId: contract.id,
        sourceFileId,
        title,
        message,
        signingOrder,
        expiresAt: new Date(`${expiresAt}T23:59:59`).toISOString(),
        recipients,
        fields,
        sendNow,
        localSignature: signLocally && localOwner ? {
          recipientKey: localOwner.key,
          signatureData: ownerSignature,
          initialsData: ownerInitials,
          consent: ownerConsent,
        } : undefined,
      })
      onCreated(result.envelopeId)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Création impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      title="Envoyer en signature"
      className="max-w-6xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-4 overflow-hidden rounded-md border border-border">
          {steps.map((label, index) => (
            <div
              key={label}
              className={`px-2 py-3 text-center text-xs font-medium sm:text-sm ${
                index === step ? 'bg-foreground text-background' : 'bg-card text-muted-foreground'
              }`}
            >
              {index + 1}. {label}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Document à signer</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Le PDF sera verrouillé par son empreinte SHA-256 dès la création.
              </p>
            </div>
            {pdfFiles.length === 0 ? (
              <div className="rounded-md border border-warning/30 bg-warning-soft p-4 text-sm">
                Générez ou importez d’abord un contrat PDF.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {pdfFiles.map(file => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setSourceFileId(file.id)}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 text-left ${
                      sourceFileId === file.id ? 'border-foreground bg-muted' : 'border-border'
                    }`}
                  >
                    <FileText className="h-5 w-5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{file.file_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {file.file_role === 'signed_final' ? 'Document signé' : 'Document source'}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Parties signataires</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les parties distantes recevront un lien privé puis un code OTP séparé.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRecipients(current => [
                  ...current,
                  createRecipientDraft({ signingOrder: current.length + 1 }),
                ])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>
            {recipients.map((recipient, index) => (
              <div key={recipient.key} className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-[1fr_1fr_160px_100px_auto]">
                <Input label="Nom" value={recipient.name} onChange={event => setRecipients(current => current.map(item => item.key === recipient.key ? { ...item, name: event.target.value } : item))} />
                <Input label="E-mail" type="email" value={recipient.email} onChange={event => setRecipients(current => current.map(item => item.key === recipient.key ? { ...item, email: event.target.value } : item))} />
                <Select label="Rôle" value={recipient.role} onChange={event => setRecipients(current => current.map(item => item.key === recipient.key ? { ...item, role: event.target.value as SignatureRecipientDraft['role'] } : item))} options={[
                  { value: 'guest', label: 'Locataire' },
                  { value: 'owner', label: 'Bailleur' },
                  { value: 'concierge', label: 'Conciergerie' },
                  { value: 'agency', label: 'Agence' },
                  { value: 'witness', label: 'Témoin' },
                  { value: 'other', label: 'Autre' },
                ]} />
                <Input label="Ordre" type="number" min="1" value={recipient.signingOrder} onChange={event => setRecipients(current => current.map(item => item.key === recipient.key ? { ...item, signingOrder: Number(event.target.value) || 1 } : item))} />
                <button
                  type="button"
                  aria-label={`Supprimer la partie ${index + 1}`}
                  disabled={recipients.length === 1}
                  onClick={() => {
                    setRecipients(current => current.filter(item => item.key !== recipient.key))
                    setFields(current => current.filter(field => field.recipientKey !== recipient.key))
                  }}
                  className="mt-6 flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          documentUrl
            ? <PdfFieldEditor documentUrl={documentUrl} recipients={recipients} fields={fields} onChange={setFields} />
            : <p className="p-8 text-center text-sm text-muted-foreground">Chargement du document…</p>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Objet de la demande" value={title} onChange={event => setTitle(event.target.value)} />
              <DateInput label="Expiration" value={expiresAt} onChange={setExpiresAt} min={new Date().toISOString().slice(0, 10)} />
              <Select label="Ordre des signatures" value={signingOrder} onChange={event => setSigningOrder(event.target.value as 'sequential' | 'parallel')} options={[
                { value: 'sequential', label: 'Séquentiel, dans l’ordre défini' },
                { value: 'parallel', label: 'Toutes les parties en parallèle' },
              ]} />
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Résumé</p>
                <p className="mt-1 text-sm font-medium">
                  {recipients.length} partie{recipients.length > 1 ? 's' : ''} · {fields.length} champ{fields.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Message d’accompagnement</label>
              <textarea
                rows={4}
                value={message}
                onChange={event => setMessage(event.target.value)}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {localOwner && (
              <div className="space-y-4 rounded-md border border-border p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={signLocally}
                    onChange={event => setSignLocally(event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block text-sm font-medium">Signer en tant que propriétaire maintenant</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Votre signature est enregistrée directement, sans invitation ni OTP envoyé à votre adresse.
                    </span>
                  </span>
                </label>
                {signLocally && (
                  <div className="grid gap-5 border-t border-border pt-4 lg:grid-cols-2">
                    <SignaturePad label="Signature du propriétaire" value={ownerSignature} onChange={setOwnerSignature} />
                    <SignaturePad label="Paraphe du propriétaire" value={ownerInitials} onChange={setOwnerInitials} />
                    <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed lg:col-span-2">
                      <input
                        type="checkbox"
                        checked={ownerConsent}
                        onChange={event => setOwnerConsent(event.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0"
                      />
                      Je confirme avoir lu le document et consens à le signer électroniquement
                      en tant que propriétaire authentifié.
                    </label>
                  </div>
                )}
              </div>
            )}
            <div className="rounded-md border border-info/30 bg-info-soft p-4 text-sm">
              Le document sera figé. Toute modification ultérieure invalidera la procédure de signature.
            </div>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
          <Button variant="secondary" onClick={step === 0 ? onClose : () => setStep(current => current - 1)} disabled={saving}>
            {step === 0 ? 'Annuler' : 'Retour'}
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={goNext} disabled={step === 0 && pdfFiles.length === 0}>
              Continuer
            </Button>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={() => handleCreate(false)} disabled={saving}>
                {signLocally && localOwner ? 'Signer sans envoyer' : 'Enregistrer en brouillon'}
              </Button>
              <Button onClick={() => handleCreate(true)} disabled={saving}>
                <Send className="mr-2 h-4 w-4" />
                {saving ? 'Envoi…' : 'Envoyer en signature'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
