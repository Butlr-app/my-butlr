// Supabase Edge Function: send-push
// Delivers a VAPID-signed Web Push to every subscription belonging to a user.
// Invoked by the `trg_dispatch_push` trigger (pg_net) whenever a targeted
// notification row is inserted. Dead subscriptions (404/410) are pruned.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@mybutlr.com'
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

interface PushPayload {
  user_id: string
  title?: string
  body?: string
  url?: string
  tag?: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: PushPayload
  try {
    payload = await req.json()
  } catch {
    return new Response('Bad request', { status: 400 })
  }
  if (!payload.user_id) {
    return new Response('Missing user_id', { status: 400 })
  }

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', payload.user_id)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const notification = JSON.stringify({
    title: payload.title ?? 'My Butlr',
    body: payload.body ?? '',
    url: payload.url ?? '/app/notifications',
    tag: payload.tag ?? 'butlr-notification',
  })

  let sent = 0
  const dead: string[] = []

  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        notification,
      )
      sent++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) dead.push(s.id)
    }
  }))

  if (dead.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', dead)
  }

  return new Response(JSON.stringify({ sent, pruned: dead.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
