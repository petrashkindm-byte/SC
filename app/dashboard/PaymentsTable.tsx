'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AddPaymentModal from './AddPaymentModal'
import PaymentServiceIcon from './PaymentServiceIcon'
import { coerceNumber } from '@/lib/coerce-number'
import { categoryLabel } from '@/lib/subscription-labels'
import type { Subscription } from '@/lib/supabase/types'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import { CARD_COLOR_PRESETS } from '@/lib/subscription-viz-notes'
import { archiveSubscription, markAsPaid, markLastUsed, updateSubscriptionStatus } from './subscriptions/actions'
import { fmtCurrency, groupMonthlyByCurrency, formatGroups, getMonthlyAmount } from '@/lib/currency'
import StatusPill from './ui/StatusPill'
import { actionButtonClass } from './ui/action-button'
import { useDarkMode } from '@/lib/hooks/use-dark-mode'
import { useLang } from '@/lib/LangContext'

/** Пять вкладок как в payments.html (без «Архив»). */
export type PaymentsFilter = 'all' | 'active' | 'soon' | 'paused' | 'cancelled'
type PaymentsSortKey = 'next_charge' | 'amount' | 'name'

const FILTER_HOVER: Record<PaymentsFilter, string> = {
  all:       'hover:border-[#5b43d4] hover:text-[#5b43d4]',
  active:    'hover:border-[#2563eb] hover:text-[#2563eb]',
  soon:      'hover:border-[#db2777] hover:text-[#db2777]',
  paused:    'hover:border-[#ca8a04] hover:text-[#ca8a04]',
  cancelled: 'hover:border-slate-500 hover:text-slate-600',
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(dateStr).getTime() - today.getTime()) / 86400000)
}

function formatDateShort(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

import type { t as tType } from '@/lib/translations'
type PaymentsStrings = typeof tType['ru']['payments'] | typeof tType['en']['payments']

/** Как в payments-table.js: только ежемесячно / ежегодно для простых случаев. */
function cycleLabelConcept(sub: Subscription, p: PaymentsStrings): string {
  if (sub.billing_cycle === 'monthly' && sub.billing_interval === 1) return p.cycleMonthly
  if (sub.billing_cycle === 'yearly' && sub.billing_interval === 1) return p.cycleYearly
  if (sub.billing_cycle === 'weekly') return p.cycleWeekly
  if (sub.billing_cycle === 'quarterly') return p.cycleQuarterly
  if (sub.billing_cycle === 'custom' && sub.custom_interval_days) {
    return p.cycleCustom(sub.custom_interval_days)
  }
  if (sub.billing_cycle === 'monthly') return p.cycleEveryNMonths(sub.billing_interval)
  if (sub.billing_cycle === 'yearly') return p.cycleEveryNYears(sub.billing_interval)
  return p.cycleMonthly
}

function dueRelativePhrase(days: number, p: PaymentsStrings): string {
  if (days < 0) return p.dueOverdue(Math.abs(days))
  if (days === 0) return p.dueToday
  if (days === 1) return p.dueTomorrow
  return p.dueInDays(days)
}

function calendarDaysAgo(isoStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(isoStr)
  d.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((today.getTime() - d.getTime()) / 86400000))
}

function lastUsedLabel(lastUsedAt: string | null, p: PaymentsStrings): { text: string; stale: boolean } {
  if (!lastUsedAt) return { text: p.activityNotMarked, stale: true }
  const days = calendarDaysAgo(lastUsedAt)
  if (days === 0) return { text: p.activityToday, stale: false }
  if (days === 1) return { text: p.activityYesterday, stale: false }
  if (days <= 7) return { text: p.activityDaysAgo(days), stale: false }
  if (days <= 30) return { text: p.activityDaysAgo(days), stale: true }
  return { text: p.activityDaysAgo(days), stale: true }
}

function cardPresetColors(preset: string | null): { tint: string; darkTint: string; swatch: string } | null {
  if (!preset) return null
  const found = CARD_COLOR_PRESETS.find((p) => p.key === preset)
  return found ? { tint: found.tint, darkTint: found.darkTint, swatch: found.swatch } : null
}

type StatusUi = {
  label: string
  tone: 'primary' | 'warning' | 'danger' | 'neutral'
  /** колонка «следующее списание»: просрочка */
  overdue: boolean
}

