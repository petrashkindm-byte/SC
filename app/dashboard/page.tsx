import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCachedDashboardData, getCachedPaymentEvents } from '@/lib/dashboard-cache'
import DashboardClient from './DashboardClient'
import type { PaymentsFilter } from './PaymentsTable'

type DashboardTab = 'today' | 'payments' | 'analytics'

const PAYMENTS_FILTERS: PaymentsFilter[] = ['all', 'active', 'soon', 'paused', 'cancelled']

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; paymentsFilter?: string; openSub?: string }>
}) {
  // Auth check — still needs the cookie-based client (can't be cached)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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

  // userName — derived client-side from user metadata (no extra query)
  const rawName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ?? ''
  const firstName = rawName.includes('@') ? rawName.split('@')[0] : rawName.split(' ')[0]
  const userName = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  // Cached main data (invalidated on any mutation via revalidateTag)
  const { subs, alerts } = await getCachedDashboardData(user.id)

  // Payment events (400 rows) — only needed for the Today calendar view
  const paymentEvents = tab === 'today' ? await getCachedPaymentEvents(user.id) : []

  return (
    <main className="px-6 py-6">
      <div className="max-w-[1180px]">
        <DashboardClient
          subs={subs}
          tab={tab}
          paymentsFilter={paymentsFilter}
          priceAlerts={alerts}
          paymentEvents={paymentEvents}
          userName={userName}
        />
      </div>
    </main>
  )
}
