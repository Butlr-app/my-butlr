// deno-lint-ignore-file no-explicit-any
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type BillingPlan = 'starter' | 'pro'
export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'

export function getStripeSecretKey() {
  return Deno.env.get('STRIPE_SECRET_KEY') ?? null
}

export function getStripe() {
  const secretKey = getStripeSecretKey()
  if (!secretKey) return null
  return new Stripe(secretKey, { apiVersion: '2024-11-20.acacia' })
}

export function priceIdForPlan(plan: BillingPlan) {
  if (plan === 'pro') return Deno.env.get('STRIPE_PRICE_PRO') ?? null
  return Deno.env.get('STRIPE_PRICE_STARTER') ?? null
}

export function planFromPriceId(priceId: string | null | undefined): BillingPlan {
  if (priceId && priceId === Deno.env.get('STRIPE_PRICE_PRO')) return 'pro'
  return 'starter'
}

export function mapStripeStatus(status: Stripe.Subscription.Status): BillingStatus {
  switch (status) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
      return 'canceled'
    case 'incomplete':
      return 'incomplete'
    case 'incomplete_expired':
      return 'canceled'
    case 'unpaid':
      return 'past_due'
    default:
      return 'incomplete'
  }
}

export function stripeTimestamp(value: number | null | undefined) {
  if (!value) return null
  return new Date(value * 1000).toISOString()
}

export function subscriptionRowFromStripe(
  ownerId: string,
  subscription: Stripe.Subscription,
  customerId?: string | null,
) {
  const priceId = subscription.items.data[0]?.price?.id ?? null
  const plan =
    (subscription.metadata?.plan as BillingPlan | undefined) ??
    planFromPriceId(priceId)

  return {
    owner_id: ownerId,
    stripe_customer_id: customerId ?? (typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id ?? null),
    stripe_subscription_id: subscription.id,
    plan,
    status: mapStripeStatus(subscription.status),
    trial_ends_at: stripeTimestamp(subscription.trial_end),
    current_period_end: stripeTimestamp(subscription.current_period_end),
    updated_at: new Date().toISOString(),
  }
}

export async function upsertSubscription(
  admin: SupabaseClient,
  row: Record<string, unknown>,
) {
  const { error } = await admin
    .from('subscriptions')
    .upsert(row, { onConflict: 'owner_id' })
  if (error) throw error
}

export async function resolveOwnerId(
  admin: SupabaseClient,
  options: {
    ownerId?: string | null
    customerId?: string | null
    subscription?: Stripe.Subscription
  },
) {
  if (options.ownerId) return options.ownerId
  if (options.subscription?.metadata?.owner_id) {
    return options.subscription.metadata.owner_id
  }
  if (options.customerId) {
    const { data } = await admin
      .from('subscriptions')
      .select('owner_id')
      .eq('stripe_customer_id', options.customerId)
      .maybeSingle()
    if (data?.owner_id) return data.owner_id
  }
  return null
}