function statusUi(sub: Subscription, p: PaymentsStrings): StatusUi {
  if (sub.status === 'archived') {
    return { label: p.statusArchived, tone: 'neutral', overdue: false }
  }
  if (sub.status === 'paused') {
    return { label: p.statusPaused, tone: 'warning', overdue: false }
  }
  if (sub.status === 'cancelled') {
    return { label: p.statusCancelled, tone: 'danger', overdue: false }
  }
  const d = daysUntil(sub.next_charge_date)
  if (d < 0) {
    return { label: p.statusOverdue, tone: 'danger', overdue: true }
  }
  return { label: p.statusActive, tone: 'primary', overdue: false }
}

function emptyMessage(filter: PaymentsFilter, hasSearch: boolean, p: PaymentsStrings): string {
  if (hasSearch) return p.emptySearch
  if (filter === 'soon') return p.emptySoon
  if (filter === 'active') return p.emptyActive
  if (filter === 'paused') return p.emptyPaused
  if (filter === 'cancelled') return p.emptyCancelled
  return p.emptySearch
}

function subscriptionFormErr(p: PaymentsStrings): Record<string, string> {
  return {
    name: p.errName,
    amount: p.errAmount,
    dates: p.errDates,
    custom: p.errCustom,
    save: p.errSave,
  }
}

/** Dropdown меню для строки таблицы — рендерится через портал чтобы вырваться из overflow-x-auto */
function RowDropdownPortal({
  open,
  anchorRef,
  onClose,
  children,
}: {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  children: React.ReactNode
}) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  useEffect(() => {
    if (!open || !anchorRef.current) return
    const r = anchorRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // slight delay so the click that opened the menu doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    return () => { clearTimeout(id); document.removeEventListener('mousedown', onDoc) }
  }, [open, anchorRef, onClose])

  if (!open || !pos) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        zIndex: 9999,
        minWidth: 190,
      }}
      className="rounded-xl border border-[rgba(26,26,61,0.08)] bg-white p-1.5 shadow-[0_8px_24px_rgba(26,26,61,0.14)]"
    >
      {children}
    </div>,
    document.body,
  )
}

