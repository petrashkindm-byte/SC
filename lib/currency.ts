import { coerceNumber } from '@/lib/coerce-number'
import type { Subscription } from '@/lib/supabase/types'

/** Нормализованная сумма подписки в месяц (shared, используется повсюду). */
export function getMonthlyAmount(sub: Subscription): number {
  const amount = coerceNumber(sub.amount)
  // billing_interval = «каждые N циклов», поэтому месячный эквивалент делится на интервал
  const interval = Math.max(1, sub.billing_interval || 1)
  switch (sub.billing_cycle) {
    case 'weekly':    return (amount * 4.33) / interval
    case 'monthly':   return amount / interval
    case 'quarterly': return amount / (3 * interval)
    case 'yearly':    return amount / (12 * interval)
    case 'custom':    return sub.custom_interval_days ? (amount / sub.custom_interval_days) * 30 : amount
    default:          return amount
  }
}

export interface CurrencyGroup {
  currency: string
  total: number
}

/** Форматирует сумму в указанной валюте (без дробей по умолчанию) */
export function fmtCurrency(
  amount: number,
  currency: string,
  fractions = 0,
): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: fractions,
    minimumFractionDigits: fractions,
  }).format(amount)
}

/**
 * Группирует суммы подписок по валюте.
 * Возвращает массив { currency, total }, отсортированный по убыванию суммы
 * (самая крупная валюта — первая).
 */
export function groupMonthlyByCurrency(
  subs: Subscription[],
  getMonthly: (s: Subscription) => number,
): CurrencyGroup[] {
  const map = new Map<string, number>()
  for (const s of subs) {
    const cur = (s.currency ?? 'RUB').toUpperCase()
    map.set(cur, (map.get(cur) ?? 0) + getMonthly(s))
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([currency, total]) => ({ currency, total }))
}

/** True если у подписок больше одной валюты */
export function isMixedCurrencies(subs: Subscription[]): boolean {
  const seen = new Set<string>()
  for (const s of subs) seen.add((s.currency ?? 'RUB').toUpperCase())
  return seen.size > 1
}

/** Суммарная строка для одной группы (вспомогательная) */
export function formatGroups(groups: CurrencyGroup[], multiply = 1): string {
  return groups
    .map((g) => fmtCurrency(g.total * multiply, g.currency))
    .join(' · ')
}
