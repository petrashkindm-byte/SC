'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { coerceNumber } from '@/lib/coerce-number'
import PaymentServiceIcon from '@/app/dashboard/PaymentServiceIcon'
import { categoryLabel, formatBillingCycle, statusLabelFull } from '@/lib/subscription-labels'
import type { CategorySlug, Subscription } from '@/lib/supabase/types'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import { getMonthlyAmount } from '@/lib/currency'
import { useLang } from '@/lib/LangContext'

const ALL_CATEGORIES: CategorySlug[] = [
  'entertainment',
  'productivity',
  'utilities',
  'finance',
  'health',
  'shopping',
  'education',
  'other',
]

const CATEGORY_THEME: Record<
  CategorySlug,
  { from: string; to: string; illustration: string | null; emoji: string }
> = {
  entertainment: { from: '#4c2db8', to: '#7c5dfa', illustration: '/illustrations/entertainment.png', emoji: '🍿' },
  productivity:  { from: '#991b1b', to: '#ef4444', illustration: '/illustrations/productivity.png',  emoji: '📋' },
  utilities:     { from: '#166534', to: '#22c55e', illustration: '/illustrations/utilities.png',     emoji: '☁️' },
  finance:       { from: '#1e40af', to: '#3b82f6', illustration: null,                               emoji: '💳' },
  health:        { from: '#0f766e', to: '#2dd4bf', illustration: '/illustrations/health.png',        emoji: '❤️' },
  shopping:      { from: '#9a3412', to: '#f97316', illustration: '/illustrations/shopping.png',      emoji: '🛍️' },
  education:     { from: '#92400e', to: '#f59e0b', illustration: null,                               emoji: '🎓' },
  other:         { from: '#57534e', to: '#a8a29e', illustration: '/illustrations/other.png',         emoji: '📦' },
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 17
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(pct, 100) / 100)
  return (
    <div className="relative flex items-center justify-center" style={{ width: 46, height: 46 }}>
      <svg width="46" height="46" viewBox="0 0 46 46" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx="23" cy="23" r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="3" />
        <circle
          cx="23" cy="23" r={r} fill="none"
          stroke="rgba(255,255,255,0.9)" strokeWidth="3"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="relative z-10 text-[11px] font-bold text-white leading-none">
        {Math.round(pct)}%
      </span>
    </div>
  )
}

