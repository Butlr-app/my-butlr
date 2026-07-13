// deno-lint-ignore-file no-explicit-any
import {
  assertPropertyAccess,
  createCeremonyToken,
  corsHeaders,
  getAdminClient,
  getAuthenticatedUser,
  invitationEmail,
  jsonResponse,
  randomToken,
  requiredEnv,
  sendEmail,
  sha256,
} from '../_shared/signing.ts'

interface RecipientInput {
  key: string
  name: string
  email: string
  role: string
  signingOrder: number
}

interface FieldInput {
  recipientKey: string
  fieldType: string
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  required?: boolean
  label?: string
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return jsonResponse({ error: 'Session invalide.' }, 401)
    const body = await req.json()
    const admin = getAdminClient()

    if (body.action === 'create') {
      return await createEnvelope(admin, user, body)
    }
    if (body.action === 'send' || body.action === 'resend') {
      return await sendEnvelope(admin, user, body)
    }
    if (body.action === 'void') {
      return await voidEnvelope(admin, user, body)
    }
    return jsonResponse({ error: 'Action inconnue.' }, 400)
  } catch (error) {
    console.error('signing-envelope', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Erreur de signature.',
    }, 400)
  }
})

async function createEnvelope(admin: any, user: any, body: any) {
  const recipients = body.recipients as RecipientInput[]
  const fields = body.fields as FieldInput[]
  if (!body.contractId || !body.sourceFileId || !body.title?.trim()) {
    throw new Error('Contrat, document et titre sont obligatoires.')
  }
  if (!Array.isArray(recipients) || recipients.length < 1 || recipients.length > 10) {
    throw new Error('Ajoutez entre 1 et 10 signataires.')
  }
  if (!Array.isArray(fields) || fields.length < 1 || fields.length > 200) {
    throw new Error('Placez au moins un champ de signature ou de paraphe.')
  }
  const recipientKeys = new Set(recipients.map(recipient => recipient.key))
  if (recipientKeys.size !== recipients.length || fields.some(field => !recipientKeys.has(field.recipientKey))) {
    throw new Error('Les champs doivent être associés à un signataire valide.')
  }
  if (recipients.some(recipient =>
    !recipient.name?.trim()
    || !recipient.email?.includes('@')
    || recipient.signingOrder < 1
  )) {
    throw new Error('Les informations des signataires sont incomplètes.')
  }

  const { data: contract, error: contractError } = await admin
    .from('contracts')
    .select('id,reservation_id')
    .eq('id', body.contractId)
    .single()
  if (contractError || !contract?.reservation_id) throw new Error('Contrat introuvable.')

  const { data: reservation, error: reservationError } = await admin
    .from('reservations')
    .select('id,property_id')
    .eq('id', contract.reservation_id)
    .single()
  if (reservationError || !reservation) throw new Error('Réservation introuvable.')
  await assertPropertyAccess(admin, reservation.property_id, user.id)

  const { data: file, error: fileError } = await admin
    .from('contract_files')
    .select('id,contract_id,reservation_id,storage_path,file_name')
    .eq('id', body.sourceFileId)
    .single()
  if (fileError || !file || file.contract_id !== contract.id) {
    throw new Error('Le document ne correspond pas à ce contrat.')
  }

  const { data: blob, error: downloadError } = await admin.storage
    .from('contract-files')
    .download(file.storage_path)
  if (downloadError || !blob) throw new Error('Document source inaccessible.')
  const sourceSha256 = await sha256(await blob.arrayBuffer())
  await admin.from('contract_files').update({
    content_sha256: sourceSha256,
    file_role: 'signing_snapshot',
  }).eq('id', file.id)

  const expiresAt = body.expiresAt
    ? new Date(body.expiresAt)
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) {
    throw new Error('La date d’expiration doit être future.')
  }

  const { data: envelope, error: envelopeError } = await admin
    .from('signature_envelopes')
    .insert({
      contract_id: contract.id,
      reservation_id: reservation.id,
      property_id: reservation.property_id,
      created_by: user.id,
      source_file_id: file.id,
      source_storage_path: file.storage_path,
      source_sha256: sourceSha256,
      title: body.title.trim(),
      message: body.message?.trim() || null,
      signing_order: body.signingOrder === 'parallel' ? 'parallel' : 'sequential',
      expires_at: expiresAt.toISOString(),
    })
    .select('*')
    .single()
  if (envelopeError || !envelope) throw envelopeError ?? new Error('Création impossible.')

  const rawTokens = new Map<string, string>()
  const recipientRows = await Promise.all(recipients.map(async recipient => {
    const token = randomToken()
    rawTokens.set(recipient.key, token)
    return {
      envelope_id: envelope.id,
      name: recipient.name.trim(),
      email: recipient.email.trim().toLowerCase(),
      role: recipient.role,
      signing_order: recipient.signingOrder,
      access_token_hash: await sha256(token),
      token_expires_at: expiresAt.toISOString(),
    }
  }))

  const { data: savedRecipients, error: recipientsError } = await admin
    .from('signature_recipients')
    .insert(recipientRows)
    .select('*')
  if (recipientsError || !savedRecipients) {
    await admin.from('signature_envelopes').delete().eq('id', envelope.id)
    throw recipientsError ?? new Error('Ajout des signataires impossible.')
  }

  const idByKey = new Map<string, string>()
  recipients.forEach(recipient => {
    const saved = savedRecipients.find((item: any) =>
      item.email === recipient.email.trim().toLowerCase()
    )
    if (saved) idByKey.set(recipient.key, saved.id)
  })
  const { data: savedFields, error: fieldsError } = await admin.from('signature_fields').insert(
    fields.map(field => ({
      envelope_id: envelope.id,
      recipient_id: idByKey.get(field.recipientKey),
      field_type: field.fieldType,
      page_number: field.pageNumber,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      required: field.required !== false,
      label: field.label?.trim() || null,
    })),
  ).select('*')
  if (fieldsError || !savedFields) {
    await admin.from('signature_envelopes').delete().eq('id', envelope.id)
    throw fieldsError ?? new Error('Ajout des champs impossible.')
  }

  await admin.from('signature_events').insert({
    envelope_id: envelope.id,
    event_type: 'envelope_created',
    actor_user_id: user.id,
    document_sha256: sourceSha256,
    metadata: { recipient_count: recipients.length, field_count: fields.length },
  })

  if (body.localSignature) {
    const localInput = recipients.find(recipient => recipient.key === body.localSignature.recipientKey)
    const localRecipient = savedRecipients.find((item: any) =>
      item.email === localInput?.email.trim().toLowerCase()
    )
    const profileEmail = user.email?.toLowerCase()
    if (
      !localInput
      || !localRecipient
      || localInput.role !== 'owner'
      || localInput.email.trim().toLowerCase() !== profileEmail
      || body.localSignature.consent !== true
    ) {
      throw new Error('La signature locale est réservée au propriétaire connecté.')
    }
    const signatureData = String(body.localSignature.signatureData ?? '')
    const initialsData = String(body.localSignature.initialsData ?? '')
    if (
      !signatureData.startsWith('data:image/png;base64,')
      || !initialsData.startsWith('data:image/png;base64,')
    ) {
      throw new Error('Signature et paraphe du propriétaire obligatoires.')
    }
    const localValues = savedFields
      .map((field: any, index: number) => ({ field, draft: fields[index] }))
      .filter(({ draft }: any) => draft.recipientKey === localInput.key)
      .map(({ field }: any) => {
        if (field.field_type === 'signature') {
          return { fieldId: field.id, valueData: signatureData }
        }
        if (field.field_type === 'initials') {
          return { fieldId: field.id, valueData: initialsData }
        }
        if (field.field_type === 'name') {
          return { fieldId: field.id, valueText: localRecipient.name }
        }
        if (field.field_type === 'date') {
          return { fieldId: field.id, valueText: new Date().toLocaleDateString('fr-FR') }
        }
        if (field.field_type === 'checkbox') {
          return { fieldId: field.id, valueText: 'true' }
        }
        return null
      })
      .filter(Boolean)
    const localToken = rawTokens.get(localInput.key)
    const ceremonyToken = await createCeremonyToken({
      recipientId: localRecipient.id,
      envelopeId: envelope.id,
      ownerAuthorized: true,
    })
    const localResponse = await fetch(
      `${requiredEnv('SUPABASE_URL')}/functions/v1/signing-ceremony`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${requiredEnv('SUPABASE_SERVICE_ROLE_KEY')}`,
          apikey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit',
          token: localToken,
          ceremonyToken,
          consent: true,
          values: localValues,
          suppressNotifications: true,
        }),
      },
    )
    const localResult = await localResponse.json()
    if (!localResponse.ok || localResult.error) {
      throw new Error(localResult.error ?? 'Signature locale impossible.')
    }
  }

  if (body.sendNow) {
    const [{ data: currentEnvelope }, { data: currentRecipients }] = await Promise.all([
      admin.from('signature_envelopes').select('*').eq('id', envelope.id).single(),
      admin.from('signature_recipients').select('*').eq('envelope_id', envelope.id),
    ])
    const selected = activeRecipients(currentEnvelope ?? envelope, currentRecipients ?? savedRecipients)
    await inviteRecipients(admin, envelope, selected, user, rawTokens, recipients)
    if ((currentEnvelope ?? envelope).status !== 'completed') {
      await admin.from('signature_envelopes').update({
        status: selected.length > 0 ? 'sent' : (currentEnvelope ?? envelope).status,
        sent_at: selected.length > 0 ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('id', envelope.id)
    }
  }

  const previewLinks = Deno.env.get('SIGNING_EMAIL_MODE') === 'log'
    ? recipients.map(recipient => ({
        email: recipient.email,
        url: `${requiredEnv('APP_URL')}/sign/${rawTokens.get(recipient.key)}`,
      }))
    : undefined
  return jsonResponse({ envelopeId: envelope.id, previewLinks })
}

async function sendEnvelope(admin: any, user: any, body: any) {
  const envelope = await getAccessibleEnvelope(admin, user.id, body.envelopeId)
  if (['completed', 'voided', 'expired'].includes(envelope.status)) {
    throw new Error('Cette enveloppe ne peut plus être envoyée.')
  }

  let query = admin
    .from('signature_recipients')
    .select('*')
    .eq('envelope_id', envelope.id)
  if (body.action === 'resend' && body.recipientId) query = query.eq('id', body.recipientId)
  const { data: recipients, error } = await query
  if (error || !recipients?.length) throw new Error('Aucun destinataire à inviter.')

  const eligible = body.action === 'resend'
    ? recipients.filter((item: any) => !['signed', 'declined'].includes(item.status))
    : activeRecipients(envelope, recipients)
  if (!eligible.length) throw new Error('Aucun destinataire actif.')

  const tokens = new Map<string, string>()
  const inputs: RecipientInput[] = []
  for (const recipient of eligible) {
    const token = randomToken()
    tokens.set(recipient.id, token)
    inputs.push({
      key: recipient.id,
      name: recipient.name,
      email: recipient.email,
      role: recipient.role,
      signingOrder: recipient.signing_order,
    })
    await admin.from('signature_recipients').update({
      access_token_hash: await sha256(token),
      token_expires_at: envelope.expires_at,
      updated_at: new Date().toISOString(),
    }).eq('id', recipient.id)
  }
  await inviteRecipients(admin, envelope, eligible, user, tokens, inputs)
  await admin.from('signature_envelopes').update({
    status: envelope.status === 'draft' ? 'sent' : envelope.status,
    sent_at: envelope.sent_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', envelope.id)
  return jsonResponse({ success: true })
}

async function voidEnvelope(admin: any, user: any, body: any) {
  const envelope = await getAccessibleEnvelope(admin, user.id, body.envelopeId)
  if (envelope.status === 'completed') throw new Error('Un document finalisé ne peut pas être annulé.')
  await admin.from('signature_envelopes').update({
    status: 'voided',
    voided_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', envelope.id)
  await admin.from('signature_recipients').update({ status: 'cancelled' })
    .eq('envelope_id', envelope.id)
    .not('status', 'in', '("signed","declined")')
  await admin.from('signature_events').insert({
    envelope_id: envelope.id,
    event_type: 'envelope_voided',
    actor_user_id: user.id,
    document_sha256: envelope.source_sha256,
    metadata: { reason: body.reason?.slice(0, 500) || null },
  })
  return jsonResponse({ success: true })
}

async function getAccessibleEnvelope(admin: any, userId: string, envelopeId: string) {
  const { data: envelope, error } = await admin
    .from('signature_envelopes')
    .select('*')
    .eq('id', envelopeId)
    .single()
  if (error || !envelope) throw new Error('Enveloppe introuvable.')
  await assertPropertyAccess(admin, envelope.property_id, userId)
  return envelope
}

function activeRecipients(envelope: any, recipients: any[]) {
  const pending = recipients.filter(recipient =>
    !['signed', 'declined', 'cancelled'].includes(recipient.status)
  )
  if (envelope.signing_order === 'parallel') return pending
  const minimumOrder = Math.min(...pending.map(recipient => recipient.signing_order))
  return pending.filter(recipient => recipient.signing_order === minimumOrder)
}

async function inviteRecipients(
  admin: any,
  envelope: any,
  recipients: any[],
  user: any,
  tokens: Map<string, string>,
  inputs: RecipientInput[],
) {
  const { data: profile } = await admin.from('profiles')
    .select('full_name,email').eq('id', user.id).maybeSingle()
  const senderName = profile?.full_name || profile?.email || user.email || 'My Butlr'

  for (const recipient of recipients) {
    const input = inputs.find(item =>
      item.key === recipient.id || item.email.trim().toLowerCase() === recipient.email
    )
    const token = input ? tokens.get(input.key) : undefined
    if (!token) continue
    try {
      const content = invitationEmail({
        recipientName: recipient.name,
        title: envelope.title,
        senderName,
        message: envelope.message,
        link: `${requiredEnv('APP_URL')}/sign/${token}`,
        expiresAt: envelope.expires_at,
      })
      const delivery = await sendEmail({ to: recipient.email, ...content })
      await admin.from('signature_recipients').update({
        status: 'invited',
        last_invited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', recipient.id)
      await admin.from('signature_events').insert({
        envelope_id: envelope.id,
        recipient_id: recipient.id,
        event_type: 'invitation_sent',
        actor_user_id: user.id,
        actor_email: recipient.email,
        document_sha256: envelope.source_sha256,
        metadata: { delivery_id: delivery.id },
      })
    } catch (error) {
      await admin.from('signature_events').insert({
        envelope_id: envelope.id,
        recipient_id: recipient.id,
        event_type: 'invitation_failed',
        actor_user_id: user.id,
        actor_email: recipient.email,
        document_sha256: envelope.source_sha256,
        metadata: { error: error instanceof Error ? error.message : 'Email failed' },
      })
      throw error
    }
  }
}
