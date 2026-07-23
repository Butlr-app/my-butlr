import { supabase } from './supabase'
import type {
  SignatureEnvelope,
  SignatureField,
  SignatureRecipient,
} from './types'
import type {
  SignatureFieldDraft,
  SignatureRecipientDraft,
} from './signatureWorkflow'

interface CreateEnvelopeInput {
  contractId: string
  sourceFileId: string
  title: string
  message?: string
  signingOrder: 'sequential' | 'parallel'
  expiresAt: string
  recipients: SignatureRecipientDraft[]
  fields: SignatureFieldDraft[]
  sendNow: boolean
  localSignature?: {
    recipientKey: string
    signatureData: string
    initialsData: string
    consent: boolean
  }
}

export async function createSignatureEnvelope(input: CreateEnvelopeInput) {
  return invoke<{ envelopeId: string; previewLinks?: Array<{ email: string; url: string }> }>(
    'signing-envelope',
    {
      action: 'create',
      ...input,
      recipients: input.recipients.map(recipient => ({
        key: recipient.key,
        name: recipient.name,
        email: recipient.email,
        role: recipient.role,
        signingOrder: recipient.signingOrder,
      })),
      fields: input.fields.map(({ id: _id, ...field }) => field),
    },
  )
}

export async function sendSignatureEnvelope(envelopeId: string) {
  return invoke<{ success: boolean }>('signing-envelope', {
    action: 'send',
    envelopeId,
  })
}

export async function resendSignatureInvitation(
  envelopeId: string,
  recipientId: string,
) {
  return invoke<{ success: boolean }>('signing-envelope', {
    action: 'resend',
    envelopeId,
    recipientId,
  })
}

export async function voidSignatureEnvelope(envelopeId: string, reason?: string) {
  return invoke<{ success: boolean }>('signing-envelope', {
    action: 'void',
    envelopeId,
    reason,
  })
}

export async function fetchContractSignatureData(contractId: string) {
  const { data, error } = await supabase
    .from('signature_envelopes')
    .select(`
      *,
      signature_recipients(*),
      signature_fields(*),
      signature_events(*)
    `)
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false })
  return { envelopes: (data as SignatureEnvelope[] | null) ?? [], error }
}

export async function requestSignatureOtp(token: string) {
  return invokePublic<{ maskedEmail?: string; alreadySigned?: boolean }>({
    action: 'request_otp',
    token,
  })
}

export async function verifySignatureOtp(token: string, otp: string) {
  return invokePublic<{ ceremonyToken: string }>({
    action: 'verify_otp',
    token,
    otp,
  })
}

export interface SigningCeremony {
  envelope: {
    id: string
    title: string
    message: string | null
    expiresAt: string
    status: string
  }
  recipient: Pick<SignatureRecipient, 'id' | 'name' | 'email' | 'role' | 'status'>
  fields: SignatureField[]
  documentUrl: string
  completed: boolean
}

export async function loadSigningCeremony(token: string, ceremonyToken: string) {
  return invokePublic<SigningCeremony>({
    action: 'load',
    token,
    ceremonyToken,
  })
}

export async function submitSignature(options: {
  token: string
  ceremonyToken: string
  consent: boolean
  values: Array<{
    fieldId: string
    valueText?: string
    valueData?: string
  }>
}) {
  return invokePublic<{ completed: boolean; envelopeCompleted?: boolean }>({
    action: 'submit',
    ...options,
  })
}

export async function declineSignature(options: {
  token: string
  ceremonyToken: string
  reason: string
}) {
  return invokePublic<{ declined: boolean }>({
    action: 'decline',
    ...options,
  })
}

async function invokePublic<T>(body: Record<string, unknown>) {
  return invoke<T>('signing-ceremony', body)
}

async function invoke<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body })
  if (error) {
    let message = error.message
    const context = (error as { context?: Response }).context
    if (context) {
      try {
        const responseBody = await context.clone().json()
        message = responseBody?.error ?? message
      } catch {
        // Keep the Supabase error when the function did not return JSON.
      }
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data as T
}
