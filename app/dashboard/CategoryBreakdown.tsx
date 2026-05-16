'use client'

import type { Subscription } from '@/lib/supabase/types'
import { coerceNumber } from '@/lib/coerce-number'
import { categoryLabel } from '@/lib/subscription-labels'
import { useLang } from '@/lib/LangContext'

function monthlyAmount(sub: Subscription): number {
  const amount = coerceNumber(sub.amount)
  switch (sub.billing_cycle) {
    case 'weekly': return amount * sub.billing_interval * 4.33
    case 'monthly': return amount * sub.billing_interval
    case 'quarterly': return (amount * sub.billing_interval) / 3
    case 'yearly': return (amount * sub.billing_interval) / 12
    case 'custom': return sub.custom_interval_days ? (amount / sub.custom_interval_days) * 30 : amount
  }
}

type Props = {
  subs: Subscription[]
  currency: string
}

export default function CategoryBreakdown({ subs, currency }: Props) {
  const { lang, strings } = useLang()
  const cb = strings.categoryBreakdown
  const active = subs.filter((s) => s.status === 'active')
  if (active.length === 0) return null

  const byCat = new Map<string, number>()
  for (const s of active) {
    const m = monthlyAmount(s)
    byCat.set(s.category_slug, (byCat.get(s.category_slug) ?? 0) + m)
  }

  const rows = [...byCat.entries()]
    .map(([slug, total]) => ({ slug, total }))
    .sort((a, b) => b.total - a.total)

  const max = rows[0]?.total ?? 1

  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(n)

  return (
    <section className="mt-8 rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
      <h2 className="text-sm font-medium text-[#6b6b80] uppercase tracking-wide mb-2">
        {cb.title}
      </h2>
      <p className="text-xs text-[#8e8e93] mb-4">
        {cb.subtitle}
      </p>
      <ul className="space-y-3">
        {rows.map(({ slug, total }) => (
          <li key={slug}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#1a1a2e]">{categoryLabel(slug, lang)}</span>
              <span className="text-[#1a1a2e] font-medium tabular-nums">{fmt(total)}</span>
            </div>
            <div className="h-2 rounded-full bg-[#ececf0] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#7b61ff]"
                style={{ width: `${Math.min(100, (total / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
