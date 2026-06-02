import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PriceAlert, Subscription, SubscriptionPayment } from '@/lib/supabase/types'

/** Cache-tag per user — revalidated on every data mutation. */
export const dashboardCacheTag = (userId: string) => `dashboard-user-${userId}`

/**
 * Cached subscriptions + price-alerts for the dashboard.
 * Uses the service-role client so the cache is not tied to request cookies.
 * Invalidated via revalidateTag(dashboardCacheTag(userId)) in every mutation.
 */
export function getCachedDashboardData(userId: string) {
  return unstable_cache(
    async () => {
      const admin = createAdminClient()
      const [subsResult, alertsResult] = await Promise.all([
        admin
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .order('next_charge_date', { ascending: true }),
        admin
          .from('price_alerts')
          .select('*')
          .eq('user_id', userId)
          .is('dismissed_at', null)
          .order('created_at', { ascending: false })
          .limit(8),
      ])
      return {
        subs:   (subsResult.data  ?? []) as Subscription[],
        alerts: (alertsResult.data ?? []) as PriceAlert[],
      }
    },
    ['dashboard-data', userId],
    {
      revalidate: false,                     // only invalidated by tag
      tags: [dashboardCacheTag(userId)],
    },
  )()
}

/**
 * Cached subscription payment events — only needed on the Today tab (calendar).
 * Kept separate so other tabs don't pay for the 400-row query.
 */
export function getCachedPaymentEvents(userId: string) {
  return unstable_cache(
    async () => {
      const admin = createAdminClient()
      const { data } = await admin
        .from('subscription_payments')
        .select('*')
        .eq('user_id', userId)
        .order('paid_at', { ascending: false })
        .limit(400)
      return (data ?? []) as SubscriptionPayment[]
    },
    ['dashboard-payment-events', userId],
    {
      revalidate: false,
      tags: [dashboardCacheTag(userId)],
    },
  )()
}
