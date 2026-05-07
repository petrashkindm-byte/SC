import { coerceNumber } from '@/lib/coerce-number'
import type { BillingCycle, Subscription } from '@/lib/supabase/types'

function shiftByCycle(date: Date, cycle: BillingCycle, interval: number, customDays: number | null, direction: 1 | -1): Date {
  const d = new Date(date)
  const n = Math.max(1, interval) * direction
  switch (cycle) {
    case 'weekly':
      d.setDate(d.getDate() + 7 * n)
      return d
    case 'monthly':
      d.setMonth(d.getMonth() + n)
      return d
    case 'quarterly':
      d.setMonth(d.getMonth() + 3 * n)
      return d
    case 'yearly':
      d.setFullYear(d.getFullYear() + n)
      return d
    case 'custom':
      d.setDate(d.getDate() + (customDays ?? 30) * n)
      return d
    default:
      return d
  }
}

function monthlyChargesForSubscription(sub: Subscription, year: number, month: number): number {
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
  let cursor = new Date(sub.next_charge_date)
  const interval = Number(sub.billing_interval) || 1
  const amount = coerceNumber(sub.amount)

  if (!Number.isFinite(cursor.getTime())) return 0

  // Подгоняем ближайшее списание к границам нужного месяца.
  while (cursor > monthEnd) {
    cursor = shiftByCycle(cursor, sub.billing_cycle, interval, sub.custom_interval_days, -1)
  }
  while (cursor < monthStart) {
    cursor = shiftByCycle(cursor, sub.billing_cycle, interval, sub.custom_interval_days, 1)
  }

  let total = 0
  while (cursor >= monthStart && cursor <= monthEnd) {
    total += amount
    cursor = shiftByCycle(cursor, sub.billing_cycle, interval, sub.custom_interval_days, 1)
  }
  return total
}

export function monthlyChargesByCurrency(subs: Subscription[], year: number, month: number) {
  const map = new Map<string, number>()
  for (const sub of subs) {
    if (sub.status !== 'active') continue
    const charge = monthlyChargesForSubscription(sub, year, month)
    if (charge <= 0) continue
    const cur = (sub.currency ?? 'RUB').toUpperCase()
    map.set(cur, (map.get(cur) ?? 0) + charge)
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([currency, total]) => ({ currency, total }))
}
