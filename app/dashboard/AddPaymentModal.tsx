'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { PAYMENT_ICON_PRESETS } from '@/lib/payment-icon-presets'
import { effectiveIconBackgroundFromViz, resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import { BILLING_FORM_OPTIONS, CATEGORY_FORM_OPTIONS } from '@/lib/subscription-labels'
import { DEFAULT_SUBCURO_VIZ } from '@/lib/subscription-viz-notes'
import {
  searchSubscriptionTemplates,
  type SubscriptionPlanTemplate,
  type SubscriptionTemplate,
} from '@/lib/subscription-templates'
import { advanceBillingDate } from '@/lib/billing-engine'
import { createSubscription } from './subscriptions/actions'
import PaymentServiceIcon from './PaymentServiceIcon'
import type { BillingCycle, BillingType } from '@/lib/supabase/types'

// Temporarily limited to RUB/USD/EUR until mobile supports more currencies
// (shared Supabase DB; mobile only has RUB/USD/EUR conversion rates). The
// init/template guards below already fall back to RUB for anything else.
const CURRENCIES = [
  { code: 'RUB', label: '🇷🇺 RUB — рубль' },
  { code: 'USD', label: '🇺🇸 USD — доллар' },
  { code: 'EUR', label: '🇪🇺 EUR — евро' },
]

function calcNextDate(firstDate: string, cycle: string, customDays: number): string {
  if (!firstDate) return ''
  try {
    return advanceBillingDate(
      firstDate,
      cycle as Parameters<typeof advanceBillingDate>[1],
      1,
      cycle === 'custom' ? customDays : null,
    )
  } catch {
    return ''
  }
}

function formatDateRu(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function billingCycleLabel(cycle: string): string {
  switch (cycle) {
    case 'monthly': return 'в месяц'
    case 'yearly': return 'в год'
    case 'quarterly': return 'раз в квартал'
    case 'weekly': return 'в неделю'
    case 'one_time': return 'разово'
    default: return ''
  }
}

/** Текстовое представление суммы тарифа с учётом её надёжности (от/≈/промо). */
function formatPlanAmount(plan: SubscriptionPlanTemplate): string {
  if (plan.amount == null) return ''
  const amountStr = plan.amount.toLocaleString('ru-RU')
  const currencyStr = plan.currency ?? ''
  const cycleLabel = billingCycleLabel(plan.billing_cycle)
  const prefix = plan.amount_type === 'from' ? 'от '
    : plan.amount_type === 'approximate' ? '≈'
    : plan.amount_type === 'promo' ? 'промо: '
    : ''
  return `${prefix}${amountStr} ${currencyStr}${cycleLabel ? ` · ${cycleLabel}` : ''}`.trim()
}

/** Подпись цены в списке подсказок автокомплита. */
function suggestionPriceLabel(template: SubscriptionTemplate): string {
  const plan = template.plans[0]
  if (template.payment_model === 'free') return 'бесплатно'
  if (template.payment_model === 'license') return 'разовая покупка'
  if (!plan || plan.amount == null) return 'цена зависит от региона'
  return formatPlanAmount(plan)
}

type Props = {
  open: boolean
  onClose: () => void
  defaultCurrency: string
}

const inputCls = 'mt-1.5 block w-full rounded-[10px] border border-[rgba(26,26,61,0.08)] px-3 py-2.5 text-sm text-[#1a1a2e] font-[inherit] box-border bg-white focus:outline-none focus:ring-2 focus:ring-[#5b43d4]/30 focus:border-[#5b43d4]'
const labelCls = 'block text-sm text-[#6b6b80] mb-1'

export default function AddPaymentModal({ open, onClose, defaultCurrency }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const initCurrency = CURRENCIES.some(c => c.code === defaultCurrency) ? defaultCurrency : 'RUB'

  const [name, setName] = useState('')
  const [billingType, setBillingType] = useState<BillingType>('paid')
  const [amount, setAmount] = useState('299')
  const [priceAfterTrial, setPriceAfterTrial] = useState('')
  const [trialDate, setTrialDate] = useState('')
  const [currency, setCurrency] = useState(initCurrency)
  const [categorySlug, setCategorySlug] = useState('other')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [customDays, setCustomDays] = useState(30)
  const [firstDate, setFirstDate] = useState(today)
  const [icon, setIcon] = useState('payments')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const showAmount = billingType === 'paid' || billingType === 'one_time'
  const showCycleAndRenewal = billingType === 'paid'
  const firstDateLabel =
    billingType === 'one_time' ? 'Дата платежа'
    : billingType === 'free' ? 'Дата начала использования'
    : 'Дата первого списания'

  function handleBillingTypeChange(next: BillingType) {
    setBillingType(next)
    if (next === 'free' || next === 'trial') setAmount('0')
    if (next === 'paid' || next === 'one_time') setPriceAfterTrial('')
    if (next !== 'trial') { setTrialDate(''); setPriceAfterTrial('') }
  }

  const BILLING_TYPE_OPTIONS: { value: BillingType; label: string }[] = [
    { value: 'paid', label: 'Платный' },
    { value: 'free', label: 'Бесплатный' },
    { value: 'trial', label: 'Пробный период' },
    { value: 'one_time', label: 'Разовый платёж' },
  ]

  const [suggestions, setSuggestions] = useState<SubscriptionTemplate[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<SubscriptionTemplate | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const nextDate = useMemo(
    () => calcNextDate(firstDate, billingCycle, customDays),
    [firstDate, billingCycle, customDays],
  )

  // Подсказки про выбранный сервис: показываем рядом с полем «Сумма», когда
  // мы не уверены в цене, чтобы пользователь не доверял автоподстановке вслепую.
  const templateHint = useMemo(() => {
    if (!selectedTemplate) return null
    const mainPlan = selectedTemplate.plans[0]
    const hasKnownAmount = mainPlan != null && mainPlan.amount != null && mainPlan.amount > 0
    return {
      isLicense: selectedTemplate.payment_model === 'license',
      isFree: selectedTemplate.payment_model === 'free',
      multiSource: (mainPlan?.payment_sources?.length ?? 0) > 1,
      approxLabel: !selectedTemplate.should_autofill_amount && hasKnownAmount && mainPlan
        ? formatPlanAmount(mainPlan)
        : null,
      warning: selectedTemplate.user_warning
        ?? (!selectedTemplate.should_autofill_amount && hasKnownAmount
          ? 'Цена может отличаться. Проверьте сумму списания.'
          : null),
    }
  }, [selectedTemplate])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  function handleNameChange(val: string) {
    setName(val)
    setSelectedTemplate(null)
    const results = searchSubscriptionTemplates(val)
    setSuggestions(results)
    setShowSuggestions(results.length > 0 && val.length >= 2)
  }

  function applySuggestion(template: SubscriptionTemplate) {
    setName(template.display_name)
    setCategorySlug(template.category_slug)
    setIcon(template.icon)

    const mainPlan = template.plans[0]

    // Период списания подставляем, только если он определён и это не разовая
    // покупка — иначе оставляем выбор пользователю.
    if (mainPlan && mainPlan.billing_cycle !== 'unknown' && mainPlan.billing_cycle !== 'one_time') {
      setBillingCycle(mainPlan.billing_cycle as BillingCycle)
    }

    // Сумму подставляем только когда автоподстановка явно разрешена —
    // это гарантирует валидатор (фиксированная цена, проверенный регион).
    if (template.should_autofill_amount && mainPlan?.amount != null) {
      setAmount(String(mainPlan.amount))
      if (mainPlan.currency) {
        setCurrency(CURRENCIES.some(c => c.code === mainPlan.currency) ? mainPlan.currency : 'RUB')
      }
    } else if (template.payment_model === 'free') {
      if (window.confirm('Это бесплатный сервис. Добавить без расходов?')) {
        setAmount('0')
      }
    }
    // В остальных случаях сумму не трогаем — рядом покажем подсказку
    // с ориентировочной ценой и предупреждением (см. templateHint).

    setSelectedTemplate(template)
    setSuggestions([])
    setShowSuggestions(false)
    nameRef.current?.focus()
  }

  function resetForm() {
    setName('')
    setBillingType('paid')
    setAmount('299')
    setPriceAfterTrial('')
    setTrialDate('')
    setCurrency(initCurrency)
    setCategorySlug('other')
    setBillingCycle('monthly')
    setCustomDays(30)
    setFirstDate(new Date().toISOString().slice(0, 10))
    setIcon('payments')
    setShowAdvanced(false)
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedTemplate(null)
  }

  const handleClose = () => { resetForm(); onClose() }

  if (!open) return null

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
      <div className="relative z-[1] w-[min(560px,100%)] max-h-[min(92vh,760px)] overflow-y-auto rounded-[18px] bg-white px-[22px] pb-5 pt-6 shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
        <button
          type="button"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-[10px] border-0 bg-[#f4f4f6] text-[22px] leading-none text-[#6b6b80] hover:bg-[#ececee]"
          aria-label="Закрыть"
          onClick={handleClose}
        >
          ×
        </button>

        <h2 id="add-payment-modal-title" className="m-0 mb-5 text-[1.15rem] font-bold text-[#1a1a2e]">
          Новый платёж
        </h2>

        <form action={createSubscription} className="space-y-4">
          <input type="hidden" name="after_create" value="payments" />
          <input type="hidden" name="billing_type" value={billingType} />
          <input type="hidden" name="currency" value={currency} />
          <input type="hidden" name="first_charge_date" value={firstDate} />
          <input type="hidden" name="next_charge_date" value={nextDate || firstDate} />
          <input type="hidden" name="icon" value={icon} />
          <input type="hidden" name="billing_interval" value="1" />
          {!showCycleAndRenewal && <input type="hidden" name="billing_cycle" value="monthly" />}
          {!showCycleAndRenewal && <input type="hidden" name="renewal_type" value="auto_renew" />}
          {billingCycle !== 'custom'
            ? <input type="hidden" name="custom_interval_days" value="" />
            : null}
          {billingType !== 'trial' && <input type="hidden" name="free_trial_end_date" value="" />}
          {billingType !== 'trial' && <input type="hidden" name="price_after_trial" value="" />}

          {/* ── Название + автокомплит ─────────────────────────────────────── */}
          <div className="relative">
            <label className={labelCls}>Название</label>
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
              className={inputCls}
            />
            {showSuggestions && (
              <ul className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border border-[rgba(26,26,61,0.12)] bg-white shadow-[0_8px_24px_rgba(26,26,61,0.14)] overflow-hidden">
                {suggestions.map((template) => {
                  const sugIcon = resolveSubscriptionIconDisplay(null, template.icon, template.category_slug)
                  return (
                    <li key={template.id}>
                      <button
                        type="button"
                        onMouseDown={() => applySuggestion(template)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f8f6f2] transition-colors"
                      >
                        <PaymentServiceIcon
                          icon={template.icon}
                          categorySlug={template.category_slug}
                          iconBg={sugIcon.iconBg}
                          shape={sugIcon.shape}
                          size={32}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1a1a2e]">{template.display_name}</p>
                          <p className="text-xs text-[#6b6b80]">
                            {suggestionPriceLabel(template)}
                          </p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* ── Тип платежа ────────────────────────────────────────────────── */}
          <div>
            <span className={labelCls}>Тип платежа</span>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {BILLING_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleBillingTypeChange(opt.value)}
                  className={`rounded-[10px] border px-3 py-1.5 text-sm font-medium transition-colors ${
                    billingType === opt.value
                      ? 'border-[#5b43d4] bg-[#ede9fc] text-[#5b43d4]'
                      : 'border-[rgba(26,26,61,0.08)] bg-white text-[#6b6b80] hover:bg-[#f8f6f2]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Сумма + Валюта ─────────────────────────────────────────────── */}
          {showAmount ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Сумма</label>
                <input
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputCls}
                  placeholder="599"
                />
              </div>
              <div>
                <label className={labelCls}>Валюта</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={inputCls}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                  {!CURRENCIES.some(c => c.code === currency) && (
                    <option value={currency}>{currency}</option>
                  )}
                </select>
              </div>
            </div>
          ) : (
            <>
              <input type="hidden" name="amount" value="0" />
              {billingType === 'trial' && (
                <div>
                  <label className={labelCls}>Валюта</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={inputCls}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                    {!CURRENCIES.some(c => c.code === currency) && (
                      <option value={currency}>{currency}</option>
                    )}
                  </select>
                </div>
              )}
            </>
          )}

          {templateHint && (templateHint.warning || templateHint.approxLabel || templateHint.isLicense || templateHint.isFree || templateHint.multiSource) && (
            <div className="-mt-1.5 space-y-1 rounded-[10px] bg-[#f8f6f2] px-3 py-2.5 text-xs text-[#6b6b80]">
              {templateHint.isLicense && (
                <p>Это разовая покупка, а не регулярная подписка — проверьте период списания ниже.</p>
              )}
              {templateHint.isFree && (
                <p>Это бесплатный сервис — обычно по нему не должно быть регулярных списаний.</p>
              )}
              {templateHint.approxLabel && (
                <p>Ориентировочная цена: <span className="font-medium text-[#1a1a2e]">{templateHint.approxLabel}</span></p>
              )}
              {templateHint.multiSource && (
                <p>Способ отмены зависит от того, где оформлена подписка (магазин приложений, сайт, оператор и т.д.).</p>
              )}
              {templateHint.warning && (
                <p>⚠️ {templateHint.warning}</p>
              )}
            </div>
          )}

          {/* ── Trial-specific fields ─────────────────────────────────────── */}
          {billingType === 'trial' && (
            <>
              <div>
                <label className={labelCls}>Пробный период до</label>
                <input
                  name="free_trial_end_date"
                  type="date"
                  required
                  value={trialDate}
                  onChange={(e) => setTrialDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Цена после пробного периода</label>
                <input
                  name="price_after_trial"
                  type="text"
                  inputMode="decimal"
                  required
                  value={priceAfterTrial}
                  onChange={(e) => setPriceAfterTrial(e.target.value)}
                  className={inputCls}
                  placeholder="599"
                />
                <p className="mt-1 text-xs text-[#6b6b80]">
                  SubCuro напомнит до первого списания после пробного периода.
                </p>
              </div>
            </>
          )}

          {/* ── Категория ─────────────────────────────────────────────────── */}
          <div>
            <label className={labelCls}>Категория</label>
            <select
              name="category_slug"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className={inputCls}
            >
              {CATEGORY_FORM_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* ── Период списания ────────────────────────────────────────────── */}
          {showCycleAndRenewal && (
            <>
              <div>
                <label className={labelCls}>Период списания</label>
                <select
                  name="billing_cycle"
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                  className={inputCls}
                >
                  {BILLING_FORM_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              {billingCycle === 'custom' && (
                <div>
                  <label className={labelCls}>Дней между списаниями</label>
                  <input
                    name="custom_interval_days"
                    type="number"
                    min={1}
                    value={customDays}
                    onChange={(e) => setCustomDays(Number(e.target.value) || 1)}
                    className={inputCls}
                    placeholder="30"
                  />
                </div>
              )}

              {/* ── Продление ─────────────────────────────────────────────────── */}
              <div>
                <label className={labelCls}>Продление</label>
                <select
                  name="renewal_type"
                  defaultValue="auto_renew"
                  className={inputCls}
                >
                  <option value="auto_renew">Автопродление</option>
                  <option value="manual">Вручную</option>
                </select>
              </div>
            </>
          )}

          {/* ── Дата первого/единственного/начала ─────────────────────────── */}
          <div className="space-y-1.5">
            <label className={labelCls}>{firstDateLabel}</label>
            <input
              type="date"
              required
              value={firstDate}
              onChange={(e) => setFirstDate(e.target.value)}
              className={inputCls}
            />
            {nextDate && showCycleAndRenewal && (
              <p className="text-xs text-[#6b6b80] flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#5b43d4]" />
                Следующее списание:&nbsp;
                <span className="font-medium text-[#1a1a2e]">{formatDateRu(nextDate)}</span>
              </p>
            )}
          </div>

          {/* ── Дополнительно (с иконкой) ─────────────────────────────────── */}
          <div className="rounded-xl border border-[rgba(26,26,61,0.08)] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[#6b6b80] hover:bg-[#f8f6f2] transition-colors"
            >
              <span className="font-medium">Дополнительно</span>
              <span className="text-xs">{showAdvanced ? '▲' : '▼'}</span>
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4 pt-2 space-y-4 border-t border-[rgba(26,26,61,0.06)]">
                {/* Предпросмотр */}
                <div className="rounded-xl border border-[rgba(26,26,61,0.08)] bg-[#f6f6f9] px-3.5 py-3">
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
                    <span className="shrink-0 font-medium tabular-nums text-[#1a1a2e]">
                      {amount || '0'} {currency}
                    </span>
                  </div>
                </div>

                {/* Иконки */}
                <div>
                  <p className="text-xs font-medium text-[#6b6b80] mb-2">Иконка</p>
                  <div className="grid max-h-[200px] grid-cols-6 gap-2 overflow-y-auto rounded-[12px] border border-[rgba(26,26,61,0.08)] bg-[#fafafa] p-2 sm:grid-cols-7">
                    {PAYMENT_ICON_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        title={p.label}
                        onClick={() => setIcon(p.id)}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-colors ${
                          icon === p.id ? 'border-[#5b43d4] bg-[#f5f0ff]' : 'border-transparent bg-white hover:bg-[#f0f0f4]'
                        }`}
                      >
                        <PaymentServiceIcon
                          icon={p.id}
                          categorySlug={categorySlug}
                          iconBg={icon === p.id ? effectiveIconBackgroundFromViz(DEFAULT_SUBCURO_VIZ, categorySlug) : p.bg}
                          shape={icon === p.id ? DEFAULT_SUBCURO_VIZ.shape : 'rounded'}
                          size={32}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Кнопки ────────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="h-11 rounded-xl border border-[rgba(26,26,61,0.08)] bg-white px-[18px] text-sm font-medium text-[#1a1a2e] hover:bg-[#fafafa]"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="h-11 rounded-xl border-0 bg-[#5b43d4] px-5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(91,67,212,0.35)] hover:brightness-105"
            >
              Добавить
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
