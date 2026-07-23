// deno-lint-ignore-file no-explicit-any
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function getAdminClient(): SupabaseClient {
  return createClient(
    requiredEnv('SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export async function getAuthenticatedUser(req: Request) {
  const authorization = req.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  const admin = getAdminClient()
  const { data, error } = await admin.auth.getUser(authorization.slice(7))
  return error ? null : data.user
}

export async function assertPropertyAccess(
  admin: SupabaseClient,
  propertyId: string,
  userId: string,
) {
  const [{ data: property }, { data: assignment }] = await Promise.all([
    admin.from('properties').select('owner_id').eq('id', propertyId).maybeSingle(),
    admin
      .from('role_assignments')
      .select('id')
      .eq('property_id', propertyId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])
  if (property?.owner_id !== userId && !assignment) {
    throw new Error('Vous n’avez pas accès à cette propriété.')
  }
}

export function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing server secret: ${name}`)
  return value
}

export function randomToken(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes))
  return base64Url(value)
}

export function randomOtp() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return String(value).padStart(6, '0')
}

export async function sha256(value: string | ArrayBuffer | Uint8Array) {
  const bytes = typeof value === 'string'
    ? new TextEncoder().encode(value)
    : value instanceof Uint8Array ? value : new Uint8Array(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashOtp(otp: string) {
  return sha256(`${otp}:${requiredEnv('SIGNING_OTP_PEPPER')}`)
}

export interface CeremonyClaims {
  recipientId: string
  envelopeId: string
  exp: number
  ownerAuthorized?: boolean
}

export async function createCeremonyToken(
  claims: Omit<CeremonyClaims, 'exp'>,
  lifetimeSeconds = 30 * 60,
) {
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' })
  const payload = encodeJson({
    ...claims,
    exp: Math.floor(Date.now() / 1000) + lifetimeSeconds,
  })
  const signature = await hmac(`${header}.${payload}`)
  return `${header}.${payload}.${signature}`
}

export async function verifyCeremonyToken(token: string): Promise<CeremonyClaims | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const expected = await hmac(`${parts[0]}.${parts[1]}`)
  if (!timingSafeEqual(expected, parts[2])) return null

  try {
    const claims = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(parts[1])),
    ) as CeremonyClaims
    if (!claims.recipientId || !claims.envelopeId || claims.exp < Date.now() / 1000) {
      return null
    }
    return claims
  } catch {
    return null
  }
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(requiredEnv('SIGNING_TOKEN_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  )
  return base64Url(new Uint8Array(signature))
}

function encodeJson(value: unknown) {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)))
}

function base64Url(value: Uint8Array) {
  let binary = ''
  value.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlDecode(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return mismatch === 0
}

export function requestMetadata(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const safeIp = forwarded && (
    /^[\d.]+$/.test(forwarded)
    || /^[a-fA-F0-9:]+$/.test(forwarded)
  ) ? forwarded : null
  return {
    ip_address: safeIp,
    user_agent: req.headers.get('user-agent')?.slice(0, 1000) || null,
  }
}

export async function sendEmail(options: {
  to: string | string[]
  subject: string
  html: string
  attachments?: Array<{ filename: string; content: string }>
}) {
  const mode = Deno.env.get('SIGNING_EMAIL_MODE') ?? 'resend'
  if (mode === 'log') {
    console.info('Signing email simulation', {
      to: options.to,
      subject: options.subject,
    })
    return { id: `simulated-${crypto.randomUUID()}`, simulated: true }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requiredEnv('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: requiredEnv('RESEND_FROM_EMAIL'),
      ...options,
    }),
  })
  const body = await response.json()
  if (!response.ok) {
    throw new Error(body?.message ?? `Resend failed (${response.status})`)
  }
  return body
}

export function invitationEmail(options: {
  recipientName: string
  title: string
  senderName: string
  message?: string | null
  link: string
  expiresAt: string
}) {
  return {
    subject: `Signature requise : ${options.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#161616">
        <h2>Document à signer</h2>
        <p>Bonjour ${escapeHtml(options.recipientName)},</p>
        <p>${escapeHtml(options.senderName)} vous invite à consulter et signer
          <strong>${escapeHtml(options.title)}</strong>.</p>
        ${options.message ? `<p>${escapeHtml(options.message)}</p>` : ''}
        <p><a href="${options.link}" style="display:inline-block;padding:12px 18px;background:#111;color:white;text-decoration:none;border-radius:6px">Consulter et signer</a></p>
        <p style="font-size:12px;color:#666">Ce lien expire le ${new Date(options.expiresAt).toLocaleString('fr-FR')}. Un code à usage unique vous sera envoyé séparément.</p>
      </div>
    `,
  }
}

export function otpEmail(recipientName: string, otp: string) {
  return {
    subject: 'Votre code de signature My Butlr',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#161616">
        <p>Bonjour ${escapeHtml(recipientName)},</p>
        <p>Votre code de vérification est :</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px">${otp}</p>
        <p>Ce code expire dans 10 minutes. Ne le communiquez à personne.</p>
      </div>
    `,
  }
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
