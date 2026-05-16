import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Subscription } from '@/lib/supabase/types'
import type { SavingsAction, SavingsHistoryResult } from '@/lib/savings-history'
import SavingsSimulatorView from '../SavingsSimulatorView'
import SavingsHistory from '../SavingsHistory'
import ActionTimeline from '../ActionTimeline'
import { getPlannedActions } from './actions'
import type { DbPlannedAction } from './actions'

export default async function SavingsPage({
  searchParams,
}: {
  searchParams: Promise<{ openChat?: string; q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const initialOpenChat = sp.openChat === '1'
  const initialChatQuery = typeof sp.q === 'string' ? sp.q : null

  // Параллельно грузим всё что нужно
  const [subsResult, plannedActions, recentSavingsResult] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('next_charge_date', { ascending: true }),
    getPlannedActions(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('savings_actions')
      .select('id, subscription_id, subscription_name, amount_monthly, currency, action_type, note, acted_at')
      .eq('user_id', user.id)
      .order('acted_at', { ascending: false })
      .limit(10),
  ])

  const subs = (subsResult.data ?? []) as Subscription[]
  const recentSavings = ((recentSavingsResult.data ?? []) as SavingsAction[])

  // Compute SavingsHistory data server-side to pass as props
  const savingsActions = recentSavings
  const currencyCount: Record<string, number> = {}
  for (const a of savingsActions) { currencyCount[a.currency] = (currencyCount[a.currency] ?? 0) + 1 }
  const dominantCurrency = Object.entries(currencyCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'RUB'
  const totalSavedMonthly = savingsActions.filter(a => a.currency === dominantCurrency).reduce((sum, a) => sum + Number(a.amount_monthly), 0)
  const savingsHistoryData: SavingsHistoryResult | null = savingsActions.length > 0 ? {
    actions: savingsActions,
    totalSavedMonthly,
    totalSavedYearly: totalSavedMonthly * 12,
    currency: dominantCurrency,
  } : null

  return (
    <main className="px-6 py-6">
      <div className="max-w-[1180px]">
        <SavingsSimulatorView
          subs={subs}
          initialPlannedActions={plannedActions}
          initialOpenChat={initialOpenChat}
          initialChatQuery={initialChatQuery}
        />

        {/* Лента действий: запланированные + завершённые вместе */}
        <ActionTimeline
          initialPlannedActions={plannedActions}
          recentSavingsActions={recentSavings}
        />

        <SavingsHistory data={savingsHistoryData} />
      </div>
    </main>
  )
}
