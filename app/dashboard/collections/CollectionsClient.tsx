'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { coerceNumber } from '@/lib/coerce-number'
import PaymentServiceIcon from '@/app/dashboard/PaymentServiceIcon'
import { categoryLabelRu, formatBillingCycleRu } from '@/lib/subscription-labels'
import type { CategorySlug, Subscription } from '@/lib/supabase/types'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import { getMonthlyAmount } from '@/lib/currency'

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

export default function CollectionsClient({ subs }: { subs: Subscription[] }) {
  const [openSlug, setOpenSlug] = useState<CategorySlug | null>(null)
  const currency = subs.find((s) => s.status === 'active')?.currency ?? subs[0]?.currency ?? 'RUB'
  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

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

  const headerSub = useMemo(() => {
    const raw = new Date().toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return raw.charAt(0).toLocaleUpperCase('ru-RU') + raw.slice(1)
  }, [])

  return (
    <div>
      <Link
        href="/dashboard?tab=payments"
        className="inline-flex text-sm font-medium text-[#5b43d4] hover:text-[#4b36b6] mb-4"
      >
        ← Назад к Платежам
      </Link>

      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e]">Коллекции</h1>
          <p className="text-sm text-[#6b6b80] mt-1">Ваши подписки в красивом порядке · {headerSub}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ALL_CATEGORIES.map((slug) => {
          const list = byCategory.get(slug) ?? []
          const active = list.filter((s) => s.status === 'active')
          const monthly = active.reduce((sum, s) => sum + getMonthlyAmount(s), 0)
          const open = openSlug === slug
          const first = list[0]
          const headerIcon = first
            ? resolveSubscriptionIconDisplay(first.notes, first.icon, first.category_slug)
            : null

          return (
            <article
              key={slug}
              className="rounded-2xl border border-[#e7e3dc] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenSlug(open ? null : slug)}
                className="w-full text-left p-5 flex gap-4 items-start hover:bg-[#faf9ff] transition-colors"
              >
                <div className="shrink-0" aria-hidden>
                  {first && headerIcon ? (
                    <PaymentServiceIcon
                      icon={first.icon}
                      categorySlug={first.category_slug}
                      iconBg={headerIcon.iconBg}
                      shape={headerIcon.shape}
                      size={56}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-[#ececf0]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8e8e93] mb-1">Раздел</p>
                  <h2 className="text-lg font-bold text-[#1a1a2e] m-0 tracking-tight">{categoryLabelRu(slug)}</h2>
                  <p className="text-sm text-[#6b6b80] mt-1 m-0">
                    {list.length} в учёте · {active.length} активных ·{' '}
                    <span className="font-semibold text-[#12b76a]">{fmt(monthly)}</span> / мес экв.
                  </p>
                </div>
                <span className="text-2xl text-[#5b43d4] leading-none mt-2" aria-hidden>
                  {open ? '▾' : '›'}
                </span>
              </button>
              {open && (
                <div className="border-t border-[#f0ece6] px-5 py-3 bg-[#faf9ff]">
                  {list.length === 0 ? (
                    <p className="text-sm text-[#8e8e93] m-0 py-2">В этом разделе пока пусто.</p>
                  ) : (
                    <ul className="divide-y divide-[#ececee] rounded-xl border border-[#e7e3dc] bg-white overflow-hidden">
                      {list.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-[rgba(91,67,212,0.04)]">
                          <Link href={`/dashboard/subscriptions/${s.id}`} className="min-w-0 flex-1 no-underline">
                            <span className="block text-sm font-semibold text-[#1a1a2e] truncate">{s.name}</span>
                            <span className="block text-xs text-[#6b6b80]">{formatBillingCycleRu(s)}</span>
                          </Link>
                          <span className="text-sm font-semibold tabular-nums text-[#1a1a2e] shrink-0">
                            {fmt(coerceNumber(s.amount))}
                          </span>
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
