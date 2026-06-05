'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { coerceNumber } from '@/lib/coerce-number'
import { categoryLabel } from '@/lib/subscription-labels'
import type { Subscription } from '@/lib/supabase/types'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import PaymentServiceIcon from './PaymentServiceIcon'
import { fmtCurrency, groupMonthlyByCurrency, formatGroups, getMonthlyAmount, type CurrencyGroup } from '@/lib/currency'
import { useLang } from '@/lib/LangContext'

type MonthBar = { label: string; groups: CurrencyGroup[]; hasAnnual: boolean; isCurrentMonth: boolean }

/** Следующие 12 месяцев — какие подписки спишутся в этом месяце, сгруппированные по валюте */
function projectByMonth(subs: Subscription[]): MonthBar[] {
  const now = new Date()
  const result: MonthBar[] = []

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const label = d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' })
    const isCurrentMonth = i === 0

    const map = new Map<string, number>()
    let hasAnnual = false
    for (const sub of subs) {
      if (sub.status !== 'active') continue
      const amount = coerceNumber(sub.amount)
      const cur = (sub.currency ?? 'RUB').toUpperCase()

      if (sub.billing_cycle === 'yearly') {
        const nextCharge = new Date(sub.next_charge_date)
        if (nextCharge.getFullYear() === d.getFullYear() && nextCharge.getMonth() === d.getMonth()) {
          // Реальное списание — это сумма одного платежа (amount), независимо от интервала
          map.set(cur, (map.get(cur) ?? 0) + amount)
          hasAnnual = true
        }
      } else {
        map.set(cur, (map.get(cur) ?? 0) + getMonthlyAmount(sub))
      }
    }
    const groups = Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([currency, total]) => ({ currency, total }))
    result.push({ label, groups, hasAnnual, isCurrentMonth })
  }
  return result
}

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

function AnimatedCurrencyAmount({
  groups,
  multiply = 1,
  className,
  duration = 900,
}: {
  groups: CurrencyGroup[]
  multiply?: number
  className?: string
  duration?: number
}) {
  const rawTotal = (groups[0]?.total ?? 0) * multiply
  const animated = useCountUp(rawTotal, duration)
  const currency = groups[0]?.currency ?? 'RUB'
  return <span className={className}>{fmtCurrency(animated, currency)}</span>
}

const BAR_H = 140

