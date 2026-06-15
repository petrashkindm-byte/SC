'use client'

import { useRef, useState, useMemo } from 'react'
import type { Subscription } from '@/lib/supabase/types'
import { coerceNumber } from '@/lib/coerce-number'
import PaymentServiceIcon from '@/app/dashboard/PaymentServiceIcon'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import { BILLING_FORM_OPTIONS, CATEGORY_FORM_OPTIONS } from '@/lib/subscription-labels'
import { resolvePaymentIconIdForDisplay } from '@/lib/payment-icon-presets'
import {
  searchSubscriptionTemplates,
  type SubscriptionPlanTemplate,
  type SubscriptionTemplate,
} from '@/lib/subscription-templates'
import { advanceBillingDate } from '@/lib/billing-engine'

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

// ── Currencies ────────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: 'RUB', label: '🇷🇺 RUB — рубль' },
  { code: 'USD', label: '🇺🇸 USD — доллар' },
  { code: 'EUR', label: '🇪🇺 EUR — евро' },
  { code: 'GBP', label: '🇬🇧 GBP — фунт' },
  { code: 'TRY', label: '🇹🇷 TRY — лира' },
  { code: 'CNY', label: '🇨🇳 CNY — юань' },
  { code: 'KZT', label: '🇰🇿 KZT — тенге' },
  { code: 'AMD', label: '🇦🇲 AMD — драм' },
  { code: 'GEL', label: '🇬🇪 GEL — лари' },
  { code: 'BYN', label: '🇧🇾 BYN — рубль (BY)' },
]

