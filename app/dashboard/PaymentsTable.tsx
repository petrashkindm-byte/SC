'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import AddPaymentModal from './AddPaymentModal'
import PaymentServiceIcon from './PaymentServiceIcon'
import { coerceNumber } from '@/lib/coerce-number'
import { categoryLabelRu } from '@/lib/subscription-labels'
import type { Subscription } from '@/lib/supabase/types'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import { markAsPaid } from './subscriptions/actions'
import { fmtCurrency, groupMonthlyByCurrency, formatGroups, getMonthlyAmount } from '@/lib/currency'

/** Пять вкладок как в payments.html (без «Архив»). */
export type PaymentsFilter = 'all' | 'active' | 'soon' | 'paused' | 'cancelled'
type PaymentsSortKey = 'next_charge' | 'amount' | 'name'

const FILTERS: { key: PaymentsFilter; label: string; hoverClass: string }[] = [
  { key: 'all', label: 'Все', hoverClass: 'hover:border-[#5b43d4] hover:text-[#5b43d4]' },
  { key: 'active', label: 'Активные', hoverClass: 'hover:border-[#2563eb] hover:text-[#2563eb]' },
  { key: 'soon', label: 'Скоро спишутся', hoverClass: 'hover:border-[#db2777] hover:text-[#db2777]' },
  { key: 'paused', label: 'На паузе', hoverClass: 'hover:border-[#ca8a04] hover:text-[#ca8a04]' },
  { key: 'cancelled', label: 'Отменённые', hoverClass: 'hover:border-slate-500 hover:text-slate-600' },
]

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

/** Как в payments-table.js: только ежемесячно / ежегодно для простых случаев. */
function cycleLabelConcept(sub: Subscription): string {
  if (sub.billing_cycle === 'monthly' && sub.billing_interval === 1) return 'Ежемесячно'
  if (sub.billing_cycle === 'yearly' && sub.billing_interval === 1) return 'Ежегодно'
  if (sub.billing_cycle === 'weekly') return 'Еженедельно'
  if (sub.billing_cycle === 'quarterly') return 'Ежеквартально'
  if (sub.billing_cycle === 'custom' && sub.custom_interval_days) {
    return `Раз в ${sub.custom_interval_days} дн.`
  }
  if (sub.billing_cycle === 'monthly') return `Каждые ${sub.billing_interval} мес.`
  if (sub.billing_cycle === 'yearly') return `Каждые ${sub.billing_interval} г.`
  return 'Ежемесячно'
}

function dueRelativePhrase(days: number): string {
  if (days < 0) return `просрочено на ${Math.abs(days)} дн.`
  if (days === 0) return 'сегодня'
  if (days === 1) return 'завтра'
  return `через ${days} дн.`
}

type StatusUi = {
  label: string
  badgeClass: string
  /** колонка «следующее списание»: просрочка */
  overdue: boolean
}

function statusUi(sub: Subscription): StatusUi {
  if (sub.status === 'archived') {
    return { label: 'В архиве', badgeClass: 'bg-[#ececf0] text-[#6b6b80]', overdue: false }
  }
  if (sub.status === 'paused') {
    return { label: 'На паузе', badgeClass: 'bg-[#fff4e0] text-[#b35a00]', overdue: false }
  }
  if (sub.status === 'cancelled') {
    return { label: 'Отменён', badgeClass: 'bg-[#fdecec] text-[#e5484d]', overdue: false }
  }
  const d = daysUntil(sub.next_charge_date)
  if (d < 0) {
    return { label: 'Просрочено', badgeClass: 'bg-[#fdecec] text-[#e5484d]', overdue: true }
  }
  return { label: 'Активна', badgeClass: 'bg-[#ede9fc] text-[#5b43d4]', overdue: false }
}

function emptyMessage(filter: PaymentsFilter, hasSearch: boolean): string {
  if (hasSearch) return 'Ничего не найдено. Измените фильтр или поиск.'
  if (filter === 'soon') {
    return 'Нет списаний в ближайшие 14 дней. Все даты дальше или подписки неактивны.'
  }
  if (filter === 'active') return 'Нет активных подписок.'
  if (filter === 'paused') return 'Нет подписок на паузе.'
  if (filter === 'cancelled') return 'Нет отменённых подписок.'
  return 'Ничего не найдено. Измените фильтр или поиск.'
}

