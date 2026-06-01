'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AddPaymentModal from './AddPaymentModal'
import PaymentServiceIcon from './PaymentServiceIcon'
import { coerceNumber } from '@/lib/coerce-number'
import { categoryLabel } from '@/lib/subscription-labels'
import type { Subscription, SubscriptionStatus } from '@/lib/supabase/types'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import { CARD_COLOR_PRESETS } from '@/lib/subscription-viz-notes'
import { archiveSubscription, deleteSubscription, markAsPaid, updateSubscriptionStatus } from './subscriptions/actions'
import { fmtCurrency, groupMonthlyByCurrency, formatGroups, getMonthlyAmount } from '@/lib/currency'
import StatusPill from './ui/StatusPill'
import { actionButtonClass } from './ui/action-button'
import { useDarkMode } from '@/lib/hooks/use-dark-mode'
import { useLang } from '@/lib/LangContext'

export type PaymentsFilter = 'all' | 'active' | 'soon' | 'overdue' | 'paused' | 'cancelled'
type PaymentsSortKey = 'next_charge' | 'amount' | 'name'

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

import type { t as tType, Lang } from '@/lib/translations'
type PaymentsStrings = typeof tType['ru']['payments'] | typeof tType['en']['payments']

function cycleLabelConcept(sub: Subscription, p: PaymentsStrings): string {
  if (sub.billing_cycle === 'monthly' && sub.billing_interval === 1) return p.cycleMonthly
  if (sub.billing_cycle === 'yearly' && sub.billing_interval === 1) return p.cycleYearly
  if (sub.billing_cycle === 'weekly') return p.cycleWeekly
  if (sub.billing_cycle === 'quarterly') return p.cycleQuarterly
  if (sub.billing_cycle === 'custom' && sub.custom_interval_days) return p.cycleCustom(sub.custom_interval_days)
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

function cardPresetColors(preset: string | null): { tint: string; darkTint: string; swatch: string } | null {
  if (!preset) return null
  const found = CARD_COLOR_PRESETS.find((p) => p.key === preset)
  return found ? { tint: found.tint, darkTint: found.darkTint, swatch: found.swatch } : null
}

type StatusUi = { label: string; tone: 'primary' | 'warning' | 'danger' | 'neutral'; overdue: boolean }

function statusUi(sub: Subscription, p: PaymentsStrings): StatusUi {
  if (sub.status === 'archived')  return { label: p.statusArchived,  tone: 'neutral',  overdue: false }
  if (sub.status === 'paused')    return { label: p.statusPaused,    tone: 'warning',  overdue: false }
  if (sub.status === 'cancelled') return { label: p.statusCancelled, tone: 'danger',   overdue: false }
  if (daysUntil(sub.next_charge_date) < 0) return { label: p.statusOverdue, tone: 'danger', overdue: true }
  return { label: p.statusActive, tone: 'primary', overdue: false }
}

function emptyMessage(filter: PaymentsFilter, hasSearch: boolean, p: PaymentsStrings): string {
  if (hasSearch) return p.emptySearch
  if (filter === 'soon')      return p.emptySoon
  if (filter === 'overdue')   return p.emptyOverdue
  if (filter === 'active')    return p.emptyActive
  if (filter === 'paused')    return p.emptyPaused
  if (filter === 'cancelled') return p.emptyCancelled
  return p.emptySearch
}

function subscriptionFormErr(p: PaymentsStrings): Record<string, string> {
  return { name: p.errName, amount: p.errAmount, dates: p.errDates, custom: p.errCustom, save: p.errSave }
}

/** Dropdown portal — вырывается из overflow-x-auto */
function RowDropdownPortal({
  open, anchorRef, onClose, children,
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
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) onClose()
    }
    const id = setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    return () => { clearTimeout(id); document.removeEventListener('mousedown', onDoc) }
  }, [open, anchorRef, onClose])

  if (!open || !pos) return null
  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999, minWidth: 190 }}
      className="rounded-xl border border-[rgba(26,26,61,0.08)] bg-white p-1.5 shadow-[0_8px_24px_rgba(26,26,61,0.14)]"
    >
      {children}
    </div>,
    document.body,
  )
}

