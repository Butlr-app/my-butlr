// Supabase Edge Function: send-contract-email
// Sends the signing link to a guest via Resend when RESEND_API_KEY is set.
// Falls back to a dry-run response when the key is missing so the UI can
// still show the manual copy link.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('CONTRACT_FROM_EMAIL') ?? 'My Butlr <contracts@mybutlr.com>'
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? 'https://app.mybutlr.com'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

interface Payload {
  contract_id: string
  to_email: string
  guest_name?: string
  property_name?: string
  signing_link?: string
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Verify the caller is an authenticated user (anon key + user JWT)
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (!payload.contract_id || !payload.to_email) {
    return new Response(JSON.stringify({ error: 'contract_id and to_email required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Authorization: the caller may only act on a contract they can access.
  // Reading through the RLS-scoped user client enforces the
  // contract → reservation → property ownership/assignment chain, so a user
  // cannot rotate the signing token of an arbitrary contract (IDOR).
  const { data: allowed, error: accessErr } = await userClient
    .from('contracts')
    .select('id')
    .eq('id', payload.contract_id)
    .maybeSingle()

  if (accessErr || !allowed) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { data: contract, error: cErr } = await admin
    .from('contracts')
    .select('*')
    .eq('id', payload.contract_id)
    .single()

  if (cErr || !contract) {
    return new Response(JSON.stringify({ error: 'Contract not found' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let token = contract.signing_token as string | null
  if (!token) {
    token = crypto.randomUUID()
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  await admin.from('contracts').update({
    signing_token: token,
    signing_expires_at: expiresAt,
    signer_email: payload.to_email,
    status: contract.status === 'draft' ? 'sent' : contract.status,
  }).eq('id', contract.id)

  const link = payload.signing_link
    ?? `${APP_ORIGIN.replace(/\/$/, '')}/sign/${token}`

  const guest = payload.guest_name || contract.guest_name || 'Guest'
  const property = payload.property_name || contract.property_name || 'your stay'

  if (!RESEND_API_KEY) {
    await admin.from('notifications').insert({
      user_id: user.id,
      type: 'system',
      title: 'Contract email skipped (no RESEND_API_KEY)',
      message: `Share this link with ${guest}: ${link}`,
      data: { contract_id: contract.id, signing_link: link },
    })
    return new Response(JSON.stringify({
      sent: false,
      reason: 'RESEND_API_KEY not configured',
      signing_link: link,
      expires_at: expiresAt,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const html = `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #111;">
      <p style="letter-spacing: .2em; font-size: 11px; text-transform: uppercase; color: #888;">My Butlr</p>
      <h1 style="font-size: 22px; font-weight: 600;">Please sign your contract</h1>
      <p>Hello ${guest},</p>
      <p>Your seasonal rental contract for <strong>${property}</strong> is ready for signature.</p>
      <p style="margin: 28px 0;">
        <a href="${link}" style="background:#111;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;">
          Review &amp; sign
        </a>
      </p>
      <p style="font-size: 13px; color: #666;">This link expires in 14 days. If the button does not work, copy this URL:<br/>${link}</p>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [payload.to_email],
      subject: `Contract ready to sign — ${property}`,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    return new Response(JSON.stringify({ error: 'Email provider failed', detail: body, signing_link: link }), {
      status: 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  await admin.from('notifications').insert({
    user_id: user.id,
    type: 'system',
    title: 'Contract email sent',
    message: `Signing link emailed to ${payload.to_email}`,
    data: { contract_id: contract.id, signing_link: link },
  })

  return new Response(JSON.stringify({
    sent: true,
    signing_link: link,
    expires_at: expiresAt,
  }), { headers: { ...cors, 'Content-Type': 'application/json' } })
})
