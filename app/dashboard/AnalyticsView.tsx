'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { coerceNumber } from '@/lib/coerce-number'
import { categoryLabelRu, formatBillingCycleRu } from '@/lib/subscription-labels'
import type { Subscription } from '@/lib/supabase/types'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import PaymentServiceIcon from './PaymentServiceIcon'
import { fmtCurrency, groupMonthlyByCurrency, formatGroups, getMonthlyAmount, type CurrencyGroup } from '@/lib/currency'
import CurrencyAmount from './CurrencyAmount'

/** Следующие 12 месяцев — какие подписки спишутся в этом месяце, сгруппированные по валюте */
function projectByMonth(subs: Subscription[]): { label: string; groups: CurrencyGroup[] }[] {
  const now = new Date()
  const result: { label: string; groups: CurrencyGroup[] }[] = []

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const label = d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' })

    const map = new Map<string, number>()
    for (const sub of subs) {
      if (sub.status !== 'active') continue
      const amount = coerceNumber(sub.amount)
      const cur = (sub.currency ?? 'RUB').toUpperCase()

      if (sub.billing_cycle === 'yearly') {
        const nextCharge = new Date(sub.next_charge_date)
        if (nextCharge.getFullYear() === d.getFullYear() && nextCharge.getMonth() === d.getMonth()) {
          map.set(cur, (map.get(cur) ?? 0) + amount * sub.billing_interval)
        }
      } else {
        map.set(cur, (map.get(cur) ?? 0) + getMonthlyAmount(sub))
      }
    }
    const groups = Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([currency, total]) => ({ currency, total }))
    result.push({ label, groups })
  }
  return result
}

