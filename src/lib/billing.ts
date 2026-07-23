import { supabase } from '@/lib/supabase'

export type SubscriptionPlan = 'starter' | 'pro'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'

export interface Subscription {
  id: string
  owner_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: SubscriptionPlan
  status: SubscriptionStatus
  trial_ends_at: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export class BillingNotConfiguredError extends Error {
  constructor(message = 'Billing is not configured.') {
    super(message)
    this.name = 'BillingNotConfiguredError'
  }
}

export async function fetchMySubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .maybeSingle()

  if (error) throw error
  return (data as Subscription | null) ?? null
}

async function readFunctionError(error: unknown) {
  let message = error instanceof Error ? error.message : 'Checkout failed'
  const context = (error as { context?: Response }).context
  if (context) {
    try {
      const body = await context.clone().json()
      if (typeof body?.error === 'string') message = body.error
      if (body?.code === 'stripe_not_configured') {
        throw new BillingNotConfiguredError(message)
      }
    } catch (parseError) {
      if (parseError instanceof BillingNotConfiguredError) throw parseError
    }
  }
  throw new Error(message)
}

export async function startCheckout(plan: SubscriptionPlan): Promise<void> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { plan },
  })

  if (error) {
    await readFunctionError(error)
  }

  const result = data as { url?: string; error?: string; code?: string } | null
  if (result?.code === 'stripe_not_configured') {
    throw new BillingNotConfiguredError(result.error)
  }
  if (result?.error) {
    if (result.code === 'stripe_not_configured') {
      throw new BillingNotConfiguredError(result.error)
    }
    throw new Error(result.error)
  }
  if (!result?.url) {
    throw new Error('Checkout URL missing from server response.')
  }

  window.location.href = result.url
}

export function isSubscriptionBlocking(
  sub: Subscription | null,
  today: Date = new Date(),
): boolean {
  if (!sub) return false
  if (sub.status === 'canceled' || sub.status === 'past_due') return true
  if (sub.status === 'trialing' && sub.trial_ends_at) {
    const trialEnd = new Date(sub.trial_ends_at)
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const trialDayStart = new Date(trialEnd.getFullYear(), trialEnd.getMonth(), trialEnd.getDate())
    return trialDayStart < dayStart
  }
  return false
}

export function isBillingConfiguredHint() {
  return Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
}
