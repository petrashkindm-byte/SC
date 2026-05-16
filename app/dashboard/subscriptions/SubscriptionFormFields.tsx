'use client'

import { useRef, useState } from 'react'
import type { Subscription } from '@/lib/supabase/types'
import { coerceNumber } from '@/lib/coerce-number'
import PaymentServiceIcon from '@/app/dashboard/PaymentServiceIcon'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import { BILLING_FORM_OPTIONS, CATEGORY_FORM_OPTIONS } from '@/lib/subscription-labels'
import { resolvePaymentIconIdForDisplay } from '@/lib/payment-icon-presets'
import { searchCatalog, type ServiceEntry } from '@/lib/service-catalog'

type Props = {
  /** Если передан — форма редактирования (скрытое поле id). */
  subscription?: Subscription
  /** Для новой подписки — валюта по умолчанию из настроек. */
  defaultCurrency?: string
  error?: string | null
  /** Server action для submit */
  action: (formData: FormData) => void
  submitLabel: string
}

export default function SubscriptionFormFields({
  subscription,
  defaultCurrency = 'RUB',
  error,
  action,
  submitLabel,
}: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const sub = subscription

  const amountStr = sub ? String(coerceNumber(sub.amount)) : ''
  const firstDate = sub ? sub.first_charge_date.slice(0, 10) : today
  const nextDate = sub ? sub.next_charge_date.slice(0, 10) : today
  const trialDate = sub?.free_trial_end_date ? sub.free_trial_end_date.slice(0, 10) : ''

  // ── Автокомплит ──
  const [suggestions, setSuggestions] = useState<ServiceEntry[]>([])
  const [nameValue, setNameValue] = useState(sub?.name ?? '')
  const [amountValue, setAmountValue] = useState(amountStr)
  const [currencyValue, setCurrencyValue] = useState(sub?.currency ?? defaultCurrency)
  const [categoryValue, setCategoryValue] = useState(sub?.category_slug ?? 'other')
  const [cycleValue, setCycleValue] = useState(sub?.billing_cycle ?? 'monthly')
  const [iconValue, setIconValue] = useState(
    sub ? resolvePaymentIconIdForDisplay(sub.icon, sub.category_slug) : '',
  )
  const nameRef = useRef<HTMLInputElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  function handleNameChange(val: string) {
    setNameValue(val)
    if (!sub) {
      // Только для новых подписок
      const results = searchCatalog(val)
      setSuggestions(results)
      setShowSuggestions(results.length > 0 && val.length >= 2)
    }
  }

  function applySuggestion(entry: ServiceEntry) {
    setNameValue(entry.name)
    setAmountValue(String(entry.amount))
    setCurrencyValue(entry.currency)
    setCategoryValue(entry.category_slug)
    setCycleValue(entry.billing_cycle)
    setIconValue(entry.icon)
    setSuggestions([])
    setShowSuggestions(false)
    nameRef.current?.focus()
  }

  return (
    <form action={action} className="space-y-6 max-w-lg rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
      {sub ? <input type="hidden" name="subscription_id" value={sub.id} /> : null}

      {error ? (
        <p className="rounded-lg bg-[#fdecec] border border-[#f3c5c7] text-[#e5484d] text-sm px-4 py-3">
          {error}
        </p>
      ) : null}

      <div className="relative">
        <label className="block text-sm text-[#6b6b80] mb-1">Название</label>
        <input
          ref={nameRef}
          name="name"
          required
          minLength={2}
          value={nameValue}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
          placeholder="Начни вводить — например, Spotify…"
          autoComplete="off"
        />
        {showSuggestions && (
          <ul className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border border-[#e7e3dc] bg-white shadow-[0_8px_24px_rgba(26,26,61,0.12)] overflow-hidden">
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
                      {entry.amount.toLocaleString('ru-RU')} {entry.currency} · {entry.billing_cycle === 'monthly' ? 'в месяц' : entry.billing_cycle === 'yearly' ? 'в год' : entry.billing_cycle}
                    </p>
                  </div>
                </button>
              </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[#6b6b80] mb-1">Сумма</label>
          <input
            name="amount"
            type="text"
            inputMode="decimal"
            required
            value={amountValue}
            onChange={(e) => setAmountValue(e.target.value)}
            className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
            placeholder="599"
          />
        </div>
        <div>
          <label className="block text-sm text-[#6b6b80] mb-1">Валюта (ISO)</label>
          <input
            name="currency"
            type="text"
            maxLength={3}
            value={currencyValue}
            onChange={(e) => setCurrencyValue(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm uppercase"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-[#6b6b80] mb-1">Категория</label>
        <select
          name="category_slug"
          value={categoryValue}
          onChange={(e) => setCategoryValue(e.target.value as typeof categoryValue)}
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
        >
          {CATEGORY_FORM_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-[#6b6b80] mb-1">Период списания</label>
        <select
          name="billing_cycle"
          value={cycleValue}
          onChange={(e) => setCycleValue(e.target.value as typeof cycleValue)}
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
        >
          {BILLING_FORM_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-[#6b6b80] mb-1">Дней между списаниями (только «Свой интервал»)</label>
        <input
          name="custom_interval_days"
          type="number"
          min={1}
          defaultValue={sub?.custom_interval_days ?? ''}
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
          placeholder="14"
        />
      </div>

      <div>
        <label className="block text-sm text-[#6b6b80] mb-1">Продление</label>
        <select
          name="renewal_type"
          defaultValue={sub?.renewal_type ?? 'auto_renew'}
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
        >
          <option value="auto_renew">Автопродление</option>
          <option value="manual">Вручную</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[#6b6b80] mb-1">Первое списание</label>
          <input
            name="first_charge_date"
            type="date"
            required
            defaultValue={firstDate}
            className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-[#6b6b80] mb-1">Следующее списание</label>
          <input
            name="next_charge_date"
            type="date"
            required
            defaultValue={nextDate}
            className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-[#6b6b80] mb-1">Конец пробного периода (необязательно)</label>
        <input
          name="free_trial_end_date"
          type="date"
          defaultValue={trialDate}
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-[#6b6b80] mb-1">Страница с тарифами</label>
        <input
          name="pricing_url"
          type="url"
          defaultValue={sub?.pricing_url ?? ''}
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
          placeholder="https://..."
        />
        <p className="mt-1 text-xs text-[#9b9bab]">Публичная страница с ценами — система будет отслеживать изменение цены</p>
      </div>

      <div>
        <label className="block text-sm text-[#6b6b80] mb-1">Ссылка на отмену</label>
        <input
          name="cancellation_url"
          type="url"
          defaultValue={sub?.cancellation_url ?? ''}
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-sm text-[#6b6b80] mb-1">Ссылка в кабинет / управление</label>
        <input
          name="management_url"
          type="url"
          defaultValue={sub?.management_url ?? ''}
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-sm text-[#6b6b80] mb-1">Иконка (id пресета, необязательно)</label>
        <input
          name="icon"
          maxLength={48}
          value={iconValue}
          onChange={(e) => setIconValue(e.target.value)}
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
          placeholder="music"
        />
      </div>

      <div>
        <label className="block text-sm text-[#6b6b80] mb-1">Заметки</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={sub?.notes ?? ''}
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm resize-y"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-[#5b43d4] hover:bg-[#4b36b6] py-2.5 text-sm font-medium text-white"
      >
        {submitLabel}
      </button>
    </form>
  )
}
