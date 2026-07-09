import { coerceNumber } from '@/lib/coerce-number'
import type { Subscription } from '@/lib/supabase/types'
import { lookupRate, canConvert, STATIC_RATES, type RateMap } from '@/lib/rates'

// ─── Monthly normalization ────────────────────────────────────────────────────

/** Monthly cost of a subscription in its OWN currency (no conversion). */
export function getMonthlyAmount(sub: Subscription): number {
  const billingType = sub.billing_type ?? (Number(sub.amount) === 0 ? 'free' : 'paid')
  if (billingType === 'free' || billingType === 'trial' || billingType === 'one_time') return 0

  const amount = coerceNumber(sub.amount)
  const interval = Math.max(1, sub.billing_interval || 1)
  let monthly: number
  switch (sub.billing_cycle) {
    case 'weekly':    monthly = (amount * 4.33) / interval; break
    case 'monthly':   monthly = amount / interval; break
    case 'quarterly': monthly = amount / (3 * interval); break
    case 'yearly':    monthly = amount / (12 * interval); break
    case 'custom':    monthly = sub.custom_interval_days ? (amount / sub.custom_interval_days) * 30 : amount; break
    default:          monthly = amount
  }
  return Number.isFinite(monthly) ? monthly : 0
}

// ─── Conversion ───────────────────────────────────────────────────────────────

/**
 * Convert an amount from one currency to another.
 * Returns null when no rate is available — never silently convert or return 0.
 * null means "cannot calculate", not "zero cost".
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: RateMap = STATIC_RATES,
): number | null {
  if (from.toUpperCase() === to.toUpperCase()) return amount
  const rate = lookupRate(from, to, rates)
  if (rate === null) return null
  return amount * rate
}

/**
 * Resolve a subscription's currency, falling back to baseCurrency only for
 * legacy rows where currency is null/empty. Never falls back to hardcoded 'RUB'.
 */
export function resolveSubscriptionCurrency(
  subCurrency: string | null | undefined,
  baseCurrency: string,
): string {
  const c = subCurrency?.trim().toUpperCase()
  return c && c.length === 3 ? c : baseCurrency.toUpperCase()
}

// ─── Display ──────────────────────────────────────────────────────────────────

export interface DisplayAmount {
  amount: number
  currency: string
  /** true when amount was converted from a different currency — show ≈ prefix */
  isApproximate: boolean
  /** true when currency !== baseCurrency but no rate was available */
  conversionUnavailable: boolean
}

/**
 * Decide how to display a subscription's monthly cost.
 *
 * Rules:
 *  • same currency → exact amount, no ≈
 *  • different currency + rate exists → converted to baseCurrency, show ≈
 *  • different currency + no rate → original amount/currency + conversionUnavailable
 */
export function getDisplayAmount(
  sub: Subscription,
  baseCurrency: string,
  rates: RateMap = STATIC_RATES,
): DisplayAmount {
  const monthlyOriginal = getMonthlyAmount(sub)
  const from = resolveSubscriptionCurrency(sub.currency, baseCurrency)
  const to = baseCurrency.toUpperCase()

  if (from === to) {
    return { amount: monthlyOriginal, currency: to, isApproximate: false, conversionUnavailable: false }
  }

  const rate = lookupRate(from, to, rates)
  if (rate === null) {
    return { amount: monthlyOriginal, currency: from, isApproximate: false, conversionUnavailable: true }
  }

  return { amount: monthlyOriginal * rate, currency: to, isApproximate: true, conversionUnavailable: false }
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Format a monetary amount. `currency` is required — never infer it.
 * Prepends "≈ " when isApproximate is true.
 */
export function formatMoney(
  amount: number,
  currency: string,
  options?: { isApproximate?: boolean; fractions?: number },
): string {
  const fractions = options?.fractions ?? 0
  const formatted = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: fractions,
    minimumFractionDigits: fractions,
  }).format(Math.round(amount))
  return options?.isApproximate ? `≈ ${formatted}` : formatted
}

/**
 * @deprecated Use formatMoney() — currency must be explicit, not inferred.
 * Kept for backward compat with old callers; do not add new usages.
 */
export function fmtCurrency(amount: number, currency: string, fractions = 0): string {
  return formatMoney(amount, currency, { fractions })
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

export interface AggregateResult {
  total: number
  currency: string
  excludedDueToMissingRateCount: number
}

/**
 * Sum monthly costs of active subscriptions in baseCurrency.
 * Subscriptions whose currency cannot be converted are excluded from the total
 * and counted in excludedDueToMissingRateCount.
 */
export function aggregateMonthlyInBaseCurrency(
  subs: Subscription[],
  baseCurrency: string,
  rates: RateMap = STATIC_RATES,
): AggregateResult {
  const active = subs.filter(s => s.status === 'active')
  let total = 0
  let excludedDueToMissingRateCount = 0

  for (const sub of active) {
    const billingType = sub.billing_type ?? (Number(sub.amount) === 0 ? 'free' : 'paid')
    if (billingType === 'free' || billingType === 'trial' || billingType === 'one_time') continue

    const from = resolveSubscriptionCurrency(sub.currency, baseCurrency)
    if (!canConvert(from, baseCurrency, rates)) {
      excludedDueToMissingRateCount++
      continue
    }
    const monthly = getMonthlyAmount(sub)
    const converted = convertAmount(monthly, from, baseCurrency, rates)
    if (converted !== null) total += converted
  }

  return { total, currency: baseCurrency.toUpperCase(), excludedDueToMissingRateCount }
}

// ─── Legacy helpers (kept for components not yet migrated) ───────────────────

export interface CurrencyGroup { currency: string; total: number }

/** @deprecated Prefer aggregateMonthlyInBaseCurrency for aggregate views. */
export function groupMonthlyByCurrency(
  subs: Subscription[],
  getMonthly: (s: Subscription) => number,
): CurrencyGroup[] {
  const map = new Map<string, number>()
  for (const s of subs) {
    const cur = resolveSubscriptionCurrency(s.currency, 'RUB')
    map.set(cur, (map.get(cur) ?? 0) + getMonthly(s))
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([currency, total]) => ({ currency, total }))
}

/** @deprecated */
export function isMixedCurrencies(subs: Subscription[]): boolean {
  const seen = new Set<string>()
  for (const s of subs) seen.add(resolveSubscriptionCurrency(s.currency, 'RUB'))
  return seen.size > 1
}

/** @deprecated */
export function formatGroups(groups: CurrencyGroup[], multiply = 1): string {
  return groups.map((g) => formatMoney(g.total * multiply, g.currency)).join(' · ')
}
