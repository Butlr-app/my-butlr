import {
  corsHeaders,
  escapeHtml,
  getAdminClient,
  getAuthenticatedUser,
  jsonResponse,
  sendEmail,
} from '../_shared/signing.ts'

const ROLE_LABELS: Record<string, string> = {
  house_manager: 'House manager',
  concierge: 'Concierge',
  maintenance: 'Maintenance',
  partner: 'Partenaire / prestataire',
  agency: 'Agence immobilière',
}

function hasResendConfig() {
  return Boolean(Deno.env.get('RESEND_API_KEY') && Deno.env.get('RESEND_FROM_EMAIL'))
}

function teamInviteEmail(options: {
  recipientName: string
  propertyName: string
  roleLabel: string
  link: string
}) {
  return {
    subject: `Invitation à rejoindre ${options.propertyName} sur My Butlr`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#161616">
        <h2>Invitation à l'équipe</h2>
        <p>Bonjour ${escapeHtml(options.recipientName)},</p>
        <p>Vous avez été invité(e) à rejoindre <strong>${escapeHtml(options.propertyName)}</strong> sur My Butlr en tant que <strong>${escapeHtml(options.roleLabel)}</strong>.</p>
        <p><a href="${options.link}" style="display:inline-block;padding:12px 18px;background:#111;color:white;text-decoration:none;border-radius:6px">Créer mon compte</a></p>
        <p style="font-size:12px;color:#666">Si vous n'attendiez pas cette invitation, ignorez cet email.</p>
        <p style="font-size:12px;color:#666">Lien direct : ${escapeHtml(options.link)}</p>
      </div>
    `,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const body = await req.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const propertyName = typeof body.propertyName === 'string' ? body.propertyName.trim() : ''
    const role = typeof body.role === 'string' ? body.role.trim() : ''
    const inviteId = typeof body.inviteId === 'string' ? body.inviteId.trim() : ''

    if (!email || !email.includes('@') || !inviteId) {
      return jsonResponse({ error: 'email and inviteId are required' }, 400)
    }

    const admin = getAdminClient()
    const { data: invite, error: inviteError } = await admin
      .from('property_team_invitations')
      .select('id, email, full_name, property_id, status')
      .eq('id', inviteId)
      .maybeSingle()

    if (inviteError || !invite) {
      return jsonResponse({ error: 'Invitation not found' }, 404)
    }

    if (invite.email.toLowerCase() !== email) {
      return jsonResponse({ error: 'Email mismatch' }, 400)
    }

    const { data: property } = await admin
      .from('properties')
      .select('owner_id, name')
      .eq('id', invite.property_id)
      .maybeSingle()

    if (property?.owner_id !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')
    const link = `${appUrl}/signup?invite=${encodeURIComponent(inviteId)}&email=${encodeURIComponent(email)}`
    const resolvedPropertyName = propertyName || property?.name || 'une propriété'
    const roleLabel = ROLE_LABELS[role] ?? role || 'membre de l\'équipe'

    if (!hasResendConfig()) {
      return jsonResponse({
        ok: false,
        sent: false,
        fallback: true,
        reason: 'resend_not_configured',
        link,
      }, 503)
    }

    const { subject, html } = teamInviteEmail({
      recipientName: invite.full_name || email,
      propertyName: resolvedPropertyName,
      roleLabel,
      link,
    })
    await sendEmail({ to: email, subject, html })

    return jsonResponse({ ok: true, sent: true, channel: 'resend', link })
  } catch (error) {
    console.error('send-team-invite failed', error)
    return jsonResponse({
      error: 'Impossible d\'envoyer l\'invitation.',
      sent: false,
      fallback: true,
    }, 500)
  }
})
