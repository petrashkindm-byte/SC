'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { coerceNumber } from '@/lib/coerce-number'
import { categoryLabelRu, CATEGORY_FORM_OPTIONS, formatBillingCycleRu } from '@/lib/subscription-labels'
import type { BillingCycle, CategorySlug, Subscription, SubscriptionStatus } from '@/lib/supabase/types'
import type { SubcuroEditViz } from '@/lib/subscription-viz-notes'
import { effectiveIconBackgroundFromViz } from '@/lib/subscription-icon-background'
import PaymentServiceIcon from '@/app/dashboard/PaymentServiceIcon'
import { PAYMENT_ICON_PRESETS, resolvePaymentIconIdForDisplay } from '@/lib/payment-icon-presets'
import { setSubscriptionReminderKind } from '@/app/dashboard/reminders/actions'
import { deleteSubscription, updateSubscriptionFields } from './actions'

const CURRENCIES = ['RUB', 'USD', 'EUR'] as const

const VIZ_COLORS: { hex: string; label: string }[] = [
  { hex: '#5b43d4', label: 'Фиолетовый' },
  { hex: '#12b76a', label: 'Зелёный' },
  { hex: '#e5484d', label: 'Красный' },
  { hex: '#ea580c', label: 'Оранжевый' },
  { hex: '#2563eb', label: 'Синий' },
  { hex: '#f5a524', label: 'Жёлтый' },
]

const STRIP_STATUS: Record<
  SubscriptionStatus,
  { label: string; chipClass: string }
> = {
  active: {
    label: '● Активен',
    chipClass: 'bg-[#e6f7f1] text-[#0d9f6e]',
  },
  paused: {
    label: '● Пауза',
    chipClass: 'bg-[#fff4e0] text-[#b35a00]',
  },
  cancelled: {
    label: '● Отменён',
    chipClass: 'bg-[#fdecec] text-[#e5484d]',
  },
  archived: {
    label: '● Архив',
    chipClass: 'bg-[#ececf0] text-[#6b6b80]',
  },
}

type Props = {
  subscription: Subscription
  initialViz: SubcuroEditViz
  userNotes: string
  displayName: string
  reminderFlags: { renewal: boolean; trial: boolean; price: boolean }
  error: string | null
}

function previewFillClass(fill: SubcuroEditViz['cardFill']): string {
  if (fill === 'lavender') return 'bg-gradient-to-b from-[#faf5ff] to-white'
  if (fill === 'mint') return 'bg-gradient-to-b from-[#f0fdf4] to-white'
  if (fill === 'peach') return 'bg-gradient-to-b from-[#fff7ed] to-white'
  return 'bg-gradient-to-b from-[#f8f8fa] to-white'
}