const SUBSCRIPTION_FORM_ERR: Record<string, string> = {
  name: 'Укажите название не короче 2 символов.',
  amount: 'Некорректная сумма.',
  dates: 'Заполните дату списания.',
  custom: 'Для своего интервала укажите количество дней.',
  save: 'Не удалось сохранить. Проверьте данные и попробуйте снова.',
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filter, setFilter] = useState<PaymentsFilter>(initialFilter)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<PaymentsSortKey>('next_charge')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [notifOpen, setNotifOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)
  const notifRef = useRef<HTMLDivElement>(null)

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
        const cat = categoryLabelRu(s.category_slug).toLowerCase()
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
        const d = daysUntil(s.next_charge_date)
        return d >= 0 && d <= 7
      })
      .sort((a, b) => daysUntil(a.next_charge_date) - daysUntil(b.next_charge_date))
      .slice(0, 6)
  }, [subs])

  const openRow = (id: string) => {
    router.push(`/dashboard/subscriptions/${id}`)
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
          <span>Платёж добавлен — он уже в таблице.</span>
          <button
            type="button"
            className="shrink-0 rounded-lg border-0 bg-transparent px-2 py-0.5 text-[#0d9f6e] hover:bg-[#d4f0e3]"
            onClick={clearPaymentFlash}
          >
            ×
          </button>
        </div>
      ) : null}

      {subscriptionFormError && SUBSCRIPTION_FORM_ERR[subscriptionFormError] ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f3c5c7] bg-[#fdecec] px-4 py-3 text-sm text-[#e5484d]">
          <span>{SUBSCRIPTION_FORM_ERR[subscriptionFormError]}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-[#e5484d] bg-white px-3 py-1.5 text-xs font-semibold text-[#e5484d] hover:bg-[#fff5f5]"
              onClick={() => {
                clearPaymentFlash()
                setAddModalOpen(true)
              }}
            >
              Открыть форму
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

      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="m-0 mb-1 text-[1.75rem] font-bold tracking-[-0.03em] text-[#1a1a2e]">Платежи</h1>
          <p className="m-0 text-sm text-[#6b6b80] leading-snug">
            Активных: {activeCount} · сумма в месяц: {formatGroups(monthlyGroups)}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2.5 bg-white border border-[rgba(26,26,61,0.08)] rounded-full pl-4 pr-4 min-w-[260px] max-w-[420px] h-11 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-[0.45] text-[#1a1a2e]">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по сервисам, категориям…"
              aria-label="Поиск"
              className="flex-1 min-w-0 border-0 bg-transparent outline-none text-sm text-[#1a1a2e] placeholder:text-[#9a9aaf] font-[inherit]"
            />
          </div>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(26,26,61,0.08)] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] text-[#1a1a2e]"
              aria-label="Уведомления"
              title="Уведомления"
              onClick={() => setNotifOpen((v) => !v)}
            >
              {notifItems.some((s) => daysUntil(s.next_charge_date) <= 3) && (
                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#e5484d] ring-2 ring-white" />
              )}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </button>
            {notifOpen ? (
              <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-[min(340px,90vw)] rounded-[14px] border border-[rgba(26,26,61,0.08)] bg-white py-2.5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
                <div className="px-3.5 pb-2 text-xs font-semibold uppercase tracking-wider text-[#6b6b80]">
                  Уведомления
                </div>
                <div className="max-h-[280px] overflow-y-auto">
                  {notifItems.length === 0 ? (
                    <p className="px-3.5 py-3 text-sm text-[#6b6b80] m-0">Нет событий на этой неделе.</p>
                  ) : (
                    notifItems.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="block w-full border-0 border-t border-[#f0f0f2] bg-transparent px-3.5 py-2.5 text-left text-[13px] text-[#1a1a2e] first:border-t-0 hover:bg-[#f8f8fb]"
                        onClick={() => {
                          setNotifOpen(false)
                          openRow(s.id)
                        }}
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="block text-xs text-[#6b6b80] mt-0.5">
                          Списание {formatDateShort(s.next_charge_date)} · {dueRelativePhrase(daysUntil(s.next_charge_date))}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5b43d4] px-5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(91,67,212,0.35)] hover:brightness-105"
          >
            + Добавить
          </button>
        </div>
      </header>

      <div className="mb-[18px] flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-2.5 text-[13px] font-medium transition-colors border ${
                active
                  ? 'border-[#0d9f6e] bg-[#0d9f6e] text-white shadow-[0_4px_14px_rgba(13,159,110,0.35)]'
                  : `border-[rgba(26,26,61,0.08)] bg-white text-[#6b6b80] ${f.hoverClass}`
              }`}
            >
              {f.label}
            </button>
          )
        })}
        <div className="ml-auto flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as PaymentsSortKey)}
            className="rounded-lg border border-[rgba(26,26,61,0.08)] bg-white px-2.5 py-2 text-xs text-[#1a1a2e]"
            aria-label="Сортировка"
          >
            <option value="next_charge">По дате списания</option>
            <option value="amount">По сумме в месяц</option>
            <option value="name">По названию</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDir((v) => (v === 'asc' ? 'desc' : 'asc'))}
            className="rounded-lg border border-[rgba(26,26,61,0.08)] bg-white px-2.5 py-2 text-xs text-[#1a1a2e] hover:border-[#5b43d4]"
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
        <table className="w-full border-collapse text-[13px] [&_tbody>tr:last-child>td]:border-b-0">
          <thead>
            <tr>
              <th className="border-b border-[rgba(26,26,61,0.08)] bg-[#fafafa] px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">
                Сервис
              </th>
              <th className="border-b border-[rgba(26,26,61,0.08)] bg-[#fafafa] px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">
                Следующее списание
              </th>
              <th className="border-b border-[rgba(26,26,61,0.08)] bg-[#fafafa] px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">
                Цикл оплаты
              </th>
              <th className="border-b border-[rgba(26,26,61,0.08)] bg-[#fafafa] px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">
                Сумма
              </th>
              <th className="border-b border-[rgba(26,26,61,0.08)] bg-[#fafafa] px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b6b80]">
                Статус
              </th>
              <th className="border-b border-[rgba(26,26,61,0.08)] bg-[#fafafa] px-4 py-3.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {sortedFiltered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-7 text-center text-[#6b6b80]">
                  {emptyMessage(filter, Boolean(search.trim()))}
                </td>
              </tr>
            ) : (
              sortedFiltered.map((sub) => {
                const st = statusUi(sub)
                const days = daysUntil(sub.next_charge_date)
                const iconDisplay = resolveSubscriptionIconDisplay(sub.notes, sub.icon, sub.category_slug)

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
                      <strong>Просрочено</strong>
                      <div className="mt-1 text-xs font-medium opacity-95">{formatDateShort(sub.next_charge_date)}</div>
                      <div className="mt-0.5 text-xs">{dueRelativePhrase(days)}</div>
                      <button
                        type="button"
                        disabled={markingPaidId === sub.id}
                        onClick={async (e) => {
                          e.stopPropagation()
                          setMarkingPaidId(sub.id)
                          try { await markAsPaid(sub.id) } finally { setMarkingPaidId(null) }
                        }}
                        className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-[#0d9f6e] bg-[#e8faf0] px-2 py-0.5 text-xs font-semibold text-[#0d9f6e] hover:bg-[#d4f0e3] disabled:opacity-50"
                      >
                        {markingPaidId === sub.id ? '…' : '✓ Оплачено'}
                      </button>
                    </td>
                  ) : (
                    <td className="border-b border-[rgba(26,26,61,0.08)] px-4 py-3.5 align-middle transition-colors group-hover:bg-[rgba(124,58,237,0.06)]">
                      <div className="font-medium">{formatDateShort(sub.next_charge_date)}</div>
                      <div className="mt-0.5 text-xs text-[#6b6b80]">{dueRelativePhrase(days)}</div>
                      {sub.status === 'active' ? (
                        <button
                          type="button"
                          disabled={markingPaidId === sub.id}
                          onClick={async (e) => {
                            e.stopPropagation()
                            setMarkingPaidId(sub.id)
                            try { await markAsPaid(sub.id) } finally { setMarkingPaidId(null) }
                          }}
                          className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-[#0d9f6e] bg-[#e8faf0] px-2 py-0.5 text-xs font-semibold text-[#0d9f6e] hover:bg-[#d4f0e3] disabled:opacity-50"
                        >
                          {markingPaidId === sub.id ? '…' : '✓ Оплачено'}
                        </button>
                      ) : null}
                    </td>
                  )

                return (
                  <tr
                    key={sub.id}
                    className="group cursor-pointer"
                    onClick={() => openRow(sub.id)}
                  >
                    <td className="border-b border-[rgba(26,26,61,0.08)] px-4 py-3.5 align-middle transition-colors group-hover:bg-[rgba(124,58,237,0.06)]">
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
                            href={`/dashboard/subscriptions/${sub.id}`}
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
                      {cycleLabelConcept(sub)}
                    </td>
                    <td
                      className="border-b border-[rgba(26,26,61,0.08)] px-4 py-3.5 align-top leading-snug text-[#1a1a2e] transition-colors group-hover:bg-[rgba(124,58,237,0.06)]"
                      style={{ verticalAlign: 'top', lineHeight: 1.35 }}
                    >
                      <strong className="font-semibold tabular-nums">{fmtCurrency(coerceNumber(sub.amount), sub.currency ?? 'RUB')}</strong>
                    </td>
                    <td className="border-b border-[rgba(26,26,61,0.08)] px-4 py-3.5 align-middle transition-colors group-hover:bg-[rgba(124,58,237,0.06)]">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${st.badgeClass}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="border-b border-[rgba(26,26,61,0.08)] px-4 py-3.5 align-middle text-right transition-colors group-hover:bg-[rgba(124,58,237,0.06)]">
                      <button
                        type="button"
                        className="border-0 bg-transparent p-1 text-lg leading-none text-[#1a1a2e] hover:text-[#5b43d4]"
                        aria-label="Действия"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/subscriptions/${sub.id}/edit`)
                        }}
                      >
                        ⋯
                      </button>
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
              Коллекции
            </span>
            <h2 className="m-0 text-[1.85rem] font-bold leading-tight tracking-[-0.02em] text-[#1a1a2e]">
              Подписки по разделам
            </h2>
            <p className="mt-2 max-w-[690px] text-sm leading-snug text-[#6b6b80] m-0">
              Откройте отдельную страницу категорий с суммой в месяц, долей и списком сервисов, включая пустые разделы.
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
