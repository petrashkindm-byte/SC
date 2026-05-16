import { coerceNumber } from '@/lib/coerce-number'
import type { BillingCycle, Subscription } from '@/lib/supabase/types'

export function parseIsoDateLocal(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return new Date(iso)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function advanceBillingDate(
  baseDate: string,
  cycle: BillingCycle,
  interval: number,
  customDays: number | null,
): string {
  const d = parseIsoDateLocal(baseDate)
  const n = Math.max(1, interval)
  switch (cycle) {
    case 'weekly':
      d.setDate(d.getDate() + 7 * n)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + n)
      break
    case 'quarterly':
      d.setMonth(d.getMonth() + 3 * n)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + n)
      break
    case 'custom':
      d.setDate(d.getDate() + (customDays ?? 30) * n)
      break
  }
  return d.toISOString().slice(0, 10)
}

function shiftByCycle(date: Date, cycle: BillingCycle, interval: number, customDays: number | null, direction: 1 | -1): Date {
  const d = new Date(date)
  const n = Math.max(1, interval) * direction
  switch (cycle) {
    case 'weekly': d.setDate(d.getDate() + 7 * n); return d
    case 'monthly': d.setMonth(d.getMonth() + n); return d
    case 'quarterly': d.setMonth(d.getMonth() + 3 * n); return d
    case 'yearly': d.setFullYear(d.getFullYear() + n); return d
    case 'custom': d.setDate(d.getDate() + (customDays ?? 30) * n); return d
    default: return d
  }
}

export function monthlyActualForSubscription(sub: Subscription, year: number, month: number): number {
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
  let cursor = parseIsoDateLocal(sub.next_charge_date)
  const interval = Number(sub.billing_interval) || 1
  const amount = coerceNumber(sub.amount)
  if (!Number.isFinite(cursor.getTime())) return 0
  while (cursor > monthEnd) cursor = shiftByCycle(cursor, sub.billing_cycle, interval, sub.custom_interval_days, -1)
  while (cursor < monthStart) cursor = shiftByCycle(cursor, sub.billing_cycle, interval, sub.custom_interval_days, 1)
  let total = 0
  while (cursor >= monthStart && cursor <= monthEnd) {
    total += amount
    cursor = shiftByCycle(cursor, sub.billing_cycle, interval, sub.custom_interval_days, 1)
  }
  return total
}
