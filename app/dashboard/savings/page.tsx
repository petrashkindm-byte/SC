import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Subscription } from '@/lib/supabase/types'
import SavingsSimulatorView from '../SavingsSimulatorView'
import AnalyticsView from '../AnalyticsView'
import ClientOnly from '../ui/ClientOnly'
import { getPlannedActions } from './actions'

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
  const [subsResult, plannedActions] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('next_charge_date', { ascending: true }),
    getPlannedActions(),
  ])

  const subs = (subsResult.data ?? []) as Subscription[]

  return (
    <main className="px-6 py-6">
      <div className="max-w-[1180px]">
        <ClientOnly fallback={<div className="h-[60vh]" aria-hidden />}>
          <SavingsSimulatorView
            subs={subs}
            initialPlannedActions={plannedActions}
            initialOpenChat={initialOpenChat}
            initialChatQuery={initialChatQuery}
          />

          {/* ── Аналитика — только на мобильном (на десктопе отдельная вкладка в сайдбаре) ── */}
          <div className="md:hidden mt-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e7e3dc]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#8e8e93]">Аналитика</span>
              <div className="h-px flex-1 bg-[#e7e3dc]" />
            </div>
            <AnalyticsView subs={subs} currency="RUB" />
          </div>
        </ClientOnly>
      </div>
    </main>
  )
}
