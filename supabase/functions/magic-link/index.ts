import {
  corsHeaders,
  escapeHtml,
  getAdminClient,
  jsonResponse,
  sendEmail,
} from '../_shared/signing.ts'

function hasResendConfig() {
  return Boolean(Deno.env.get('RESEND_API_KEY') && Deno.env.get('RESEND_FROM_EMAIL'))
}

function magicLinkEmail(options: { link: string }) {
  return {
    subject: 'Votre lien de connexion My Butlr',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#161616">
        <h2>Connexion sans mot de passe</h2>
        <p>Cliquez pour vous connecter à My Butlr :</p>
        <p><a href="${options.link}" style="display:inline-block;padding:12px 18px;background:#111;color:white;text-decoration:none;border-radius:6px">Se connecter</a></p>
        <p style="font-size:12px;color:#666">Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p>
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
    const body = await req.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
    const redirectTo = typeof body.redirectTo === 'string' && body.redirectTo.includes('/auth/callback')
      ? body.redirectTo
      : `${appUrl.replace(/\/$/, '')}/auth/callback`

    if (!email || !email.includes('@')) {
      return jsonResponse({ ok: true })
    }

    if (!hasResendConfig()) {
      return jsonResponse({
        ok: false,
        fallback: true,
        reason: 'resend_not_configured',
      }, 503)
    }

    const admin = getAdminClient()
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })

    if (error || !data.properties?.hashed_token) {
      console.warn('magic-link: no link generated', error?.message)
      return jsonResponse({ ok: true })
    }

    const loginLink = `${redirectTo}?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink`
    const { subject, html } = magicLinkEmail({ link: loginLink })
    await sendEmail({ to: email, subject, html })

    return jsonResponse({ ok: true, channel: 'resend' })
  } catch (error) {
    console.error('magic-link failed', error)
    return jsonResponse({
      error: 'Impossible d’envoyer le lien magique.',
      fallback: true,
    }, 500)
  }
})
