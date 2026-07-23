// deno-lint-ignore-file no-explicit-any
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib'
import {
  corsHeaders,
  createCeremonyToken,
  getAdminClient,
  hashOtp,
  jsonResponse,
  otpEmail,
  randomOtp,
  randomToken,
  requestMetadata,
  requiredEnv,
  sendEmail,
  sha256,
  verifyCeremonyToken,
} from '../_shared/signing.ts'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const body = await req.json()
    const admin = getAdminClient()
    const token = String(body.token ?? '')
    if (!token) return jsonResponse({ error: 'Lien de signature invalide.' }, 400)

    if (body.action === 'request_otp' || body.action === 'verify_otp') {
      const recipient = await recipientFromToken(admin, token)
      if (body.action === 'request_otp') return await requestOtp(admin, recipient, req)
      return await verifyOtp(admin, recipient, body.otp, req)
    }

    const claims = await verifyCeremonyToken(String(body.ceremonyToken ?? ''))
    const recipient = await recipientFromToken(admin, token, claims?.ownerAuthorized === true)
    if (
      !claims
      || claims.recipientId !== recipient.id
      || claims.envelopeId !== recipient.envelope_id
    ) {
      return jsonResponse({ error: 'Votre session de signature a expiré.' }, 401)
    }

    if (body.action === 'load') return await loadCeremony(admin, recipient)
    if (body.action === 'submit') {
      return await submitSignature(
        admin,
        recipient,
        body,
        req,
        claims.ownerAuthorized === true && body.suppressNotifications === true,
      )
    }
    if (body.action === 'decline') return await declineSignature(admin, recipient, body, req)
    return jsonResponse({ error: 'Action inconnue.' }, 400)
  } catch (error) {
    console.error('signing-ceremony', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Erreur de signature.',
    }, 400)
  }
})

async function recipientFromToken(admin: any, token: string, bypassOrder = false) {
  const tokenHash = await sha256(token)
  const { data: recipient, error } = await admin
    .from('signature_recipients')
    .select('*,signature_envelopes(*)')
    .eq('access_token_hash', tokenHash)
    .single()
  if (error || !recipient) throw new Error('Lien de signature invalide.')

  const envelope = recipient.signature_envelopes
  if (!envelope || new Date(recipient.token_expires_at) <= new Date()) {
    if (envelope && !['completed', 'voided', 'expired'].includes(envelope.status)) {
      await Promise.all([
        admin.from('signature_envelopes').update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        }).eq('id', envelope.id),
        admin.from('signature_recipients').update({ status: 'expired' })
          .eq('envelope_id', envelope.id)
          .not('status', 'in', '("signed","declined","cancelled")'),
        admin.from('signature_events').insert({
          envelope_id: envelope.id,
          recipient_id: recipient.id,
          event_type: 'envelope_expired',
          actor_email: recipient.email,
          document_sha256: envelope.source_sha256,
        }),
      ])
    }
    throw new Error('Ce lien de signature a expiré.')
  }
  if (['voided', 'expired'].includes(envelope.status) || recipient.status === 'cancelled') {
    throw new Error('Cette demande de signature a été annulée.')
  }
  if (envelope.status === 'completed' || recipient.status === 'signed') {
    return recipient
  }

  if (envelope.signing_order === 'sequential' && !bypassOrder) {
    const { data: pending } = await admin
      .from('signature_recipients')
      .select('signing_order,status')
      .eq('envelope_id', envelope.id)
      .not('status', 'in', '("signed","declined","cancelled")')
    const activeOrder = Math.min(...(pending ?? []).map((item: any) => item.signing_order))
    if (recipient.signing_order !== activeOrder) {
      throw new Error('Votre tour de signature n’est pas encore arrivé.')
    }
  }
  return recipient
}

