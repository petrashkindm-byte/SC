'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Subscription } from '@/lib/supabase/types'
import { coerceNumber } from '@/lib/coerce-number'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import PaymentServiceIcon from './PaymentServiceIcon'
import CurrencyAmount from './CurrencyAmount'
import { fmtCurrency, groupMonthlyByCurrency, formatGroups, getMonthlyAmount } from '@/lib/currency'
import DashboardScreenHeader from './DashboardScreenHeader'
import { estimateSavingsGroups } from '@/lib/savings-estimate'

// ── Helpers ──────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

const CYCLE_LABEL: Record<string, string> = {
  weekly:    'в неделю',
  monthly:   'в месяц',
  quarterly: 'раз в квартал',
  yearly:    'раз в год',
  custom:    'свой цикл',
}

const RU_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

// ── AI response renderer ──────────────────────────────────────

type AiItem = { name: string; verdict: 'cancel' | 'keep' | 'check' | 'info'; body: string }

function parseAiResponse(text: string): AiItem[] {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean)
  return lines.map(line => {
    const colon = line.indexOf(':')
    if (colon === -1) return { name: '', verdict: 'info' as const, body: line }
    const name = line.slice(0, colon).trim()
    const body = line.slice(colon + 1).trim()
    const lower = body.toLowerCase()
    const verdict =
      lower.startsWith('отменить') || lower.includes('отмените') ? 'cancel'
      : lower.startsWith('оставить') || lower.includes('оставьте') ? 'keep'
      : lower.startsWith('проверить') || lower.includes('проверьте') ? 'check'
      : 'info'
    return { name, verdict, body } as AiItem
  })
}

const VERDICT_STYLE = {
  cancel: { bg: '#fde7ea', color: '#d94851', label: 'Отменить' },
  keep:   { bg: '#e4f6ec', color: '#0f8f54', label: 'Оставить' },
  check:  { bg: '#ffeadd', color: '#c96a1a', label: 'Проверить' },
  info:   { bg: '#ede9fc', color: '#5b43d4', label: 'Инфо' },
}