export default function CollectionsClient({ subs }: { subs: Subscription[] }) {
  const { lang, strings } = useLang()
  const c = strings.collections
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get('category') as CategorySlug | null
  const [openSlug, setOpenSlug] = useState<CategorySlug | null>(
    initialCategory && ALL_CATEGORIES.includes(initialCategory as CategorySlug) ? initialCategory : null
  )
  const autoScrollRef = useRef<HTMLElement | null>(null)

  // Auto-scroll to the pre-opened category card
  useEffect(() => {
    if (!initialCategory || !autoScrollRef.current) return
    const el = autoScrollRef.current
    const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    return () => clearTimeout(t)
  }, [initialCategory])

  const currency = subs.find((s) => s.status === 'active')?.currency ?? subs[0]?.currency ?? 'RUB'
  const locale = lang === 'en' ? 'en-US' : 'ru-RU'
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  const fmtDecimal = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  const headerSub = useMemo(() => {
    const raw = new Date().toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    if (lang === 'ru') return raw.charAt(0).toLocaleUpperCase('ru-RU') + raw.slice(1)
    return raw
  }, [lang, locale])

  const byCategory = useMemo(() => {
    const map = new Map<CategorySlug, Subscription[]>()
    for (const slug of ALL_CATEGORIES) map.set(slug, [])
    for (const s of subs) {
      if (s.status === 'archived') continue
      const list = map.get(s.category_slug) ?? []
      list.push(s)
      map.set(s.category_slug, list)
    }
    return map
  }, [subs])

  const totalMonthly = useMemo(() => {
    return subs
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + getMonthlyAmount(s), 0)
  }, [subs])

  return (
    <div>
      <Link
        href="/dashboard?tab=payments"
        className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white px-4 text-[14px] font-semibold text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.08)] no-underline hover:bg-[#f8f6f2] mb-4 transition-colors"
      >
        {c.backToPayments}
      </Link>

      <header className="mb-8">
        <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e]">{c.title}</h1>
        <p className="text-sm text-[#6b6b80] mt-1">{c.subtitle} · {headerSub}</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ALL_CATEGORIES.map((slug) => {
          const list = byCategory.get(slug) ?? []
          const active = list.filter((s) => s.status === 'active')
          const monthly = active.reduce((sum, s) => sum + getMonthlyAmount(s), 0)
          const pct = totalMonthly > 0 ? (monthly / totalMonthly) * 100 : 0
          const open = openSlug === slug
          const theme = CATEGORY_THEME[slug]

          // First 4 service icons to display
          const iconSubs = list.slice(0, 4)

          const isAutoTarget = slug === initialCategory
          return (
            <article
              key={slug}
              ref={isAutoTarget ? (el) => { autoScrollRef.current = el } : undefined}
              className="overflow-hidden rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
            >
              {/* Gradient header card */}
              <button
                type="button"
                onClick={() => setOpenSlug(open ? null : slug)}
                className="w-full text-left relative"
                style={{
                  background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)`,
                  minHeight: 160,
                  padding: '20px 20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* Top row: title + progress ring */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white/70 mb-1 leading-none">
                      {c.services(list.length)}
                    </p>
                    <h2 className="text-[24px] font-bold text-white leading-tight tracking-tight m-0">
                      {categoryLabel(slug, lang)}
                    </h2>
                    <p className="text-[22px] font-bold text-white mt-1 leading-none tracking-tight">
                      {fmtDecimal(monthly)}{' '}
                      <span className="text-[14px] font-medium text-white/75">{c.perMonth}</span>
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <ProgressRing pct={pct} />
                    <span
                      className="text-white/70 text-[18px] transition-transform"
                      style={{ transform: open ? 'rotate(90deg)' : 'none' }}
                      aria-hidden
                    >
                      ›
                    </span>
                  </div>
                </div>

                {/* Illustration — absolutely positioned so it bleeds into the bottom-right corner */}
                {theme.illustration ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={theme.illustration}
                    alt=""
                    aria-hidden
                    width={110}
                    height={110}
                    style={{
                      position: 'absolute',
                      bottom: -6,
                      right: -4,
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.28))',
                      pointerEvents: 'none',
                    }}
                  />
                ) : (
                  <span
                    className="select-none leading-none"
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 12,
                      fontSize: 68,
                      filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.25))',
                      pointerEvents: 'none',
                    }}
                    aria-hidden
                  >
                    {theme.emoji}
                  </span>
                )}

                {/* Bottom row: service icons */}
                <div className="flex items-end mt-3" style={{ paddingRight: 100 }}>
                  <div className="flex items-center gap-1.5">
                    {iconSubs.length === 0 ? (
                      <span className="text-white/50 text-[13px]">{c.noSubscriptions}</span>
                    ) : (
                      iconSubs.map((s) => {
                        const iconDisplay = resolveSubscriptionIconDisplay(s.notes, s.icon, s.category_slug)
                        return (
                          <div
                            key={s.id}
                            className="rounded-xl overflow-hidden border-2 border-white/30 shadow-sm"
                          >
                            <PaymentServiceIcon
                              icon={s.icon}
                              categorySlug={s.category_slug}
                              iconBg={iconDisplay.iconBg}
                              shape={iconDisplay.shape}
                              size={34}
                            />
                          </div>
                        )
                      })
                    )}
                    {list.length > 4 && (
                      <div className="w-[34px] h-[34px] rounded-xl border-2 border-white/30 bg-white/20 flex items-center justify-center">
                        <span className="text-white text-[11px] font-bold">+{list.length - 4}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded list */}
              {open && (
                <div className="border-t border-white/10 bg-white">
                  {list.length === 0 ? (
                    <p className="text-sm text-[#8e8e93] px-5 py-4">{c.emptyCategory}</p>
                  ) : (
                    <ul className="divide-y divide-[#f0ece6]">
                      {list.map((s) => (
                        <li key={s.id}>
                          <Link
                            href={`/dashboard/subscriptions/${s.id}?from=collections`}
                            className="flex items-center justify-between gap-3 px-5 py-3 no-underline hover:bg-[rgba(91,67,212,0.04)] transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {(() => {
                                const iconDisplay = resolveSubscriptionIconDisplay(s.notes, s.icon, s.category_slug)
                                return (
                                  <PaymentServiceIcon
                                    icon={s.icon}
                                    categorySlug={s.category_slug}
                                    iconBg={iconDisplay.iconBg}
                                    shape={iconDisplay.shape}
                                    size={36}
                                  />
                                )
                              })()}
                              <div className="min-w-0">
                                <span className="block text-[14px] font-semibold text-[#1a1a2e] truncate">{s.name}</span>
                                <span className="block text-[12px] text-[#6b6b80]">{formatBillingCycle(s, lang)}</span>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="block text-[14px] font-semibold tabular-nums text-[#1a1a2e]">
                                {fmt(coerceNumber(s.amount))}
                              </span>
                              <span className={`block text-[11px] font-medium ${
                                s.status === 'active' ? 'text-[#0d9f6e]' :
                                s.status === 'paused' ? 'text-[#b35a00]' : 'text-[#6b6b80]'
                              }`}>
                                {statusLabelFull(s.status, lang)}
                              </span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
