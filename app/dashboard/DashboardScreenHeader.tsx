'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Subscription } from '@/lib/supabase/types'

function headerDateRu(): string {
  const raw = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return raw.charAt(0).toLocaleUpperCase('ru-RU') + raw.slice(1).replace(/\s?г\.?$/, '').trim()
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

function dueRelativePhrase(days: number): string {
  if (days < 0) return `просрочено на ${Math.abs(days)} дн.`
  if (days === 0) return 'сегодня'
  if (days === 1) return 'завтра'
  return `через ${days} дн.`
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
}

export default function DashboardScreenHeader({
  title,
  subs,
  addButtonVariant = 'icon-plus',
  className = 'mb-6',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Поиск по сервисам, категориям…',
  trailingActions,
}: Props) {
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!notifOpen) return
    const onDoc = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [notifOpen])

  const notifItems = useMemo(() => {
    return subs
      .filter((s) => s.status === 'active' && daysUntil(s.next_charge_date) >= 0 && daysUntil(s.next_charge_date) <= 7)
      .sort((a, b) => daysUntil(a.next_charge_date) - daysUntil(b.next_charge_date))
      .slice(0, 6)
  }, [subs])

  return (
    <header className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div>
        <h1 className="m-0 mb-1 text-[1.75rem] font-bold tracking-[-0.03em] text-[#1a1a2e]">{title}</h1>
        <p className="m-0 text-sm text-[#6b6b80] leading-snug">{headerDateRu()}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
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
            placeholder={searchPlaceholder}
            aria-label="Поиск"
            className={`min-w-0 flex-1 border-0 bg-transparent text-sm text-[#1a1a2e] outline-none placeholder:text-[#9a9aaf] ${
              onSearchChange ? '' : 'cursor-default'
            }`}
          />
        </div>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(26,26,61,0.08)] bg-white text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]"
            aria-label="Уведомления"
            onClick={() => setNotifOpen((v) => !v)}
          >
            {notifItems.length > 0 ? (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#e5484d] ring-2 ring-white" />
            ) : null}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </button>
          {notifOpen ? (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(340px,90vw)] rounded-[14px] border border-[rgba(26,26,61,0.08)] bg-white py-2.5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
              <div className="px-3.5 pb-2 text-xs font-semibold uppercase tracking-wider text-[#6b6b80]">Уведомления</div>
              <div className="max-h-[280px] overflow-y-auto">
                {notifItems.length === 0 ? (
                  <p className="m-0 px-3.5 py-3 text-sm text-[#6b6b80]">Нет событий на этой неделе.</p>
                ) : (
                  notifItems.map((s) => (
                    <Link
                      key={s.id}
                      href={`/dashboard/subscriptions/${s.id}`}
                      className="block border-t border-[#f0f0f2] px-3.5 py-2.5 text-left text-[13px] text-[#1a1a2e] first:border-t-0 hover:bg-[#f8f8fb]"
                      onClick={() => setNotifOpen(false)}
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="mt-0.5 block text-xs text-[#6b6b80]">
                        Списание {formatDateShort(s.next_charge_date)} · {dueRelativePhrase(daysUntil(s.next_charge_date))}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <Link
          href="/dashboard/subscriptions/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5b43d4] px-5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(91,67,212,0.35)] hover:brightness-105"
        >
          {addButtonVariant === 'icon-plus' ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Добавить
            </>
          ) : (
            <>+ Добавить</>
          )}
        </Link>
        {trailingActions}
      </div>
    </header>
  )
}
