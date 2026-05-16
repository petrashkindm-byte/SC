'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import type { PriceAlert, Subscription, SubscriptionPayment } from '@/lib/supabase/types'
import AnalyticsView from './AnalyticsView'
import PaymentsTable, { type PaymentsFilter } from './PaymentsTable'
import TodayView from './TodayView'
import { actionButtonClass } from './ui/action-button'

type DashboardTab = 'today' | 'payments' | 'analytics'

type Props = {
  subs: Subscription[]
  priceAlerts?: PriceAlert[]
  paymentEvents?: SubscriptionPayment[]
  tab?: DashboardTab
  paymentsFilter?: PaymentsFilter
  userName?: string
}

export default function DashboardClient({
  subs: allSubs,
  priceAlerts = [],
  paymentEvents = [],
  tab: dashTab = 'today',
  paymentsFilter = 'all',
  userName = '',
}: Props) {
  const currency = useMemo(
    () => allSubs.find(s => s.status === 'active')?.currency ?? allSubs[0]?.currency ?? 'RUB',
    [allSubs],
  )

  // Tab routing
  if (dashTab === 'payments')
    return <PaymentsTable subs={allSubs} currency={currency} initialFilter={paymentsFilter} />
  if (dashTab === 'analytics') return <AnalyticsView subs={allSubs} currency={currency} />

  // Empty state
  if (allSubs.length === 0) {
    return (
      <section className="rounded-2xl border border-[#ebe6df] bg-white px-6 py-12 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] text-center max-w-xl mx-auto">
        <div className="text-4xl mb-4">📋</div>
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em] text-[#1a1a2e] mb-2">Подписок пока нет</h1>
        <p className="text-sm text-[#6b6b80] mb-8">Добавьте вручную или загрузите CSV-файл — и здесь появятся траты, аналитика и напоминания</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard/subscriptions/new"
            className={`inline-flex items-center gap-2 px-6 py-3 ${actionButtonClass('primary')} transition-all`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            Добавить вручную
          </Link>
          <Link
            href="/dashboard/import"
            className={`inline-flex items-center gap-2 px-6 py-3 ${actionButtonClass('secondary')} transition-colors`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Загрузить CSV
          </Link>
        </div>
        <p className="mt-6 text-xs text-[#8e8e93]">
          Также можно добавить подписки в мобильном приложении — они появятся здесь автоматически
        </p>
      </section>
    )
  }

  return <TodayView subs={allSubs} priceAlerts={priceAlerts} paymentEvents={paymentEvents} userName={userName} />
}
