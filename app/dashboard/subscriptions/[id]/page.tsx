import { coerceNumber } from '@/lib/coerce-number'
import { createClient } from '@/lib/supabase/server'
import type { Subscription } from '@/lib/supabase/types'
import {
  categoryLabelRu,
  formatBillingCycleRu,
} from '@/lib/subscription-labels'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import PaymentServiceIcon from '@/app/dashboard/PaymentServiceIcon'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import { parseNotesAndViz, CARD_COLOR_PRESETS } from '@/lib/subscription-viz-notes'
import { lookupManagementUrl } from '@/lib/service-catalog'
import SubscriptionDangerZone from './SubscriptionDangerZone'
import SubscriptionStatusActions from './SubscriptionStatusActions'
import MarkUsedTodayButton from './MarkUsedTodayButton'
import TintedCard from './TintedCard'
import ManagementButton from './ManagementButton'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(dateStr).getTime() - today.getTime()) / 86400000)
}

function nextChargeBadge(sub: Subscription) {
  if (sub.status !== 'active') return null
  const days = daysUntil(sub.next_charge_date)
  if (days < 0) return { text: `Просрочено на ${Math.abs(days)} дн.`, color: 'text-[#e5484d] bg-[#fff0f0] border-[#fcc]' }
  if (days === 0) return { text: 'Списывается сегодня', color: 'text-[#c24f00] bg-[#fff4eb] border-[#fdd]' }
  if (days <= 3) return { text: `Через ${days} дн.`, color: 'text-[#c24f00] bg-[#fff4eb] border-[#fdd]' }
  if (days <= 14) return { text: `Через ${days} дн.`, color: 'text-[#0d9f6e] bg-[#e8faf0] border-[#bfe7d1]' }
  return null
}

const STATUS_STYLES: Record<string, string> = {
  active: 'text-[#0d9f6e] bg-[#e8faf0] border-[#bfe7d1]',
  paused: 'text-[#b35a00] bg-[#fff4eb] border-[#fdd]',
  cancelled: 'text-[#6b6b80] bg-[#f4f5f8] border-[#e0e0e8]',
  archived: 'text-[#6b6b80] bg-[#f4f5f8] border-[#e0e0e8]',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'Активна',
  paused: 'На паузе',
  cancelled: 'Отменена',
  archived: 'В архиве',
}

