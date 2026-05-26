'use client'

import { useEffect, useRef, useState } from 'react'
import { PAYMENT_ICON_PRESETS } from '@/lib/payment-icon-presets'
import { effectiveIconBackgroundFromViz, resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import { CATEGORY_FORM_OPTIONS } from '@/lib/subscription-labels'
import { DEFAULT_SUBCURO_VIZ } from '@/lib/subscription-viz-notes'
import { searchCatalog, type ServiceEntry } from '@/lib/service-catalog'
import { createSubscription } from './subscriptions/actions'
import PaymentServiceIcon from './PaymentServiceIcon'
import type { BillingCycle } from '@/lib/supabase/types'

const CURRENCIES = ['RUB', 'USD', 'EUR'] as const

type Props = {
  open: boolean
  onClose: () => void
  defaultCurrency: string
}

export default function AddPaymentModal({ open, onClose, defaultCurrency }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('299')
  const [currency, setCurrency] = useState(() =>
    CURRENCIES.includes(defaultCurrency as (typeof CURRENCIES)[number]) ? defaultCurrency : 'RUB',
  )
  const [categorySlug, setCategorySlug] = useState('other')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [customIntervalDays, setCustomIntervalDays] = useState('30')
  const [chargeDate, setChargeDate] = useState(today)
  const [icon, setIcon] = useState('payments')

  const [suggestions, setSuggestions] = useState<ServiceEntry[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  function handleNameChange(val: string) {
    setName(val)
    const results = searchCatalog(val)
    setSuggestions(results)
    setShowSuggestions(results.length > 0 && val.length >= 2)
  }

  function applySuggestion(entry: ServiceEntry) {
    setName(entry.name)
    setAmount(String(entry.amount))
    setCurrency(CURRENCIES.includes(entry.currency as (typeof CURRENCIES)[number]) ? entry.currency : 'RUB')
    setCategorySlug(entry.category_slug)
    setBillingCycle(entry.billing_cycle)
    setIcon(entry.icon)
    setSuggestions([])
    setShowSuggestions(false)
    nameRef.current?.focus()
  }

  const resetForm = () => {
    setName('')
    setAmount('299')
    const cur = CURRENCIES.includes(defaultCurrency as (typeof CURRENCIES)[number])
      ? defaultCurrency
      : 'RUB'
    setCurrency(cur)
    setCategorySlug('other')
    setBillingCycle('monthly')
    setCustomIntervalDays('30')
    setChargeDate(new Date().toISOString().slice(0, 10))
    setIcon('payments')
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!open) return null

  const amountLabel =
    currency === 'RUB' ? 'Сумма, ₽' : currency === 'USD' ? 'Сумма, $' : 'Сумма, €'
  const listPreviewIcon = resolveSubscriptionIconDisplay(null, icon || 'payments', categorySlug)

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-payment-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(26,26,61,0.35)] cursor-default border-0"
        aria-label="Закрыть"
        onClick={handleClose}
      />
      <div className="relative z-[1] w-[min(560px,100%)] max-h-[min(92vh,720px)] overflow-y-auto rounded-[18px] bg-white px-[22px] pb-5 pt-6 shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
        <button
          type="button"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-[10px] border-0 bg-[#f4f4f6] text-[22px] leading-none text-[#6b6b80] hover:bg-[#ececee]"
          aria-label="Закрыть"
          onClick={handleClose}
        >
          ×
        </button>

        <h2 id="add-payment-modal-title" className="m-0 mb-2.5 text-[1.15rem] font-bold text-[#1a1a2e]">
          Новый платёж
        </h2>
        <p className="m-0 mb-4 text-sm leading-snug text-[#6b6b80]">
          Выберите категорию и заполните данные — строка в списке обновится после сохранения.
        </p>

        <form action={createSubscription} className="space-y-3">
          <input type="hidden" name="after_create" value="payments" />
          <input type="hidden" name="currency" value={currency} />
          <input type="hidden" name="first_charge_date" value={chargeDate} />
          <input type="hidden" name="next_charge_date" value={chargeDate} />
          <input type="hidden" name="renewal_type" value="auto_renew" />
          <input type="hidden" name="icon" value={icon} />
          <input type="hidden" name="billing_interval" value="1" />
          <input type="hidden" name="custom_interval_days" value={billingCycle === 'custom' ? customIntervalDays : ''} />

          <div className="relative mb-3">
            <label className="block text-xs font-medium text-[#6b6b80]">
              Название сервиса
              <input
                ref={nameRef}
                name="name"
                required
                minLength={2}
                maxLength={60}
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                autoComplete="off"
                placeholder="Начни вводить — например, Spotify…"
                className="mt-1.5 block w-full rounded-[10px] border border-[rgba(26,26,61,0.08)] px-3 py-2.5 text-sm text-[#1a1a2e] font-[inherit] box-border"
              />
            </label>
            {showSuggestions && (
              <ul className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border border-[rgba(26,26,61,0.12)] bg-white shadow-[0_8px_24px_rgba(26,26,61,0.14)] overflow-hidden">
                {suggestions.map((entry) => {
                  const sugIcon = resolveSubscriptionIconDisplay(null, entry.icon, entry.category_slug)
                  return (
                    <li key={entry.name}>
                      <button
                        type="button"
                        onMouseDown={() => applySuggestion(entry)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f8f6f2] transition-colors"
                      >
                        <PaymentServiceIcon
                          icon={entry.icon}
                          categorySlug={entry.category_slug}
                          iconBg={sugIcon.iconBg}
                          shape={sugIcon.shape}
                          size={32}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1a1a2e]">{entry.name}</p>
                          <p className="text-xs text-[#6b6b80]">
                            {entry.amount > 0
                              ? `${entry.amount.toLocaleString('ru-RU')} ${entry.currency} · `
                              : ''}
                            {entry.billing_cycle === 'monthly'
                              ? 'в месяц'
                              : entry.billing_cycle === 'yearly'
                              ? 'в год'
                              : entry.billing_cycle === 'quarterly'
                              ? 'раз в квартал'
                              : entry.billing_cycle === 'weekly'
                              ? 'в неделю'
                              : entry.billing_cycle}
                          </p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <label className="mb-3 block text-xs font-medium text-[#6b6b80]">
            <span>{amountLabel}</span>
            <input
              name="amount"
              type="number"
              min={0}
              step={1}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5 block w-full rounded-[10px] border border-[rgba(26,26,61,0.08)] px-3 py-2.5 text-sm text-[#1a1a2e] font-[inherit] box-border"
            />
          </label>

          <span className="mb-1 block text-xs font-medium text-[#6b6b80]">Валюта</span>
          <div className="mb-3 flex flex-wrap gap-2.5" role="group" aria-label="Валюта">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`inline-flex items-center gap-2 rounded-full border px-[18px] py-3 text-[13px] font-medium shadow-[0_2px_8px_rgba(26,26,61,0.06)] transition-colors ${
                  currency === c
                    ? 'border-[#0d9f6e] bg-[#0d9f6e] text-white shadow-[0_4px_14px_rgba(13,159,110,0.35)]'
                    : 'border-[rgba(26,26,61,0.08)] bg-white text-[#6b6b80] hover:border-[#7b61ff] hover:text-[#5b43d4]'
                }`}
              >
                <span className={`text-[13px] font-bold ${currency === c ? 'opacity-100' : 'opacity-35'}`}>✓</span>
                {c}
              </button>
            ))}
          </div>

          <label className="mb-3 block text-xs font-medium text-[#6b6b80]">
            Категория
            <select
              name="category_slug"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="mt-1.5 block w-full rounded-[10px] border border-[rgba(26,26,61,0.08)] px-3 py-2.5 text-sm text-[#1a1a2e] font-[inherit] box-border bg-white"
            >
              {CATEGORY_FORM_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-3 block text-xs font-medium text-[#6b6b80]">
            Цикл оплаты
            <select
              name="billing_cycle"
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
              className="mt-1.5 block w-full rounded-[10px] border border-[rgba(26,26,61,0.08)] px-3 py-2.5 text-sm text-[#1a1a2e] font-[inherit] box-border bg-white"
            >
              <option value="weekly">Еженедельно</option>
              <option value="monthly">Ежемесячно</option>
              <option value="quarterly">Ежеквартально</option>
              <option value="yearly">Ежегодно</option>
              <option value="custom">Свой интервал</option>
            </select>
          </label>
          {billingCycle === 'custom' ? (
            <label className="mb-3 block text-xs font-medium text-[#6b6b80]">
              Интервал в днях
              <input
                name="custom_interval_days_visible"
                type="number"
                min={1}
                step={1}
                required
                value={customIntervalDays}
                onChange={(e) => setCustomIntervalDays(e.target.value)}
                className="mt-1.5 block w-full rounded-[10px] border border-[rgba(26,26,61,0.08)] px-3 py-2.5 text-sm text-[#1a1a2e] font-[inherit] box-border"
              />
            </label>
          ) : null}

          <label className="mb-3 block text-xs font-medium text-[#6b6b80]">
            Следующее списание
            <input
              type="date"
              required
              value={chargeDate}
              onChange={(e) => setChargeDate(e.target.value)}
              className="mt-1.5 block w-full rounded-[10px] border border-[rgba(26,26,61,0.08)] px-3 py-2.5 text-sm text-[#1a1a2e] font-[inherit] box-border"
            />
          </label>

          <span className="mb-1 block text-xs font-medium text-[#6b6b80]">Иконка</span>
          <div className="mb-2 grid max-h-[220px] grid-cols-6 gap-2 overflow-y-auto rounded-[14px] border border-[rgba(26,26,61,0.08)] bg-[#fafafa] p-2 sm:grid-cols-7">
            {PAYMENT_ICON_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                onClick={() => setIcon(p.id)}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-colors ${
                  icon === p.id ? 'border-[#5b43d4] bg-[#f5f0ff]' : 'border-transparent bg-white hover:bg-[#f0f0f4]'
                }`}
              >
                <PaymentServiceIcon
                  icon={p.id}
                  categorySlug={categorySlug}
                  iconBg={icon === p.id ? effectiveIconBackgroundFromViz(DEFAULT_SUBCURO_VIZ, categorySlug) : p.bg}
                  shape={icon === p.id ? DEFAULT_SUBCURO_VIZ.shape : 'rounded'}
                  size={36}
                />
              </button>
            ))}
          </div>
          <input
            type="text"
            maxLength={48}
            value={icon}
            onChange={(e) => setIcon(e.target.value.trim())}
            placeholder="Или id пресета (например music)"
            className="mb-3 block w-full rounded-[10px] border border-[rgba(26,26,61,0.08)] px-3 py-2 text-sm text-[#1a1a2e] font-[inherit] box-border"
          />

          <span className="mb-1 block text-xs font-medium text-[#6b6b80]">Предпросмотр в списке</span>
          <div className="mb-4 rounded-xl border border-[rgba(26,26,61,0.08)] bg-[#f6f6f9] px-3.5 py-3">
            <div className="flex items-center gap-2.5 text-sm">
              <PaymentServiceIcon
                icon={icon || 'payments'}
                categorySlug={categorySlug}
                iconBg={listPreviewIcon.iconBg}
                shape={listPreviewIcon.shape}
                size={36}
              />
              <span className="min-w-0 flex-1 truncate font-semibold text-[#1a1a2e]">
                {name.trim() || 'Название'}
              </span>
              <span className="text-[#6b6b80]">·</span>
              <span className="shrink-0 font-medium tabular-nums text-[#1a1a2e]">
                {amount || '0'} {currency}
              </span>
              <span className="text-[#6b6b80] text-lg">›</span>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="h-11 rounded-xl border border-[rgba(26,26,61,0.08)] bg-white px-[18px] text-sm font-medium text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] hover:bg-[#fafafa]"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="h-11 rounded-xl border-0 bg-[#0d9f6e] px-5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(13,159,110,0.35)] hover:brightness-105"
            >
              Добавить
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