function BarChart({
  monthBars,
  maxBar,
  monthlyGroups,
}: {
  monthBars: MonthBar[]
  maxBar: number
  monthlyGroups: CurrencyGroup[]
}) {
  const { strings } = useLang()
  const a = strings.analytics
  const [hovered, setHovered] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30)
    return () => clearTimeout(t)
  }, [])

  // Average monthly total (from normalized monthly groups — includes amortized annual)
  const avgMonthly = monthlyGroups.reduce((s, g) => s + g.total, 0)
  const avgPx = maxBar > 0 ? Math.max(1, (avgMonthly / maxBar) * BAR_H) : 0
  const avgCurrency = monthlyGroups[0]?.currency ?? 'RUB'

  return (
    <div>
      {/* Chart area */}
      <div className="relative flex items-end gap-1 h-[140px]">
        {/* Average dashed line */}
        {avgPx > 0 && (
          <div
            className="absolute left-0 right-0 pointer-events-none z-10"
            style={{ bottom: avgPx }}
          >
            <div
              className="su-line-draw w-full border-t-2"
              style={{ borderColor: '#5b43d4', borderStyle: 'dashed', opacity: 0.45 }}
            />
          </div>
        )}

        {monthBars.map((bar, i) => {
          const barTotal = bar.groups.reduce((s, g) => s + g.total, 0)
          const pxHeight = Math.max(6, (barTotal / maxBar) * BAR_H)
          const isHovered = hovered === i
          const color = bar.isCurrentMonth
            ? '#5b43d4'
            : bar.hasAnnual
            ? '#f59e0b'
            : '#a78bfa'
          const staggerDelay = `${i * 55}ms`
          const easing = bar.isCurrentMonth
            ? 'cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'cubic-bezier(0.22, 1, 0.36, 1)'

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end min-w-0 h-full cursor-default relative"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip */}
              {isHovered && barTotal > 0 && (
                <div
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <div className="rounded-xl bg-[#1a1a2e] px-3 py-2 text-white shadow-xl">
                    <p className="text-[11px] text-white/60 leading-none mb-1">{bar.label}</p>
                    <p className="text-[14px] font-bold leading-none">{formatGroups(bar.groups)}</p>
                    <p className="text-[10px] text-white/50 mt-1.5 leading-snug">
                      {bar.hasAnnual
                        ? a.tooltipReal
                        : a.tooltipAvg(fmtCurrency(avgMonthly, avgCurrency, 0))}
                    </p>
                  </div>
                  <div className="w-2.5 h-2.5 bg-[#1a1a2e] rotate-45 mx-auto -mt-[5px]" />
                </div>
              )}

              {/* Amount label on top */}
              {barTotal > 0 && (
                <p
                  className="text-[8px] leading-none mb-0.5 tabular-nums font-semibold"
                  style={{ color, opacity: isHovered ? 1 : 0.75 }}
                >
                  {bar.groups[0]
                    ? bar.groups[0].total >= 1000
                      ? `${Math.round(bar.groups[0].total / 1000)}к`
                      : Math.round(bar.groups[0].total).toLocaleString('ru-RU')
                    : ''}
                </p>
              )}

              {/* Bar — grows from bottom on mount */}
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

      {/* X-axis labels */}
      <div className="flex gap-1 mt-1.5">
        {monthBars.map((bar, i) => (
          <div key={i} className="flex-1 min-w-0 text-center">
            <span
              className="text-[9px] leading-none"
              style={{
                color: bar.isCurrentMonth ? '#5b43d4' : bar.hasAnnual ? '#b45309' : '#8e8e93',
                fontWeight: bar.isCurrentMonth || bar.hasAnnual ? 600 : 400,
              }}
            >
              {bar.label.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-[#f0ece6]">
        <span className="flex items-center gap-1.5 text-[11px] text-[#6b6b80]">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#5b43d4]" />
          {a.legendCurrent}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#6b6b80]">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#a78bfa]" />
          {a.legendRegular}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#6b6b80]">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" />
          {a.legendAnnual}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#6b6b80]">
          <span className="inline-block w-5 border-t-2 border-dashed border-[#5b43d4] opacity-60" />
          {a.legendAvg}
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

function EfficiencyTable({
  subs,
  monthlyGroups,
}: {
  subs: Subscription[]
  monthlyGroups: CurrencyGroup[]
}) {
  const { lang, strings } = useLang()
  const a = strings.analytics
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const rows = subs.map((sub) => {
    const firstCharge = new Date(sub.first_charge_date)
    const daysSinceStart = Math.max(0, Math.round((today.getTime() - firstCharge.getTime()) / 86400000))
    const monthsSinceStart = Math.floor(daysSinceStart / 30)
    const totalSpent = estimateTotalSpent(sub, daysSinceStart)
    const monthly = getMonthlyAmount(sub)
    const iconDisplay = resolveSubscriptionIconDisplay(sub.notes, sub.icon, sub.category_slug)
    return { sub, monthly, totalSpent, monthsSinceStart, iconDisplay, currency: sub.currency ?? 'RUB' }
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
            {rows.map(({ sub, monthly, totalSpent, monthsSinceStart, iconDisplay, currency }, idx) => (
              <tr
                key={sub.id}
                className="su-fade-up-row border-t border-[#f0ece6] hover:bg-[#f8f6f2] transition-colors"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <td className="px-5 py-3">
                  <Link href={`/dashboard?tab=payments&openSub=${sub.id}`} className="flex items-center gap-2.5 hover:text-[#5b43d4] min-w-0">
                    <PaymentServiceIcon
                      icon={sub.icon}
                      categorySlug={sub.category_slug}
                      iconBg={iconDisplay.iconBg}
                      shape={iconDisplay.shape}
                      size={30}
                      className="shrink-0"
                    />
                    <span className="font-medium text-[#1a1a2e] truncate">{sub.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#6b6b80] text-[13px] whitespace-nowrap">
                  {categoryLabel(sub.category_slug, lang)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-[#1a1a2e] tabular-nums whitespace-nowrap">
                  {fmtCurrency(monthly, currency, 0)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-xs whitespace-nowrap">
                  {totalSpent > 0 ? (
                    <span>
                      <span className="font-medium text-[#1a1a2e]">≈ {fmtCurrency(totalSpent, currency, 0)}</span>
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
              <td className="px-5 py-3 text-sm font-semibold text-[#1a1a2e]" colSpan={3}>
                {a.effTotal}
              </td>
              <td className="px-5 py-3 text-right font-bold text-[#5b43d4] tabular-nums text-sm whitespace-nowrap">
                {formatGroups(monthlyGroups)}
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
  currency,
}: {
  subs: Subscription[]
  currency: string
}) {
  void currency
  const { lang, strings } = useLang()
  const a = strings.analytics
  const active = useMemo(() => subs.filter((s) => s.status === 'active'), [subs])

  const monthlyGroups = useMemo(
    () => groupMonthlyByCurrency(active, getMonthlyAmount),
    [active],
  )

  const monthBars = useMemo(() => projectByMonth(active), [active])
  // Высота баров — по сумме всех валют (пропорции, не финансовые)
  const maxBar = Math.max(...monthBars.map((b) => b.groups.reduce((s, g) => s + g.total, 0)), 1)

  const categoryRows = useMemo(() => {
    const byCat = new Map<string, { curMap: Map<string, number>; subs: typeof active }>()
    for (const s of active) {
      const m = getMonthlyAmount(s)
      const cur = (s.currency ?? 'RUB').toUpperCase()
      if (!byCat.has(s.category_slug)) byCat.set(s.category_slug, { curMap: new Map(), subs: [] })
      const entry = byCat.get(s.category_slug)!
      entry.curMap.set(cur, (entry.curMap.get(cur) ?? 0) + m)
      entry.subs.push(s)
    }
    const monthlyMap = new Map(monthlyGroups.map((g) => [g.currency, g.total]))
    return [...byCat.entries()]
      .map(([slug, { curMap, subs }]) => {
        const groups = Array.from(curMap.entries())
          .sort(([, a], [, b]) => b - a)
          .map(([cur, total]) => ({
            currency: cur,
            total,
            pct: (monthlyMap.get(cur) ?? 0) > 0 ? (total / monthlyMap.get(cur)!) * 100 : 0,
          }))
        // top-3 subs by monthly amount for icon display
        const topSubs = [...subs]
          .sort((a, b) => getMonthlyAmount(b) - getMonthlyAmount(a))
          .slice(0, 3)
        return { slug, groups, topSubs }
      })
      .sort((a, b) => (b.groups[0]?.total ?? 0) - (a.groups[0]?.total ?? 0))
  }, [active, monthlyGroups])

  const sortedByAmount = useMemo(
    () => [...active].sort((a, b) => coerceNumber(b.amount) - coerceNumber(a.amount)),
    [active],
  )

  const animatedActiveCount = useCountUp(active.length, 400)

  // Category progress bars mounted state
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <p className="text-xs text-[#6b6b80] uppercase tracking-wide mb-2">{a.statActive}</p>
          <p className="text-[34px] leading-none font-bold tracking-[-0.03em] text-[#1a1a2e] tabular-nums">{animatedActiveCount}</p>
          <p className="text-xs text-[#8e8e93] mt-2">{a.statActiveSubtitle}</p>
        </div>
        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <p className="text-xs text-[#6b6b80] uppercase tracking-wide mb-2">{a.statPerMonth}</p>
          <AnimatedCurrencyAmount groups={monthlyGroups} duration={1000} className="text-[34px] leading-none font-bold tracking-[-0.03em] text-[#12b76a] tabular-nums" />
          <p className="text-xs text-[#8e8e93] mt-2">{a.statPerMonthSubtitle}</p>
        </div>
        <div className="rounded-2xl border border-[#ede9fc] bg-[#f7f5ff] p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <p className="text-xs text-[#6b6b80] uppercase tracking-wide mb-2">{a.statPerYear}</p>
          <AnimatedCurrencyAmount groups={monthlyGroups} multiply={12} duration={1400} className="text-[34px] leading-none font-bold tracking-[-0.03em] text-[#5b43d4] tabular-nums" />
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
              <p className="text-xs text-[#8e8e93] mb-4">
                {a.barChartSubtitle}
              </p>
              <BarChart monthBars={monthBars} maxBar={maxBar} monthlyGroups={monthlyGroups} />
            </div>

            {/* Category breakdown */}
            <div className="rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
              <h2 className="text-[15px] font-semibold text-[#1a1a2e] mb-1">{a.catTitle}</h2>
              <p className="text-xs text-[#8e8e93] mb-4">{a.catSubtitle}</p>
              <ul className="space-y-3">
                {categoryRows.map(({ slug, groups, topSubs }, catIdx) => (
                  <li key={slug} className="su-fade-up" style={{ animationDelay: `${catIdx * 70}ms` }}>
                    <Link
                      href={`/dashboard/collections?category=${slug}`}
                      className="group flex justify-between items-center text-sm mb-1.5 rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-[#f4f2ff] transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {/* App icons */}
                        <span className="flex items-center -space-x-1.5 shrink-0">
                          {topSubs.map((s) => {
                            const disp = resolveSubscriptionIconDisplay(s.notes, s.icon, s.category_slug)
                            return (
                              <PaymentServiceIcon
                                key={s.id}
                                icon={s.icon}
                                categorySlug={s.category_slug}
                                iconBg={disp.iconBg}
                                shape="circle"
                                size={22}
                                className="ring-2 ring-white"
                              />
                            )
                          })}
                        </span>
                        <span className="flex items-center gap-1 text-[#1a1a2e] group-hover:text-[#5b43d4] transition-colors truncate">
                          {categoryLabel(slug, lang)}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 transition-transform duration-150 shrink-0" aria-hidden>
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </span>
                      </span>
                      <span className="text-right tabular-nums shrink-0 ml-2">
                        {groups.map((g, i) => (
                          <span key={g.currency} className={i === 0 ? 'text-[#1a1a2e] font-medium group-hover:text-[#5b43d4] transition-colors' : 'block text-[11px] text-[#8e8e93]'}>
                            {fmtCurrency(g.total, g.currency)}
                            {i === 0 && (
                              <span className="text-[#8e8e93] font-normal ml-1 text-xs">{Math.round(g.pct)}%</span>
                            )}
                          </span>
                        ))}
                      </span>
                    </Link>
                    <div className="h-1.5 rounded-full bg-[#ececf0] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#7b61ff]"
                        style={{
                          width: catMounted ? `${Math.min(100, groups[0]?.pct ?? 0)}%` : '0%',
                          transition: `width 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${catIdx * 100}ms`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-[#f0ece6]">
                <Link
                  href="/dashboard/collections"
                  className="su-arrow-link text-xs font-semibold text-[#5b43d4] hover:text-[#4b36b6]"
                >
                  {strings.analytics.catViewAll}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Efficiency table */}
          <EfficiencyTable subs={sortedByAmount} monthlyGroups={monthlyGroups} />
        </>
      )}
    </>
  )
}