export default function EditSubscriptionView({
  subscription: sub,
  initialViz,
  userNotes: initialUserNotes,
  displayName,
  reminderFlags: initialReminderFlags,
  error,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toastShownRef = useRef(false)
  const [saveToast, setSaveToast] = useState(false)

  const [tab, setTab] = useState<'data' | 'visual' | 'reminders' | 'extra'>('data')

  const [name, setName] = useState(sub.name)
  const [amount, setAmount] = useState(String(coerceNumber(sub.amount)))
  const [currency, setCurrency] = useState(() =>
    CURRENCIES.includes(sub.currency as (typeof CURRENCIES)[number]) ? sub.currency : 'RUB',
  )
  const [categorySlug, setCategorySlug] = useState<CategorySlug>(
    CATEGORY_FORM_OPTIONS.some((c) => c.value === sub.category_slug)
      ? sub.category_slug
      : 'other',
  )
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(() => sub.billing_cycle)
  const [nextDue, setNextDue] = useState(sub.next_charge_date.slice(0, 10))
  const firstCharge = sub.first_charge_date.slice(0, 10)

  const [status, setStatus] = useState<SubscriptionStatus>(sub.status)
  const autoRenew = sub.renewal_type === 'auto_renew'
  const [repeatYes, setRepeatYes] = useState(autoRenew)
  const [autopayEnabled, setAutopayEnabled] = useState(autoRenew)

  const [icon, setIcon] = useState(() =>
    resolvePaymentIconIdForDisplay(sub.icon, sub.category_slug),
  )
  const [viz, setViz] = useState<SubcuroEditViz>(initialViz)
  const [notes, setNotes] = useState(initialUserNotes)
  const [manageUrl, setManageUrl] = useState(sub.management_url ?? '')
  const [cancelUrl, setCancelUrl] = useState(sub.cancellation_url ?? '')

  const [remRenewal, setRemRenewal] = useState(initialReminderFlags.renewal)
  const [remTrial, setRemTrial] = useState(initialReminderFlags.trial)
  const [remPrice, setRemPrice] = useState(initialReminderFlags.price)
  const [cardModalOpen, setCardModalOpen] = useState(false)

  const [pendingReminder, startReminder] = useTransition()
  const [pendingDelete, startDelete] = useTransition()

  const renewalType: 'auto_renew' | 'manual' =
    repeatYes && autopayEnabled ? 'auto_renew' : 'manual'

  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean)
    const a = parts[0]?.[0] ?? '?'
    const b = parts[1]?.[0] ?? ''
    return (a + b).toUpperCase().slice(0, 2)
  }, [displayName])

  useEffect(() => {
    if (searchParams.get('saved') !== '1') {
      toastShownRef.current = false
      return
    }
    if (toastShownRef.current) return
    toastShownRef.current = true
    setSaveToast(true)
    router.replace(`/dashboard/subscriptions/${sub.id}/edit`, { scroll: false })
  }, [searchParams, router, sub.id])

  const amountLabel =
    currency === 'RUB' ? 'Сумма, ₽' : currency === 'USD' ? 'Сумма, $' : 'Сумма, €'

  const fxHint =
    currency !== 'RUB'
      ? 'Сумма в валюте подписки. Курсы для отчётов берутся из настроек (скоро).'
      : ''

  const stripAmount = useMemo(() => {
    const n = Number(amount.replace(',', '.'))
    if (!Number.isFinite(n)) return '—'
    return `${n.toLocaleString('ru-RU')} ${currency}`
  }, [amount, currency])

  const stripDue = useMemo(() => {
    if (!nextDue) return '—'
    try {
      return new Date(`${nextDue}T12:00:00`).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return nextDue
    }
  }, [nextDue])

  const catChipClass = useMemo(() => {
    const map: Record<string, string> = {
      entertainment: 'bg-[#ede9fc] text-[#5b43d4]',
      productivity: 'bg-[#e8efff] text-[#3457d5]',
      utilities: 'bg-[#ececf0] text-[#6b6b80]',
      finance: 'bg-[#e8faf0] text-[#0d9f6e]',
      health: 'bg-[#fdecec] text-[#e5484d]',
      shopping: 'bg-[#fff4e0] text-[#b35a00]',
      education: 'bg-[#e6f5ff] text-[#1479b8]',
      other: 'bg-[#ececf0] text-[#6b6b80]',
    }
    return map[categorySlug] ?? map.other
  }, [categorySlug])

  const resetVizCategory = useCallback(() => {
    setViz((v) => ({ ...v, iconBg: null }))
  }, [])

  const toggleReminder = useCallback(
    (kind: 'renewal' | 'trial_end' | 'price_check', next: boolean, localSet: (v: boolean) => void) => {
      startReminder(async () => {
        try {
          await setSubscriptionReminderKind(sub.id, kind, next)
          localSet(next)
        } catch {
          localSet(!next)
        }
      })
    },
    [sub.id],
  )

  const onDelete = useCallback(() => {
    if (!window.confirm('Удалить этот платёж? Действие необратимо.')) return
    startDelete(async () => {
      try {
        await deleteSubscription(sub.id)
        router.push('/dashboard?tab=payments')
      } catch {
        /* keep */
      }
    })
  }, [router, sub.id])

  const billingOptions = useMemo(() => {
    const o = new Set<BillingCycle>(['monthly', 'yearly'])
    o.add(sub.billing_cycle)
    o.add(billingCycle)
    return Array.from(o)
  }, [sub.billing_cycle, billingCycle])

  const TABS = useMemo(
    () =>
      [
        { id: 'data' as const, label: 'Данные', hover: 'hover:text-[#5b43d4]' },
        { id: 'visual' as const, label: 'Визуал', hover: 'hover:text-[#2563eb]' },
        { id: 'reminders' as const, label: 'Напоминания', hover: 'hover:text-[#db2777]' },
        { id: 'extra' as const, label: 'Дополнительно', hover: 'hover:text-[#ca8a04]' },
      ] as const,
    [],
  )

  const iconBg = effectiveIconBackgroundFromViz(viz, categorySlug)

  return (
    <>
      <main className="min-h-screen pb-32 px-5 pt-5 max-w-[1180px]">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard?tab=payments"
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border-0 bg-white text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.08)] no-underline hover:bg-[#f8f6f2]"
              aria-label="Назад"
            >
              ←
            </Link>
            <h1 className="m-0 text-[1.35rem] font-bold tracking-[-0.03em] text-[#1a1a2e]">
              Редактировать платёж
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative hidden max-w-[280px] items-center gap-2 rounded-[12px] border border-[#e7e3dc] bg-white px-2.5 py-1.5 sm:flex">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#9a9aaf]">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="search"
                readOnly
                placeholder="Поиск…"
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#1a1a2e] outline-none placeholder:text-[#9a9aaf]"
                aria-label="Поиск"
              />
              <span className="shrink-0 rounded-md border border-[#e7e3dc] px-1.5 py-0.5 text-[11px] text-[#9a9aaf]">
                ⌘K
              </span>
            </div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border-0 bg-white text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.08)]"
              aria-label="Уведомления"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5b43d4] text-[13px] font-semibold text-white">
              {initials}
            </div>
          </div>
        </header>

        <form id="edit-sub-form" action={updateSubscriptionFields} className="space-y-5">
          <input type="hidden" name="subscription_id" value={sub.id} />
          <input type="hidden" name="currency" value={currency} />
          <input type="hidden" name="first_charge_date" value={firstCharge} />
          <input type="hidden" name="icon" value={icon} />
          <input type="hidden" name="subscription_status" value={status} />
          <input type="hidden" name="renewal_type" value={renewalType} />
          <input type="hidden" name="subcuro_viz" value={JSON.stringify(viz)} />
          <input
            type="hidden"
            name="free_trial_end_date"
            value={sub.free_trial_end_date?.slice(0, 10) ?? ''}
          />

          {error ? (
            <p className="rounded-xl border border-[#f3c5c7] bg-[#fdecec] px-4 py-3 text-sm text-[#e5484d]">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 rounded-[18px] border border-[#e7e3dc] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(26,26,61,0.06)]">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <PaymentServiceIcon
                icon={icon}
                categorySlug={categorySlug}
                iconBg={iconBg}
                shape={viz.shape}
                size={48}
              />
              <div className="min-w-0">
                <strong className="text-[1.1rem] text-[#1a1a2e]">{name || '—'}</strong>
                <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${catChipClass}`}>
                  {categoryLabelRu(categorySlug)}
                </span>
              </div>
            </div>
            <div className="text-[13px] text-[#1a1a2e]">{stripAmount}</div>
            <div className="text-[13px] text-[#6b6b80]">{stripDue}</div>
            <span className={`ml-auto rounded-full px-2.5 py-1 text-[12px] font-semibold ${STRIP_STATUS[status].chipClass}`}>
              {STRIP_STATUS[status].label}
            </span>
            <div className="flex gap-2">
              <Link
                href="/dashboard?tab=payments"
                className="inline-flex h-10 items-center rounded-[10px] border border-[#e7e3dc] bg-white px-4 text-[13px] font-semibold text-[#1a1a2e] no-underline hover:bg-[#f8f6f2]"
              >
                Назад
              </Link>
              <button
                type="submit"
                form="edit-sub-form"
                className="inline-flex h-10 items-center rounded-[10px] border-0 bg-[#0d9f6e] px-4 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(13,159,110,0.35)] hover:brightness-105"
              >
                Сохранить
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_minmax(300px,420px)]">
            <div className="rounded-[18px] border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06)]">
              <div className="mb-5 flex flex-wrap gap-1 border-b border-[#ececee] pb-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`rounded-[10px] border-0 px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                      tab === t.id
                        ? 'bg-[#e6f7f1] text-[#0d9f6e]'
                        : `bg-transparent text-[#6b6b80] ${t.hover}`
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'data' ? (
                <div className="space-y-4">
                  <h3 className="m-0 mb-3.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-[#6b6b80]">
                    Основная информация
                  </h3>
                  <div>
                    <label htmlFor="edit-name" className="mb-1 block text-[13px] text-[#6b6b80]">
                      Название
                    </label>
                    <input
                      id="edit-name"
                      name="name"
                      required
                      minLength={2}
                      maxLength={60}
                      autoComplete="off"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-[10px] border border-[#dcd6ce] bg-white px-3 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#5b43d4]"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-amount" className="mb-1 block text-[13px] text-[#6b6b80]">
                      {amountLabel}
                    </label>
                    <input
                      id="edit-amount"
                      name="amount"
                      required
                      min={0}
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-[10px] border border-[#dcd6ce] bg-white px-3 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#5b43d4]"
                    />
                  </div>
                  {fxHint ? (
                    <p className="m-0 -mt-1 text-[12px] leading-snug text-[#6b6b80]">{fxHint}</p>
                  ) : null}
                  <div>
                    <span className="mb-1 block text-[13px] text-[#6b6b80]">Валюта подписки</span>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Валюта">
                      {CURRENCIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCurrency(c)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                            currency === c
                              ? 'border-[#5b43d4] bg-[#ede9fc] text-[#5b43d4]'
                              : 'border-[#e7e3dc] bg-white text-[#1a1a2e] hover:border-[#cfc8bf]'
                          }`}
                        >
                          <span className={currency === c ? 'inline' : 'invisible'} aria-hidden>
                            ✓
                          </span>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="edit-category" className="mb-1 block text-[13px] text-[#6b6b80]">
                      Категория
                    </label>
                    <select
                      id="edit-category"
                      name="category_slug"
                      value={categorySlug}
                      onChange={(e) => setCategorySlug(e.target.value as CategorySlug)}
                      className="w-full rounded-[10px] border border-[#dcd6ce] bg-white px-3 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#5b43d4]"
                    >
                      {CATEGORY_FORM_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit-cycle" className="mb-1 block text-[13px] text-[#6b6b80]">
                      Периодичность
                    </label>
                    <select
                      id="edit-cycle"
                      name="billing_cycle"
                      value={billingCycle}
                      onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                      className="w-full rounded-[10px] border border-[#dcd6ce] bg-white px-3 py-2.5 text-sm text-[#1a1a2e] outline-none focus:border-[#5b43d4]"
                    >
                      {billingOptions.map((bc) => (
                        <option key={bc} value={bc}>
                          {formatBillingCycleRu({
                            billing_cycle: bc,
                            billing_interval: sub.billing_interval,
                            custom_interval_days: sub.custom_interval_days,
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                  {billingCycle === 'custom' ? (
                    <div>
                      <label htmlFor="edit-custom-days" className="mb-1 block text-[13px] text-[#6b6b80]">
                        Дней в цикле
                      </label>
                      <input
                        id="edit-custom-days"
                        name="custom_interval_days"
                        type="number"
                        min={1}
                        required
                        defaultValue={sub.custom_interval_days ?? 30}
                        className="w-full rounded-[10px] border border-[#dcd6ce] bg-white px-3 py-2.5 text-sm outline-none"
                      />
                    </div>
                  ) : (
                    <input type="hidden" name="custom_interval_days" value="" />
                  )}
                  <div>
                    <label htmlFor="edit-next-due" className="mb-1 block text-[13px] text-[#6b6b80]">
                      Следующее списание
                    </label>
                    <input
                      id="edit-next-due"
                      name="next_charge_date"
                      type="date"
                      required
                      value={nextDue}
                      onChange={(e) => setNextDue(e.target.value)}
                      className="w-full rounded-[10px] border border-[#dcd6ce] bg-white px-3 py-2.5 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-[13px] text-[#6b6b80]">Статус</span>
                    <div className="mt-1.5 flex flex-wrap rounded-[12px] bg-[#f4f4f6] p-1">
                      {(['active', 'paused', 'cancelled', 'archived'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(s)}
                          className={`flex-1 rounded-[10px] border-0 px-2 py-2 text-[12px] font-semibold sm:text-[13px] ${
                            status === s
                              ? 'bg-white text-[#5b43d4] shadow-sm'
                              : 'bg-transparent text-[#6b6b80] hover:text-[#1a1a2e]'
                          }`}
                        >
                          {s === 'active'
                            ? 'Активен'
                            : s === 'paused'
                              ? 'Пауза'
                              : s === 'cancelled'
                                ? 'Отменён'
                                : 'Архив'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block text-[13px] text-[#6b6b80]">Повторяется автоматически</span>
                    <div className="mt-1.5 flex rounded-[12px] bg-[#f4f4f6] p-1">
                      <button
                        type="button"
                        onClick={() => setRepeatYes(true)}
                        className={`flex-1 rounded-[10px] border-0 py-2 text-[13px] font-semibold ${
                          repeatYes ? 'bg-white text-[#1a1a2e] shadow-sm' : 'bg-transparent text-[#6b6b80]'
                        }`}
                      >
                        Да
                      </button>
                      <button
                        type="button"
                        onClick={() => setRepeatYes(false)}
                        className={`flex-1 rounded-[10px] border-0 py-2 text-[13px] font-semibold ${
                          !repeatYes ? 'bg-white text-[#1a1a2e] shadow-sm' : 'bg-transparent text-[#6b6b80]'
                        }`}
                      >
                        Нет
                      </button>
                    </div>
                  </div>

                  <h3 className="mb-3.5 mt-6 text-[13px] font-semibold uppercase tracking-[0.06em] text-[#6b6b80]">
                    Оплата
                  </h3>
                  <div>
                    <span className="mb-1 block text-[13px] text-[#6b6b80]">Способ оплаты</span>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Карта">
                      <span className="inline-flex items-center rounded-full border border-[#e7e3dc] bg-[#f8f6f2] px-3 py-2 text-[13px] text-[#6b6b80]">
                        •••• — скоро
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => setCardModalOpen(true)}
                        className="rounded-full border border-[#e7e3dc] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#1a1a2e] hover:bg-[#f8f6f2]"
                      >
                        Изменить карту…
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardModalOpen(true)}
                        className="rounded-full border border-[#e7e3dc] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#1a1a2e] hover:bg-[#f8f6f2]"
                      >
                        + Новая карта
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block text-[13px] text-[#6b6b80]">Автопродление</span>
                    <div className="mt-1.5 flex rounded-[12px] bg-[#f4f4f6] p-1">
                      <button
                        type="button"
                        onClick={() => setAutopayEnabled(true)}
                        className={`flex-1 rounded-[10px] border-0 py-2 text-[13px] font-semibold ${
                          autopayEnabled ? 'bg-white text-[#5b43d4] shadow-sm' : 'bg-transparent text-[#6b6b80]'
                        }`}
                      >
                        Включено
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutopayEnabled(false)}
                        className={`flex-1 rounded-[10px] border-0 py-2 text-[13px] font-semibold ${
                          !autopayEnabled ? 'bg-white text-[#5b43d4] shadow-sm' : 'bg-transparent text-[#6b6b80]'
                        }`}
                      >
                        Ручное
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === 'visual' ? (
                <div>
                  <p className="m-0 text-[14px] leading-relaxed text-[#6b6b80]">
                    Иконку, цвет, форму и заливку карточки настройте в панели{' '}
                    <strong className="text-[#1a1a2e]">справа</strong> — изменения сразу видны вверху и в предпросмотре.
                  </p>
                  <p className="mt-4">
                    <a
                      href="#edit-visual-aside"
                      className="inline-block rounded-[10px] border border-[#e7e3dc] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#1a1a2e] no-underline hover:bg-[#f8f6f2]"
                    >
                      К панели «Визуал»
                    </a>
                  </p>
                </div>
              ) : null}

              {tab === 'reminders' ? (
                <div>
                  <h3 className="m-0 mb-3.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-[#6b6b80]">
                    Напоминания
                  </h3>
                  <div className="flex items-center justify-between border-b border-[#e7e3dc] py-3">
                    <span className="text-[14px] text-[#1a1a2e]">Напомнить за 3 дня</span>
                    <button
                      type="button"
                      disabled={pendingReminder}
                      onClick={() => toggleReminder('renewal', !remRenewal, setRemRenewal)}
                      className={`relative h-7 w-12 shrink-0 rounded-full border-0 transition-colors ${
                        remRenewal ? 'bg-[#5b43d4]' : 'bg-[#c8c9d4]'
                      }`}
                      aria-label="Переключить напоминание за 3 дня"
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          remRenewal ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#e7e3dc] py-3">
                    <span className="text-[14px] text-[#1a1a2e]">Напоминание о trial</span>
                    <button
                      type="button"
                      disabled={pendingReminder || !sub.free_trial_end_date}
                      onClick={() => {
                        if (!sub.free_trial_end_date) return
                        toggleReminder('trial_end', !remTrial, setRemTrial)
                      }}
                      className={`relative h-7 w-12 shrink-0 rounded-full border-0 transition-colors ${
                        remTrial ? 'bg-[#5b43d4]' : 'bg-[#c8c9d4]'
                      } disabled:opacity-40`}
                      aria-label="Переключить напоминание о trial"
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          remTrial ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-[14px] text-[#1a1a2e]">Уведомление об изменении цены</span>
                    <button
                      type="button"
                      disabled={pendingReminder}
                      onClick={() => toggleReminder('price_check', !remPrice, setRemPrice)}
                      className={`relative h-7 w-12 shrink-0 rounded-full border-0 transition-colors ${
                        remPrice ? 'bg-[#5b43d4]' : 'bg-[#c8c9d4]'
                      }`}
                      aria-label="Переключить уведомление о цене"
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          remPrice ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                  {!sub.free_trial_end_date ? (
                    <p className="mt-2 text-[12px] text-[#6b6b80]">
                      Для trial-напоминания укажите дату окончания пробного периода в данных подписки (скоро в этом
                      редакторе).
                    </p>
                  ) : null}
                </div>
              ) : null}

              {tab === 'extra' ? (
                <div className="space-y-4">
                  <h3 className="m-0 mb-3.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-[#6b6b80]">
                    Ссылки
                  </h3>
                  <div>
                    <label htmlFor="edit-link-manage" className="mb-1 block text-[13px] text-[#6b6b80]">
                      Ссылка на управление
                    </label>
                    <input
                      id="edit-link-manage"
                      name="management_url"
                      type="url"
                      value={manageUrl}
                      onChange={(e) => setManageUrl(e.target.value)}
                      placeholder="https://…"
                      className="w-full rounded-[10px] border border-[#dcd6ce] bg-white px-3 py-2.5 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-link-cancel" className="mb-1 block text-[13px] text-[#6b6b80]">
                      Ссылка на отмену
                    </label>
                    <input
                      id="edit-link-cancel"
                      name="cancellation_url"
                      type="url"
                      value={cancelUrl}
                      onChange={(e) => setCancelUrl(e.target.value)}
                      placeholder="https://…"
                      className="w-full rounded-[10px] border border-[#dcd6ce] bg-white px-3 py-2.5 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-notes" className="mb-1 block text-[13px] text-[#6b6b80]">
                      Заметки
                    </label>
                    <textarea
                      id="edit-notes"
                      name="notes"
                      rows={4}
                      maxLength={500}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Заметка…"
                      className="w-full resize-y rounded-[10px] border border-[#dcd6ce] bg-white px-3 py-2.5 text-sm outline-none"
                    />
                    <div className="mt-1 text-right text-[12px] text-[#6b6b80]">
                      {notes.length} / 500
                    </div>
                  </div>
                  <p className="mt-6">
                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={pendingDelete}
                      className="border-0 bg-transparent p-0 text-[15px] font-semibold text-[#e5484d] hover:underline"
                    >
                      🗑 Удалить платёж
                    </button>
                  </p>
                </div>
              ) : null}
            </div>

            <aside
              id="edit-visual-aside"
              className="h-fit rounded-[18px] border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06)]"
            >
              <h2 className="m-0 mb-3.5 text-[1rem] font-bold text-[#1a1a2e]">Визуал и предпросмотр</h2>
              <p className="edit-aside-hint m-0 mb-2.5 text-[12px] text-[#6b6b80]">Иконка</p>
              <div
                className="mb-2 grid max-h-[320px] grid-cols-6 gap-1.5 overflow-y-auto sm:grid-cols-8"
                aria-label="Выбор иконки категории"
              >
                {PAYMENT_ICON_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.label}
                    onClick={() => setIcon(p.id)}
                    className={`flex h-11 items-center justify-center rounded-[10px] border transition-colors ${
                      icon === p.id
                        ? 'border-[#5b43d4] bg-[#ede9fc]'
                        : 'border-[#e7e3dc] bg-[#fafafa] hover:border-[#cfc8bf]'
                    }`}
                  >
                    <PaymentServiceIcon
                      icon={p.id}
                      categorySlug={categorySlug}
                      iconBg={icon === p.id ? iconBg : p.bg}
                      shape={icon === p.id ? viz.shape : 'rounded'}
                      size={36}
                    />
                  </button>
                ))}
              </div>
              <p className="m-0 mb-2.5 text-[12px] text-[#6b6b80]">Цвет фона иконки</p>
              <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
                {VIZ_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={c.label}
                    onClick={() => setViz((v) => ({ ...v, iconBg: c.hex }))}
                    className={`h-8 w-8 shrink-0 rounded-full border-2 border-transparent ${
                      viz.iconBg === c.hex ? 'shadow-[0_0_0_2px_#fff,0_0_0_4px_#5b43d4]' : ''
                    }`}
                    style={{ background: c.hex }}
                  />
                ))}
                <button
                  type="button"
                  onClick={resetVizCategory}
                  className="border-0 bg-transparent p-1 text-[12px] text-[#5b43d4] underline"
                >
                  Как у категории
                </button>
              </div>
              <p className="m-0 mb-2.5 text-[12px] text-[#6b6b80]">Форма иконки</p>
              <div className="mb-4 flex flex-col gap-1 rounded-[12px] bg-[#f4f4f6] p-1 sm:flex-row">
                {(
                  [
                    ['rounded', 'Скруглённый квадрат'],
                    ['circle', 'Круг'],
                    ['square', 'Квадрат'],
                  ] as const
                ).map(([shape, label]) => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => setViz((v) => ({ ...v, shape: shape as SubcuroEditViz['shape'] }))}
                    className={`flex-1 rounded-[10px] border-0 px-2 py-2 text-[12px] font-semibold leading-tight ${
                      viz.shape === shape ? 'bg-white text-[#1a1a2e] shadow-sm' : 'bg-transparent text-[#6b6b80]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="m-0 mb-2.5 text-[12px] text-[#6b6b80]">Заливка карточки предпросмотра</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {(
                  [
                    ['none', 'Нейтральная'],
                    ['lavender', 'Лаванда'],
                    ['mint', 'Мята'],
                    ['peach', 'Персик'],
                  ] as const
                ).map(([fill, title]) => (
                  <button
                    key={fill}
                    type="button"
                    title={title}
                    aria-label={title}
                    onClick={() => setViz((v) => ({ ...v, cardFill: fill }))}
                    className={`h-9 w-9 rounded-lg border-2 ${
                      fill === 'none' ? 'bg-[#fafafa]' : ''
                    } ${viz.cardFill === fill ? 'border-[#5b43d4] shadow-[0_0_0_1px_rgba(91,67,212,0.2)]' : 'border-[#e7e3dc]'}`}
                    style={
                      fill === 'lavender'
                        ? { background: '#faf5ff' }
                        : fill === 'mint'
                          ? { background: '#f0fdf4' }
                          : fill === 'peach'
                            ? { background: '#fff7ed' }
                            : undefined
                    }
                  />
                ))}
              </div>
              <p className="m-0 mb-2.5 text-[12px] text-[#6b6b80]">Предпросмотр в приложении</p>
              <div
                className={`preview-phone overflow-hidden rounded-[28px] border border-[#e7e3dc] p-4 shadow-inner ${previewFillClass(viz.cardFill)}`}
              >
                <div className="flex items-center gap-3">
                  <PaymentServiceIcon
                    icon={icon}
                    categorySlug={categorySlug}
                    iconBg={iconBg}
                    shape={viz.shape}
                    size={44}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[15px] font-semibold text-[#1a1a2e]">{name || '—'}</p>
                    <p className="m-0 text-[12px] text-[#6b6b80]">{stripDue}</p>
                  </div>
                  <span className="shrink-0 text-[14px] font-semibold text-[#1a1a2e]">{stripAmount}</span>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </main>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center py-4 pl-[250px] max-lg:pl-0"
        style={{ background: '#2d0c33' }}
      >
        <button
          type="submit"
          form="edit-sub-form"
          className="rounded-[12px] border-0 bg-[#0d9f6e] px-8 py-3 text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:brightness-105"
        >
          ✓ Сохранить изменения
        </button>
      </div>

      {saveToast ? (
        <div
          className="fixed bottom-[max(24px,88px)] left-1/2 z-[80] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 motion-safe:animate-[edit-toast_0.35s_cubic-bezier(0.22,1,0.36,1)_both]"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3.5 rounded-[18px] border border-[#e7e3dc] bg-white px-[18px] py-4 shadow-[0_4px_24px_rgba(26,26,61,0.12),0_16px_40px_rgba(0,0,0,0.1)]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#e6f7f1] text-[#0d9f6e]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-[15px] font-semibold text-[#1a1a2e]">Изменения сохранены</strong>
              <span className="mt-1 block text-[13px] leading-snug text-[#6b6b80]">
                Данные подписки обновлены в списке платежей.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSaveToast(false)}
              className="shrink-0 rounded-[10px] border-0 bg-[#0d9f6e] px-[18px] py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(13,159,110,0.35)] hover:brightness-105"
            >
              Понятно
            </button>
          </div>
        </div>
      ) : null}

      {cardModalOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-5" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0 bg-[rgba(26,26,61,0.35)]"
            aria-label="Закрыть"
            onClick={() => setCardModalOpen(false)}
          />
          <div className="relative z-[1] w-[min(420px,100%)] rounded-[18px] border border-[#e7e3dc] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
            <button
              type="button"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-[10px] border-0 bg-[#f4f4f6] text-[22px] text-[#6b6b80]"
              aria-label="Закрыть"
              onClick={() => setCardModalOpen(false)}
            >
              ×
            </button>
            <h2 className="m-0 mb-2 text-[1.1rem] font-bold text-[#1a1a2e]">Карта оплаты</h2>
            <p className="m-0 mb-4 text-[14px] leading-snug text-[#6b6b80]">
              Реквизиты сохраняются в приложении и доступны для всех подписок, где выбрана эта карта. Функция скоро
              появится.
            </p>
            <label className="mb-3 block text-[13px] text-[#1a1a2e]">
              Выбор карты
              <select className="mt-1 w-full rounded-[10px] border border-[#dcd6ce] px-3 py-2 text-sm" disabled>
                <option>—</option>
              </select>
            </label>
            <label className="mb-3 block text-[13px] text-[#1a1a2e]">
              Бренд (Visa, Mastercard…)
              <input className="mt-1 w-full rounded-[10px] border border-[#dcd6ce] px-3 py-2 text-sm" disabled />
            </label>
            <label className="mb-5 block text-[13px] text-[#1a1a2e]">
              Последние 4 цифры
              <input className="mt-1 w-full rounded-[10px] border border-[#dcd6ce] px-3 py-2 text-sm" disabled />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCardModalOpen(false)}
                className="rounded-[10px] border border-[#e7e3dc] bg-white px-4 py-2.5 text-[13px] font-semibold"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => setCardModalOpen(false)}
                className="rounded-[10px] border-0 bg-[#0d9f6e] px-4 py-2.5 text-[13px] font-semibold text-white"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
