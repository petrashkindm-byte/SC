import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { PriceAlert, Subscription, SubscriptionPayment } from '@/lib/supabase/types'
import DashboardClient from './DashboardClient'
import type { PaymentsFilter } from './PaymentsTable'

type DashboardTab = 'today' | 'payments' | 'analytics'

const PAYMENTS_FILTERS: PaymentsFilter[] = ['all', 'active', 'soon', 'paused', 'cancelled']

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; paymentsFilter?: string }>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rawName = (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? user.email ?? ''
  const firstName = rawName.includes('@') ? rawName.split('@')[0] : rawName.split(' ')[0]
  const userName = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('next_charge_date', { ascending: true })

  const subs = (subscriptions ?? []) as Subscription[]
  const { data: priceAlerts } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', user.id)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(8)
  const alerts = (priceAlerts ?? []) as PriceAlert[]
  const { data: payments } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('user_id', user.id)
    .order('paid_at', { ascending: false })
    .limit(400)
  const paymentEvents = (payments ?? []) as SubscriptionPayment[]

  const sp = await searchParams
  const rawTab = sp.tab ?? 'today'
  const tab: DashboardTab = ['today', 'payments', 'analytics'].includes(rawTab)
    ? (rawTab as DashboardTab)
    : 'today'

  const rawPaymentsFilter = sp.paymentsFilter
  const paymentsFilter: PaymentsFilter =
    rawPaymentsFilter && PAYMENTS_FILTERS.includes(rawPaymentsFilter as PaymentsFilter)
      ? (rawPaymentsFilter as PaymentsFilter)
      : 'all'

  return (
    <main className="px-6 py-6">
      <div className="max-w-[1180px]">
        <DashboardClient subs={subs} tab={tab} paymentsFilter={paymentsFilter} priceAlerts={alerts} paymentEvents={paymentEvents} userName={userName} />
      </div>
    </main>
  )
}