/** Правая панель деталей подписки */
function SubscriptionDetailPanel({
  sub,
  onClose,
  onMarkPaid,
  onStatusChange,
  onDelete,
  markingPaidId,
  statusUpdatingId,
  p,
  lang,
}: {
  sub: Subscription
  onClose: () => void
  onMarkPaid: (id: string) => void
  onStatusChange: (sub: Subscription, next: 'active' | 'paused' | 'cancelled') => void
  onDelete: (sub: Subscription) => void
  markingPaidId: string | null
  statusUpdatingId: string | null
  p: PaymentsStrings
  lang: Lang
}) {
  const iconDisplay = resolveSubscriptionIconDisplay(sub.notes, sub.icon, sub.category_slug)
  const st = statusUi(sub, p)
  const days = daysUntil(sub.next_charge_date)
  const isPaused = sub.status === 'paused'

  const statusBarClass =
    st.overdue  ? 'bg-[#fde8ea] text-[#c5384b]' :
    isPaused    ? 'bg-[#fff4e0] text-[#9a5a00]' :
    sub.status === 'cancelled' ? 'bg-[#f0f0f3] text-[#6b6b80]' :
    'bg-[#e3f9f2] text-[#0d7a4d]'

  const statusBarDot =
    st.overdue  ? '⚠' :
    isPaused    ? '⏸' :
    sub.status === 'cancelled' ? '✗' : '●'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[rgba(26,26,61,0.18)] backdrop-blur-[1px]"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 flex w-[340px] max-w-full flex-col overflow-y-auto bg-white shadow-[-12px_0_32px_rgba(26,26,61,0.12)] border-l border-[rgba(26,26,61,0.08)]">
        <div className="flex flex-col gap-0 px-5 py-6">
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#f4f4f6] text-[#8e8e93] hover:bg-[#ebebef]"
            aria-label="Закрыть"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          {/* Head: icon + name */}
          <div className="mb-4 flex items-center gap-3.5 pr-10">
            <div className="shrink-0">
              <PaymentServiceIcon
                icon={sub.icon}
                categorySlug={sub.category_slug}
                iconBg={iconDisplay.iconBg}
                shape={iconDisplay.shape}
                size={56}
                title={sub.name}
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[1.05rem] font-bold text-[#1a1a2e]">{sub.name}</div>
              <div className="mt-0.5 text-[12px] text-[#6b6b80]">{categoryLabel(sub.category_slug, lang)}</div>
            </div>
          </div>

          {/* Status bar */}
          <div className={`mb-4 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold ${statusBarClass}`}>
            {statusBarDot} {st.label}{st.overdue ? ` (${dueRelativePhrase(days, p)})` : ''}
          </div>

          {/* Detail rows */}
          <div className="mb-4 overflow-hidden rounded-xl border border-[rgba(26,26,61,0.08)]">
            {[
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                label: p.detailAmountLabel,
                val: <span className="font-semibold tabular-nums">{fmtCurrency(coerceNumber(sub.amount), sub.currency ?? 'RUB')}</span>,
              },
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                label: p.detailNextLabel,
                val: <span className={`font-semibold ${st.overdue ? 'text-[#e5484d]' : ''}`}>{formatDateShort(sub.next_charge_date)}</span>,
              },
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
                label: p.detailCycleLabel,
                val: <span className="font-semibold">{cycleLabelConcept(sub, p)}</span>,
              },
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                label: p.detailStatusLabel,
                val: <StatusPill label={st.label} tone={st.tone} />,
              },
              {
                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 00-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0"/></svg>,
                label: p.detailReminderLabel,
                val: <span className="text-[#6b6b80]">{p.detailReminderVal}</span>,
              },
            ].map((row, i, arr) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3.5 py-3 ${i < arr.length - 1 ? 'border-b border-[rgba(26,26,61,0.06)]' : ''}`}
              >
                <span className="shrink-0 text-[#6b6b80]">{row.icon}</span>
                <span className="flex-1 text-[13px] text-[#6b6b80]">{row.label}</span>
                <span className="text-[13px]">{row.val}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="mb-2 flex flex-col gap-2">
            {sub.status === 'active' && (
              <button
                type="button"
                disabled={markingPaidId === sub.id}
                onClick={() => onMarkPaid(sub.id)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(13,159,110,0.22)] bg-[#e8faf0] py-2.5 text-[14px] font-semibold text-[#0d9f6e] hover:bg-[#d4f0e3] disabled:opacity-40 transition-colors"
              >
                {markingPaidId === sub.id ? p.updatingLabel : p.detailMarkPaid}
              </button>
            )}
            <Link
              href={`/dashboard/subscriptions/${sub.id}/edit?from=payments`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(91,67,212,0.2)] bg-[#f5f0ff] py-2.5 text-[14px] font-semibold text-[#5b43d4] hover:bg-[#ede6ff] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              {p.editButton}
            </Link>
            <button
              type="button"
              disabled={statusUpdatingId === sub.id}
              onClick={() => onStatusChange(sub, isPaused ? 'active' : 'paused')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(26,26,61,0.1)] bg-[#f4f4f7] py-2.5 text-[14px] font-semibold text-[#1a1a2e] hover:bg-[#ebebef] disabled:opacity-40 transition-colors"
            >
              {isPaused ? p.resumeAction : p.pauseAction}
            </button>
          </div>

          <div className="mb-4 flex flex-col gap-2">
            {sub.status !== 'cancelled' && (
              <button
                type="button"
                disabled={statusUpdatingId === sub.id}
                onClick={() => onStatusChange(sub, 'cancelled')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(229,72,77,0.22)] bg-transparent py-2.5 text-[14px] font-semibold text-[#e5484d] hover:bg-[#fde8ea] disabled:opacity-40 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                {p.detailCancelSub}
              </button>
            )}
            <button
              type="button"
              disabled={statusUpdatingId === sub.id}
              onClick={() => onDelete(sub)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-0 bg-[#fde8ea] py-2.5 text-[14px] font-semibold text-[#c5384b] hover:bg-[#fbd5d9] disabled:opacity-40 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
              {p.detailDelete}
            </button>
          </div>

          {/* Privacy note */}
          <div className="flex items-start gap-2 rounded-xl border border-[rgba(26,26,61,0.08)] bg-[#f7f7fb] p-3 text-[12px] leading-relaxed text-[#6b6b80]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5b43d4" strokeWidth="2" className="mt-0.5 shrink-0">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>{p.detailPrivacy}</span>
          </div>
        </div>
      </div>
    </>
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
    initialFilterFromUrl && (['all', 'active', 'soon', 'overdue', 'paused', 'cancelled'] as const).includes(initialFilterFromUrl as PaymentsFilter)
      ? (initialFilterFromUrl as PaymentsFilter)
      : initialFilter,
  )
  const [search, setSearch] = useState(initialQuery)
  const [sortKey, setSortKey] = useState<PaymentsSortKey>(
    initialSort === 'amount' || initialSort === 'name' || initialSort === 'next_charge' ? initialSort : 'next_charge',
  )
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialDir === 'desc' ? 'desc' : 'asc')
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
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [detailSub, setDetailSub] = useState<Subscription | null>(() => {
    // Авто-открытие панели при возврате со страницы редактирования (?openSub=<id>)
    const id = searchParams.get('openSub')
    return id ? subs.find((s) => s.id === id) ?? null : null
  })
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window === 'undefined') return 'list'
    const stored = localStorage.getItem('payments_view')
    return stored === 'grid' ? 'grid' : 'list'
  })
  const [filterOpen, setFilterOpen] = useState(false)
  // Оптимистичные смены статуса/удаления: мгновенно отражаем в UI, не дожидаясь ревалидации сервера
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, SubscriptionStatus>>({})
  const [optimisticRemoved, setOptimisticRemoved] = useState<Set<string>>(() => new Set())
  const notifRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLButtonElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  // Когда приходят свежие данные с сервера — сбрасываем оптимистичные оверрайды.
  // Официальный React-паттерн «adjust state during render when a prop changes».
  const [prevSubs, setPrevSubs] = useState(subs)
  if (prevSubs !== subs) {
    setPrevSubs(subs)
    if (Object.keys(optimisticStatus).length > 0) setOptimisticStatus({})
    if (optimisticRemoved.size > 0) setOptimisticRemoved(new Set())
  }

  const effectiveSubs = useMemo(
    () => subs
      .filter((s) => !optimisticRemoved.has(s.id))
      .map((s) => (optimisticStatus[s.id] ? { ...s, status: optimisticStatus[s.id] } : s)),
    [subs, optimisticStatus, optimisticRemoved],
  )

  const changeView = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    try { localStorage.setItem('payments_view', mode) } catch {}
  }

  const subscriptionCreated = searchParams.get('subscriptionCreated') === '1'
  const subscriptionFormError = searchParams.get('subscriptionFormError')

  const clearPaymentFlash = () => router.replace('/dashboard?tab=payments')

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
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setActionsOpenId(null)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [actionsOpenId])

  // Escape to close detail panel
  useEffect(() => {
    if (!detailSub) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDetailSub(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [detailSub])

  // Close filters dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return
    const onDoc = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [filterOpen])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'payments')
    if (filter === 'all') params.delete('paymentsFilter')
    else params.set('paymentsFilter', filter)
    if (search.trim()) params.set('q', search.trim())
    else params.delete('q')
    params.set('sort', sortKey)
    params.set('dir', sortDir)
    params.delete('openSub') // одноразовый параметр авто-открытия панели — убираем из URL
    const next = `/dashboard?${params.toString()}`
    if (next !== `/dashboard?${searchParams.toString()}`) router.replace(next, { scroll: false })
  }, [filter, search, sortKey, sortDir, router, searchParams])

  const monthlyGroups = useMemo(
    () => groupMonthlyByCurrency(effectiveSubs.filter((s) => s.status === 'active'), getMonthlyAmount),
    [effectiveSubs],
  )

  // Stats
  const todayCount   = useMemo(() => effectiveSubs.filter((s) => s.status === 'active' && daysUntil(s.next_charge_date) === 0).length, [effectiveSubs])
  const weekCount    = useMemo(() => effectiveSubs.filter((s) => s.status === 'active' && daysUntil(s.next_charge_date) >= 0 && daysUntil(s.next_charge_date) <= 7).length, [effectiveSubs])
  const overdueCount = useMemo(() => effectiveSubs.filter((s) => s.status === 'active' && daysUntil(s.next_charge_date) < 0).length, [effectiveSubs])

  const filtered = useMemo(() => {
    let list = effectiveSubs
    if (filter === 'soon') {
      list = effectiveSubs.filter((s) => { if (s.status !== 'active') return false; const d = daysUntil(s.next_charge_date); return d >= 0 && d <= 14 })
    } else if (filter === 'overdue') {
      list = effectiveSubs.filter((s) => s.status === 'active' && daysUntil(s.next_charge_date) < 0)
    } else if (filter === 'active') {
      list = effectiveSubs.filter((s) => s.status === 'active')
    } else if (filter === 'paused') {
      list = effectiveSubs.filter((s) => s.status === 'paused')
    } else if (filter === 'cancelled') {
      list = effectiveSubs.filter((s) => s.status === 'cancelled')
    }
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
  }, [effectiveSubs, filter, search, lang])

  const sortedFiltered = useMemo(() => {
    const mul = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === 'amount') return (getMonthlyAmount(a) - getMonthlyAmount(b)) * mul
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'ru') * mul
      return (daysUntil(a.next_charge_date) - daysUntil(b.next_charge_date)) * mul
    })
  }, [filtered, sortDir, sortKey])

  const notifItems = useMemo(() => effectiveSubs
    .filter((s) => {
      if (s.status !== 'active') return false
      if (dismissedNotifIds.has(s.id)) return false
      const d = daysUntil(s.next_charge_date)
      return d >= 0 && d <= 7
    })
    .sort((a, b) => daysUntil(a.next_charge_date) - daysUntil(b.next_charge_date))
    .slice(0, 6), [effectiveSubs, dismissedNotifIds])

  const openRow = (sub: Subscription) => setDetailSub(sub)

  const applyStatusAction = async (sub: Subscription, next: 'active' | 'paused' | 'cancelled' | 'archived') => {
    // Оптимистично: сразу отражаем новый статус и закрываем панель/меню
    setOptimisticStatus((prev) => ({ ...prev, [sub.id]: next }))
    if (detailSub?.id === sub.id) setDetailSub(null)
    setActionsOpenId(null)
    setStatusUpdatingId(sub.id)
    try {
      if (next === 'archived') await archiveSubscription(sub.id)
      else await updateSubscriptionStatus(sub.id, next)
    } catch {
      // Откат при ошибке
      setOptimisticStatus((prev) => {
        const copy = { ...prev }
        delete copy[sub.id]
        return copy
      })
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const handleMarkPaid = async (id: string) => {
    setMarkingPaidId(id)
    try { await markAsPaid(id) } finally { setMarkingPaidId(null) }
  }

  const handleDelete = async (sub: Subscription) => {
    if (!window.confirm(p.detailDeleteConfirm)) return
    // Оптимистично убираем строку и закрываем панель/меню
    setOptimisticRemoved((prev) => new Set(prev).add(sub.id))
    if (detailSub?.id === sub.id) setDetailSub(null)
    setActionsOpenId(null)
    try {
      await deleteSubscription(sub.id)
    } catch {
      setOptimisticRemoved((prev) => {
        const copy = new Set(prev)
        copy.delete(sub.id)
        return copy
      })
    }
  }

  /** Пункты выпадающего меню строки/карточки — общие для списка и плитки */
  const rowMenuItems = (sub: Subscription, days: number) => (
    <>
      <button type="button" onClick={() => { router.push(`/dashboard/subscriptions/${sub.id}/edit?from=payments`); setActionsOpenId(null) }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#1a1a2e] hover:bg-[#f7f6fe]">{p.editButton}</button>
      {sub.status === 'active' && days <= 3 && (
        <button type="button" disabled={markingPaidId === sub.id} onClick={async (e) => { e.stopPropagation(); setMarkingPaidId(sub.id); try { await markAsPaid(sub.id) } finally { setMarkingPaidId(null); setActionsOpenId(null) } }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#0d9f6e] hover:bg-[#f0faf5] disabled:opacity-50">
          {markingPaidId === sub.id ? '…' : p.paidButton}
        </button>
      )}
      <div className="my-1 border-t border-[#f0ece6]" />
      {sub.status !== 'paused'
        ? <button type="button" disabled={statusUpdatingId === sub.id} onClick={(e) => { e.stopPropagation(); void applyStatusAction(sub, 'paused') }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#1a1a2e] hover:bg-[#f7f6fe] disabled:opacity-50">{p.pauseAction}</button>
        : <button type="button" disabled={statusUpdatingId === sub.id} onClick={(e) => { e.stopPropagation(); void applyStatusAction(sub, 'active') }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#1a1a2e] hover:bg-[#f7f6fe] disabled:opacity-50">{p.resumeAction}</button>
      }
      {sub.status !== 'cancelled' && <button type="button" disabled={statusUpdatingId === sub.id} onClick={(e) => { e.stopPropagation(); void applyStatusAction(sub, 'cancelled') }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#c24f00] hover:bg-[#fff4eb] disabled:opacity-50">{p.cancelAction}</button>}
      {sub.status !== 'archived' && <button type="button" disabled={statusUpdatingId === sub.id} onClick={(e) => { e.stopPropagation(); void applyStatusAction(sub, 'archived') }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#6b6b80] hover:bg-[#f6f6f8] disabled:opacity-50">{p.archiveAction}</button>}
      <div className="my-1 border-t border-[#f0ece6]" />
      <button type="button" onClick={(e) => { e.stopPropagation(); void handleDelete(sub) }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#c5384b] hover:bg-[#fde8ea]">{p.detailDelete}</button>
    </>
  )

  const dueColorClass = (st: StatusUi, days: number) =>
    st.overdue ? 'text-[#e5484d] font-semibold' :
    days === 0 ? 'text-[#e5484d] font-semibold' :
    days <= 3  ? 'text-[#d97706] font-semibold' : ''

  const FILTER_LABELS: Record<PaymentsFilter, string> = {
    all:       p.filterAll,
    active:    p.filterActive,
    soon:      p.filterSoon,
    overdue:   p.filterOverdue,
    paused:    p.filterPaused,
    cancelled: p.filterCancelled,
  }

  return (
    <>
      <AddPaymentModal open={addModalOpen} onClose={() => setAddModalOpen(false)} defaultCurrency={currency} />

      {/* Detail panel */}
      {detailSub && (
        <SubscriptionDetailPanel
          sub={detailSub}
          onClose={() => setDetailSub(null)}
          onMarkPaid={handleMarkPaid}
          onStatusChange={(sub, next) => applyStatusAction(sub, next)}
          onDelete={handleDelete}
          markingPaidId={markingPaidId}
          statusUpdatingId={statusUpdatingId}
          p={p}
          lang={lang}
        />
      )}

      {/* Flash messages */}
      {subscriptionCreated && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[#bfe7d1] bg-[#e8faf0] px-4 py-3 text-sm text-[#0d9f6e]">
          <span>{p.flashAdded}</span>
          <button type="button" className="shrink-0 rounded-lg border-0 bg-transparent px-2 py-0.5 text-[#0d9f6e] hover:bg-[#d4f0e3]" onClick={clearPaymentFlash}>×</button>
        </div>
      )}
      {subscriptionFormError && subscriptionFormErr(p)[subscriptionFormError] && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f3c5c7] bg-[#fdecec] px-4 py-3 text-sm text-[#e5484d]">
          <span>{subscriptionFormErr(p)[subscriptionFormError]}</span>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-lg border border-[#e5484d] bg-white px-3 py-1.5 text-xs font-semibold text-[#e5484d] hover:bg-[#fff5f5]" onClick={() => { clearPaymentFlash(); setAddModalOpen(true) }}>{p.openFormButton}</button>
            <button type="button" className="shrink-0 rounded-lg border-0 bg-transparent px-2 py-0.5 text-[#e5484d] hover:bg-[#fcd4d4]" onClick={clearPaymentFlash}>×</button>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="shrink-0">
          <h1 className="m-0 text-[1.75rem] font-bold tracking-[-0.03em] text-[#1a1a2e]">{p.title}</h1>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 lg:flex-1 lg:justify-end">
          <div className="flex items-center gap-2.5 flex-1 lg:flex-none">
            <div className="flex items-center gap-2.5 bg-white border border-[rgba(26,26,61,0.08)] rounded-full pl-4 pr-4 flex-1 lg:w-[300px] lg:flex-none h-11 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-[0.45] text-[#1a1a2e]"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={p.searchPlaceholder} aria-label={p.searchAriaLabel} className="flex-1 min-w-0 border-0 bg-transparent outline-none text-sm text-[#1a1a2e] placeholder:text-[#9a9aaf] font-[inherit]" />
            </div>

            {/* Notifications */}
            <div className="relative shrink-0" ref={notifRef}>
              <button type="button" className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(26,26,61,0.08)] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] text-[#1a1a2e]" aria-label={p.notifAriaLabel} onClick={() => setNotifOpen((v) => !v)}>
                {notifItems.length > 0 && <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#e5484d] ring-2 ring-white su-pulse-dot" />}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={notifItems.length > 0 ? 'su-bell-ring' : ''}><path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0"/></svg>
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,92vw)] rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white shadow-[0_4px_6px_rgba(26,26,61,0.04),0_12px_32px_rgba(26,26,61,0.10)]">
                  <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b6b80]">{p.notifTitle}</span>
                    {notifItems.length > 0 && <span className="text-[11px] font-semibold text-[#5b43d4]">{p.notifThisWeek}</span>}
                  </div>
                  <div className="max-h-[320px] overflow-y-auto px-2 pb-2">
                    {notifItems.length === 0 ? (
                      <div className="flex flex-col items-center gap-1.5 py-8 text-center"><p className="text-[13px] text-[#6b6b80]">{p.notifNone}</p></div>
                    ) : (
                      <div className="space-y-1">
                        {notifItems.map((s) => {
                          const days = daysUntil(s.next_charge_date)
                          const badgeStyle = days <= 0 ? 'bg-[#fee2e2] text-[#b91c1c]' : days === 1 ? 'bg-[#ffedd5] text-[#c2410c]' : days <= 3 ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-[#f1f0ff] text-[#5b43d4]'
                          const avatarColors = ['bg-[#ede9ff] text-[#5b43d4]','bg-[#dcfce7] text-[#15803d]','bg-[#dbeafe] text-[#1d4ed8]','bg-[#fef3c7] text-[#b45309]','bg-[#fce7f3] text-[#be185d]']
                          const code = s.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
                          return (
                            <button key={s.id} type="button" className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-[#f8f7ff] transition-colors" onClick={() => { dismissNotif(s.id); setNotifOpen(false); openRow(s) }}>
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold ${avatarColors[code % avatarColors.length]}`}>{s.name.trim().charAt(0).toUpperCase()}</div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-[#1a1a2e] truncate">{s.name}</p>
                                <p className="text-[11px] text-[#6b6b80] mt-0.5">{formatDateShort(s.next_charge_date)}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[13px] font-semibold text-[#1a1a2e]">{fmtCurrency(getMonthlyAmount(s), s.currency ?? 'RUB')}</span>
                                <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${badgeStyle}`}>{dueRelativePhrase(days, p)}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* View toggle — desktop only */}
          <div className="hidden md:flex shrink-0 items-center gap-1 rounded-xl border border-[rgba(26,26,61,0.08)] bg-white p-1 shadow-[0_1px_3px_rgba(26,26,61,0.06)]">
            <button
              type="button"
              onClick={() => changeView('grid')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${viewMode === 'grid' ? 'bg-[#ede9fc] text-[#5b43d4]' : 'text-[#6b6b80] hover:text-[#1a1a2e]'}`}
              aria-pressed={viewMode === 'grid'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              {p.viewGridLabel}
            </button>
            <button
              type="button"
              onClick={() => changeView('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${viewMode === 'list' ? 'bg-[#ede9fc] text-[#5b43d4]' : 'text-[#6b6b80] hover:text-[#1a1a2e]'}`}
              aria-pressed={viewMode === 'list'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              {p.viewListLabel}
            </button>
          </div>
          <button type="button" onClick={() => setAddModalOpen(true)} className={`${actionButtonClass('primary')} gap-2 px-5 w-full sm:w-auto justify-center`}>{p.addButton}</button>
        </div>
      </header>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>, color: 'bg-[#dcfce7] text-[#16a34a]', val: formatGroups(monthlyGroups), lbl: p.statMonthly },
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, color: 'bg-[#dbeafe] text-[#2563eb]', val: String(todayCount), lbl: p.statToday },
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, color: 'bg-[#fff3cd] text-[#d97706]', val: String(weekCount), lbl: p.statThisWeek },
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>, color: 'bg-[#fde8ea] text-[#e5484d]', val: String(overdueCount), lbl: p.statOverdueLabel },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-[rgba(26,26,61,0.08)] bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.color}`}>{s.icon}</div>
            <div>
              <div className="text-[1.1rem] font-bold leading-tight tracking-tight text-[#1a1a2e]">{s.val}</div>
              <div className="mt-0.5 text-[12px] text-[#6b6b80]">{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters dropdown + sort ──────────────────────────────────── */}
      <div className="mb-[18px] flex items-center gap-2">
        {/* Фильтры — выпадающий список вместо постоянных чипов */}
        <div className="relative shrink-0" ref={filterRef}>
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-medium transition-colors ${
              filter !== 'all'
                ? 'border-[#0d9f6e] bg-[#0d9f6e] text-white shadow-[0_4px_14px_rgba(13,159,110,0.35)]'
                : 'border-[rgba(26,26,61,0.08)] bg-white text-[#1a1a2e] hover:border-[#5b43d4] hover:text-[#5b43d4]'
            }`}
            aria-expanded={filterOpen}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            {p.filtersButton}
            {filter !== 'all' && <span className="rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-semibold">{FILTER_LABELS[filter]}</span>}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {filterOpen && (
            <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[220px] rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white p-1.5 shadow-[0_4px_6px_rgba(26,26,61,0.04),0_12px_32px_rgba(26,26,61,0.10)]">
              {(['all', 'active', 'soon', 'overdue', 'paused', 'cancelled'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setFilter(key); setFilterOpen(false) }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                    filter === key ? 'bg-[#ede9fc] text-[#5b43d4]' : 'text-[#1a1a2e] hover:bg-[#f6f6f9]'
                  }`}
                >
                  {FILTER_LABELS[key]}
                  {filter === key && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as PaymentsSortKey)} className={`${actionButtonClass('ghost', 'sm')} font-normal`} aria-label={p.sortLabel}>
            <option value="next_charge">{p.sortByDate}</option>
            <option value="amount">{p.sortByAmount}</option>
            <option value="name">{p.sortByName}</option>
          </select>
          <button type="button" onClick={() => setSortDir((v) => (v === 'asc' ? 'desc' : 'asc'))} className={actionButtonClass('ghost', 'sm')}>{sortDir === 'asc' ? '↑' : '↓'}</button>
        </div>
      </div>

      {/* ── Mobile cards (unchanged) ─────────────────────────────────── */}
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
              <article key={sub.id} className="su-slide-left rounded-2xl border p-3.5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]"
                style={{
                  animationDelay: `${idx * 50}ms`,
                  background: cardColors ? isDark ? `linear-gradient(135deg, ${cardColors.darkTint} 0%, #1c1c38 100%)` : `linear-gradient(135deg, ${cardColors.tint} 0%, #fff 100%)` : isDark ? '#1c1c38' : '#fff',
                  borderColor: cardColors ? cardColors.swatch : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,61,0.08)',
                }}
              >
                <div className="mb-2.5 flex items-center gap-2.5">
                  <PaymentServiceIcon icon={sub.icon} categorySlug={sub.category_slug} iconBg={iconDisplay.iconBg} shape={iconDisplay.shape} size={36} title={sub.name} />
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => openRow(sub)} className="block truncate text-sm font-semibold text-[#1a1a2e] text-left">{sub.name}</button>
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
                    <button type="button" disabled={markingPaidId === sub.id} onClick={async () => { setMarkingPaidId(sub.id); try { await markAsPaid(sub.id) } finally { setMarkingPaidId(null) } }} className={`flex-1 ${actionButtonClass('success', 'sm')} disabled:opacity-40`}>
                      {markingPaidId === sub.id ? p.updatingLabel : p.paidButton}
                    </button>
                  )}
                  <button type="button" onClick={() => openRow(sub)} className={actionButtonClass('secondary', 'sm')}>{p.editButton}</button>
                  <div className="relative">
                    <button type="button" ref={actionsOpenId === sub.id ? actionsRef : undefined} aria-label={p.moreActionsAriaLabel} onClick={() => setActionsOpenId((v) => (v === sub.id ? null : sub.id))} className="rounded-lg border border-[rgba(26,26,61,0.12)] px-2.5 py-2 text-xs font-medium text-[#1a1a2e]">⋯</button>
                    <RowDropdownPortal open={actionsOpenId === sub.id} anchorRef={actionsRef} onClose={() => setActionsOpenId(null)}>
                      {sub.status !== 'paused'
                        ? <button type="button" disabled={statusUpdatingId === sub.id} onClick={() => applyStatusAction(sub, 'paused')} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#1a1a2e] hover:bg-[#f7f6fe] disabled:opacity-50">{p.pauseAction}</button>
                        : <button type="button" disabled={statusUpdatingId === sub.id} onClick={() => applyStatusAction(sub, 'active')} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#1a1a2e] hover:bg-[#f7f6fe] disabled:opacity-50">{p.resumeAction}</button>
                      }
                      {sub.status !== 'cancelled' && <button type="button" disabled={statusUpdatingId === sub.id} onClick={() => applyStatusAction(sub, 'cancelled')} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#c24f00] hover:bg-[#fff4eb] disabled:opacity-50">{p.cancelAction}</button>}
                    </RowDropdownPortal>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>

      {/* ── Desktop: LIST (table) view ────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          {sortedFiltered.length === 0 ? (
            <div className="px-4 py-10 text-center text-[#6b6b80]">{emptyMessage(filter, Boolean(search.trim()), p)}</div>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {[p.colService, p.colCategory, p.colAmount, p.colPeriodicity, p.colNextCharge, p.colStatus, ''].map((h, i) => (
                    <th key={i} className={`border-b border-[rgba(26,26,61,0.06)] px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9a9aaf] ${i === 6 ? 'w-12' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.map((sub, idx) => {
                  const st = statusUi(sub, p)
                  const days = daysUntil(sub.next_charge_date)
                  const iconDisplay = resolveSubscriptionIconDisplay(sub.notes, sub.icon, sub.category_slug)
                  const rowColors = cardPresetColors(sub.card_color_preset ?? null)
                  const isSelected = detailSub?.id === sub.id
                  const dateColorClass = dueColorClass(st, days)
                  return (
                    <tr
                      key={sub.id}
                      className={`su-slide-left group cursor-pointer border-b border-[rgba(26,26,61,0.06)] transition-colors last:border-b-0 ${isSelected ? 'bg-[rgba(91,67,212,0.06)]' : 'hover:bg-[rgba(91,67,212,0.03)]'}`}
                      style={{ animationDelay: `${idx * 30}ms` }}
                      onClick={() => openRow(sub)}
                    >
                      <td className="px-5 py-3.5 align-middle" style={rowColors ? { borderLeft: `3px solid ${rowColors.swatch}` } : undefined}>
                        <div className="flex min-w-0 items-center gap-3">
                          <PaymentServiceIcon icon={sub.icon} categorySlug={sub.category_slug} iconBg={iconDisplay.iconBg} shape={iconDisplay.shape} size={40} title={sub.name} />
                          <span className="truncate text-[14px] font-semibold text-[#1a1a2e] max-w-[200px]">{sub.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-middle text-[13px] text-[#6b6b80]">{categoryLabel(sub.category_slug, lang)}</td>
                      <td className="px-5 py-3.5 align-middle text-[14px] font-bold tabular-nums text-[#1a1a2e] whitespace-nowrap">{fmtCurrency(coerceNumber(sub.amount), sub.currency ?? 'RUB')}</td>
                      <td className="px-5 py-3.5 align-middle text-[13px] text-[#6b6b80]">{cycleLabelConcept(sub, p)}</td>
                      <td className="px-5 py-3.5 align-middle">
                        {sub.status === 'cancelled' || sub.status === 'archived' ? (
                          <span className="text-[13px] text-[#6b6b80]">—</span>
                        ) : (
                          <>
                            <div className={`text-[13px] ${dateColorClass || 'text-[#1a1a2e]'}`}>{formatDateShort(sub.next_charge_date)}</div>
                            <div className="mt-0.5 text-[11px] text-[#6b6b80]">{dueRelativePhrase(days, p)}</div>
                          </>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-middle"><StatusPill label={st.label} tone={st.tone} /></td>
                      <td className="px-3 py-3.5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block">
                          <button
                            type="button"
                            ref={actionsOpenId === sub.id ? actionsRef : undefined}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-lg leading-none text-[#6b6b80] hover:bg-[rgba(26,26,61,0.06)] hover:text-[#5b43d4] transition-colors"
                            aria-label={p.actionsAriaLabel}
                            onClick={() => setActionsOpenId((v) => (v === sub.id ? null : sub.id))}
                          >
                            ⋯
                          </button>
                          <RowDropdownPortal open={actionsOpenId === sub.id} anchorRef={actionsRef} onClose={() => setActionsOpenId(null)}>
                            {rowMenuItems(sub, days)}
                          </RowDropdownPortal>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Desktop: GRID (tile) view ─────────────────────────────────── */}
      {viewMode === 'grid' && (
        <div className="hidden md:block">
          {sortedFiltered.length === 0 ? (
            <div className="rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white px-4 py-10 text-center text-[#6b6b80] shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">{emptyMessage(filter, Boolean(search.trim()), p)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {sortedFiltered.map((sub, idx) => {
                const st = statusUi(sub, p)
                const days = daysUntil(sub.next_charge_date)
                const iconDisplay = resolveSubscriptionIconDisplay(sub.notes, sub.icon, sub.category_slug)
                const rowColors = cardPresetColors(sub.card_color_preset ?? null)
                const isSelected = detailSub?.id === sub.id
                const dateColorClass = dueColorClass(st, days)
                return (
                  <div
                    key={sub.id}
                    className={`su-slide-left group relative flex cursor-pointer flex-col rounded-2xl border bg-white p-4 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(26,26,61,0.12)] ${isSelected ? 'ring-2 ring-[#5b43d4]' : ''}`}
                    style={{
                      animationDelay: `${idx * 35}ms`,
                      ...(rowColors ? { background: isDark ? `linear-gradient(135deg, ${rowColors.darkTint} 0%, #1c1c38 100%)` : `linear-gradient(135deg, ${rowColors.tint} 0%, #fff 100%)`, borderColor: rowColors.swatch } : { borderColor: 'rgba(26,26,61,0.08)' }),
                    }}
                    onClick={() => openRow(sub)}
                  >
                    {/* Top: icon + menu */}
                    <div className="mb-3 flex items-start justify-between">
                      <PaymentServiceIcon icon={sub.icon} categorySlug={sub.category_slug} iconBg={iconDisplay.iconBg} shape={iconDisplay.shape} size={46} title={sub.name} />
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          ref={actionsOpenId === sub.id ? actionsRef : undefined}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-lg leading-none text-[#6b6b80] hover:bg-[rgba(26,26,61,0.06)] hover:text-[#5b43d4] transition-colors"
                          aria-label={p.actionsAriaLabel}
                          onClick={() => setActionsOpenId((v) => (v === sub.id ? null : sub.id))}
                        >
                          ⋯
                        </button>
                        <RowDropdownPortal open={actionsOpenId === sub.id} anchorRef={actionsRef} onClose={() => setActionsOpenId(null)}>
                          {rowMenuItems(sub, days)}
                        </RowDropdownPortal>
                      </div>
                    </div>

                    {/* Name + category */}
                    <div className="truncate text-[15px] font-bold text-[#1a1a2e]">{sub.name}</div>
                    <div className="mt-0.5 text-[12px] text-[#6b6b80]">{categoryLabel(sub.category_slug, lang)}</div>

                    {/* Amount */}
                    <div className="mt-3">
                      <span className="text-[1.05rem] font-extrabold tabular-nums text-[#1a1a2e]">{fmtCurrency(coerceNumber(sub.amount), sub.currency ?? 'RUB')}</span>
                      <span className="ml-1.5 text-[12px] text-[#6b6b80]">{cycleLabelConcept(sub, p).toLowerCase()}</span>
                    </div>

                    {/* Next charge + status */}
                    <div className="mt-3 border-t border-[rgba(26,26,61,0.06)] pt-3">
                      <div className="text-[11px] text-[#9a9aaf]">{p.colNextCharge}</div>
                      {sub.status === 'cancelled' || sub.status === 'archived' ? (
                        <div className="mt-0.5 text-[13px] text-[#6b6b80]">—</div>
                      ) : (
                        <div className={`mt-0.5 text-[13px] ${dateColorClass || 'text-[#1a1a2e]'}`}>{formatDateShort(sub.next_charge_date)} · {dueRelativePhrase(days, p)}</div>
                      )}
                      <div className="mt-2"><StatusPill label={st.label} tone={st.tone} /></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Collections entry banner ──────────────────────────────────── */}
      <section className="mt-5" aria-labelledby="payments-collections-title">
        <Link
          href="/dashboard/collections"
          className="flex items-center justify-between gap-4 rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white px-[18px] py-[18px] text-inherit no-underline shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] transition-all hover:border-[rgba(91,67,212,0.3)] hover:shadow-[0_8px_20px_rgba(91,67,212,0.12)] active:translate-y-px"
        >
          <div className="min-w-0 flex-1">
            <span id="payments-collections-title" className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#6b6b80]">{p.collectionsLabel}</span>
            <h2 className="m-0 text-[1.85rem] font-bold leading-tight tracking-[-0.02em] text-[#1a1a2e]">{p.collectionsTitle}</h2>
            <p className="mt-2 max-w-[690px] text-sm leading-snug text-[#6b6b80] m-0">{p.collectionsDesc}</p>
          </div>
          <span className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#f2eefc] text-[28px] leading-none text-[#5b43d4]" aria-hidden>›</span>
        </Link>
      </section>
    </>
  )
}