export default function PaymentsTable({
  subs,
  currency,
  initialFilter = 'all',
}: {
  subs: Subscription[]
  currency: string
  initialFilter?: PaymentsFilter
}) {
  const isDark = useDarkMode()
  const { lang, strings } = useLang()
  const p = strings.payments
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialFilterFromUrl = searchParams.get('paymentsFilter')
  const initialQuery = searchParams.get('q') ?? ''
  const initialSort = searchParams.get('sort')
  const initialDir = searchParams.get('dir')
  const [filter, setFilter] = useState<PaymentsFilter>(
    initialFilterFromUrl && (['all', 'active', 'soon', 'paused', 'cancelled'] as const).includes(initialFilterFromUrl as PaymentsFilter)
      ? (initialFilterFromUrl as PaymentsFilter)
      : initialFilter,
  )
  const [search, setSearch] = useState(initialQuery)
  const [sortKey, setSortKey] = useState<PaymentsSortKey>(
    initialSort === 'amount' || initialSort === 'name' || initialSort === 'next_charge'
      ? initialSort
      : 'next_charge',
  )
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(
    initialDir === 'desc' ? 'desc' : 'asc',
  )
  const [notifOpen, setNotifOpen] = useState(false)
  const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = localStorage.getItem('notif_dismissed')
      if (!raw) return new Set()
      const { date, ids } = JSON.parse(raw)
      if (date !== new Date().toDateString()) return new Set()
      return new Set(ids as string[])
    } catch { return new Set() }
  })

  const dismissNotif = (id: string) => {
    setDismissedNotifIds(prev => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem('notif_dismissed', JSON.stringify({ date: new Date().toDateString(), ids: [...next] }))
      return next
    })
  }
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)
  const [markingUsedId, setMarkingUsedId] = useState<string | null>(null)
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLButtonElement>(null)

  const subscriptionCreated = searchParams.get('subscriptionCreated') === '1'
  const subscriptionFormError = searchParams.get('subscriptionFormError')

  const clearPaymentFlash = () => {
    router.replace('/dashboard?tab=payments')
  }

  useEffect(() => {
    if (!notifOpen) return
    const onDoc = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [notifOpen])

  useEffect(() => {
    if (!actionsOpenId) return
    const onDoc = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpenId(null)
      }
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [actionsOpenId])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'payments')
    if (filter === 'all') params.delete('paymentsFilter')
    else params.set('paymentsFilter', filter)
    if (search.trim()) params.set('q', search.trim())
    else params.delete('q')
    params.set('sort', sortKey)
    params.set('dir', sortDir)
    const next = `/dashboard?${params.toString()}`
    if (next !== `/dashboard?${searchParams.toString()}`) {
      router.replace(next, { scroll: false })
    }
  }, [filter, search, sortKey, sortDir, router, searchParams])

  const monthlyGroups = useMemo(
    () => groupMonthlyByCurrency(subs.filter((s) => s.status === 'active'), getMonthlyAmount),
    [subs],
  )
  const activeCount = useMemo(() => subs.filter((s) => s.status === 'active').length, [subs])

  const filtered = useMemo(() => {
    let list = subs
    if (filter === 'soon') {
      list = subs.filter((s) => {
        if (s.status !== 'active') return false
        const d = daysUntil(s.next_charge_date)
        return d >= 0 && d <= 14
      })
    } else if (filter === 'active') {
      list = subs.filter((s) => s.status === 'active')
    } else if (filter === 'paused') {
      list = subs.filter((s) => s.status === 'paused')
    } else if (filter === 'cancelled') {
      list = subs.filter((s) => s.status === 'cancelled')
    }
    // filter === 'all' — все, включая archived

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((s) => {
        const name = s.name.toLowerCase()
        const cat = categoryLabel(s.category_slug, lang).toLowerCase()
        const slug = (s.category_slug || '').toLowerCase()
        return name.includes(q) || cat.includes(q) || slug.includes(q)
      })
    }
    return list
  }, [subs, filter, search])

  const sortedFiltered = useMemo(() => {
    const mul = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === 'amount') return (getMonthlyAmount(a) - getMonthlyAmount(b)) * mul
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'ru') * mul
      return (daysUntil(a.next_charge_date) - daysUntil(b.next_charge_date)) * mul
    })
  }, [filtered, sortDir, sortKey])

  const notifItems = useMemo(() => {
    return subs
      .filter((s) => {
        if (s.status !== 'active') return false
        if (dismissedNotifIds.has(s.id)) return false
        const d = daysUntil(s.next_charge_date)
        return d >= 0 && d <= 7
      })
      .sort((a, b) => daysUntil(a.next_charge_date) - daysUntil(b.next_charge_date))
      .slice(0, 6)
  }, [subs])

  const openRow = (id: string) => {
    router.push(`/dashboard/subscriptions/${id}?from=payments`)
  }

  const applyStatusAction = async (
    sub: Subscription,
    next: 'active' | 'paused' | 'cancelled' | 'archived',
  ) => {
    setStatusUpdatingId(sub.id)
    try {
      if (next === 'archived') await archiveSubscription(sub.id)
      else await updateSubscriptionStatus(sub.id, next)
    } finally {
      setStatusUpdatingId(null)
      setActionsOpenId(null)
    }
  }

  return (
    <>
      <AddPaymentModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        defaultCurrency={currency}
      />

      {subscriptionCreated ? (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[#bfe7d1] bg-[#e8faf0] px-4 py-3 text-sm text-[#0d9f6e]">
          <span>{p.flashAdded}</span>
          <button
            type="button"
            className="shrink-0 rounded-lg border-0 bg-transparent px-2 py-0.5 text-[#0d9f6e] hover:bg-[#d4f0e3]"
            onClick={clearPaymentFlash}
          >
            ×
          </button>
        </div>
      ) : null}

      {subscriptionFormError && subscriptionFormErr(p)[subscriptionFormError] ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f3c5c7] bg-[#fdecec] px-4 py-3 text-sm text-[#e5484d]">
          <span>{subscriptionFormErr(p)[subscriptionFormError]}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-[#e5484d] bg-white px-3 py-1.5 text-xs font-semibold text-[#e5484d] hover:bg-[#fff5f5]"
              onClick={() => {
                clearPaymentFlash()
                setAddModalOpen(true)
              }}
            >
              {p.openFormButton}
            </button>
            <button
              type="button"
              className="shrink-0 rounded-lg border-0 bg-transparent px-2 py-0.5 text-[#e5484d] hover:bg-[#fcd4d4]"
              onClick={clearPaymentFlash}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      <header className="mb-6">
        {/* Title */}
        <div className="mb-3">
          <h1 className="m-0 mb-1 text-[1.75rem] font-bold tracking-[-0.03em] text-[#1a1a2e]">{p.title}</h1>
          <p className="m-0 text-sm text-[#6b6b80] leading-snug">
            {p.activeCount(activeCount)} · {p.perMonth}: {formatGroups(monthlyGroups)}
          </p>
        </div>
        {/* Controls: search+bell row, then add button (mobile: stacked; desktop: inline) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="flex items-center gap-2.5 bg-white border border-[rgba(26,26,61,0.08)] rounded-full pl-4 pr-4 flex-1 h-11 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-[0.45] text-[#1a1a2e]">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={p.searchPlaceholder}
                aria-label={p.searchAriaLabel}
                className="flex-1 min-w-0 border-0 bg-transparent outline-none text-sm text-[#1a1a2e] placeholder:text-[#9a9aaf] font-[inherit]"
              />
            </div>

            <div className="relative shrink-0" ref={notifRef}>
              <button
                type="button"
                className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(26,26,61,0.08)] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] text-[#1a1a2e]"
                aria-label={p.notifAriaLabel}
                onClick={() => setNotifOpen((v) => !v)}
              >
              {notifItems.length > 0 && (
                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#e5484d] ring-2 ring-white su-pulse-dot" />
              )}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={notifItems.length > 0 ? 'su-bell-ring' : ''}>
                <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </button>
            {notifOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,92vw)] rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white shadow-[0_4px_6px_rgba(26,26,61,0.04),0_12px_32px_rgba(26,26,61,0.10)]">
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b6b80]">{p.notifTitle}</span>
                  {notifItems.length > 0 && (
                    <span className="text-[11px] font-semibold text-[#5b43d4]">{p.notifThisWeek}</span>
                  )}
                </div>
                <div className="max-h-[320px] overflow-y-auto px-2 pb-2">
                  {notifItems.length === 0 ? (
                    <div className="flex flex-col items-center gap-1.5 py-8 text-center">
                      <p className="text-[13px] text-[#6b6b80]">{p.notifNone}</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {notifItems.map((s) => {
                        const days = daysUntil(s.next_charge_date)
                        const badgeStyle = days <= 0
                          ? 'bg-[#fee2e2] text-[#b91c1c]'
                          : days === 1 ? 'bg-[#ffedd5] text-[#c2410c]'
                          : days <= 3 ? 'bg-[#fef3c7] text-[#b45309]'
                          : 'bg-[#f1f0ff] text-[#5b43d4]'
                        const avatarColors = ['bg-[#ede9ff] text-[#5b43d4]','bg-[#dcfce7] text-[#15803d]','bg-[#dbeafe] text-[#1d4ed8]','bg-[#fef3c7] text-[#b45309]','bg-[#fce7f3] text-[#be185d]']
                        const code = s.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
                        const avatarCls = avatarColors[code % avatarColors.length]
                        const amount = getMonthlyAmount(s)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-[#f8f7ff] transition-colors"
                            onClick={() => { dismissNotif(s.id); setNotifOpen(false); openRow(s.id) }}
                          >
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold ${avatarCls}`}>
                              {s.name.trim().charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-[#1a1a2e] truncate">{s.name}</p>
                              <p className="text-[11px] text-[#6b6b80] mt-0.5">{formatDateShort(s.next_charge_date)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-[13px] font-semibold text-[#1a1a2e]">{fmtCurrency(amount, s.currency ?? 'RUB')}</span>
                              <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${badgeStyle}`}>{dueRelativePhrase(days, p)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            </div>
          </div>

          {/* Add button — full width on mobile, auto on desktop */}
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className={`${actionButtonClass('primary')} gap-2 px-5 w-full sm:w-auto justify-center`}
          >
            {p.addButton}
          </button>
        </div>
      </header>

      {/* Filter chips — horizontal scroll on mobile, wrap on desktop */}
      <div className="mb-[18px]">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:overflow-visible">
        {(['all', 'active', 'soon', 'paused', 'cancelled'] as const).map((key) => {
          const isActive = filter === key
          const labelMap: Record<PaymentsFilter, string> = {
            all:       p.filterAll,
            active:    p.filterActive,
            soon:      p.filterSoon,
            paused:    p.filterPaused,
            cancelled: p.filterCancelled,
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full px-4 py-2.5 text-[13px] font-medium transition-colors border ${
                isActive
                  ? 'border-[#0d9f6e] bg-[#0d9f6e] text-white shadow-[0_4px_14px_rgba(13,159,110,0.35)]'
                  : `border-[rgba(26,26,61,0.08)] bg-white text-[#6b6b80] ${FILTER_HOVER[key]}`
              }`}
            >
              {labelMap[key]}
            </button>
          )
        })}
          {/* Sort controls — hidden on mobile, inline on desktop */}
          <div className="ml-auto hidden sm:flex items-center gap-2 shrink-0">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as PaymentsSortKey)}
              className={`${actionButtonClass('ghost', 'sm')} font-normal`}
              aria-label={p.sortLabel}
            >
              <option value="next_charge">{p.sortByDate}</option>
              <option value="amount">{p.sortByAmount}</option>
              <option value="name">{p.sortByName}</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDir((v) => (v === 'asc' ? 'desc' : 'asc'))}
              className={actionButtonClass('ghost', 'sm')}
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        {/* Sort controls — mobile only row */}
        <div className="flex items-center justify-end gap-2 mt-2 sm:hidden">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as PaymentsSortKey)}
            className={`${actionButtonClass('ghost', 'sm')} font-normal`}
            aria-label={p.sortLabel}
          >
            <option value="next_charge">{p.sortByDate}</option>
            <option value="amount">{p.sortByAmount}</option>
            <option value="name">{p.sortByName}</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDir((v) => (v === 'asc' ? 'desc' : 'asc'))}
            className={actionButtonClass('ghost', 'sm')}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {sortedFiltered.length === 0 ? (
          <div className="rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white px-4 py-7 text-center text-[#6b6b80] shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
            {emptyMessage(filter, Boolean(search.trim()), p)}
          </div>
        ) : (
          sortedFiltered.map((sub, idx) => {
            const st = statusUi(sub, p)
            const days = daysUntil(sub.next_charge_date)
            const iconDisplay = resolveSubscriptionIconDisplay(sub.notes, sub.icon, sub.category_slug)
            const cardColors = cardPresetColors(sub.card_color_preset ?? null)
            return (
              <article
                key={sub.id}
                className="su-slide-left rounded-2xl border p-3.5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]"
                style={{
                  animationDelay: `${idx * 50}ms`,
                  background: cardColors
                    ? isDark
                      ? `linear-gradient(135deg, ${cardColors.darkTint} 0%, #1c1c38 100%)`
                      : `linear-gradient(135deg, ${cardColors.tint} 0%, #fff 100%)`
                    : isDark ? '#1c1c38' : '#fff',
                  borderColor: cardColors ? cardColors.swatch : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,61,0.08)',
                }}
              >
                <div className="mb-2.5 flex items-center gap-2.5">
                  <PaymentServiceIcon
                    icon={sub.icon}
                    categorySlug={sub.category_slug}
                    iconBg={iconDisplay.iconBg}
                    shape={iconDisplay.shape}
                    size={36}
                    title={sub.name}
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/subscriptions/${sub.id}?from=payments`} className="block truncate text-sm font-semibold text-[#1a1a2e]">
                      {sub.name}
                    </Link>
                    <p className="m-0 truncate text-xs text-[#6b6b80]">{cycleLabelConcept(sub, p)}</p>
                  </div>
                  <StatusPill label={st.label} tone={st.tone} />
                </div>
                <div className="mb-3 flex items-center justify-between text-xs text-[#6b6b80]">
                  <span>{formatDateShort(sub.next_charge_date)} · {dueRelativePhrase(days, p)}</span>
                  <strong className="text-sm text-[#1a1a2e]">{fmtCurrency(coerceNumber(sub.amount), sub.currency ?? 'RUB')}</strong>
                </div>
                <div className="flex items-center gap-2">
                  {sub.status === 'active' && days <= 3 && (
                    <button
                      type="button"
                      disabled={markingPaidId === sub.id}
                      onClick={async () => {
                        setMarkingPaidId(sub.id)
                        try { await markAsPaid(sub.id) } finally { setMarkingPaidId(null) }
                      }}
                      className={`flex-1 ${actionButtonClass('success', 'sm')} disabled:opacity-40`}
                    >
                      {markingPaidId === sub.id ? p.updatingLabel : p.paidButton}
                    </button>
                  )}
                  <Link
                    href={`/dashboard/subscriptions/${sub.id}/edit`}
                    className={actionButtonClass('secondary', 'sm')}
                  >
                    {p.editButton}
                  </Link>
                  <div className="relative">
                    <button
                      type="button"
                      ref={actionsOpenId === sub.id ? actionsRef : undefined}
                      aria-label={p.moreActionsAriaLabel}
                      onClick={() => setActionsOpenId((v) => (v === sub.id ? null : sub.id))}
                      className="rounded-lg border border-[rgba(26,26,61,0.12)] px-2.5 py-2 text-xs font-medium text-[#1a1a2e]"
                    >
                      ⋯
                    </button>
                    <RowDropdownPortal open={actionsOpenId === sub.id} anchorRef={actionsRef} onClose={() => setActionsOpenId(null)}>
                      {sub.status === 'active' && (
                        <button
                          type="button"
                          disabled={markingUsedId === sub.id}
                          onClick={async () => {
                            setMarkingUsedId(sub.id)
                            try { await markLastUsed(sub.id) } finally { setMarkingUsedId(null); setActionsOpenId(null) }
                          }}
                          className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#1a1a2e] hover:bg-[#f0faf5] disabled:opacity-50"
                        >
                          {markingUsedId === sub.id ? '…' : p.markUsedTodayLong}
                        </button>
                      )}
                      {sub.status === 'active' && days <= 3 && (
                        <button
                          type="button"
                          disabled={markingPaidId === sub.id}
                          onClick={async () => {
                            setMarkingPaidId(sub.id)
                            try { await markAsPaid(sub.id) } finally { setMarkingPaidId(null); setActionsOpenId(null) }
                          }}
                          className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#0d9f6e] hover:bg-[#f0faf5] disabled:opacity-50"
                        >
                          {markingPaidId === sub.id ? '…' : p.paidButton}
                        </button>
                      )}
                      <div className="my-1 border-t border-[#f0ece6]" />
                      {sub.status !== 'paused' ? (
                        <button type="button" disabled={statusUpdatingId === sub.id} onClick={() => applyStatusAction(sub, 'paused')} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#1a1a2e] hover:bg-[#f7f6fe] disabled:opacity-50">{p.pauseAction}</button>
                      ) : (
                        <button type="button" disabled={statusUpdatingId === sub.id} onClick={() => applyStatusAction(sub, 'active')} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#1a1a2e] hover:bg-[#f7f6fe] disabled:opacity-50">{p.resumeAction}</button>
                      )}
                      {sub.status !== 'cancelled' && (
                        <button type="button" disabled={statusUpdatingId === sub.id} onClick={() => applyStatusAction(sub, 'cancelled')} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#c24f00] hover:bg-[#fff4eb] disabled:opacity-50">{p.cancelAction}</button>
                      )}
                      {sub.status !== 'archived' && (
                        <button type="button" disabled={statusUpdatingId === sub.id} onClick={() => applyStatusAction(sub, 'archived')} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#6b6b80] hover:bg-[#f6f6f8] disabled:opacity-50">{p.archiveAction}</button>
                      )}
                    </RowDropdownPortal>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] md:block">
        <table className="w-full border-collapse text-[13px] [&_tbody>tr:last-child>td]:border-b-0">
          <thead>
            <tr>
              <th className="border-b border-[rgba(26,26,61,0.08)] bg-[#fafafa] px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">
                {p.colService}
              </th>
              <th className="border-b border-[rgba(26,26,61,0.08)] bg-[#fafafa] px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">
                {p.colNextCharge}
              </th>
              <th className="border-b border-[rgba(26,26,61,0.08)] bg-[#fafafa] px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">
                {p.colCycle}
              </th>
              <th className="border-b border-[rgba(26,26,61,0.08)] bg-[#fafafa] px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">
                {p.colAmount}
              </th>
              <th className="border-b border-[rgba(26,26,61,0.08)] bg-[#fafafa] px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">
                {p.colStatus}
              </th>
              <th className="border-b border-[rgba(26,26,61,0.08)] bg-[#fafafa] px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">
                {p.colActivity}
              </th>
              <th className="border-b border-[rgba(26,26,61,0.08)] bg-[#fafafa] px-4 py-3.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {sortedFiltered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-7 text-center text-[#6b6b80]">
                  {emptyMessage(filter, Boolean(search.trim()), p)}
                </td>
              </tr>
            ) : (
              sortedFiltered.map((sub, idx) => {
                const st = statusUi(sub, p)
                const days = daysUntil(sub.next_charge_date)
                const iconDisplay = resolveSubscriptionIconDisplay(sub.notes, sub.icon, sub.category_slug)
                const rowColors = cardPresetColors(sub.card_color_preset ?? null)

                const nextCell =
                  sub.status === 'cancelled' || sub.status === 'archived' ? (
                    <td className="border-b border-[rgba(26,26,61,0.08)] px-4 py-3.5 align-middle text-[#6b6b80] transition-colors group-hover:bg-[rgba(124,58,237,0.06)]">
                      —
                    </td>
                  ) : st.overdue ? (
                    <td
                      className="border-b border-[rgba(26,26,61,0.08)] px-4 py-3.5 align-middle font-semibold text-[#e5484d] transition-colors group-hover:bg-[rgba(124,58,237,0.06)]"
                      style={{ verticalAlign: 'top', lineHeight: 1.35 }}
                    >
                      <strong>{p.statusOverdue}</strong>
                      <div className="mt-1 text-xs font-medium opacity-95">{formatDateShort(sub.next_charge_date)}</div>
                      <div className="mt-0.5 text-xs">{dueRelativePhrase(days, p)}</div>
                      <button
                        type="button"
                        disabled={markingPaidId === sub.id}
                        onClick={async (e) => {
                          e.stopPropagation()
                          setMarkingPaidId(sub.id)
                          try { await markAsPaid(sub.id) } finally { setMarkingPaidId(null) }
                        }}
                        className={`mt-1.5 inline-flex items-center gap-1 ${actionButtonClass('success', 'sm')} opacity-90 disabled:opacity-50`}
                      >
                        {markingPaidId === sub.id ? '…' : p.paidButton}
                      </button>
                    </td>
                  ) : (
                    <td className="border-b border-[rgba(26,26,61,0.08)] px-4 py-3.5 align-middle transition-colors group-hover:bg-[rgba(124,58,237,0.06)]">
                      <div className="font-medium">{formatDateShort(sub.next_charge_date)}</div>
                      <div className="mt-0.5 text-xs text-[#6b6b80]">{dueRelativePhrase(days, p)}</div>
                      {sub.status === 'active' && days <= 3 ? (
                        <button
                          type="button"
                          disabled={markingPaidId === sub.id}
                          onClick={async (e) => {
                            e.stopPropagation()
                            setMarkingPaidId(sub.id)
                            try { await markAsPaid(sub.id) } finally { setMarkingPaidId(null) }
                          }}
                          className={`mt-1.5 inline-flex items-center gap-1 ${actionButtonClass('success', 'sm')} opacity-90 disabled:opacity-50`}
                        >
                          {markingPaidId === sub.id ? '…' : p.paidButton}
                        </button>
                      ) : null}
                    </td>
                  )

                return (
                  <tr
                    key={sub.id}
                    className="group cursor-pointer su-slide-left"
                    style={{ animationDelay: `${idx * 40}ms`, ...(rowColors ? { backgroundColor: isDark ? rowColors.darkTint : rowColors.tint } : {}) }}
                    onClick={() => openRow(sub.id)}
                  >
                    <td
                      className="border-b border-[rgba(26,26,61,0.08)] px-4 py-3.5 align-middle transition-colors group-hover:bg-[rgba(124,58,237,0.06)]"
                      style={rowColors ? { borderLeft: `3px solid ${rowColors.swatch}` } : undefined}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <PaymentServiceIcon
                          icon={sub.icon}
                          categorySlug={sub.category_slug}
                          iconBg={iconDisplay.iconBg}
                          shape={iconDisplay.shape}
                          size={40}
                          title={sub.name}
                        />
                        <strong className="min-w-0 font-semibold text-[#1a1a2e]">
                          <Link
                            href={`/dashboard/subscriptions/${sub.id}?from=payments`}
                            className="text-inherit no-underline hover:text-[#5b43d4] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="truncate block max-w-[220px] sm:max-w-[320px]">{sub.name}</span>
                          </Link>
                        </strong>
                      </div>
                    </td>
                    {nextCell}
                    <td className="border-b border-[rgba(26,26,61,0.08)] px-4 py-3.5 align-middle text-[#1a1a2e] transition-colors group-hover:bg-[rgba(124,58,237,0.06)]">
                      {cycleLabelConcept(sub, p)}
                    </td>
                    <td
                      className="border-b border-[rgba(26,26,61,0.08)] px-4 py-3.5 align-top leading-snug text-[#1a1a2e] transition-colors group-hover:bg-[rgba(124,58,237,0.06)]"
                      style={{ verticalAlign: 'top', lineHeight: 1.35 }}
                    >
                      <strong className="font-semibold tabular-nums">{fmtCurrency(coerceNumber(sub.amount), sub.currency ?? 'RUB')}</strong>
                    </td>
                    <td className="border-b border-[rgba(26,26,61,0.08)] px-4 py-3.5 align-middle transition-colors group-hover:bg-[rgba(124,58,237,0.06)]">
                      <StatusPill label={st.label} tone={st.tone} />
                    </td>
                    <td
                      className="border-b border-[rgba(26,26,61,0.08)] px-4 py-3.5 align-middle transition-colors group-hover:bg-[rgba(124,58,237,0.06)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {sub.status === 'active' ? (() => {
                        const lu = lastUsedLabel(sub.last_used_at ?? null, p)
                        const usedToday = sub.last_used_at
                          ? calendarDaysAgo(sub.last_used_at) === 0
                          : false
                        return (
                          <div className="flex flex-col gap-1">
                            <span className={`text-[11px] leading-tight ${lu.stale ? 'text-[#c24f00]' : 'text-[#0d9f6e]'}`}>
                              {lu.text}
                            </span>
                            {!usedToday && (
                              <button
                                type="button"
                                disabled={markingUsedId === sub.id}
                                onClick={async () => {
                                  setMarkingUsedId(sub.id)
                                  try { await markLastUsed(sub.id) } finally { setMarkingUsedId(null) }
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-[rgba(13,159,110,0.25)] bg-[#f0faf5] px-2 py-1 text-[11px] font-medium text-[#0d9f6e] hover:bg-[#d4f0e3] disabled:opacity-50 transition-colors w-fit"
                              >
                                {markingUsedId === sub.id ? '…' : p.markUsedToday}
                              </button>
                            )}
                            {usedToday && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#e8faf0] px-2 py-1 text-[11px] font-medium text-[#0d9f6e] w-fit">
                                {p.markedToday}
                              </span>
                            )}
                          </div>
                        )
                      })() : <span className="text-[#c0bfcf] text-xs">—</span>}
                    </td>
                    <td className="border-b border-[rgba(26,26,61,0.08)] px-4 py-3.5 align-middle text-right transition-colors group-hover:bg-[rgba(124,58,237,0.06)]">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          ref={actionsOpenId === sub.id ? actionsRef : undefined}
                          className="border-0 bg-transparent p-1 text-lg leading-none text-[#1a1a2e] hover:text-[#5b43d4]"
                          aria-label={p.actionsAriaLabel}
                          onClick={(e) => {
                            e.stopPropagation()
                            setActionsOpenId((v) => (v === sub.id ? null : sub.id))
                          }}
                        >
                          ⋯
                        </button>
                        <RowDropdownPortal open={actionsOpenId === sub.id} anchorRef={actionsRef} onClose={() => setActionsOpenId(null)}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/subscriptions/${sub.id}/edit`) }}
                            className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#1a1a2e] hover:bg-[#f7f6fe]"
                          >
                            {p.editButton}
                          </button>
                          {sub.status === 'active' && days <= 3 && (
                            <button
                              type="button"
                              disabled={markingPaidId === sub.id}
                              onClick={async (e) => {
                                e.stopPropagation()
                                setMarkingPaidId(sub.id)
                                try { await markAsPaid(sub.id) } finally { setMarkingPaidId(null); setActionsOpenId(null) }
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#0d9f6e] hover:bg-[#f0faf5] disabled:opacity-50"
                            >
                              {markingPaidId === sub.id ? '…' : p.paidButton}
                            </button>
                          )}
                          <div className="my-1 border-t border-[#f0ece6]" />
                          {sub.status !== 'paused' ? (
                            <button type="button" disabled={statusUpdatingId === sub.id} onClick={(e) => { e.stopPropagation(); void applyStatusAction(sub, 'paused') }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#1a1a2e] hover:bg-[#f7f6fe] disabled:opacity-50">{p.pauseAction}</button>
                          ) : (
                            <button type="button" disabled={statusUpdatingId === sub.id} onClick={(e) => { e.stopPropagation(); void applyStatusAction(sub, 'active') }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#1a1a2e] hover:bg-[#f7f6fe] disabled:opacity-50">{p.resumeAction}</button>
                          )}
                          {sub.status !== 'cancelled' && (
                            <button type="button" disabled={statusUpdatingId === sub.id} onClick={(e) => { e.stopPropagation(); void applyStatusAction(sub, 'cancelled') }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#c24f00] hover:bg-[#fff4eb] disabled:opacity-50">{p.cancelAction}</button>
                          )}
                          {sub.status !== 'archived' && (
                            <button type="button" disabled={statusUpdatingId === sub.id} onClick={(e) => { e.stopPropagation(); void applyStatusAction(sub, 'archived') }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#6b6b80] hover:bg-[#f6f6f8] disabled:opacity-50">{p.archiveAction}</button>
                          )}
                        </RowDropdownPortal>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-1.5" aria-labelledby="payments-collections-title">
        <Link
          href="/dashboard/collections"
          className="flex items-center justify-between gap-4 rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white px-[18px] py-[18px] text-inherit no-underline shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] transition-all hover:border-[rgba(91,67,212,0.3)] hover:shadow-[0_8px_20px_rgba(91,67,212,0.12)] active:translate-y-px"
        >
          <div className="min-w-0 flex-1">
            <span
              id="payments-collections-title"
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#6b6b80]"
            >
              {p.collectionsLabel}
            </span>
            <h2 className="m-0 text-[1.85rem] font-bold leading-tight tracking-[-0.02em] text-[#1a1a2e]">
              {p.collectionsTitle}
            </h2>
            <p className="mt-2 max-w-[690px] text-sm leading-snug text-[#6b6b80] m-0">
              {p.collectionsDesc}
            </p>
          </div>
          <span
            className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#f2eefc] text-[28px] leading-none text-[#5b43d4]"
            aria-hidden
          >
            ›
          </span>
        </Link>
      </section>
    </>
  )
}