export default function AnalyticsView({
  subs,
  currency,
}: {
  subs: Subscription[]
  currency: string
}) {
  void currency
  const active = useMemo(() => subs.filter((s) => s.status === 'active'), [subs])

  const monthlyGroups = useMemo(
    () => groupMonthlyByCurrency(active, getMonthlyAmount),
    [active],
  )

  const monthBars = useMemo(() => projectByMonth(active), [active])
  // Высота баров — по сумме всех валют (пропорции, не финансовые)
  const maxBar = Math.max(...monthBars.map((b) => b.groups.reduce((s, g) => s + g.total, 0)), 1)

  const categoryRows = useMemo(() => {
    const byCat = new Map<string, Map<string, number>>()
    for (const s of active) {
      const m = getMonthlyAmount(s)
      const cur = (s.currency ?? 'RUB').toUpperCase()
      if (!byCat.has(s.category_slug)) byCat.set(s.category_slug, new Map())
      const curMap = byCat.get(s.category_slug)!
      curMap.set(cur, (curMap.get(cur) ?? 0) + m)
    }
    const monthlyMap = new Map(monthlyGroups.map((g) => [g.currency, g.total]))
    return [...byCat.entries()]
      .map(([slug, curMap]) => {
        const groups = Array.from(curMap.entries())
          .sort(([, a], [, b]) => b - a)
          .map(([cur, total]) => ({
            currency: cur,
            total,
            pct: (monthlyMap.get(cur) ?? 0) > 0 ? (total / monthlyMap.get(cur)!) * 100 : 0,
          }))
        return { slug, groups }
      })
      .sort((a, b) => (b.groups[0]?.total ?? 0) - (a.groups[0]?.total ?? 0))
  }, [active, monthlyGroups])

  const sortedByAmount = useMemo(
    () => [...active].sort((a, b) => coerceNumber(b.amount) - coerceNumber(a.amount)),
    [active],
  )

  return (
    <>
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e]">Аналитика</h1>
          <p className="text-sm text-[#6b6b80] mt-1">Расходы по месяцам, категориям и сервисам</p>
        </div>
        <Link
          href="/dashboard/savings"
          className="text-sm font-semibold text-[#5b43d4] hover:text-[#4b36b6] shrink-0"
        >
          Симулятор экономии →
        </Link>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <p className="text-xs text-[#6b6b80] uppercase tracking-wide mb-2">Активных</p>
          <p className="text-[34px] leading-none font-bold tracking-[-0.03em] text-[#1a1a2e]">{active.length}</p>
          <p className="text-xs text-[#8e8e93] mt-2">платежей в учёте</p>
        </div>
        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <p className="text-xs text-[#6b6b80] uppercase tracking-wide mb-2">В месяц</p>
          <CurrencyAmount groups={monthlyGroups} className="text-[34px] leading-none font-bold tracking-[-0.03em] text-[#12b76a]" />
          <p className="text-xs text-[#8e8e93] mt-2">ежемесячный эквивалент</p>
        </div>
        <div className="rounded-2xl border border-[#ede9fc] bg-[#f7f5ff] p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <p className="text-xs text-[#6b6b80] uppercase tracking-wide mb-2">В год</p>
          <CurrencyAmount groups={monthlyGroups} multiply={12} className="text-[34px] leading-none font-bold tracking-[-0.03em] text-[#5b43d4]" />
          <p className="text-xs text-[#8e8e93] mt-2">прогноз на год</p>
        </div>
      </div>

      {active.length === 0 ? (
        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-10 text-center shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <p className="text-[#8e8e93] text-sm">Нет активных подписок для аналитики</p>
          <Link href="/dashboard/subscriptions/new" className="mt-4 inline-flex text-sm text-[#5b43d4] hover:text-[#4b36b6]">
            Добавить подписку →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Bar chart */}
            <div className="rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
              <h2 className="text-[15px] font-semibold text-[#1a1a2e] mb-1">Расходы по месяцам</h2>
              <p className="text-xs text-[#8e8e93] mb-4">
                Ежемесячный эквивалент; годовые — в месяц реального списания
              </p>
              <div className="flex items-end gap-1.5 h-32">
                {monthBars.map((bar, i) => {
                  const barTotal = bar.groups.reduce((s, g) => s + g.total, 0)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <div
                        className="w-full rounded-t-sm bg-[#7b61ff] opacity-80 hover:opacity-100 transition-opacity"
                        style={{ height: `${Math.max(4, (barTotal / maxBar) * 100)}%` }}
                        title={bar.groups.length > 0 ? `${bar.label}: ${formatGroups(bar.groups)}` : bar.label}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-1.5 mt-1">
                {monthBars.map((bar, i) => (
                  <div key={i} className="flex-1 min-w-0 text-center">
                    <span className="text-[9px] text-[#8e8e93] leading-none">{bar.label.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
              <h2 className="text-[15px] font-semibold text-[#1a1a2e] mb-1">По категориям</h2>
              <p className="text-xs text-[#8e8e93] mb-4">Доля трат в месяц по каждой категории</p>
              <ul className="space-y-2.5">
                {categoryRows.map(({ slug, groups }) => (
                  <li key={slug}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#1a1a2e]">{categoryLabelRu(slug)}</span>
                      <span className="text-right tabular-nums">
                        {groups.map((g, i) => (
                          <span key={g.currency} className={i === 0 ? 'text-[#1a1a2e] font-medium' : 'block text-[11px] text-[#8e8e93]'}>
                            {fmtCurrency(g.total, g.currency)}
                            {i === 0 && (
                              <span className="text-[#8e8e93] font-normal ml-1 text-xs">{Math.round(g.pct)}%</span>
                            )}
                          </span>
                        ))}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#ececf0] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#7b61ff]"
                        style={{ width: `${Math.min(100, groups[0]?.pct ?? 0)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Full table */}
          <div className="rounded-2xl border border-[#e7e3dc] bg-white overflow-hidden shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
            <div className="px-5 py-4 border-b border-[#f0ece6]">
              <h2 className="text-[15px] font-semibold text-[#1a1a2e]">Все активные по стоимости</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0ece6] text-[#6b6b80] text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium">Сервис</th>
                    <th className="text-left px-4 py-3 font-medium">Следующее</th>
                    <th className="text-left px-4 py-3 font-medium">Цикл</th>
                    <th className="text-right px-4 py-3 font-medium">Сумма</th>
                    <th className="text-right px-5 py-3 font-medium">В месяц</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByAmount.map((sub) => {
                    const rowIcon = resolveSubscriptionIconDisplay(sub.notes, sub.icon, sub.category_slug)
                    return (
                    <tr key={sub.id} className="border-t border-[#f0ece6] hover:bg-[#f8f6f2] transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/dashboard/subscriptions/${sub.id}`} className="flex items-center gap-2 hover:text-[#5b43d4]">
                          <PaymentServiceIcon
                            icon={sub.icon}
                            categorySlug={sub.category_slug}
                            iconBg={rowIcon.iconBg}
                            shape={rowIcon.shape}
                            size={28}
                            className="shrink-0"
                          />
                          <span className="font-medium text-[#1a1a2e]">{sub.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#6b6b80] whitespace-nowrap tabular-nums text-xs">
                        {new Date(sub.next_charge_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-[#6b6b80] whitespace-nowrap text-xs">
                        {formatBillingCycleRu(sub)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1a1a2e] tabular-nums whitespace-nowrap">
                        {fmtCurrency(coerceNumber(sub.amount), sub.currency ?? 'RUB', 2)}
                      </td>
                      <td className="px-5 py-3 text-right text-[#6b6b80] tabular-nums text-xs whitespace-nowrap">
                        {fmtCurrency(getMonthlyAmount(sub), sub.currency ?? 'RUB')}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#e7e3dc] bg-[#f8f6f2]">
                    <td className="px-5 py-3 text-sm font-semibold text-[#1a1a2e]" colSpan={4}>
                      Итого в месяц
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-[#5b43d4] tabular-nums text-sm whitespace-nowrap">
                      {formatGroups(monthlyGroups)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}