function AiResponseCard({ text }: { text: string }) {
  const items = useMemo(() => parseAiResponse(text), [text])
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const st = VERDICT_STYLE[item.verdict]
        return (
          <div
            key={i}
            className="rounded-xl border border-[#e7e3dc] bg-white px-4 py-3 flex items-start gap-3"
          >
            {item.name && (
              <span
                className="mt-0.5 shrink-0 text-[11px] font-bold rounded-full px-2.5 py-1 leading-none whitespace-nowrap"
                style={{ background: st.bg, color: st.color }}
              >
                {st.label}
              </span>
            )}
            <div className="min-w-0">
              {item.name && (
                <p className="text-sm font-semibold text-[#1a1a2e] mb-0.5">{item.name}</p>
              )}
              <p className="text-[13px] text-[#6b6b80] leading-snug">{item.body}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Real AI card ─────────────────────────────────────────────

function AiAlertsCard({ subIds }: { subIds: string[] }) {
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (subIds.length === 0) return
    setLoading(true); setError(null); setText(null)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionIds: subIds, locale: 'ru' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(typeof data.error === 'string' ? data.error : 'Ошибка запроса'); return }
      setText(data.text ?? '')
    } catch { setError('Сеть недоступна. Попробуй позже.') }
    finally { setLoading(false) }
  }

  return (
    <section className="rounded-2xl border border-[rgba(91,67,212,0.18)] bg-gradient-to-b from-[#f7f4ff] to-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 bg-white border border-[#e0d8fc] text-[#5b43d4]">
            ✦ AI
          </span>
          <h2 className="text-[17px] font-bold text-[#1a1a2e] tracking-[-0.02em]">
            AI-анализ подписок
          </h2>
        </div>
        <Link href="/dashboard/savings" className="text-[13px] font-medium text-[#5b43d4] shrink-0 hover:text-[#4b36b6]">
          Симулятор →
        </Link>
      </div>

      <div className="px-5 pb-5">
        {!text && !loading && (
          <>
            <p className="text-sm text-[#6b6b80] mb-3 leading-relaxed">
              Модель посмотрит на все твои активные подписки и подскажет, что пересмотреть, где переплата и что можно отключить.
            </p>
            <button
              type="button"
              onClick={() => void run()}
              disabled={subIds.length === 0}
              className="w-full rounded-xl bg-[#5b43d4] px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(91,67,212,0.3)] hover:brightness-105 disabled:opacity-40 transition-all"
            >
              Запустить AI-анализ
            </button>
          </>
        )}

        {loading && (
          <div className="flex items-center gap-3 py-4">
            <svg className="animate-spin text-[#5b43d4]" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round"/>
            </svg>
            <span className="text-sm text-[#6b6b80]">Анализирую подписки…</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-[#fdecec] border border-[#f3c5c7] px-4 py-3 text-sm text-[#e5484d]">
            {error}
          </div>
        )}

        {text && (
          <div className="space-y-3">
            <AiResponseCard text={text} />
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => void run()}
                disabled={loading}
                className="text-xs text-[#5b43d4] hover:text-[#4b36b6] font-medium"
              >
                ↻ Обновить анализ
              </button>
              <Link href="/dashboard/savings" className="text-xs text-[#6b6b80] hover:text-[#1a1a2e]">
                Открыть симулятор экономии →
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Upcoming Row ──────────────────────────────────────────────

function UpcomingRow({ sub, isFirst }: { sub: Subscription; isFirst: boolean }) {
  const days = daysUntil(sub.next_charge_date)
  const iconDisplay = resolveSubscriptionIconDisplay(sub.notes, sub.icon, sub.category_slug)

  let badge: { label: string; color: string; bg: string } | null = null
  if (days <= 0)      badge = { label: 'Сегодня', color: '#d94851', bg: '#fde7ea' }
  else if (days === 1) badge = { label: 'Завтра',   color: '#d94851', bg: '#fde7ea' }
  else if (days <= 4)  badge = { label: `${days} дн.`, color: '#c96a1a', bg: '#ffeadd' }
  else if (days <= 7)  badge = { label: `${days} дн.`, color: '#0f8f54', bg: '#e4f6ec' }

  const dateLabel = new Date(sub.next_charge_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

  return (
    <Link
      href={`/dashboard/subscriptions/${sub.id}`}
      className={`grid items-center gap-x-3.5 py-4 pr-2 text-current no-underline hover:bg-[rgba(91,67,212,0.04)] transition-colors ${
        isFirst ? '' : 'border-t border-[#ececee]'
      }`}
      style={{ gridTemplateColumns: '48px 1fr minmax(88px,auto) auto' }}
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

      {/* Name + cycle */}
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-[#1a1a2e] truncate leading-snug">{sub.name}</p>
        <p className="text-[13px] text-[#8e8e93] mt-0.5">{CYCLE_LABEL[sub.billing_cycle] ?? sub.billing_cycle}</p>
      </div>

      {/* Amount + date */}
      <div className="text-right">
        <p className="text-[15px] font-semibold text-[#1a1a2e] tabular-nums leading-snug">
          {fmtCurrency(coerceNumber(sub.amount), sub.currency ?? 'RUB', 0)}
        </p>
        <p className="text-[13px] text-[#8e8e93] mt-0.5">{dateLabel}</p>
      </div>

      {/* Badge */}
      <div className="flex justify-end">
        {badge && (
          <span
            className="px-2.5 py-[5px] rounded-full text-xs font-semibold whitespace-nowrap leading-none"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
        )}
      </div>
    </Link>
  )
}

// ── Calendar ──────────────────────────────────────────────────

function WriteoffCalendar({ subs }: { subs: Subscription[] }) {
  const now = new Date()
  const [calYear,  setCalYear]  = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [hintDay,  setHintDay]  = useState<number | null>(null)

  const chargeMap = useMemo(() => {
    const map = new Map<number, Subscription[]>()
    subs.forEach((sub) => {
      const d = new Date(sub.next_charge_date)
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate()
        if (!map.has(day)) map.set(day, [])
        map.get(day)!.push(sub)
      }
    })
    return map
  }, [subs, calMonth, calYear])

  const monthTotalGroups = useMemo(() => {
    const map = new Map<string, number>()
    chargeMap.forEach((ds) => ds.forEach((s) => {
      const cur = (s.currency ?? 'RUB').toUpperCase()
      map.set(cur, (map.get(cur) ?? 0) + coerceNumber(s.amount))
    }))
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([currency, total]) => ({ currency, total }))
  }, [chargeMap])

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
            {RU_MONTHS[calMonth]} {calYear}
          </h2>
          <button
            type="button" onClick={nextM}
            className="w-7 h-7 rounded-lg border border-[#e7e3dc] bg-white flex items-center justify-center text-[#1a1a2e] leading-none flex-shrink-0 hover:bg-[#f8f6f2] transition-colors"
          >›</button>
        </div>
        <div className="text-right text-[11px] leading-snug max-w-[150px]">
          <span className="text-[#8e8e93]">Списания в выбранном месяце:</span>
          <span className="font-bold text-[#12b76a] ml-1">{formatGroups(monthTotalGroups)}</span>
        </div>
      </div>

      {/* DOW headers */}
      <div className="grid grid-cols-7 text-center mb-1">
        {['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map(d => (
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
                        ? { background: '#1c1c39', color: '#fff' }
                        : hasDot
                        ? { boxShadow: '0 0 0 2px rgba(91,67,212,0.4)', color: '#1a1a2e' }
                        : { color: '#1a1a2e' }
                    }
                  >{day}</span>
                  {hasDot && <span className="block w-1.5 h-1.5 mt-0.5 rounded-full bg-[#12b76a] flex-shrink-0" />}
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
          <span>Наведи на дату, чтобы увидеть списания</span>
        )}
      </div>
    </article>
  )
}

// ── Main ──────────────────────────────────────────────────────

export default function TodayView({ subs: allSubs }: { subs: Subscription[] }) {
  const [headerSearch, setHeaderSearch] = useState('')
  const activeSubs = useMemo(() => allSubs.filter(s => s.status === 'active'), [allSubs])

  const monthlyGroups = useMemo(
    () => groupMonthlyByCurrency(activeSubs, getMonthlyAmount),
    [activeSubs],
  )

  // Оценка экономии по реальным сигналам: неиспользуемые/рискованные подписки.
  const saveGroups = useMemo(() => estimateSavingsGroups(activeSubs), [activeSubs])

  const upcoming = useMemo(
    () => activeSubs
      .filter(s => { const d = daysUntil(s.next_charge_date); return d >= 0 && d <= 30 })
      .sort((a, b) => a.next_charge_date.localeCompare(b.next_charge_date)),
    [activeSubs],
  )

  const searchQ = headerSearch.trim().toLowerCase()
  const upcomingFiltered = useMemo(() => {
    if (!searchQ) return upcoming
    return upcoming.filter((s) => s.name.toLowerCase().includes(searchQ))
  }, [upcoming, searchQ])

  const activeIds = useMemo(() => activeSubs.map(s => s.id), [activeSubs])

  const urgentCount = upcoming.filter(s => daysUntil(s.next_charge_date) <= 3).length
  const weekCount   = upcoming.filter(s => { const d = daysUntil(s.next_charge_date); return d > 3 && d <= 7 }).length
  const autoCount   = activeSubs.filter(s => s.renewal_type === 'auto_renew').length

  return (
    <div className="space-y-4">
      <DashboardScreenHeader
        title="Сегодня"
        subs={activeSubs}
        searchValue={headerSearch}
        onSearchChange={setHeaderSearch}
        searchPlaceholder="Поиск по платежам и сервисам…"
        trailingActions={
          <a
            href="/api/export/subscriptions"
            download="subcuro-subscriptions.csv"
            className="inline-flex h-11 items-center rounded-xl border border-[#e7e3dc] bg-white px-4 text-sm font-medium text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] hover:bg-[#f8f6f2]"
          >
            Экспорт CSV
          </a>
        }
      />

      {/* ── 3 Stat cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Расходы */}
        <Link
          href="/dashboard?tab=analytics"
          className="flex justify-between items-stretch gap-4 rounded-2xl border border-[#e7e3dc] bg-white p-6 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] min-h-[148px] hover:border-[rgba(91,67,212,0.25)] hover:shadow-[0_4px_20px_rgba(91,67,212,0.12)] transition-all group"
        >
          <div className="flex flex-col flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-[#1a1a2e] mb-2.5">Расходы на платежи</h3>
            <CurrencyAmount
              groups={monthlyGroups}
              className="text-[32px] leading-none font-bold tracking-[-0.03em] text-[#1a1a2e]"
            />
            <p className="text-sm text-[#8e8e93] mt-1.5">в месяц (эквивалент)</p>
            <span className="mt-auto inline-flex px-2.5 py-[5px] text-xs font-medium text-[#6b6b70] border border-[#d8d8dc] bg-white rounded-full w-fit">
              — к прошлому месяцу
            </span>
          </div>
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-b from-[#f7f4ff] to-[#ede8fc] flex items-center justify-center self-center">
            <Image src="/icon-stat-bars.svg" alt="" width={52} height={52} className="w-[52px] h-[52px] object-contain" />
          </div>
        </Link>

        {/* Можно сэкономить */}
        <Link
          href="/dashboard/savings"
          className="flex justify-between items-stretch gap-4 rounded-2xl border border-[rgba(18,183,106,0.12)] bg-[#eef8f0] p-6 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] min-h-[148px] hover:shadow-[0_4px_20px_rgba(18,183,106,0.15)] transition-all group"
        >
          <div className="flex flex-col flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-[#1a1a2e] mb-2.5">Можно сэкономить</h3>
            <CurrencyAmount
              groups={saveGroups}
              className="text-[32px] leading-none font-bold tracking-[-0.03em] text-[#12b76a]"
            />
            <p className="text-sm text-[#8e8e93] mt-1.5">оценка по активным платежам</p>
            <span className="mt-auto text-sm font-semibold text-[#0d9f6e]">Симулятор экономии →</span>
          </div>
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-[rgba(255,255,255,0.65)] flex items-center justify-center self-center">
            <Image src="/icon-wallet.svg" alt="" width={72} height={72} className="w-[72px] h-[72px] object-contain" />
          </div>
        </Link>

        {/* Активные платежи */}
        <Link
          href="/dashboard?tab=payments"
          className="flex justify-between items-stretch gap-4 rounded-2xl border border-[#e7e3dc] bg-white p-6 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] min-h-[148px] hover:border-[rgba(91,67,212,0.25)] hover:shadow-[0_4px_20px_rgba(91,67,212,0.12)] transition-all group"
        >
          <div className="flex flex-col flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-[#1a1a2e] mb-2.5">Активные платежи</h3>
            <div className="flex items-baseline gap-1.5">
              <p className="text-[32px] leading-none font-bold tracking-[-0.03em] text-[#1a1a2e]">{activeSubs.length}</p>
              <span className="text-sm font-medium text-[#8e8e93]">сервисов</span>
            </div>
            <p className="text-sm text-[#8e8e93] mt-1.5">в учёте</p>
            <span className="mt-auto inline-flex px-2.5 py-[5px] text-xs font-medium text-[#6b6b70] border border-[#d8d8dc] bg-white rounded-full w-fit">
              {monthlyGroups.length === 1
                ? fmtCurrency(monthlyGroups[0].total / activeSubs.length || 0, monthlyGroups[0].currency)
                : `${activeSubs.length} сервисов`} / сервис
            </span>
          </div>
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-[#ede9fc] flex items-center justify-center self-center">
            <Image src="/icon-four-dots.svg" alt="" width={44} height={44} className="w-11 h-11 object-contain opacity-90" />
          </div>
        </Link>
      </div>

      {/* ── Actions banner (concept: .banner-actions) ── */}
      <section
        className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:px-[22px] rounded-2xl mb-[18px]"
        style={{
          background: 'linear-gradient(135deg, #f0ebff 0%, #ede9fc 100%)',
          border: '1px solid rgba(91, 67, 212, 0.12)',
        }}
      >
        <div
          className="w-[52px] h-[52px] rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]"
          aria-hidden
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5b43d4" strokeWidth="2">
            <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="m-0 mb-1.5 text-base font-semibold text-[#1a1a2e]">
            Очередь действий — {urgentCount + weekCount}
          </h2>
          <p className="m-0 mb-2.5 text-[13px] text-[#6b6b80]">Экономия до {formatGroups(saveGroups)} / мес</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-[5px] rounded-full text-xs font-semibold" style={{ background: '#fde7ea', color: '#d94851' }}>
              Срочно {urgentCount}
            </span>
            <span className="px-3 py-[5px] rounded-full text-xs font-semibold" style={{ background: '#ffeadd', color: '#b35a00' }}>
              На неделе {weekCount}
            </span>
            <span className="px-3 py-[5px] rounded-full text-xs font-semibold" style={{ background: '#e4f6ec', color: '#0f8f54' }}>
              Авто {autoCount}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2.5 flex-shrink-0 w-full sm:w-auto">
          <Link
            href="/dashboard/reminders"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5b43d4] px-[22px] py-3 text-sm font-semibold text-white whitespace-nowrap hover:brightness-105 shadow-[0_4px_14px_rgba(91,67,212,0.35)] w-full sm:w-auto"
          >
            Разобрать очередь →
          </Link>
          <Link href="/dashboard/savings" className="text-[13px] font-medium text-[#5b43d4] text-center sm:text-right hover:text-[#4b36b6]">
            Симулятор экономии
          </Link>
        </div>
      </section>

      <AiAlertsCard subIds={activeIds} />

      {/* ── 2-column: upcoming + calendar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Ближайшие списания */}
        <article className="rounded-2xl border border-[#e7e3dc] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-[#f0ece6]">
            <h2 className="text-[17px] font-bold text-[#1a1a2e] tracking-[-0.02em]">Ближайшие списания</h2>
            <Link href="/dashboard?tab=payments" className="text-sm font-medium text-[#5b43d4] hover:text-[#4b36b6]">
              Все →
            </Link>
          </div>
          <div className="px-5 pb-2">
            {upcoming.length === 0 ? (
              <p className="py-6 text-sm text-[#8e8e93]">В ближайшие 30 дней нет списаний</p>
            ) : upcomingFiltered.length === 0 ? (
              <p className="py-6 text-sm text-[#8e8e93]">Ничего не найдено по запросу</p>
            ) : (
              upcomingFiltered.slice(0, 7).map((s, i) => (
                <UpcomingRow key={s.id} sub={s} isFirst={i === 0} />
              ))
            )}
          </div>
        </article>

        {/* Calendar */}
        <WriteoffCalendar subs={activeSubs} />
      </div>
    </div>
  )
}
