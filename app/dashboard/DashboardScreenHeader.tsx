'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import type { Subscription } from '@/lib/supabase/types'
import { actionButtonClass } from './ui/action-button'
import { fmtCurrency, getMonthlyAmount } from '@/lib/currency'
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

function urgencyStyle(days: number): { badge: string; dot: string } {
  if (days <= 0) return { badge: 'bg-[#fee2e2] text-[#b91c1c]', dot: 'bg-[#ef4444]' }
  if (days === 1) return { badge: 'bg-[#ffedd5] text-[#c2410c]', dot: 'bg-[#f97316]' }
  if (days <= 3) return { badge: 'bg-[#fef3c7] text-[#b45309]', dot: 'bg-[#f59e0b]' }
  return { badge: 'bg-[#f1f0ff] text-[#5b43d4]', dot: 'bg-[#8b8bc0]' }
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
  const resolvedPlaceholder = searchPlaceholder ?? h.searchPlaceholder
  const [notifOpen, setNotifOpen] = useState(false)
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

  const notifItems = useMemo(() => {
    return subs
      .filter((s) => s.status === 'active' && daysUntil(s.next_charge_date) >= 0 && daysUntil(s.next_charge_date) <= 7 && !dismissedIds.has(s.id))
      .sort((a, b) => daysUntil(a.next_charge_date) - daysUntil(b.next_charge_date))
      .slice(0, 6)
  }, [subs, dismissedIds])

  return (
    <header className={`flex flex-wrap gap-4 items-center justify-between ${className}`}>
      {greetingName ? (
        /* Greeting mode: one line, same size */
        <h1 className="m-0 text-[1.75rem] font-bold tracking-[-0.03em] text-[#1a1a2e] leading-none">
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
      ) : (
        <div>
          <h1 className="m-0 mb-1 text-[1.75rem] font-bold tracking-[-0.03em] text-[#1a1a2e]">{title}</h1>
          <p className="m-0 text-sm text-[#6b6b80] leading-snug">{headerDate(lang)}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        {greetingName && (
          /* Title + date pushed to far right, before the bell */
          <div className="text-right mr-1">
            <p className="m-0 mb-0.5 text-[1.75rem] font-bold tracking-[-0.03em] text-[#1a1a2e] leading-none">{title}</p>
            <p className="m-0 text-sm text-[#6b6b80] leading-snug">{headerDate(lang)}</p>
          </div>
        )}
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
              style={{ position: 'fixed', top: notifPos.top, right: notifPos.right, zIndex: 9999, width: 'min(360px, 92vw)' }}
              className="rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white shadow-[0_4px_6px_rgba(26,26,61,0.04),0_12px_32px_rgba(26,26,61,0.10)]"
            >
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b6b80]">{h.notificationsTitle}</span>
                {notifItems.length > 0 && (
                  <span className="text-[11px] font-semibold text-[#5b43d4]">{h.thisWeek}</span>
                )}
              </div>
              <div className="max-h-[320px] overflow-y-auto px-2 pb-2">
                {notifItems.length === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 py-8 text-center">
                    <span className="text-[28px]" aria-hidden>·</span>
                    <p className="text-[13px] text-[#6b6b80]">{h.noChargesThisWeek}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifItems.map((s) => {
                      const days = daysUntil(s.next_charge_date)
                      const { badge } = urgencyStyle(days)
                      const amount = getMonthlyAmount(s)
                      return (
                        <Link
                          key={s.id}
                          href={`/dashboard/subscriptions/${s.id}`}
                          className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 hover:bg-[#f8f7ff] transition-colors"
                          onClick={() => { dismissNotif(s.id); setNotifOpen(false) }}
                        >
                          <PaymentServiceIcon
                            icon={s.icon}
                            categorySlug={s.category_slug}
                            iconBg={resolveSubscriptionIconDisplay(s.notes, s.icon, s.category_slug).iconBg}
                            size={36}
                            shape="rounded"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-[#1a1a2e] truncate">{s.name}</p>
                            <p className="text-[11px] text-[#6b6b80] mt-0.5">{formatDateShort(s.next_charge_date)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[13px] font-semibold text-[#1a1a2e]">
                              {fmtCurrency(amount, s.currency)}
                            </span>
                            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${badge}`}>
                              {dueRelativePhrase(days, strings)}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>,
            document.body
          ) : null}
        </div>

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