export default async function SubscriptionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { id } = await params
  const { from } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: row, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !row) notFound()

  const sub = row as Subscription
  const detailIcon = resolveSubscriptionIconDisplay(sub.notes, sub.icon, sub.category_slug)
  const { userNotes } = parseNotesAndViz(sub.notes ?? null)
  const cardColorEntry = sub.card_color_preset
    ? CARD_COLOR_PRESETS.find((p) => p.key === sub.card_color_preset) ?? null
    : null
  const amount = coerceNumber(sub.amount)
  const fmt = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: sub.currency,
    maximumFractionDigits: 0,
  }).format(amount)
  const badge = nextChargeBadge(sub)
  const managementUrl = sub.management_url ?? lookupManagementUrl(sub.name)

  return (
    <main className="px-4 sm:px-6 py-6">
      {/* Back */}
      <Link
        href={from === 'collections' ? '/dashboard/collections' : '/dashboard?tab=payments'}
        className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white px-4 text-[14px] font-semibold text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.08)] no-underline hover:bg-[#f8f6f2] mb-6 transition-colors"
      >
        <span aria-hidden>←</span>
        {from === 'collections' ? 'К коллекциям' : 'К платежам'}
      </Link>

      {/* Header card */}
      <TintedCard
        tint={cardColorEntry?.tint ?? null}
        darkTint={cardColorEntry?.darkTint ?? null}
        swatch={cardColorEntry?.swatch ?? null}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <PaymentServiceIcon
              icon={sub.icon}
              categorySlug={sub.category_slug}
              iconBg={detailIcon.iconBg}
              shape={detailIcon.shape}
              size={56}
            />
            <div className="min-w-0">
              <h1 className="text-[26px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e] truncate">
                {sub.name}
              </h1>
              <p className="text-[#6b6b80] text-sm mt-0.5">
                {categoryLabelRu(sub.category_slug)}
              </p>
            </div>
          </div>
          {/* Price block */}
          <div className="shrink-0 text-right">
            <p className="text-[28px] font-bold tracking-[-0.03em] text-[#1a1a2e] leading-none">{fmt}</p>
            <p className="text-xs text-[#6b6b80] mt-1">{formatBillingCycleRu(sub).toLowerCase()}</p>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLES[sub.status]}`}>
            {STATUS_LABELS[sub.status]}
          </span>
          {badge && (
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${badge.color}`}>
              {badge.text}
            </span>
          )}
          {sub.renewal_type === 'auto_renew' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(26,26,61,0.1)] bg-[#f8f6f2] px-3 py-1 text-xs font-medium text-[#6b6b80]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Авто-продление
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[#f0ece6]">
          <MarkUsedTodayButton subscriptionId={sub.id} lastUsedAt={sub.last_used_at ?? null} />
          <ManagementButton url={managementUrl} editHref={`/dashboard/subscriptions/${sub.id}/edit`} />
          <Link
            href={`/dashboard/subscriptions/${sub.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e7e3dc] bg-white px-4 py-2.5 text-sm font-medium text-[#1a1a2e] hover:bg-[#f8f6f2] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Редактировать
          </Link>
          <Link
            href={`/dashboard/subscriptions/${sub.id}/edit?tab=reminders`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e7e3dc] bg-white px-4 py-2.5 text-sm font-medium text-[#1a1a2e] hover:bg-[#f8f6f2] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            Напоминание
          </Link>
          {sub.cancellation_url && (
            <a
              href={sub.cancellation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#fdd] bg-[#fff5f5] px-4 py-2.5 text-sm font-medium text-[#c24f00] hover:bg-[#ffecec] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              Отменить подписку
            </a>
          )}
        </div>
      </TintedCard>

      {/* Info grid */}
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <InfoCard label="Следующее списание" value={formatDate(sub.next_charge_date)} />
        <InfoCard label="Первое списание" value={formatDate(sub.first_charge_date)} />
        <InfoCard label="Цикл оплаты" value={formatBillingCycleRu(sub)} />
        <InfoCard label="Продление" value={sub.renewal_type === 'auto_renew' ? 'Автоматически' : 'Вручную'} />
        {sub.last_used_at && (
          <InfoCard
            label="Последнее использование"
            value={formatDate(sub.last_used_at)}
          />
        )}
        {sub.free_trial_end_date && (
          <InfoCard label="Конец пробного периода" value={formatDate(sub.free_trial_end_date)} />
        )}
      </div>

      {/* URLs */}
      {sub.pricing_url && (
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <LinkCard label="Страница тарифов" href={sub.pricing_url} />
        </div>
      )}

      {/* Notes */}
      {userNotes && (
        <div className="rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06)] mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6b6b80] mb-2">Заметки</p>
          <p className="text-sm text-[#1a1a2e] whitespace-pre-wrap leading-relaxed">{userNotes}</p>
        </div>
      )}

      {/* Status actions */}
      <section className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6b6b80] mb-2 px-1">Управление статусом</p>
        <SubscriptionStatusActions subscriptionId={sub.id} status={sub.status} />
      </section>

      {/* Danger zone */}
      <section className="max-w-lg">
        <SubscriptionDangerZone subscriptionId={sub.id} status={sub.status} />
      </section>
    </main>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(26,26,61,0.06)]">
      <p className="text-xs text-[#6b6b80] mb-1">{label}</p>
      <p className="text-sm font-semibold text-[#1a1a2e]">{value}</p>
    </div>
  )
}

function LinkCard({ label, href }: { label: string; href: string }) {
  let display = href
  try { display = new URL(href).hostname } catch { /* keep raw */ }
  return (
    <div className="rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(26,26,61,0.06)]">
      <p className="text-xs text-[#6b6b80] mb-1">{label}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm font-medium text-[#5b43d4] hover:text-[#4b36b6] truncate max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {display}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>
    </div>
  )
}