async function requestOtp(admin: any, recipient: any, req: Request) {
  if (recipient.status === 'signed') {
    return jsonResponse({ alreadySigned: true, maskedEmail: maskEmail(recipient.email) })
  }

  const { data: recent } = await admin
    .from('signature_otp_challenges')
    .select('created_at')
    .eq('recipient_id', recipient.id)
    .order('created_at', { ascending: false })
    .limit(1)
  if (
    recent?.[0]
    && Date.now() - new Date(recent[0].created_at).getTime() < 60_000
  ) {
    throw new Error('Un code vient déjà d’être envoyé. Patientez une minute.')
  }

  const otp = randomOtp()
  const { error } = await admin.from('signature_otp_challenges').insert({
    recipient_id: recipient.id,
    otp_hash: await hashOtp(otp),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })
  if (error) throw error
  const content = otpEmail(recipient.name, otp)
  const delivery = await sendEmail({ to: recipient.email, ...content })
  await admin.from('signature_events').insert([
    {
      envelope_id: recipient.envelope_id,
      recipient_id: recipient.id,
      event_type: 'document_viewed',
      actor_email: recipient.email,
      document_sha256: recipient.signature_envelopes.source_sha256,
      ...requestMetadata(req),
    },
    {
      envelope_id: recipient.envelope_id,
      recipient_id: recipient.id,
      event_type: 'otp_sent',
      actor_email: recipient.email,
      document_sha256: recipient.signature_envelopes.source_sha256,
      metadata: { delivery_id: delivery.id },
      ...requestMetadata(req),
    },
  ])
  await admin.from('signature_recipients').update({
    viewed_at: recipient.viewed_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', recipient.id)
  return jsonResponse({ maskedEmail: maskEmail(recipient.email) })
}

async function verifyOtp(
  admin: any,
  recipient: any,
  otpValue: unknown,
  req: Request,
) {
  const otp = String(otpValue ?? '').replace(/\D/g, '')
  if (otp.length !== 6) throw new Error('Saisissez le code à 6 chiffres.')
  const { data: challenge, error } = await admin
    .from('signature_otp_challenges')
    .select('*')
    .eq('recipient_id', recipient.id)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !challenge) throw new Error('Demandez un nouveau code.')
  if (
    new Date(challenge.expires_at) <= new Date()
    || challenge.attempts >= challenge.max_attempts
  ) {
    throw new Error('Ce code a expiré. Demandez-en un nouveau.')
  }

  const valid = await hashOtp(otp) === challenge.otp_hash
  if (!valid) {
    await admin.from('signature_otp_challenges').update({
      attempts: challenge.attempts + 1,
    }).eq('id', challenge.id)
    await admin.from('signature_events').insert({
      envelope_id: recipient.envelope_id,
      recipient_id: recipient.id,
      event_type: 'otp_failed',
      actor_email: recipient.email,
      document_sha256: recipient.signature_envelopes.source_sha256,
      metadata: { attempt: challenge.attempts + 1 },
      ...requestMetadata(req),
    })
    throw new Error('Code incorrect.')
  }

  const verifiedAt = new Date().toISOString()
  await Promise.all([
    admin.from('signature_otp_challenges').update({
      consumed_at: verifiedAt,
      attempts: challenge.attempts + 1,
    }).eq('id', challenge.id),
    admin.from('signature_recipients').update({
      status: 'otp_verified',
      otp_verified_at: verifiedAt,
      updated_at: verifiedAt,
    }).eq('id', recipient.id),
    admin.from('signature_events').insert({
      envelope_id: recipient.envelope_id,
      recipient_id: recipient.id,
      event_type: 'otp_verified',
      actor_email: recipient.email,
      document_sha256: recipient.signature_envelopes.source_sha256,
      ...requestMetadata(req),
    }),
  ])
  return jsonResponse({
    ceremonyToken: await createCeremonyToken({
      recipientId: recipient.id,
      envelopeId: recipient.envelope_id,
    }),
  })
}

async function loadCeremony(admin: any, recipient: any) {
  const envelope = recipient.signature_envelopes
  const { data: fields, error } = await admin
    .from('signature_fields')
    .select('id,field_type,page_number,x,y,width,height,required,label')
    .eq('recipient_id', recipient.id)
    .order('page_number')
  if (error) throw error
  const { data: signedUrl, error: urlError } = await admin.storage
    .from('contract-files')
    .createSignedUrl(envelope.source_storage_path, 10 * 60)
  if (urlError) throw urlError

  return jsonResponse({
    envelope: {
      id: envelope.id,
      title: envelope.title,
      message: envelope.message,
      expiresAt: envelope.expires_at,
      status: envelope.status,
    },
    recipient: {
      id: recipient.id,
      name: recipient.name,
      email: maskEmail(recipient.email),
      role: recipient.role,
      status: recipient.status,
    },
    fields: fields ?? [],
    documentUrl: signedUrl.signedUrl,
    completed: recipient.status === 'signed',
  })
}

async function submitSignature(
  admin: any,
  recipient: any,
  body: any,
  req: Request,
  suppressNotifications = false,
) {
  if (recipient.status === 'signed') return jsonResponse({ completed: true })
  if (body.consent !== true) throw new Error('Votre consentement explicite est obligatoire.')
  if (!Array.isArray(body.values)) throw new Error('Les champs de signature sont absents.')

  const { data: fields, error: fieldsError } = await admin
    .from('signature_fields')
    .select('*')
    .eq('recipient_id', recipient.id)
  if (fieldsError) throw fieldsError
  const valuesByField = new Map(body.values.map((value: any) => [value.fieldId, value]))
  const missing = (fields ?? []).filter((field: any) =>
    field.required && !validValue(field, valuesByField.get(field.id))
  )
  if (missing.length > 0) throw new Error('Complétez tous les champs obligatoires.')

  const valueRows = []
  for (const field of fields ?? []) {
    const value: any = valuesByField.get(field.id)
    if (!value) continue
    const valueData = ['signature', 'initials'].includes(field.field_type)
      ? String(value.valueData ?? '')
      : null
    const valueText = valueData ? null : String(value.valueText ?? '').slice(0, 1000)
    if (valueData && (!valueData.startsWith('data:image/png;base64,') || valueData.length > 1_500_000)) {
      throw new Error('La signature ou le paraphe est invalide.')
    }
    valueRows.push({
      field_id: field.id,
      recipient_id: recipient.id,
      value_text: valueText,
      value_data: valueData,
      value_sha256: await sha256(valueData ?? valueText),
    })
  }

  const signedAt = new Date().toISOString()
  const { error: valuesError } = await admin
    .from('signature_field_values')
    .upsert(valueRows, { onConflict: 'field_id' })
  if (valuesError) throw valuesError
  await admin.from('signature_recipients').update({
    status: 'signed',
    signed_at: signedAt,
    updated_at: signedAt,
  }).eq('id', recipient.id)
  await admin.from('signature_events').insert([
    {
      envelope_id: recipient.envelope_id,
      recipient_id: recipient.id,
      event_type: 'consent_accepted',
      actor_email: recipient.email,
      document_sha256: recipient.signature_envelopes.source_sha256,
      metadata: { text: 'Lu et approuvé. Je consens à signer électroniquement.' },
      ...requestMetadata(req),
    },
    {
      envelope_id: recipient.envelope_id,
      recipient_id: recipient.id,
      event_type: 'recipient_signed',
      actor_email: recipient.email,
      document_sha256: recipient.signature_envelopes.source_sha256,
      metadata: { field_count: valueRows.length },
      ...requestMetadata(req),
    },
  ])

  const { data: allRecipients } = await admin
    .from('signature_recipients')
    .select('*')
    .eq('envelope_id', recipient.envelope_id)
    .order('signing_order')
  const unsigned = (allRecipients ?? []).filter((item: any) => item.status !== 'signed')
  if (unsigned.length === 0) {
    await finalizeEnvelope(admin, recipient.signature_envelopes, suppressNotifications)
    return jsonResponse({ completed: true, envelopeCompleted: true })
  }

  await admin.from('signature_envelopes').update({
    status: 'partially_signed',
    updated_at: signedAt,
  }).eq('id', recipient.envelope_id)
  await admin.from('signature_events').insert({
    envelope_id: recipient.envelope_id,
    recipient_id: recipient.id,
    event_type: 'envelope_partially_signed',
    actor_email: recipient.email,
    document_sha256: recipient.signature_envelopes.source_sha256,
  })
  if (recipient.signature_envelopes.signing_order === 'sequential' && !suppressNotifications) {
    const nextOrder = Math.min(...unsigned.map((item: any) => item.signing_order))
    await inviteNextRecipients(
      admin,
      recipient.signature_envelopes,
      unsigned.filter((item: any) => item.signing_order === nextOrder),
    )
  }
  return jsonResponse({ completed: true, envelopeCompleted: false })
}

async function declineSignature(admin: any, recipient: any, body: any, req: Request) {
  const reason = String(body.reason ?? '').trim()
  if (reason.length < 3) throw new Error('Indiquez la raison de votre refus.')
  const now = new Date().toISOString()
  await admin.from('signature_recipients').update({
    status: 'declined',
    declined_at: now,
    decline_reason: reason.slice(0, 1000),
    updated_at: now,
  }).eq('id', recipient.id)
  await admin.from('signature_envelopes').update({
    status: 'declined',
    updated_at: now,
  }).eq('id', recipient.envelope_id)
  await admin.from('signature_events').insert({
    envelope_id: recipient.envelope_id,
    recipient_id: recipient.id,
    event_type: 'recipient_declined',
    actor_email: recipient.email,
    document_sha256: recipient.signature_envelopes.source_sha256,
    metadata: { reason: reason.slice(0, 1000) },
    ...requestMetadata(req),
  })
  return jsonResponse({ declined: true })
}

async function inviteNextRecipients(admin: any, envelope: any, recipients: any[]) {
  for (const recipient of recipients) {
    const token = randomToken()
    await admin.from('signature_recipients').update({
      access_token_hash: await sha256(token),
      status: 'invited',
      last_invited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', recipient.id)
    const link = `${requiredEnv('APP_URL')}/sign/${token}`
    const delivery = await sendEmail({
      to: recipient.email,
      subject: `Signature requise : ${envelope.title}`,
      html: `<p>Bonjour ${recipient.name},</p><p>C’est à votre tour de signer.</p><p><a href="${link}">Consulter et signer</a></p>`,
    })
    await admin.from('signature_events').insert({
      envelope_id: envelope.id,
      recipient_id: recipient.id,
      event_type: 'invitation_sent',
      actor_email: recipient.email,
      document_sha256: envelope.source_sha256,
      metadata: { delivery_id: delivery.id, sequential: true },
    })
  }
}

async function finalizeEnvelope(admin: any, envelope: any, suppressNotifications = false) {
  const startedAt = new Date().toISOString()
  await admin.from('signature_envelopes').update({
    status: 'finalizing',
    updated_at: startedAt,
  }).eq('id', envelope.id)

  try {
    const { data: sourceBlob, error: downloadError } = await admin.storage
      .from('contract-files')
      .download(envelope.source_storage_path)
    if (downloadError || !sourceBlob) throw new Error('Document source inaccessible.')
    const sourceBytes = new Uint8Array(await sourceBlob.arrayBuffer())
    const currentHash = await sha256(sourceBytes)
    if (currentHash !== envelope.source_sha256) {
      await admin.from('signature_events').insert({
        envelope_id: envelope.id,
        event_type: 'hash_mismatch',
        document_sha256: currentHash,
        metadata: { expected: envelope.source_sha256 },
      })
      throw new Error('Le document a été modifié pendant la signature.')
    }

    const { data: fields } = await admin
      .from('signature_fields')
      .select('*')
      .eq('envelope_id', envelope.id)
    const fieldIds = (fields ?? []).map((field: any) => field.id)
    const [{ data: values }, { data: recipients }, { data: events }] = await Promise.all([
      fieldIds.length
        ? admin.from('signature_field_values').select('*').in('field_id', fieldIds)
        : Promise.resolve({ data: [] }),
      admin.from('signature_recipients').select('*').eq('envelope_id', envelope.id).order('signing_order'),
      admin.from('signature_events').select('*').eq('envelope_id', envelope.id).order('created_at'),
    ])
    const valueByField = new Map(
      (values ?? []).filter((value: any) =>
        (fields ?? []).some((field: any) => field.id === value.field_id)
      ).map((value: any) => [value.field_id, value]),
    )
    const pdf = await PDFDocument.load(sourceBytes)
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    for (const field of fields ?? []) {
      const value: any = valueByField.get(field.id)
      if (!value) continue
      const page = pdf.getPage(field.page_number - 1)
      if (!page) continue
      const width = page.getWidth()
      const height = page.getHeight()
      const box = {
        x: Number(field.x) * width,
        y: height - Number(field.y) * height - Number(field.height) * height,
        width: Number(field.width) * width,
        height: Number(field.height) * height,
      }
      if (['signature', 'initials'].includes(field.field_type) && value.value_data) {
        const image = await pdf.embedPng(dataUrlBytes(value.value_data))
        page.drawImage(image, { ...box })
      } else {
        const text = value.value_text || (
          field.field_type === 'date' ? new Date().toLocaleDateString('fr-FR') : ''
        )
        page.drawText(String(text).slice(0, 150), {
          x: box.x + 2,
          y: box.y + Math.max(2, box.height / 3),
          size: Math.min(12, Math.max(7, box.height / 2)),
          font,
          color: rgb(0.05, 0.05, 0.05),
          maxWidth: box.width - 4,
        })
      }
    }

    const certificate = pdf.addPage()
    const { height } = certificate.getSize()
    certificate.drawText('CERTIFICAT DE SIGNATURE ÉLECTRONIQUE', {
      x: 45, y: height - 55, size: 16, font,
    })
    let y = height - 90
    const lines = [
      `Document : ${envelope.title}`,
      `Empreinte source SHA-256 : ${envelope.source_sha256}`,
      `Enveloppe : ${envelope.id}`,
      `Finalisée le : ${new Date().toLocaleString('fr-FR')}`,
      '',
      'Signataires :',
      ...(recipients ?? []).map((item: any) =>
        `${item.name} <${item.email}> — signé le ${new Date(item.signed_at).toLocaleString('fr-FR')}`
      ),
      '',
      `Événements d’audit enregistrés : ${(events ?? []).length}`,
      'Chaque signature a été précédée d’une vérification par code e-mail à usage unique.',
    ]
    for (const line of lines) {
      for (const wrapped of wrapText(line, 95)) {
        certificate.drawText(wrapped, { x: 45, y, size: 9, font })
        y -= 14
      }
    }

    const finalBytes = await pdf.save()
    const finalHash = await sha256(finalBytes)
    const fileName = `contrat-signe-${envelope.id}.pdf`
    const path = `${envelope.created_by}/${envelope.reservation_id}/${crypto.randomUUID()}-${fileName}`
    const { error: uploadError } = await admin.storage.from('contract-files').upload(
      path,
      finalBytes,
      { contentType: 'application/pdf', upsert: false },
    )
    if (uploadError) throw uploadError
    const { data: finalFile, error: fileError } = await admin.from('contract_files').insert({
      contract_id: envelope.contract_id,
      reservation_id: envelope.reservation_id,
      uploaded_by: envelope.created_by,
      source: 'generated',
      storage_path: path,
      file_name: fileName,
      mime_type: 'application/pdf',
      size_bytes: finalBytes.byteLength,
      extraction_status: 'completed',
      content_sha256: finalHash,
      file_role: 'signed_final',
    }).select('id').single()
    if (fileError || !finalFile) {
      await admin.storage.from('contract-files').remove([path])
      throw fileError ?? new Error('Archivage final impossible.')
    }

    const completedAt = new Date().toISOString()
    await admin.from('signature_envelopes').update({
      status: 'completed',
      final_file_id: finalFile.id,
      completed_at: completedAt,
      updated_at: completedAt,
    }).eq('id', envelope.id)
    await admin.from('signature_events').insert({
      envelope_id: envelope.id,
      event_type: 'envelope_completed',
      document_sha256: finalHash,
      metadata: { source_sha256: envelope.source_sha256, final_file_id: finalFile.id },
    })

    if (!suppressNotifications) {
      const { data: signedUrl } = await admin.storage.from('contract-files')
        .createSignedUrl(path, 7 * 24 * 60 * 60)
      await sendEmail({
        to: (recipients ?? []).map((item: any) => item.email),
        subject: `Document signé : ${envelope.title}`,
        html: `<p>Le document a été signé par toutes les parties.</p><p><a href="${signedUrl?.signedUrl}">Télécharger le document final</a></p><p>Ce lien est valable 7 jours.</p>`,
      })
    }
  } catch (error) {
    await admin.from('signature_envelopes').update({
      status: 'partially_signed',
      updated_at: new Date().toISOString(),
    }).eq('id', envelope.id)
    await admin.from('signature_events').insert({
      envelope_id: envelope.id,
      event_type: 'finalization_failed',
      document_sha256: envelope.source_sha256,
      metadata: { error: error instanceof Error ? error.message : 'Finalization failed' },
    })
    throw error
  }
}

function validValue(field: any, value: any) {
  if (!value) return false
  if (['signature', 'initials'].includes(field.field_type)) {
    return String(value.valueData ?? '').startsWith('data:image/png;base64,')
  }
  if (field.field_type === 'checkbox') return value.valueText === 'true'
  return String(value.valueText ?? '').trim().length > 0
}

function dataUrlBytes(value: string) {
  const base64 = value.split(',')[1]
  const binary = atob(base64)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

function wrapText(value: string, maxLength: number) {
  if (!value) return ['']
  const words = value.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (`${line} ${word}`.trim().length > maxLength) {
      lines.push(line)
      line = word
    } else {
      line = `${line} ${word}`.trim()
    }
  }
  if (line) lines.push(line)
  return lines
}

function maskEmail(email: string) {
  const [name, domain] = email.split('@')
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}@${domain}`
}
