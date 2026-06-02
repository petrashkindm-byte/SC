'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDarkMode } from '@/lib/hooks/use-dark-mode'
import type { PriceAlert, Subscription, SubscriptionPayment } from '@/lib/supabase/types'
import { coerceNumber } from '@/lib/coerce-number'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import PaymentServiceIcon from './PaymentServiceIcon'
import CurrencyAmount from './CurrencyAmount'
import { fmtCurrency, groupMonthlyByCurrency, formatGroups, getMonthlyAmount } from '@/lib/currency'
import DashboardScreenHeader from './DashboardScreenHeader'
import { estimateSavingsGroups } from '@/lib/savings-estimate'
import { parseIsoDateLocal } from '@/lib/billing-engine'
import { actionButtonClass } from './ui/action-button'
import { CARD_COLOR_PRESETS } from '@/lib/subscription-viz-notes'
import type { DailyTipResult } from '@/lib/ai/types'
import { useLang } from '@/lib/LangContext'

// ── Helpers ──────────────────────────────────────────────────

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    let raf: number
    const start = Date.now()
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

function AnimatedCurrencyAmount({
  groups,
  className,
}: {
  groups: { currency: string; total: number }[]
  className?: string
}) {
  const primary = groups[0] ?? null
  const rest = groups.slice(1)
  const animatedTotal = useCountUp(primary ? Math.round(primary.total) : 0, 1000)
  if (!primary) return <span className={className}>—</span>
  return (
    <span>
      <span className={className}>{fmtCurrency(animatedTotal, primary.currency, 0)}</span>
      {rest.length > 0 && (
        <span className="block text-[13px] font-medium opacity-55 mt-0.5 leading-snug">
          {rest.map(g => fmtCurrency(Math.round(g.total), g.currency, 0)).join(' · ')}
        </span>
      )}
    </span>
  )
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

// Cycle labels and month names are derived from translation strings at render time

const DAILY_TIP_CACHE_LS = 'subcuro_daily_tip_cache_v2'

// date: 'YYYY-MM-DD' — cache is per-day, tipSummary is carried over to avoid repetition next day
type DailyTipCache = { fp: string; date: string; lang: string; tip: DailyTipResult; tipSummary: string }

function tipDetailHref(tip: DailyTipResult): string {
  const p = tip.action_path?.trim() ?? ''
  const validPath = p.startsWith('/dashboard') && !p.includes('..') && !p.includes('//')
  // Prefer action_path when it points to a specific subscription — the model sets this more reliably
  if (validPath && p.includes('/subscriptions/')) return p
  // Fall back to related_subscription_ids only when action_path is generic (/dashboard/savings etc.)
  const ids = tip.related_subscription_ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id))
  if (ids.length === 1) return `/dashboard/subscriptions/${ids[0]}`
  if (validPath) return p
  return '/dashboard/savings'
}


function AiBadgeStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#5b43d4" aria-hidden className="shrink-0 su-star-wobble">
      <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21l2.3-7-6-4.6h7.6L12 2z" />
    </svg>
  )
}

function todayDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function AiDailyTipCard({ subs, dataFingerprint }: { subs: Subscription[]; dataFingerprint: string }) {
  const isDark = useDarkMode()
  const { lang, strings } = useLang()
  const ai = strings.aiTip
  const [tip, setTip] = useState<DailyTipResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const skipCacheOnce = useRef(false)

  const fetchTip = useCallback(
    async (opts: { force: boolean }) => {
      const ids = subs.map((s) => s.id)
      if (ids.length === 0) {
        setTip(null)
        setLoading(false)
        return
      }
      const today = todayDateStr()
      let avoidSummary: string | undefined
      if (!opts.force) {
        try {
          const raw = localStorage.getItem(DAILY_TIP_CACHE_LS)
          if (raw) {
            const c = JSON.parse(raw) as DailyTipCache
            // Valid cache: same fingerprint, same day, same language
            if (c.fp === dataFingerprint && c.date === today && c.lang === lang && c.tip) {
              setTip(c.tip)
              setError(null)
              setLoading(false)
              return
            }
            // Carry previous tip as avoidSummary so next tip is different
            if (c.tipSummary) avoidSummary = c.tipSummary
          }
        } catch {
          /* ignore */
        }
      }

      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/ai/daily-tip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionIds: ids,
            locale: lang,
            avoidSummary,
          }),
        })
        const data = (await res.json()) as DailyTipResult & { error?: string }
        if (!res.ok) {
          setError(typeof data.error === 'string' ? data.error : ai.errorRequest)
          setTip(null)
          return
        }
        if (typeof data.text !== 'string') {
          setError(ai.errorInvalid)
          setTip(null)
          return
        }
        const next: DailyTipResult = {
          text: data.text,
          savings_rub: data.savings_rub ?? null,
          action_path: typeof data.action_path === 'string' ? data.action_path : '/dashboard/savings',
          kind: typeof data.kind === 'string' ? data.kind : 'other',
          related_subscription_ids: Array.isArray(data.related_subscription_ids)
            ? data.related_subscription_ids.filter((x): x is string => typeof x === 'string')
            : [],
        }
        setTip(next)
        try {
          localStorage.setItem(
            DAILY_TIP_CACHE_LS,
            JSON.stringify({
              fp: dataFingerprint,
              date: today,
              lang,
              tip: next,
              tipSummary: next.text.slice(0, 300),
            } satisfies DailyTipCache),
          )
        } catch {
          /* ignore */
        }
      } catch {
        setError(ai.errorNetwork)
        setTip(null)
      } finally {
        setLoading(false)
      }
    },
    [dataFingerprint, lang, subs],
  )

  useEffect(() => {
    if (subs.length === 0) return
    const force = skipCacheOnce.current
    skipCacheOnce.current = false
    void fetchTip({ force })
  }, [dataFingerprint, refreshTick, subs.length, fetchTip])

  const onRefresh = () => {
    skipCacheOnce.current = true
    setRefreshTick((n) => n + 1)
  }

  const titleClass = isDark ? 'text-[#ece8ff]' : 'text-[#1a1a2e]'
  const bodyMuted = isDark ? 'text-[#b4aed0]' : 'text-[#6b6b80]'
  const tipBodyClass = isDark ? 'text-[#ddd8f5]' : 'text-[#1a1a2e]'

  return (
    <section
      className="rounded-2xl border overflow-hidden shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]"
      style={{
        borderColor: isDark ? 'rgba(91,67,212,0.3)' : 'rgba(91,67,212,0.18)',
        background: isDark
          ? 'linear-gradient(to bottom, #1e1a3a, #1c1c38)'
          : 'linear-gradient(to bottom, #f7f4ff, #ffffff)',
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold rounded-full px-2.5 py-1 bg-white/90 border border-[#e0d8fc] text-[#5b43d4] shrink-0">
            <AiBadgeStar />
            AI
          </span>
          <h2 className={`text-[17px] font-bold tracking-[-0.02em] truncate ${titleClass}`}>
            {ai.title}
          </h2>
        </div>
        {/* Simulator — styled pill button */}
        <Link
          href="/dashboard/savings"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#c9bef8] bg-white/80 px-3.5 py-1.5 text-[12px] font-semibold text-[#5b43d4] hover:bg-[#ede9fc] hover:border-[#a891f5] transition-colors shrink-0 backdrop-blur-sm"
        >
          {ai.simulatorLink}
        </Link>
      </div>

      <div className="px-5 pb-5">
        {subs.length === 0 && (
          <p className={`text-sm leading-relaxed ${bodyMuted}`}>{ai.addSubsHint}</p>
        )}

        {subs.length > 0 && loading && !tip && (
          <div className="flex items-center gap-3 py-3">
            <svg className="animate-spin text-[#5b43d4]" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round"/>
            </svg>
            <span className={`text-sm ${bodyMuted}`}>{ai.loading}</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-[#fdecec] border border-[#f3c5c7] px-4 py-3 text-sm text-[#e5484d] mb-2">
            {error}
            <button type="button" onClick={onRefresh} className="block mt-2 text-xs font-medium text-[#5b43d4]">{ai.retry}</button>
          </div>
        )}

        {tip && (
          <div className="space-y-3.5 pt-0.5">
            {/* Savings badge — prominent */}
            {tip.savings_rub != null && tip.savings_rub > 0 && (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-[#dcfce7] border border-[#a7f3d0] px-3.5 py-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M12 20V4M5 13l7 7 7-7"/></svg>
                <span className="text-[14px] font-bold text-[#0d9f6e] tabular-nums">
                  {ai.upTo(fmtCurrency(tip.savings_rub, subs[0]?.currency ?? 'RUB', 0))}
                </span>
              </div>
            )}

            {/* Tip text */}
            <p className={`text-[15px] leading-relaxed ${tipBodyClass}`}>{tip.text}</p>

            {/* Action buttons — clear hierarchy */}
            <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
              {/* Primary: Подробнее */}
              <Link
                href={tipDetailHref(tip)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#5b43d4] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_3px_10px_rgba(91,67,212,0.35)] hover:bg-[#4b36b6] hover:shadow-[0_4px_14px_rgba(91,67,212,0.42)] transition-all active:scale-[0.97]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                {ai.details}
              </Link>
              {/* Secondary: Спросить ИИ о другом */}
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold border transition-all disabled:opacity-50 active:scale-[0.97] ${
                  isDark
                    ? 'border-[rgba(91,67,212,0.4)] bg-[rgba(91,67,212,0.08)] text-[#c4baff] hover:bg-[rgba(91,67,212,0.18)]'
                    : 'border-[#e0d8fc] bg-white/90 text-[#5b43d4] hover:bg-[#ede9fc] hover:border-[#c9bef8]'
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden className={loading ? 'animate-spin' : ''}><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                {ai.askOther}
              </button>
            </div>

            {loading && tip && (
              <p className={`text-[11px] ${bodyMuted}`}>{ai.updating}</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

// ── Upcoming Row ──────────────────────────────────────────────

function cycleTotalDays(sub: Subscription): number {
  const interval = sub.billing_interval ?? 1
  switch (sub.billing_cycle) {
    case 'weekly':    return 7 * interval
    case 'monthly':   return 30 * interval
    case 'quarterly': return 90 * interval
    case 'yearly':    return 365 * interval
    case 'custom':    return sub.custom_interval_days ?? 30
    default:          return 30
  }
}

function UpcomingRow({ sub, isFirst, index }: { sub: Subscription; isFirst: boolean; index: number }) {
  const isDark = useDarkMode()
  const { lang, strings } = useLang()
  const up = strings.upcoming
  const days = daysUntil(sub.next_charge_date)
  const iconDisplay = resolveSubscriptionIconDisplay(sub.notes, sub.icon, sub.category_slug)
  const presetColors = sub.card_color_preset
    ? CARD_COLOR_PRESETS.find(p => p.key === sub.card_color_preset) ?? null
    : null

  // Progress bar
  const totalDays = cycleTotalDays(sub)
  const pct = Math.min(100, Math.max(0, ((totalDays - days) / totalDays) * 100))
  const urgent = days <= 3
  const barColor = urgent
    ? 'linear-gradient(to right, #f87171, #ef4444)'
    : 'linear-gradient(to right, #c4b5f8, #8eecd6)'

  const daysLabel = lang === 'en'
    ? (days === 0 ? 'today' : `in ${days}d`)
    : (days === 0 ? 'сегодня' : `через ${days} д.`)

  const dateLocale = lang === 'en' ? 'en-US' : 'ru-RU'
  const dateLabel = new Date(sub.next_charge_date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })

  return (
    <Link
      href={`/dashboard?tab=payments&openSub=${sub.id}`}
      className={`su-slide-left grid items-center gap-x-3.5 py-3.5 text-current no-underline transition-colors hover:bg-[rgba(91,67,212,0.04)] active:scale-[0.99] ${
        isFirst ? '' : 'border-t border-[#ececee]'
      }`}
      style={{
        gridTemplateColumns: '48px 1fr auto',
        paddingLeft: '20px',
        paddingRight: '20px',
        animationDelay: `${index * 80}ms`,
        ...(presetColors ? { backgroundColor: isDark ? presetColors.darkTint : presetColors.tint } : {}),
      }}
    >
      {/* Icon */}
      <PaymentServiceIcon
        icon={sub.icon}
        categorySlug={sub.category_slug}
        iconBg={iconDisplay.iconBg}
        shape={iconDisplay.shape}
        size={48}
        className="flex-shrink-0"
      />

      {/* Name + progress bar */}
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-[#1a1a2e] truncate leading-snug mb-1.5">{sub.name}</p>
        {/* Bar meta */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#8e8e93]">
            {lang === 'en' ? 'next charge' : 'следующее списание'}
          </span>
          <span
            className="text-[10px] font-semibold"
            style={{ color: urgent ? '#ef4444' : '#5b43d4' }}
          >
            {daysLabel}
          </span>
        </div>
        {/* Bar track */}
        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(124,92,225,0.12)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      </div>

      {/* Amount + date */}
      <div className="text-right shrink-0">
        <p className="text-[15px] font-semibold text-[#1a1a2e] tabular-nums leading-snug">
          {fmtCurrency(coerceNumber(sub.amount), sub.currency ?? 'RUB', 0)}
        </p>
        <p className="text-[13px] text-[#8e8e93] mt-0.5">{dateLabel}</p>
      </div>
    </Link>
  )
}

// ── Calendar helpers ──────────────────────────────────────────

/**
 * Returns the day-of-month on which a subscription charges in the given
 * year/month, or null if it does not charge that month.
 *
 * Monthly  → same day every month (clamped to month's last day)
 * Yearly   → only in the anniversary calendar month
 * Quarterly→ every 3 months from the next_charge_date month
 * Weekly/custom → only the specific month of next_charge_date
 */
function getChargeDayInMonth(
  sub: Subscription,
  year: number,
  month: number,
): number | null {
  const nextDate = parseIsoDateLocal(sub.next_charge_date)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const clamp = (d: number) => Math.min(d, daysInMonth)

  if (sub.billing_cycle === 'monthly') {
    return clamp(nextDate.getDate())
  }

  if (sub.billing_cycle === 'yearly') {
    return nextDate.getMonth() === month ? clamp(nextDate.getDate()) : null
  }

  if (sub.billing_cycle === 'quarterly') {
    const nextIdx = nextDate.getFullYear() * 12 + nextDate.getMonth()
    const selIdx  = year * 12 + month
    return (selIdx - nextIdx) % 3 === 0 ? clamp(nextDate.getDate()) : null
  }

  // weekly / custom: show only if next_charge_date falls in this exact month
  if (nextDate.getFullYear() === year && nextDate.getMonth() === month) {
    return nextDate.getDate()
  }
  return null
}

// ── Calendar ──────────────────────────────────────────────────

function WriteoffCalendar({ subs }: { subs: Subscription[] }) {
  const isDark = useDarkMode()
  const { lang, strings } = useLang()
  const cal = strings.calendar
  const tod = strings.today
  const now = new Date()
  const [calYear,  setCalYear]  = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [hintDay,  setHintDay]  = useState<number | null>(null)

  const chargeMap = useMemo(() => {
    const map = new Map<number, Subscription[]>()
    subs.forEach((sub) => {
      const day = getChargeDayInMonth(sub, calYear, calMonth)
      if (day === null) return
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(sub)
    })
    return map
  }, [subs, calMonth, calYear])

  const monthTotalGroups = useMemo(() => {
    // Суммируем все подписки, которые заряжаются в выбранном месяце —
    // та же логика, что у chargeMap, чтобы сумма совпадала с точками на календаре.
    const map = new Map<string, number>()
    subs.forEach((s) => {
      const day = getChargeDayInMonth(s, calYear, calMonth)
      if (day === null) return
      const cur = (s.currency ?? 'RUB').toUpperCase()
      map.set(cur, (map.get(cur) ?? 0) + coerceNumber(s.amount))
    })
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([currency, total]) => ({ currency, total }))
  }, [subs, calMonth, calYear])

  // Grid: Mon-start weekday
  const firstDow = (() => {
    const d = new Date(calYear, calMonth, 1).getDay() - 1
    return d < 0 ? 6 : d
  })()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const cells: Array<number | null> = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const prevM = () => { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11) } else setCalMonth(m => m-1) }
  const nextM = () => { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0) }  else setCalMonth(m => m+1) }

  const hintSubs = hintDay ? (chargeMap.get(hintDay) ?? []) : []

  return (
    <article className="rounded-2xl border border-[#e7e3dc] bg-white p-4 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
      {/* Head */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            type="button" onClick={prevM}
            className="w-7 h-7 rounded-lg border border-[#e7e3dc] bg-white flex items-center justify-center text-[#1a1a2e] leading-none flex-shrink-0 hover:bg-[#f8f6f2] transition-colors"
          >‹</button>
          <h2 className="flex-1 text-center text-[15px] font-bold text-[#1a1a2e] tracking-[-0.02em]">
            {cal.months[calMonth]} {calYear}
          </h2>
          <button
            type="button" onClick={nextM}
            className="w-7 h-7 rounded-lg border border-[#e7e3dc] bg-white flex items-center justify-center text-[#1a1a2e] leading-none flex-shrink-0 hover:bg-[#f8f6f2] transition-colors"
          >›</button>
        </div>
        <div className="text-right text-[11px] leading-snug max-w-[150px]">
          <span className="text-[#8e8e93]">{tod.monthlyInSelectedMonth}</span>
          <span className="font-bold text-[#12b76a] ml-1">{formatGroups(monthTotalGroups)}</span>
        </div>
      </div>

      {/* DOW headers */}
      <div className="grid grid-cols-7 text-center mb-1">
        {cal.weekdays.map(d => (
          <span key={d} className="text-[10px] font-medium text-[#8e8e93] uppercase tracking-wide">{d}</span>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5 mb-2">
        {cells.map((day, i) => {
          const isToday = day !== null && day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear()
          const hasDot = day !== null && chargeMap.has(day)
          const hinted = day === hintDay && hasDot
          return (
            <div
              key={i}
              className="flex flex-col items-center justify-center min-h-[36px] rounded-lg py-0.5 cursor-default transition-colors"
              style={hinted ? { background: 'rgba(91,67,212,0.06)' } : undefined}
              onMouseEnter={() => { if (day) setHintDay(day) }}
              onMouseLeave={() => setHintDay(null)}
            >
              {day !== null && (
                <>
                  <span
                    className="w-7 h-7 flex items-center justify-center text-[13px] font-semibold rounded-full"
                    style={
                      isToday
                        ? { background: '#5b43d4', color: '#fff' }
                        : hasDot
                        ? { background: 'rgba(18,183,106,0.14)', color: '#0a7a4a', fontWeight: 700 }
                        : { color: isDark ? '#9b98b0' : '#1a1a2e' }
                    }
                  >{day}</span>
                  {hasDot && (
                    <span className={`block w-1.5 h-1.5 mt-0.5 rounded-full flex-shrink-0 bg-[#12b76a] ${isToday ? 'su-pulse-dot' : ''}`} />
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Hint */}
      <div className="min-h-[2.7em] text-[11px] leading-relaxed text-[#8e8e93]">
        {hintSubs.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {hintSubs.map((s) => {
              const hintIcon = resolveSubscriptionIconDisplay(s.notes, s.icon, s.category_slug)
              return (
                <span key={s.id} className="inline-flex items-center gap-1.5">
                  <PaymentServiceIcon
                    icon={s.icon}
                    categorySlug={s.category_slug}
                    iconBg={hintIcon.iconBg}
                    shape={hintIcon.shape}
                    size={16}
                  />
                  <span>{s.name}: {fmtCurrency(coerceNumber(s.amount), s.currency ?? 'RUB')}</span>
                </span>
              )
            })}
          </div>
        ) : (
          <span>{tod.hoverHint}</span>
        )}
      </div>
    </article>
  )
}

// ── Main ──────────────────────────────────────────────────────

export default function TodayView({
  subs: allSubs,
  priceAlerts = [],
  paymentEvents = [],
  userName,
}: {
  subs: Subscription[]
  priceAlerts?: PriceAlert[]
  paymentEvents?: SubscriptionPayment[]
  userName?: string
}) {
  const { strings } = useLang()
  const tod = strings.today
  const activeSubs = useMemo(() => allSubs.filter(s => s.status === 'active'), [allSubs])
  const animatedSubsCount = useCountUp(activeSubs.length, 600)

  const monthlyGroups = useMemo(
    () => groupMonthlyByCurrency(activeSubs, getMonthlyAmount),
    [activeSubs],
  )
  const monthComparison = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const currentMap = new Map<string, number>()
    const previousMap = new Map<string, number>()
    for (const p of paymentEvents) {
      const paidAt = new Date(p.paid_at)
      const cur = (p.currency ?? 'RUB').toUpperCase()
      const amount = coerceNumber(p.amount)
      if (paidAt >= monthStart) currentMap.set(cur, (currentMap.get(cur) ?? 0) + amount)
      else if (paidAt >= prevStart && paidAt < monthStart) previousMap.set(cur, (previousMap.get(cur) ?? 0) + amount)
    }
    if (currentMap.size === 0 && previousMap.size === 0) {
      for (const g of groupMonthlyByCurrency(activeSubs, getMonthlyAmount)) currentMap.set(g.currency, g.total)
    }
    const allCurrencies = Array.from(new Set([...currentMap.keys(), ...previousMap.keys()]))
    const groups = allCurrencies.map((currency) => {
      const cur = currentMap.get(currency) ?? 0
      const prev = previousMap.get(currency) ?? 0
      const diff = cur - prev
      const pct = prev > 0 ? (diff / prev) * 100 : null
      return { currency, diff, pct }
    })
    return { groups }
  }, [activeSubs, paymentEvents])

  // Оценка экономии по реальным сигналам: неиспользуемые/рискованные подписки.
  const savingsEstimate = useMemo(() => estimateSavingsGroups(activeSubs), [activeSubs])
  const saveGroups = savingsEstimate.groups
  const savingsScenario = savingsEstimate.scenario

  const upcoming = useMemo(
    () => activeSubs
      .filter(s => { const d = daysUntil(s.next_charge_date); return d >= 0 && d <= 7 })
      .sort((a, b) => a.next_charge_date.localeCompare(b.next_charge_date)),
    [activeSubs],
  )


  const aiSubFingerprint = useMemo(() => {
    const parts = activeSubs
      .map(
        (s) =>
          `${s.id}:${String(s.amount)}:${s.billing_cycle}:${s.billing_interval ?? 1}:${s.next_charge_date}:${s.last_used_at ?? ''}:${s.name}`,
      )
      .sort()
    let h = 2166136261
    for (const p of parts) {
      for (let i = 0; i < p.length; i++) {
        h ^= p.charCodeAt(i)
        h = Math.imul(h, 16777619)
      }
    }
    return `${parts.length}:${(h >>> 0).toString(36)}`
  }, [activeSubs])

  // Block 3: most expensive & cheapest (by monthly equivalent)
  const mostExpensive = useMemo(() => {
    if (activeSubs.length === 0) return null
    return activeSubs.reduce((max, s) => getMonthlyAmount(s) > getMonthlyAmount(max) ? s : max)
  }, [activeSubs])
  const cheapest = useMemo(() => {
    if (activeSubs.length < 2) return null
    return activeSubs.reduce((min, s) => getMonthlyAmount(s) < getMonthlyAmount(min) ? s : min)
  }, [activeSubs])

  // Block 2: savings breakdown — derived directly from savingsEstimate (same source as simulator)
  const annualSwitchItems = savingsEstimate.annualSwitchItems
  const flaggedSubs = useMemo(() => activeSubs.filter(s => {
    const staleDays = s.last_used_at
      ? Math.round((Date.now() - new Date(s.last_used_at).getTime()) / 86400000)
      : null
    if (staleDays !== null && staleDays >= 30) return true
    return Boolean(s.price_increase_flag || s.annual_renewal_at_risk)
  }), [activeSubs])
  const flaggedSavingsGroups = useMemo(
    () => groupMonthlyByCurrency(flaggedSubs, getMonthlyAmount),
    [flaggedSubs],
  )

  return (
    <div className="space-y-5">
      <DashboardScreenHeader
        title={tod.title}
        subs={activeSubs}
        hideSearch
        hideAddButton
        compact
        greetingName={userName}
      />

      {/* ── 3 Stat cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Расходы */}
        <Link
          href="/dashboard?tab=analytics"
          className="su-fade-up flex justify-between items-stretch gap-4 rounded-2xl border border-[#e7e3dc] bg-white p-6 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] min-h-[148px] hover:border-[rgba(91,67,212,0.25)] hover:-translate-y-1 hover:shadow-[0_8px_28px_rgba(91,67,212,0.14)] transition-all group"
          style={{ animationDelay: '0ms' }}
        >
          <div className="flex flex-col flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-[#1a1a2e] mb-2.5">{tod.expenses}</h3>
            <AnimatedCurrencyAmount
              groups={monthlyGroups}
              className="text-[32px] leading-none font-bold tracking-[-0.03em] text-[#1a1a2e]"
            />
            <p className="text-sm text-[#8e8e93] mt-1.5">{tod.perMonthEquiv}</p>
            <div className="mt-auto flex flex-wrap gap-1.5">
              {(() => {
                const withPct = monthComparison.groups.filter(g => g.pct !== null && Number.isFinite(g.pct))
                if (withPct.length === 0) {
                  return (
                    <span className="inline-flex px-2.5 py-[5px] text-xs font-medium text-[#6b6b70] border border-[#d8d8dc] bg-white rounded-full">
                      {tod.noDataLastMonth}
                    </span>
                  )
                }
                return withPct.map((g) => {
                  const isUp = g.pct! > 0
                  const isDown = g.pct! < 0
                  const sign = isUp ? '▲ +' : isDown ? '▼ ' : '— '
                  const label = tod.vsLastMonth(sign, g.pct!.toFixed(0))
                  return (
                    <span
                      key={g.currency}
                      className="inline-flex items-center px-2.5 py-[5px] text-xs font-semibold rounded-full w-fit"
                      style={{
                        background: isDown ? '#e8faf0' : isUp ? '#fde7ea' : '#f0ece6',
                        color: isDown ? '#0d9f6e' : isUp ? '#d94851' : '#6b6b70',
                        border: `1px solid ${isDown ? '#bfe7d1' : isUp ? '#f3c5c7' : '#d8d8dc'}`,
                      }}
                    >
                      {label}
                    </span>
                  )
                })
              })()}
            </div>
          </div>
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-b from-[#f7f4ff] to-[#ede8fc] flex items-center justify-center self-center">
            <Image src="/icon-stat-bars.svg" alt="" width={52} height={52} className="w-[52px] h-[52px] object-contain" />
          </div>
        </Link>

        {/* Можно сэкономить */}
        <Link
          href="/dashboard/savings"
          className="su-fade-up flex justify-between items-stretch gap-4 rounded-2xl border border-[rgba(18,183,106,0.12)] bg-[#eef8f0] p-6 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] min-h-[148px] hover:-translate-y-1 hover:shadow-[0_8px_28px_rgba(18,183,106,0.18)] transition-all group"
          style={{ animationDelay: '80ms' }}
        >
          <div className="flex flex-col flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-[#1a1a2e] mb-2.5">{tod.savingsPotential}</h3>
            <AnimatedCurrencyAmount
              groups={saveGroups}
              className="text-[32px] leading-none font-bold tracking-[-0.03em] text-[#12b76a]"
            />
            <p className="text-sm text-[#8e8e93] mt-1.5">{tod.perMonthEquiv}</p>
            <div className="mt-auto space-y-1">
              {savingsScenario === 'annual_switch' && (() => {
                const names = annualSwitchItems.map(it => it.name)
                const preview = names.slice(0, 2).join(', ')
                const rest = names.length - 2
                return (
                  <p className="text-xs text-[#6b6b80]">
                    {tod.toAnnual(preview, rest > 0 ? tod.toAnnualMore(rest) : '')}
                  </p>
                )
              })()}
              {savingsScenario === 'flagged' && flaggedSubs.length > 0 && (() => {
                const names = flaggedSubs.map(s => s.name)
                const preview = names.slice(0, 2).join(', ')
                const rest = names.length - 2
                return (
                  <p className="text-xs text-[#6b6b80]">
                    — {preview}{rest > 0 ? tod.toAnnualMore(rest) : ''}: <span className="font-medium text-[#0d9f6e]">{formatGroups(flaggedSavingsGroups)}</span> {tod.flaggedNote}
                  </p>
                )
              })()}
              {savingsScenario === 'none' && (
                <p className="text-xs text-[#6b6b80]">{tod.estimateNote}</p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-[rgba(255,255,255,0.65)] flex items-center justify-center self-center">
            <Image src="/icon-wallet.svg" alt="" width={72} height={72} className="w-[72px] h-[72px] object-contain" />
          </div>
        </Link>

        {/* Активные платежи */}
        <Link
          href="/dashboard?tab=payments"
          className="su-fade-up flex justify-between items-stretch gap-4 rounded-2xl border border-[#e7e3dc] bg-white p-6 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] min-h-[148px] hover:border-[rgba(91,67,212,0.25)] hover:-translate-y-1 hover:shadow-[0_8px_28px_rgba(91,67,212,0.14)] transition-all group"
          style={{ animationDelay: '160ms' }}
        >
          <div className="flex flex-col flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-[#1a1a2e] mb-2.5">{tod.activePayments}</h3>
            <div className="flex items-baseline gap-1.5">
              <p className="text-[32px] leading-none font-bold tracking-[-0.03em] text-[#1a1a2e]">{animatedSubsCount}</p>
              <span className="text-sm font-medium text-[#8e8e93]">{tod.services}</span>
            </div>
            <p className="text-sm text-[#8e8e93] mt-1.5">{tod.inAccounting}</p>
            <div className="mt-auto space-y-1">
              {mostExpensive && (
                <div className="flex items-baseline gap-1 text-xs text-[#6b6b80]">
                  <span className="shrink-0">{tod.mostExpensive}</span>
                  <span className="font-medium text-[#1a1a2e] truncate">{mostExpensive.name}</span>
                  <span className="shrink-0 text-[#5b43d4]">{fmtCurrency(getMonthlyAmount(mostExpensive), mostExpensive.currency ?? 'RUB', 0)}{tod.perMonth}</span>
                </div>
              )}
              {cheapest && cheapest.id !== mostExpensive?.id && (
                <div className="flex items-baseline gap-1 text-xs text-[#6b6b80]">
                  <span className="shrink-0">{tod.cheapest}</span>
                  <span className="font-medium text-[#1a1a2e] truncate">{cheapest.name}</span>
                  <span className="shrink-0 text-[#5b43d4]">{fmtCurrency(getMonthlyAmount(cheapest), cheapest.currency ?? 'RUB', 0)}{tod.perMonth}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-[#ede9fc] flex items-center justify-center self-center">
            <Image src="/icon-four-dots.svg" alt="" width={44} height={44} className="w-11 h-11 object-contain opacity-90" />
          </div>
        </Link>
      </div>

      <AiDailyTipCard
        key={activeSubs.length === 0 ? 'no-subs' : aiSubFingerprint}
        subs={activeSubs}
        dataFingerprint={aiSubFingerprint}
      />

      {/* Ближайшие списания + календарь */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <article className="rounded-2xl border border-[#e7e3dc] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-[#f0ece6]">
            <h2 className="text-[17px] font-bold text-[#1a1a2e] tracking-[-0.02em]">{tod.upcomingCharges}</h2>
            <Link
              href="/dashboard?tab=payments"
              className="inline-flex items-center gap-1 rounded-full border border-[#e0d8fc] bg-[#f7f4ff] px-3 py-1.5 text-[12px] font-semibold text-[#5b43d4] hover:bg-[#ede9fc] hover:border-[#c9bef8] transition-colors"
            >
              {tod.viewAll}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </Link>
          </div>
          <div className="pb-2">
            {upcoming.length === 0 ? (
              <p className="py-6 px-5 text-sm text-[#8e8e93]">{tod.noCharges30}</p>
            ) : upcoming.length === 0 ? (
              <p className="py-6 px-5 text-sm text-[#8e8e93]">{tod.nothingFound}</p>
            ) : (
              upcoming.slice(0, 7).map((s, i) => (
                <UpcomingRow key={s.id} sub={s} isFirst={i === 0} index={i} />
              ))
            )}
          </div>
        </article>
        <WriteoffCalendar subs={activeSubs} />
      </div>

      {priceAlerts.length > 0 ? (
        <section className="rounded-2xl border border-[#fde1b8] bg-[#fff7ea] p-4 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <h2 className="m-0 text-[15px] font-semibold text-[#7c4a00]">{tod.priceChanges}</h2>
            <Link href="/dashboard?tab=payments" className="text-xs font-medium text-[#7c4a00] hover:underline">
              {tod.toPayments}
            </Link>
          </div>
          <div className="space-y-2">
            {priceAlerts.slice(0, 3).map((a) => (
              <div key={a.id} className="rounded-xl border border-[#f2d7ab] bg-white px-3 py-2 text-sm">
                <div className="font-medium text-[#1a1a2e]">
                  {a.old_amount} → {a.new_amount} {a.currency}
                </div>
                <div className="mt-0.5 text-xs text-[#6b6b80]">
                  {tod.changeLabel(Number(a.change_pct).toFixed(1), a.source_url ?? '')}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

    </div>
  )
}
