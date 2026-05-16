import { coerceNumber } from '@/lib/coerce-number'
import type { Subscription } from '@/lib/supabase/types'
import type { SubscriptionForAI } from '@/lib/ai/types'

export function daysUntilCharge(nextChargeDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(nextChargeDate)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

/**
 * Эвристика по `last_used_at`, чтобы промпты совпадали по смыслу с мобильным usageState.
 * В БД веба отдельного поля нет — только last_used_at.
 */
export function inferUsageStateForAi(lastUsedAt: string | null | undefined): string {
  if (lastUsedAt == null || lastUsedAt === '') return 'unknown'
  const days = Math.round((Date.now() - new Date(lastUsedAt).getTime()) / 86400000)
  if (!Number.isFinite(days) || days < 0) return 'unknown'
  if (days <= 10) return 'regular'
  if (days >= 30) return 'rarely_used'
  return 'needs_review'
}

/** Та же логика «в месяц», что на дашборде (getMonthlyAmount). */
export function monthlyNormalizedAmount(s: SubscriptionForAI): number {
  const amount = s.amount
  const interval = Math.max(1, s.billingInterval || 1)
  switch (s.billingCycle) {
    case 'weekly':
      return amount * interval * 4.33
    case 'monthly':
      return amount * interval
    case 'quarterly':
      return (amount * interval) / 3
    case 'yearly':
      return (amount * interval) / 12
    case 'custom':
      return s.customIntervalDays && s.customIntervalDays > 0
        ? (amount / s.customIntervalDays) * 30
        : amount
    default:
      return amount * interval
  }
}

export function subscriptionToAiPayload(sub: Subscription): SubscriptionForAI {
  const s: SubscriptionForAI = {
    name: sub.name,
    amount: coerceNumber(sub.amount),
    currency: sub.currency,
    billingCycle: sub.billing_cycle,
    billingInterval: Math.max(1, sub.billing_interval ?? 1),
    customIntervalDays: sub.custom_interval_days,
    nextChargeDate: sub.next_charge_date,
    lastUsedAt: sub.last_used_at,
    usageState: inferUsageStateForAi(sub.last_used_at),
    daysUntilRenewal: daysUntilCharge(sub.next_charge_date),
    category: sub.category_slug,
    renewalType: sub.renewal_type,
    monthlyEquivalent: 0,
  }
  s.monthlyEquivalent = Math.round(monthlyNormalizedAmount(s))
  return s
}
