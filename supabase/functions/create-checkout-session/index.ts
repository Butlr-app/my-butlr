import {
  corsHeaders,
  getAdminClient,
  getAuthenticatedUser,
  jsonResponse,
} from '../_shared/signing.ts'
import {
  getStripe,
  getStripeSecretKey,
  priceIdForPlan,
  type BillingPlan,
} from '../_shared/billing.ts'

function isBillingPlan(value: unknown): value is BillingPlan {
  return value === 'starter' || value === 'pro'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!getStripeSecretKey()) {
    return jsonResponse({
      error: 'Stripe billing is not configured. Set STRIPE_SECRET_KEY in Supabase secrets.',
      code: 'stripe_not_configured',
    }, 503)
  }

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const body = await req.json().catch(() => ({}))
    const plan = body.plan
    if (!isBillingPlan(plan)) {
      return jsonResponse({ error: 'plan must be starter or pro' }, 400)
    }

    const priceId = priceIdForPlan(plan)
    if (!priceId) {
      return jsonResponse({
        error: `Missing Stripe price for plan "${plan}". Set STRIPE_PRICE_${plan === 'pro' ? 'PRO' : 'STARTER'}.`,
        code: 'stripe_not_configured',
      }, 503)
    }

    const stripe = getStripe()
    if (!stripe) {
      return jsonResponse({
        error: 'Stripe billing is not configured. Set STRIPE_SECRET_KEY in Supabase secrets.',
        code: 'stripe_not_configured',
      }, 503)
    }

    const admin = getAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .maybeSingle()

    const { data: existing } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('owner_id', user.id)
      .maybeSingle()

    let customerId = existing?.stripe_customer_id ?? null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email ?? undefined,
        name: profile?.full_name ?? undefined,
        metadata: { owner_id: user.id },
      })
      customerId = customer.id
      await admin.from('subscriptions').upsert({
        owner_id: user.id,
        stripe_customer_id: customerId,
        plan,
        status: 'trialing',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'owner_id' })
    }

    const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/app/settings?tab=Account&billing=success`,
      cancel_url: `${appUrl}/app/settings?tab=Account&billing=cancel`,
      metadata: { owner_id: user.id, plan },
      subscription_data: {
        metadata: { owner_id: user.id, plan },
      },
    })

    if (!session.url) {
      return jsonResponse({ error: 'Stripe did not return a checkout URL.' }, 500)
    }

    return jsonResponse({ url: session.url })
  } catch (error) {
    console.error('create-checkout-session failed', error)
    return jsonResponse({ error: 'Unable to start checkout.' }, 500)
  }
})
