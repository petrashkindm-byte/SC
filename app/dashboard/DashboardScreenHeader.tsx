'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import type { Subscription } from '@/lib/supabase/types'
import { actionButtonClass } from './ui/action-button'
import { fmtCurrency, groupMonthlyByCurrency, formatGroups } from '@/lib/currency'
import { coerceNumber } from '@/lib/coerce-number'
import PaymentServiceIcon from './PaymentServiceIcon'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import { useLang } from '@/lib/LangContext'
import type { Lang } from '@/lib/translations'

function getGreeting(lang: Lang): string {
  const h = new Date().getHours()
  if (lang === 'ru') {
    if (h >= 5 && h < 12) return 'Доброе утро'
    if (h >= 12 && h < 18) return 'Добрый день'
    if (h >= 18 && h < 23) return 'Добрый вечер'
    return 'Доброй ночи'
  }
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 18) return 'Good afternoon'
  if (h >= 18 && h < 23) return 'Good evening'
  return 'Good night'
}

function headerDate(lang: Lang): string {
  const locale = lang === 'en' ? 'en-US' : 'ru-RU'
  const raw = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  if (lang === 'ru') {
    return raw.charAt(0).toLocaleUpperCase('ru-RU') + raw.slice(1).replace(/\s?г\.?$/, '').trim()
  }
  return raw
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

function dueRelativePhrase(days: number, strings: ReturnType<typeof useLang>['strings']): string {
  if (days < 0) return strings.due.overdue(Math.abs(days))
  if (days === 0) return strings.due.today
  if (days === 1) return strings.due.tomorrow
  return strings.due.inDays(days)
}

type NotifBadge = { label: string; bg: string; fg: string; border: string | null; dot: string | null; pulse: boolean }
function notifBadgeInfo(days: number, badgeOverdue: string, badgeToday: string, badgeTomorrow: string, badgeInDays: (n: number) => string): NotifBadge {
  if (days < 0)   return { label: badgeOverdue,        bg: '#FEE2E2', fg: '#DC2626', border: '#DC2626', dot: '#DC2626', pulse: true }
  if (days === 0) return { label: badgeToday,          bg: '#FEF3C7', fg: '#D97706', border: '#F59E0B', dot: '#F59E0B', pulse: false }
  if (days === 1) return { label: badgeTomorrow,       bg: '#FEF3C7', fg: '#D97706', border: '#F59E0B', dot: '#F59E0B', pulse: false }
  if (days <= 3)  return { label: badgeInDays(days),   bg: '#FFEDD5', fg: '#EA580C', border: '#FB923C', dot: '#FB923C', pulse: false }
  if (days <= 7)  return { label: badgeInDays(days),   bg: '#EDE9FE', fg: '#7C3AED', border: '#8B5CF6', dot: '#8B5CF6', pulse: false }
  return            { label: badgeInDays(days),   bg: '#F3F4F6', fg: '#6B7280', border: null,      dot: null,      pulse: false }
}


type Props = {
  title: string
  subs: Subscription[]
  /** Как в settings.html — только текст; как в профиле — иконка + «Добавить» */
  addButtonVariant?: 'icon-plus' | 'plus-text'
  className?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  trailingActions?: ReactNode
  hideSearch?: boolean
  hideAddButton?: boolean
  /** Прижимает правые элементы к заголовку вместо justify-between */
  compact?: boolean
  greetingName?: string
}

export default function DashboardScreenHeader({
  title,
  subs,
  addButtonVariant = 'icon-plus',
  className = 'mb-6',
  searchValue,
  onSearchChange,
  searchPlaceholder,
  trailingActions,
  hideSearch = false,
  hideAddButton = false,
  compact = false,
  greetingName,
}: Props) {
  const { lang, strings } = useLang()
  const h = strings.header
  const p = strings.payments
  const resolvedPlaceholder = searchPlaceholder ?? h.searchPlaceholder
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifTab, setNotifTab] = useState<'all' | 'soon' | 'overdue'>('all')
  const [notifPos, setNotifPos] = useState<{ top: number; right: number } | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem('notif_dismissed')
      if (!raw) return
      const { date, ids } = JSON.parse(raw)
      if (date !== new Date().toDateString()) return
      setDismissedIds(new Set(ids as string[]))
    } catch { /* ignore */ }
  }, [])
  const notifRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const dismissNotif = (id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem('notif_dismissed', JSON.stringify({ date: new Date().toDateString(), ids: [...next] }))
      return next
    })
  }

  useEffect(() => {
    if (!notifOpen) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      const inBell = bellRef.current?.contains(t)
      const inDropdown = dropdownRef.current?.contains(t)
      if (!inBell && !inDropdown) setNotifOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [notifOpen])

  const notifItems = useMemo(() => subs
    .filter((s) => s.status === 'active' && daysUntil(s.next_charge_date) <= 7 && !dismissedIds.has(s.id))
    .sort((a, b) => daysUntil(a.next_charge_date) - daysUntil(b.next_charge_date)),
    [subs, dismissedIds])

  const tabFilteredNotifs = useMemo(() => notifItems.filter((s) => {
    const d = daysUntil(s.next_charge_date)
    if (notifTab === 'soon') return d >= 0
    if (notifTab === 'overdue') return d < 0
    return true
  }), [notifItems, notifTab])

  const visibleNotifs = useMemo(() => tabFilteredNotifs.slice(0, 8), [tabFilteredNotifs])

  const notifSummaryText = useMemo(() => {
    const groups = groupMonthlyByCurrency(notifItems, (s) => coerceNumber(s.amount))
    return p.notifSummary(notifItems.length, formatGroups(groups))
  }, [notifItems, p])

  const bellButton = (
    <div ref={notifRef}>
      <button
        ref={bellRef}
        type="button"
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(26,26,61,0.08)] bg-white text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]"
        aria-label={h.notifications}
        onClick={() => {
          if (bellRef.current) {
            const r = bellRef.current.getBoundingClientRect()
            setNotifPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
          }
          setNotifOpen((v) => !v)
        }}
      >
        {notifItems.length > 0 && (
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#e5484d] ring-2 ring-white su-pulse-dot" />
        )}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={notifItems.length > 0 ? 'su-bell-ring' : ''}>
          <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      </button>
      {notifOpen && notifPos ? createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: notifPos.top, right: notifPos.right, zIndex: 9999, width: 'min(380px, 92vw)' }}
          className="su-notif-panel overflow-hidden rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white shadow-[0_4px_6px_rgba(26,26,61,0.04),0_12px_32px_rgba(26,26,61,0.12)]"
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[16px] font-bold text-[#1B2A4A]">{p.notifTitle}</span>
              {notifItems.length > 0 && (
                <div className="flex items-center gap-0.5 rounded-full bg-[#f3f4f6] p-0.5">
                  {([['all', p.filterAll], ['soon', p.notifTabSoon], ['overdue', p.notifBadgeOverdue]] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setNotifTab(key)}
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
                      style={notifTab === key ? { background: '#7BAE7F', color: '#fff' } : { color: '#6B7280' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {notifItems.length > 0 && (
              <p className="mt-1.5 text-[12px] text-[#6B7280]">{notifSummaryText}</p>
            )}
          </div>

          {/* Cards */}
          <div className="max-h-[340px] overflow-y-auto px-3 pb-1">
            {visibleNotifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                <p className="text-[14px] font-semibold text-[#1B2A4A]">{p.notifNone}</p>
                <p className="text-[12px] text-[#9CA3AF]">{p.notifEmptySub}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1 pb-1">
                {visibleNotifs.map((s, i) => {
                  const days = daysUntil(s.next_charge_date)
                  const b = notifBadgeInfo(days, p.notifBadgeOverdue, p.notifBadgeToday, p.notifBadgeTomorrow, p.notifBadgeInDays)
                  const disp = resolveSubscriptionIconDisplay(s.notes, s.icon, s.category_slug)
                  return (
                    <Link
                      key={s.id}
                      href={`/dashboard/subscriptions/${s.id}`}
                      onClick={() => { dismissNotif(s.id); setNotifOpen(false) }}
                      className="su-fade-up-row flex items-center gap-3 rounded-[12px] bg-white px-[14px] py-3 no-underline shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.10)]"
                      style={{ borderLeft: `3px solid ${b.border ?? 'transparent'}`, animationDelay: `${i * 30}ms` }}
                    >
                      <span className="shrink-0" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))' }}>
                        <PaymentServiceIcon icon={s.icon} categorySlug={s.category_slug} iconBg={disp.iconBg} shape={disp.shape} size={44} title={s.name} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-[#1B2A4A]">{s.name}</p>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="text-[12px] text-[#6B7280]">{formatDateShort(s.next_charge_date)}</span>
                          <span className="text-[14px] font-semibold text-[#1B2A4A]">{fmtCurrency(coerceNumber(s.amount), s.currency ?? 'RUB')}</span>
                        </div>
                      </div>
                      <span className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: b.bg, color: b.fg }}>
                        {b.dot && <span className={`inline-block h-1.5 w-1.5 rounded-full ${b.pulse ? 'su-pulse-dot' : ''}`} style={{ background: b.dot }} />}
                        {b.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[rgba(26,26,61,0.06)] px-4 py-2.5 text-center">
            <Link
              href={notifTab === 'overdue' ? '/dashboard?tab=payments&paymentsFilter=overdue' : notifTab === 'soon' ? '/dashboard?tab=payments&paymentsFilter=soon' : '/dashboard?tab=payments'}
              onClick={() => setNotifOpen(false)}
              className="su-arrow-link text-[13px] font-semibold no-underline"
              style={{ color: '#7BAE7F' }}
            >
              {p.notifShowAll}<span aria-hidden>→</span>
            </Link>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  )

  if (greetingName) {
    return (
      <header className={className}>
        <div className="flex items-start justify-between gap-3 w-full">
          <div className="flex-1 min-w-0">
            <h1 className="m-0 text-[1.75rem] font-bold tracking-[-0.03em] text-[#1a1a2e] leading-tight">
              <span
                style={{
                  background: 'linear-gradient(90deg, #6b55f6 0%, #34d399 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {getGreeting(lang)}{','}
              </span>
              {' '}{greetingName}
            </h1>
            <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
              <p className="m-0 text-[1.05rem] font-bold tracking-[-0.02em] text-[#1a1a2e]">{title}</p>
              <p className="m-0 text-sm text-[#6b6b80] leading-snug">{headerDate(lang)}</p>
            </div>
          </div>
          <div className="shrink-0 mt-0.5">{bellButton}</div>
        </div>
      </header>
    )
  }

  return (
    <header className={`flex flex-wrap gap-4 items-center justify-between ${className}`}>
      <div>
        <h1 className="m-0 mb-1 text-[1.75rem] font-bold tracking-[-0.03em] text-[#1a1a2e]">{title}</h1>
        <p className="m-0 text-sm text-[#6b6b80] leading-snug">{headerDate(lang)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {!hideSearch && (
          <div className="flex h-11 min-w-[260px] max-w-[420px] items-center gap-2.5 rounded-full border border-[rgba(26,26,61,0.08)] bg-white pl-4 pr-4 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#1a1a2e] opacity-[0.45]">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              readOnly={!onSearchChange}
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={resolvedPlaceholder}
              aria-label={h.searchAriaLabel}
              className={`min-w-0 flex-1 border-0 bg-transparent text-sm text-[#1a1a2e] outline-none placeholder:text-[#9a9aaf] ${
                onSearchChange ? '' : 'cursor-default'
              }`}
            />
          </div>
        )}
        {bellButton}
        {!hideAddButton && (
          <Link
            href="/dashboard/subscriptions/new"
            className={`${actionButtonClass('primary')} gap-2 px-5`}
          >
            {addButtonVariant === 'icon-plus' ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {h.add}
              </>
            ) : (
              <>+ {h.add}</>
            )}
          </Link>
        )}
        {trailingActions}
      </div>
    </header>
  )
}
