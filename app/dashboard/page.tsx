import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Subscription } from '@/lib/supabase/types'
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

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('next_charge_date', { ascending: true })

  const subs = (subscriptions ?? []) as Subscription[]

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
        <DashboardClient subs={subs} tab={tab} paymentsFilter={paymentsFilter} />
      </div>
    </main>
  )
}
