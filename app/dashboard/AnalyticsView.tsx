'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { coerceNumber } from '@/lib/coerce-number'
import { categoryLabel } from '@/lib/subscription-labels'
import type { Subscription } from '@/lib/supabase/types'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import PaymentServiceIcon from './PaymentServiceIcon'
import {
  getMonthlyAmount,
  formatMoney,
  getDisplayAmount,
  aggregateMonthlyInBaseCurrency,
  resolveSubscriptionCurrency,
} from '@/lib/currency'
import { STATIC_RATES } from '@/lib/rates'
import { useLang } from '@/lib/LangContext'

// ── Counter-up hook ──────────────────────────────────────────
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(target)
  const previousTargetRef = useRef(target)
  useEffect(() => {
    const from = previousTargetRef.current
    if (from === target) return
    previousTargetRef.current = target
    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

// ── Monthly projection per month in baseCurrency ──────────────
type MonthBar = {
  label: string
  total: number        // in baseCurrency
  hasAnnual: boolean
  isCurrentMonth: boolean
  excludedCount: number
}

function buildMonthBars(subs: Subscription[], baseCurrency: string): MonthBar[] {
  const now = new Date()
  const result: MonthBar[] = []

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const label = d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' })
    let total = 0
    let hasAnnual = false
    let excludedCount = 0

    for (const sub of subs) {
      if (sub.status !== 'active') continue
      if (sub.billing_cycle === 'yearly') {
        const nextCharge = new Date(sub.next_charge_date)
        if (nextCharge.getFullYear() === d.getFullYear() && nextCharge.getMonth() === d.getMonth()) {
          const display = getDisplayAmount(sub, baseCurrency, STATIC_RATES)
          if (display.conversionUnavailable) { excludedCount++; continue }
          total += display.amount * 12
          hasAnnual = true
        }
      } else {
        const display = getDisplayAmount(sub, baseCurrency, STATIC_RATES)
        if (display.conversionUnavailable) { excludedCount++; continue }
        total += display.amount
      }
    }
    result.push({ label, total, hasAnnual, isCurrentMonth: i === 0, excludedCount })
  }
  return result
}



const BAR_H = 140

function BarChart({
  monthBars,
  maxBar,
  avgMonthly,
  baseCurrency,
}: {
  monthBars: MonthBar[]
  maxBar: number
  avgMonthly: number
  baseCurrency: string
}) {
  const { strings } = useLang()
  const a = strings.analytics
  const [hovered, setHovered] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30)
    return () => clearTimeout(t)
  }, [])

  const avgPx = maxBar > 0 ? Math.max(1, (avgMonthly / maxBar) * BAR_H) : 0

  return (
    <div>
      <div className="relative flex items-end gap-1 h-[140px]">
        {avgPx > 0 && (
          <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ bottom: avgPx }}>
            <div className="su-line-draw w-full border-t-2" style={{ borderColor: '#5b43d4', borderStyle: 'dashed', opacity: 0.45 }} />
          </div>
        )}

        {monthBars.map((bar, i) => {
          const pxHeight = Math.max(6, (bar.total / maxBar) * BAR_H)
          const isHovered = hovered === i
          const color = bar.isCurrentMonth ? '#5b43d4' : bar.hasAnnual ? '#f59e0b' : '#a78bfa'
          const staggerDelay = `${i * 55}ms`
          const easing = bar.isCurrentMonth ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'cubic-bezier(0.22, 1, 0.36, 1)'

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end min-w-0 h-full cursor-default relative"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {isHovered && bar.total > 0 && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none" style={{ whiteSpace: 'nowrap' }}>
                  <div className="rounded-xl bg-[#1a1a2e] px-3 py-2 text-white shadow-xl">
                    <p className="text-[11px] text-white/60 leading-none mb-1">{bar.label}</p>
                    <p className="text-[14px] font-bold leading-none">{formatMoney(bar.total, baseCurrency)}</p>
                    <p className="text-[10px] text-white/50 mt-1.5 leading-snug">
                      {bar.hasAnnual ? a.tooltipReal : a.tooltipAvg(formatMoney(avgMonthly, baseCurrency))}
                    </p>
                  </div>
                  <div className="w-2.5 h-2.5 bg-[#1a1a2e] rotate-45 mx-auto -mt-[5px]" />
                </div>
              )}

              {bar.total > 0 && (
                <p className="text-[8px] leading-none mb-0.5 tabular-nums font-semibold" style={{ color, opacity: isHovered ? 1 : 0.75 }}>
                  {bar.total >= 1000 ? `${Math.round(bar.total / 1000)}к` : Math.round(bar.total).toLocaleString('ru-RU')}
                </p>
              )}

              <div
                className="w-full rounded-t-md"
                style={{
                  height: mounted ? pxHeight : 0,
                  background: color,
                  opacity: isHovered ? 1 : 0.85,
                  transition: `height 0.55s ${easing} ${staggerDelay}, opacity 0.15s ease`,
                  willChange: 'height',
                }}
              />
            </div>
          )
        })}
      </div>

      <div className="flex gap-1 mt-1.5">
        {monthBars.map((bar, i) => (
          <div key={i} className="flex-1 min-w-0 text-center">
            <span className="text-[9px] leading-none" style={{ color: bar.isCurrentMonth ? '#5b43d4' : bar.hasAnnual ? '#b45309' : '#8e8e93', fontWeight: bar.isCurrentMonth || bar.hasAnnual ? 600 : 400 }}>
              {bar.label.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-[#f0ece6]">
        <span className="flex items-center gap-1.5 text-[11px] text-[#6b6b80]">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#5b43d4]" />{a.legendCurrent}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#6b6b80]">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#a78bfa]" />{a.legendRegular}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#6b6b80]">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" />{a.legendAnnual}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#6b6b80]">
          <span className="inline-block w-5 border-t-2 border-dashed border-[#5b43d4] opacity-60" />{a.legendAvg}
        </span>
      </div>
    </div>
  )
}

function estimateTotalSpent(sub: Subscription, daysSinceStart: number): number {
  const amount = coerceNumber(sub.amount)
  const cycleDays =
    sub.billing_cycle === 'weekly'    ? 7 * sub.billing_interval :
    sub.billing_cycle === 'monthly'   ? 30 * sub.billing_interval :
    sub.billing_cycle === 'quarterly' ? 91 * sub.billing_interval :
    sub.billing_cycle === 'yearly'    ? 365 * sub.billing_interval :
    sub.custom_interval_days ?? 30
  const cycles = Math.floor(daysSinceStart / cycleDays)
  return cycles * amount
}

function MissingRateWarning({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 mb-4">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>
        {count === 1
          ? '1 платёж не учтён в итогах: нет курса валюты'
          : `${count} платежа(-ей) не учтено в итогах: нет курса валюты`}
      </span>
    </div>
  )
}

function EfficiencyTable({
  subs,
  baseCurrency,
  monthlyTotal,
}: {
  subs: Subscription[]
  baseCurrency: string
  monthlyTotal: number
}) {
  const { lang, strings } = useLang()
  const a = strings.analytics
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const rows = subs.map((sub) => {
    const firstCharge = new Date(sub.first_charge_date)
    const daysSinceStart = Math.max(0, Math.round((today.getTime() - firstCharge.getTime()) / 86400000))
    const monthsSinceStart = Math.floor(daysSinceStart / 30)
    const totalSpentOriginal = estimateTotalSpent(sub, daysSinceStart)
    const iconDisplay = resolveSubscriptionIconDisplay(sub.notes, sub.icon, sub.category_slug)
    const display = getDisplayAmount(sub, baseCurrency, STATIC_RATES)
    // Total spent estimate in baseCurrency
    const totalSpentDisplay = display.conversionUnavailable
      ? null
      : { amount: (totalSpentOriginal / coerceNumber(sub.amount)) * display.amount * 12 / 12 * (daysSinceStart / 30), isApproximate: display.isApproximate }
    // Simpler: scale monthly amount by months
    const monthlyBase = display.conversionUnavailable ? null : display.amount
    const totalBase = monthlyBase !== null ? monthlyBase * monthsSinceStart : null
    return { sub, monthlyBase, totalBase, monthsSinceStart, iconDisplay, display }
  })

  return (
    <div className="rounded-2xl border border-[#e7e3dc] bg-white overflow-hidden shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
      <div className="px-5 py-4 border-b border-[#f0ece6]">
        <h2 className="text-[15px] font-semibold text-[#1a1a2e]">{a.efficiencyTitle}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#f0ece6] text-[#6b6b80] text-xs uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">{a.effColService}</th>
              <th className="text-left px-4 py-3 font-medium">{a.effColCategory}</th>
              <th className="text-right px-4 py-3 font-medium">{a.effColPerMonth}</th>
              <th className="text-right px-5 py-3 font-medium">{a.effColTotalSpent}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ sub, monthlyBase, totalBase, monthsSinceStart, iconDisplay, display }, idx) => (
              <tr key={sub.id} className="su-fade-up-row border-t border-[#f0ece6] hover:bg-[#f8f6f2] transition-colors" style={{ animationDelay: `${idx * 80}ms` }}>
                <td className="px-5 py-3">
                  <Link href={`/dashboard?tab=payments&openSub=${sub.id}`} className="flex items-center gap-2.5 hover:text-[#5b43d4] min-w-0">
                    <PaymentServiceIcon icon={sub.icon} categorySlug={sub.category_slug} iconBg={iconDisplay.iconBg} shape={iconDisplay.shape} size={30} className="shrink-0" />
                    <span className="font-medium text-[#1a1a2e] truncate">{sub.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#6b6b80] text-[13px] whitespace-nowrap">
                  {categoryLabel(sub.category_slug, lang)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-[#1a1a2e] tabular-nums whitespace-nowrap">
                  {display.conversionUnavailable
                    ? <span title="Нет курса валюты">{formatMoney(display.amount, display.currency)}</span>
                    : formatMoney(monthlyBase ?? 0, baseCurrency, { isApproximate: display.isApproximate })}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-xs whitespace-nowrap">
                  {totalBase !== null && totalBase > 0 ? (
                    <span>
                      <span className="font-medium text-[#1a1a2e]">
                        {formatMoney(totalBase, baseCurrency, { isApproximate: display.isApproximate })}
                      </span>
                      {monthsSinceStart > 0 && (
                        <span className="block text-[11px] text-[#8e8e93] mt-0.5">{a.effSpentFor(monthsSinceStart)}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[#8e8e93]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#e7e3dc] bg-[#f8f6f2]">
              <td className="px-5 py-3 text-sm font-semibold text-[#1a1a2e]" colSpan={3}>{a.effTotal}</td>
              <td className="px-5 py-3 text-right font-bold text-[#5b43d4] tabular-nums text-sm whitespace-nowrap">
                {formatMoney(monthlyTotal, baseCurrency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default function AnalyticsView({
  subs,
  baseCurrency = 'RUB',
}: {
  subs: Subscription[]
  baseCurrency?: string
}) {
  const { lang, strings } = useLang()
  const a = strings.analytics
  const active = useMemo(() => subs.filter((s) => s.status === 'active'), [subs])

  // Aggregate in baseCurrency — single total, not groups by currency
  const aggregate = useMemo(
    () => aggregateMonthlyInBaseCurrency(active, baseCurrency, STATIC_RATES),
    [active, baseCurrency],
  )

  const monthBars = useMemo(() => buildMonthBars(active, baseCurrency), [active, baseCurrency])
  const maxBar = Math.max(...monthBars.map((b) => b.total), 1)
  // Average monthly = mean of bars without annual spikes
  const avgMonthly = useMemo(() => {
    const regular = monthBars.filter(b => !b.hasAnnual)
    const pool = regular.length > 0 ? regular : monthBars
    return pool.length > 0 ? pool.reduce((s, b) => s + b.total, 0) / pool.length : 0
  }, [monthBars])

  const categoryRows = useMemo(() => {
    const byCat = new Map<string, { total: number; subs: typeof active; excludedCount: number }>()
    for (const s of active) {
      const display = getDisplayAmount(s, baseCurrency, STATIC_RATES)
      if (!byCat.has(s.category_slug)) byCat.set(s.category_slug, { total: 0, subs: [], excludedCount: 0 })
      const entry = byCat.get(s.category_slug)!
      if (display.conversionUnavailable) { entry.excludedCount++; continue }
      entry.total += display.amount
      entry.subs.push(s)
    }
    return [...byCat.entries()]
      .map(([slug, { total, subs, excludedCount }]) => {
        const pct = aggregate.total > 0 ? (total / aggregate.total) * 100 : 0
        const topSubs = [...subs].sort((a, b) => getMonthlyAmount(b) - getMonthlyAmount(a)).slice(0, 3)
        return { slug, total, pct, topSubs, excludedCount }
      })
      .sort((a, b) => b.total - a.total)
  }, [active, baseCurrency, aggregate.total])

  const sortedByAmount = useMemo(
    () => [...active].sort((a, b) => coerceNumber(b.amount) - coerceNumber(a.amount)),
    [active],
  )

  const animatedActiveCount = useCountUp(active.length, 400)
  const animatedMonthly = useCountUp(Math.round(aggregate.total), 1000)
  const animatedYearly = useCountUp(Math.round(aggregate.total * 12), 1400)

  const [catMounted, setCatMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setCatMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e]">{a.title}</h1>
          <p className="text-sm text-[#6b6b80] mt-1">{a.subtitle}</p>
        </div>
      </header>

      <MissingRateWarning count={aggregate.excludedDueToMissingRateCount} />

      {/* Stat cards — all in baseCurrency */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <p className="text-xs text-[#6b6b80] uppercase tracking-wide mb-2">{a.statActive}</p>
          <p className="text-[34px] leading-none font-bold tracking-[-0.03em] text-[#1a1a2e] tabular-nums">{animatedActiveCount}</p>
          <p className="text-xs text-[#8e8e93] mt-2">{a.statActiveSubtitle}</p>
        </div>
        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <p className="text-xs text-[#6b6b80] uppercase tracking-wide mb-2">{a.statPerMonth}</p>
          <p className="text-[34px] leading-none font-bold tracking-[-0.03em] text-[#12b76a] tabular-nums">
            {formatMoney(animatedMonthly, baseCurrency)}
          </p>
          <p className="text-xs text-[#8e8e93] mt-2">{a.statPerMonthSubtitle}</p>
        </div>
        <div className="rounded-2xl border border-[#ede9fc] bg-[#f7f5ff] p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <p className="text-xs text-[#6b6b80] uppercase tracking-wide mb-2">{a.statPerYear}</p>
          <p className="text-[34px] leading-none font-bold tracking-[-0.03em] text-[#5b43d4] tabular-nums">
            {formatMoney(animatedYearly, baseCurrency)}
          </p>
          <p className="text-xs text-[#8e8e93] mt-2">{a.statPerYearSubtitle}</p>
        </div>
      </div>

      {active.length === 0 ? (
        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-10 text-center shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <p className="text-[#8e8e93] text-sm">{a.emptyState}</p>
          <Link href="/dashboard/subscriptions/new" className="mt-4 inline-flex text-sm text-[#5b43d4] hover:text-[#4b36b6]">
            {a.emptyStateLink}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Bar chart */}
            <div className="rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
              <h2 className="text-[15px] font-semibold text-[#1a1a2e] mb-1">{a.barChartTitle}</h2>
              <p className="text-xs text-[#8e8e93] mb-4">{a.barChartSubtitle}</p>
              <BarChart monthBars={monthBars} maxBar={maxBar} avgMonthly={avgMonthly} baseCurrency={baseCurrency} />
            </div>

            {/* Category breakdown */}
            <div className="rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
              <h2 className="text-[15px] font-semibold text-[#1a1a2e] mb-1">{a.catTitle}</h2>
              <p className="text-xs text-[#8e8e93] mb-4">{a.catSubtitle}</p>
              <ul className="space-y-3">
                {categoryRows.map(({ slug, total, pct, topSubs }, catIdx) => (
                  <li key={slug} className="su-fade-up" style={{ animationDelay: `${catIdx * 70}ms` }}>
                    <Link
                      href={`/dashboard/collections?category=${slug}`}
                      className="group flex justify-between items-center text-sm mb-1.5 rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-[#f4f2ff] transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="flex items-center -space-x-1.5 shrink-0">
                          {topSubs.map((s) => {
                            const disp = resolveSubscriptionIconDisplay(s.notes, s.icon, s.category_slug)
                            return (
                              <PaymentServiceIcon key={s.id} icon={s.icon} categorySlug={s.category_slug} iconBg={disp.iconBg} shape="circle" size={22} className="ring-2 ring-white" />
                            )
                          })}
                        </span>
                        <span className="flex items-center gap-1 text-[#1a1a2e] group-hover:text-[#5b43d4] transition-colors truncate">
                          {categoryLabel(slug, lang)}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 transition-transform duration-150 shrink-0" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
                        </span>
                      </span>
                      <span className="text-right tabular-nums shrink-0 ml-2">
                        <span className="text-[#1a1a2e] font-medium group-hover:text-[#5b43d4] transition-colors">
                          {formatMoney(total, baseCurrency)}
                          <span className="text-[#8e8e93] font-normal ml-1 text-xs">{Math.round(pct)}%</span>
                        </span>
                      </span>
                    </Link>
                    <div className="h-1.5 rounded-full bg-[#ececf0] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#7b61ff]"
                        style={{
                          width: catMounted ? `${Math.min(100, pct)}%` : '0%',
                          transition: `width 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${catIdx * 100}ms`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-[#f0ece6]">
                <Link href="/dashboard/collections" className="su-arrow-link text-xs font-semibold text-[#5b43d4] hover:text-[#4b36b6]">
                  {strings.analytics.catViewAll}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
              </div>
            </div>
          </div>

          <EfficiencyTable subs={sortedByAmount} baseCurrency={baseCurrency} monthlyTotal={aggregate.total} />
        </>
      )}
    </>
  )
}