// ── Date helpers ──────────────────────────────────────────────────────────────
function calcNextDate(
  firstDate: string,
  cycle: string,
  customDays: number,
  trialDate: string,
): string {
  // If a trial end date is set, first charge happens on trial end date,
  // next charge = first charge + 1 period
  const base = trialDate || firstDate
  if (!base) return ''
  try {
    return advanceBillingDate(
      base,
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
  const initFirst = sub ? sub.first_charge_date.slice(0, 10) : today
  const initTrial = sub?.free_trial_end_date ? sub.free_trial_end_date.slice(0, 10) : ''

  // ── Controlled state ──────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<SubscriptionTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<SubscriptionTemplate | null>(null)
  const [nameValue, setNameValue] = useState(sub?.name ?? '')
  const [amountValue, setAmountValue] = useState(amountStr)
  const [currencyValue, setCurrencyValue] = useState(sub?.currency ?? defaultCurrency)
  const [categoryValue, setCategoryValue] = useState(sub?.category_slug ?? 'other')
  const [cycleValue, setCycleValue] = useState(sub?.billing_cycle ?? 'monthly')
  const [iconValue, setIconValue] = useState(
    sub ? resolvePaymentIconIdForDisplay(sub.icon, sub.category_slug) : '',
  )
  const [firstDate, setFirstDate] = useState(initFirst)
  const [trialDate, setTrialDate] = useState(initTrial)
  const [customDays, setCustomDays] = useState(sub?.custom_interval_days ?? 14)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Prefill URLs from suggestion
  const [cancelUrl, setCancelUrl] = useState(sub?.cancellation_url ?? '')
  const [manageUrl, setManageUrl] = useState(sub?.management_url ?? '')
  const [pricingUrl, setPricingUrl] = useState(sub?.pricing_url ?? '')

  const nameRef = useRef<HTMLInputElement>(null)

  // ── Auto-calculated next date ─────────────────────────────────────────────
  // next = first + 1 period (trial date doesn't affect this — first_charge_date
  // is already set to the trial-end date if the user has a trial)
  const nextDate = useMemo(
    () => calcNextDate(firstDate, cycleValue, Number(customDays), ''),
    [firstDate, cycleValue, customDays],
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

  // ── Autocomplete ──────────────────────────────────────────────────────────
  function handleNameChange(val: string) {
    setNameValue(val)
    setSelectedTemplate(null)
    if (!sub) {
      const results = searchSubscriptionTemplates(val)
      setSuggestions(results)
      setShowSuggestions(results.length > 0 && val.length >= 2)
    }
  }

  function applySuggestion(template: SubscriptionTemplate) {
    setNameValue(template.display_name)
    setCategoryValue(template.category_slug)
    setIconValue(template.icon)

    const mainPlan = template.plans[0]

    if (mainPlan && mainPlan.billing_cycle !== 'unknown' && mainPlan.billing_cycle !== 'one_time') {
      setCycleValue(mainPlan.billing_cycle as typeof cycleValue)
    }

    if (template.should_autofill_amount && mainPlan?.amount != null) {
      setAmountValue(String(mainPlan.amount))
      if (mainPlan.currency) setCurrencyValue(mainPlan.currency)
    } else if (template.payment_model === 'free') {
      if (window.confirm('Это бесплатный сервис. Добавить без расходов?')) {
        setAmountValue('0')
      }
    }
    // В остальных случаях сумму не трогаем — рядом покажем подсказку
    // с ориентировочной ценой и предупреждением (см. templateHint).

    if (template.cancellation_url) setCancelUrl(template.cancellation_url)
    if (template.management_url) setManageUrl(template.management_url)
    if (template.pricing_url) setPricingUrl(template.pricing_url)

    setSelectedTemplate(template)
    setSuggestions([])
    setShowSuggestions(false)
    nameRef.current?.focus()
  }

  const inputCls = 'w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#5b43d4]/30 focus:border-[#5b43d4]'
  const labelCls = 'block text-sm text-[#6b6b80] mb-1'

  return (
    <form
      action={action}
      className="space-y-5 max-w-lg rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]"
    >
      {sub ? <input type="hidden" name="subscription_id" value={sub.id} /> : null}

      {error ? (
        <p className="rounded-lg bg-[#fdecec] border border-[#f3c5c7] text-[#e5484d] text-sm px-4 py-3">
          {error}
        </p>
      ) : null}

      {/* ── 1. Name + autocomplete ─────────────────────────────────────────── */}
      <div className="relative">
        <label className={labelCls}>Название</label>
        <input
          ref={nameRef}
          name="name"
          required
          minLength={2}
          value={nameValue}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className={inputCls}
          placeholder="Начни вводить — например, Spotify…"
          autoComplete="off"
        />
        {showSuggestions && (
          <ul className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border border-[#e7e3dc] bg-white shadow-[0_8px_24px_rgba(26,26,61,0.12)] overflow-hidden">
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

      {/* ── 2. Amount + Currency ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Сумма</label>
          <input
            name="amount"
            type="text"
            inputMode="decimal"
            required
            value={amountValue}
            onChange={(e) => setAmountValue(e.target.value)}
            className={inputCls}
            placeholder="599"
          />
        </div>
        <div>
          <label className={labelCls}>Валюта</label>
          <select
            name="currency"
            value={currencyValue}
            onChange={(e) => setCurrencyValue(e.target.value)}
            className={inputCls}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
            {/* Keep unknown currencies selectable */}
            {!CURRENCIES.some((c) => c.code === currencyValue) && (
              <option value={currencyValue}>{currencyValue}</option>
            )}
          </select>
        </div>
      </div>

      {templateHint && (templateHint.warning || templateHint.approxLabel || templateHint.isLicense || templateHint.isFree || templateHint.multiSource) && (
        <div className="-mt-2 space-y-1 rounded-[10px] bg-[#f8f6f2] px-3 py-2.5 text-xs text-[#6b6b80]">
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

      {/* ── 3. Category ───────────────────────────────────────────────────── */}
      <div>
        <label className={labelCls}>Категория</label>
        <select
          name="category_slug"
          value={categoryValue}
          onChange={(e) => setCategoryValue(e.target.value as typeof categoryValue)}
          className={inputCls}
        >
          {CATEGORY_FORM_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── 4. Billing cycle ──────────────────────────────────────────────── */}
      <div>
        <label className={labelCls}>Период списания</label>
        <select
          name="billing_cycle"
          value={cycleValue}
          onChange={(e) => {
            setCycleValue(e.target.value as typeof cycleValue)
          }}
          className={inputCls}
        >
          {BILLING_FORM_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── 5. Custom interval (only for 'custom' cycle) ──────────────────── */}
      {cycleValue === 'custom' && (
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
      {/* Hidden custom_interval_days when cycle != custom — send empty so server ignores it */}
      {cycleValue !== 'custom' && (
        <input type="hidden" name="custom_interval_days" value="" />
      )}

      {/* ── 6. Renewal ────────────────────────────────────────────────────── */}
      <div>
        <label className={labelCls}>Продление</label>
        <select
          name="renewal_type"
          defaultValue={sub?.renewal_type ?? 'auto_renew'}
          className={inputCls}
        >
          <option value="auto_renew">Автопродление</option>
          <option value="manual">Вручную</option>
        </select>
      </div>

      {/* ── 7. First charge date ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className={labelCls}>Дата первого списания</label>
        <input
          name="first_charge_date"
          type="date"
          required
          value={firstDate}
          onChange={(e) => setFirstDate(e.target.value)}
          className={inputCls}
        />
        {/* Next charge date — auto-calculated, passed as hidden field */}
        <input type="hidden" name="next_charge_date" value={nextDate} />
        {nextDate && (
          <p className="text-xs text-[#6b6b80] flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#5b43d4]" />
            Следующее списание:&nbsp;<span className="font-medium text-[#1a1a2e]">{formatDateRu(nextDate)}</span>
          </p>
        )}
      </div>

      {/* ── 8. Trial period (optional, collapsible via advanced) ─────────── */}
      {/* Trial is shown inside Advanced, but it affects dates above */}

      {/* ── Advanced section ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#ece8e1] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[#6b6b80] hover:bg-[#f8f6f2] transition-colors"
        >
          <span className="font-medium">Дополнительно</span>
          <span className="text-xs">{showAdvanced ? '▲' : '▼'}</span>
        </button>
        {showAdvanced && (
          <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[#f0ece6]">
            {/* Trial period */}
            <div>
              <label className={labelCls}>Конец пробного периода (необязательно)</label>
              <input
                name="free_trial_end_date"
                type="date"
                value={trialDate}
                onChange={(e) => setTrialDate(e.target.value)}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-[#9b9bab]">
                Укажи, если есть бесплатный пробный период перед первым списанием
              </p>
            </div>

            {/* Pricing URL */}
            <div>
              <label className={labelCls}>Страница с тарифами</label>
              <input
                name="pricing_url"
                type="url"
                value={pricingUrl}
                onChange={(e) => setPricingUrl(e.target.value)}
                className={inputCls}
                placeholder="https://..."
              />
              <p className="mt-1 text-xs text-[#9b9bab]">
                Публичная страница с ценами — система будет отслеживать изменение цены
              </p>
            </div>

            {/* Cancellation URL */}
            <div>
              <label className={labelCls}>Ссылка на отмену</label>
              <input
                name="cancellation_url"
                type="url"
                value={cancelUrl}
                onChange={(e) => setCancelUrl(e.target.value)}
                className={inputCls}
                placeholder="https://..."
              />
            </div>

            {/* Management URL */}
            <div>
              <label className={labelCls}>Ссылка в кабинет / управление</label>
              <input
                name="management_url"
                type="url"
                value={manageUrl}
                onChange={(e) => setManageUrl(e.target.value)}
                className={inputCls}
                placeholder="https://..."
              />
              <p className="mt-1 text-xs text-[#9b9bab]">
                Необязательно · Откроется при нажатии «Управление подпиской»
              </p>
            </div>

            {/* Icon */}
            <div>
              <label className={labelCls}>Иконка (id пресета, необязательно)</label>
              <input
                name="icon"
                maxLength={48}
                value={iconValue}
                onChange={(e) => setIconValue(e.target.value)}
                className={inputCls}
                placeholder="music"
              />
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>Заметки</label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={sub?.notes ?? ''}
                className={inputCls + ' resize-y'}
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-[#5b43d4] hover:bg-[#4b36b6] py-2.5 text-sm font-medium text-white transition-colors"
      >
        {submitLabel}
      </button>
    </form>
  )
}
