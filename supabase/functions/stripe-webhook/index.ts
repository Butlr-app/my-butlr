import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { corsHeaders, getAdminClient, jsonResponse } from '../_shared/signing.ts'
import {
  getStripe,
  resolveOwnerId,
  subscriptionRowFromStripe,
  upsertSubscription,
} from '../_shared/billing.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!webhookSecret) {
    console.error('stripe-webhook: STRIPE_WEBHOOK_SECRET is not set')
    return jsonResponse({ error: 'Webhook secret not configured' }, 503)
  }

  const stripe = getStripe()
  if (!stripe) {
    console.error('stripe-webhook: STRIPE_SECRET_KEY is not set')
    return jsonResponse({ error: 'Stripe not configured' }, 503)
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return jsonResponse({ error: 'Missing stripe-signature header' }, 400)
  }

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error('stripe-webhook signature verification failed', error)
    return jsonResponse({ error: 'Invalid webhook signature' }, 400)
  }

  const admin = getAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const ownerId = await resolveOwnerId(admin, {
          ownerId: session.client_reference_id ?? session.metadata?.owner_id ?? null,
          customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
        })
        if (!ownerId) {
          console.warn('checkout.session.completed without resolvable owner_id', session.id)
          break
        }

        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null

        if (session.subscription) {
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          await upsertSubscription(admin, subscriptionRowFromStripe(ownerId, subscription, customerId))
        } else if (customerId) {
          await upsertSubscription(admin, {
            owner_id: ownerId,
            stripe_customer_id: customerId,
            plan: session.metadata?.plan ?? 'starter',
            updated_at: new Date().toISOString(),
          })
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id ?? null
        const ownerId = await resolveOwnerId(admin, {
          subscription,
          customerId,
        })
        if (!ownerId) {
          console.warn(`${event.type} without resolvable owner_id`, subscription.id)
          break
        }

        if (event.type === 'customer.subscription.deleted') {
          await upsertSubscription(admin, {
            ...subscriptionRowFromStripe(ownerId, subscription, customerId),
            status: 'canceled',
          })
        } else {
          await upsertSubscription(admin, subscriptionRowFromStripe(ownerId, subscription, customerId))
        }
        break
      }

      default:
        break
    }

    return jsonResponse({ received: true })
  } catch (error) {
    console.error('stripe-webhook handler failed', event.type, error)
    return jsonResponse({ error: 'Webhook handler failed' }, 500)
  }
})
