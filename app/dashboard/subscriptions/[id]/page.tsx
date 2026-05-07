import { coerceNumber } from '@/lib/coerce-number'
import { createClient } from '@/lib/supabase/server'
import type { Subscription } from '@/lib/supabase/types'
import {
  categoryLabelRu,
  formatBillingCycleRu,
  STATUS_LABEL_FULL_RU,
} from '@/lib/subscription-labels'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import PaymentServiceIcon from '@/app/dashboard/PaymentServiceIcon'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import SubscriptionDangerZone from './SubscriptionDangerZone'
import SubscriptionStatusActions from './SubscriptionStatusActions'
import MarkUsedTodayButton from './MarkUsedTodayButton'

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

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
  const amount = coerceNumber(sub.amount)
  const fmt = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: sub.currency,
  }).format(amount)

  return (
    <main className="px-6 py-6 max-w-[1180px]">
      <Link
        href="/dashboard"
        className="text-sm text-[#6b6b80] hover:text-[#1a1a2e] mb-6 inline-block"
      >
        ← К обзору
      </Link>

      <div className="mt-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <PaymentServiceIcon
              icon={sub.icon}
              categorySlug={sub.category_slug}
              iconBg={detailIcon.iconBg}
              shape={detailIcon.shape}
              size={44}
            />
            <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e]">{sub.name}</h1>
          </div>
          <p className="text-[#6b6b80] text-sm mt-1">
            {categoryLabelRu(sub.category_slug)} · {STATUS_LABEL_FULL_RU[sub.status]}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            <Link
              href={`/dashboard/subscriptions/${sub.id}/edit`}
              className="text-sm font-medium text-[#5b43d4] hover:text-[#4b36b6]"
            >
              Редактировать поля
            </Link>
            <Link
              href={`/dashboard/reminders?sub=${sub.id}`}
              className="text-sm font-medium text-[#6b6b80] hover:text-[#1a1a2e]"
            >
              Напоминание
            </Link>
          </div>
          <div className="mt-3">
            <MarkUsedTodayButton subscriptionId={sub.id} lastUsedAt={sub.last_used_at ?? null} />
          </div>
        </div>
        <p className="text-2xl font-semibold text-[#1a1a2e] shrink-0">{fmt}</p>
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2 text-sm">
        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-4 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <dt className="text-[#6b6b80]">Цикл списания</dt>
          <dd className="text-[#1a1a2e] mt-1">{formatBillingCycleRu(sub)}</dd>
        </div>
        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-4 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <dt className="text-[#6b6b80]">Продление</dt>
          <dd className="text-[#1a1a2e] mt-1">{sub.renewal_type === 'auto_renew' ? 'Авто' : 'Вручную'}</dd>
        </div>
        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-4 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <dt className="text-[#6b6b80]">Первое списание</dt>
          <dd className="text-[#1a1a2e] mt-1">{formatDate(sub.first_charge_date)}</dd>
        </div>
        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-4 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <dt className="text-[#6b6b80]">Следующее списание</dt>
          <dd className="text-[#1a1a2e] mt-1">{formatDate(sub.next_charge_date)}</dd>
        </div>
        {sub.cancellation_url ? (
          <div className="rounded-2xl border border-[#e7e3dc] bg-white p-4 sm:col-span-2 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
            <dt className="text-[#6b6b80]">Ссылка на отмену</dt>
            <dd className="mt-1">
              <a
                href={sub.cancellation_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5b43d4] hover:text-[#4b36b6] break-all"
              >
                {sub.cancellation_url}
              </a>
            </dd>
          </div>
        ) : null}
        {sub.management_url ? (
          <div className="rounded-2xl border border-[#e7e3dc] bg-white p-4 sm:col-span-2 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
            <dt className="text-[#6b6b80]">Личный кабинет</dt>
            <dd className="mt-1">
              <a
                href={sub.management_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5b43d4] hover:text-[#4b36b6] break-all"
              >
                {sub.management_url}
              </a>
            </dd>
          </div>
        ) : null}
        {sub.free_trial_end_date ? (
          <div className="rounded-2xl border border-[#e7e3dc] bg-white p-4 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
            <dt className="text-[#6b6b80]">Конец триала</dt>
            <dd className="text-[#1a1a2e] mt-1">{formatDate(sub.free_trial_end_date)}</dd>
          </div>
        ) : null}
        {sub.notes ? (
          <div className="rounded-2xl border border-[#e7e3dc] bg-white p-4 sm:col-span-2 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
            <dt className="text-[#6b6b80]">Заметки</dt>
            <dd className="text-[#1a1a2e] mt-1 whitespace-pre-wrap">{sub.notes}</dd>
          </div>
        ) : null}
      </dl>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-[#6b6b80] uppercase tracking-wide mb-3">
          Статус
        </h2>
        <SubscriptionStatusActions subscriptionId={sub.id} status={sub.status} />
      </section>

      <section className="mt-10 max-w-lg">
        <SubscriptionDangerZone subscriptionId={sub.id} status={sub.status} />
      </section>
    </main>
  )
}
