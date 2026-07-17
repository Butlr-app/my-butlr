import { supabase } from './supabase'
import type {
  SignatureEnvelopeStatus,
  SignatureFieldType,
  SignatureRecipient,
} from './types'

export async function expireStaleSignatureEnvelopes() {
  return supabase.rpc('expire_stale_signature_envelopes')
}

export interface SignatureRecipientDraft {
  key: string
  name: string
  email: string
  role: SignatureRecipient['role']
  signingOrder: number
}

export interface SignatureFieldDraft {
  id: string
  recipientKey: string
  fieldType: SignatureFieldType
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  required: boolean
  label?: string
}

export const signatureStatusLabels: Record<SignatureEnvelopeStatus | 'not_started', string> = {
  not_started: 'Non démarrée',
  draft: 'Brouillon',
  sent: 'Envoyée',
  partially_signed: 'Partiellement signée',
  finalizing: 'Finalisation',
  completed: 'Terminée',
  expired: 'Expirée',
  voided: 'Annulée',
  declined: 'Refusée',
}

export const signatureFieldLabels: Record<SignatureFieldType, string> = {
  signature: 'Signature',
  initials: 'Paraphe',
  name: 'Nom',
  date: 'Date',
  checkbox: 'Case à cocher',
  text: 'Texte',
}

export function createRecipientDraft(
  values: Partial<SignatureRecipientDraft> = {},
): SignatureRecipientDraft {
  return {
    key: crypto.randomUUID(),
    name: '',
    email: '',
    role: 'guest',
    signingOrder: 1,
    ...values,
  }
}

export function createFieldDraft(options: {
  recipientKey: string
  fieldType: SignatureFieldType
  pageNumber?: number
  index?: number
}): SignatureFieldDraft {
  const index = options.index ?? 0
  const sizes: Record<SignatureFieldType, { width: number; height: number }> = {
    signature: { width: 0.28, height: 0.08 },
    initials: { width: 0.12, height: 0.06 },
    name: { width: 0.24, height: 0.045 },
    date: { width: 0.18, height: 0.045 },
    checkbox: { width: 0.04, height: 0.04 },
    text: { width: 0.24, height: 0.045 },
  }
  return {
    id: crypto.randomUUID(),
    recipientKey: options.recipientKey,
    fieldType: options.fieldType,
    pageNumber: options.pageNumber ?? 1,
    x: 0.08 + (index % 2) * 0.42,
    y: Math.min(0.82, 0.62 + Math.floor(index / 2) * 0.1),
    ...sizes[options.fieldType],
    required: true,
  }
}

export function validateEnvelopeDraft(options: {
  title: string
  sourceFileId: string
  recipients: SignatureRecipientDraft[]
  fields: SignatureFieldDraft[]
}) {
  if (!options.title.trim()) return 'Le titre est obligatoire.'
  if (!options.sourceFileId) return 'Sélectionnez le PDF à faire signer.'
  if (options.recipients.length === 0) return 'Ajoutez au moins un signataire.'
  const normalizedEmails = options.recipients.map(item => item.email.trim().toLowerCase())
  if (new Set(normalizedEmails).size !== normalizedEmails.length) {
    return 'Chaque signataire doit utiliser une adresse e-mail différente.'
  }
  if (options.recipients.some(item =>
    !item.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email.trim())
  )) {
    return 'Le nom et une adresse e-mail valide sont requis pour chaque signataire.'
  }
  if (options.fields.length === 0) return 'Placez au moins un champ sur le document.'
  const recipientKeys = new Set(options.recipients.map(item => item.key))
  if (options.fields.some(field => !recipientKeys.has(field.recipientKey))) {
    return 'Un champ est associé à un signataire supprimé.'
  }
  const withoutSignature = options.recipients.filter(recipient =>
    !options.fields.some(field =>
      field.recipientKey === recipient.key
      && ['signature', 'initials'].includes(field.fieldType)
    )
  )
  if (withoutSignature.length > 0) {
    return `Ajoutez une signature ou un paraphe pour ${withoutSignature[0].name || 'chaque signataire'}.`
  }
  return null
}

export function activeSigningOrder(
  recipients: Pick<SignatureRecipient, 'signing_order' | 'status'>[],
) {
  const pending = recipients.filter(item =>
    !['signed', 'declined', 'cancelled'].includes(item.status)
  )
  return pending.length ? Math.min(...pending.map(item => item.signing_order)) : null
}

export function envelopeProgress(
  recipients: Pick<SignatureRecipient, 'status'>[],
) {
  if (recipients.length === 0) return 0
  return Math.round(
    recipients.filter(item => item.status === 'signed').length
    / recipients.length
    * 100,
  )
}
