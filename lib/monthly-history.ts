import type { Subscription } from '@/lib/supabase/types'
import { monthlyActualForSubscription } from '@/lib/billing-engine'

export function monthlyChargesByCurrency(subs: Subscription[], year: number, month: number) {
  const map = new Map<string, number>()
  for (const sub of subs) {
    if (sub.status !== 'active') continue
    const charge = monthlyActualForSubscription(sub, year, month)
    if (charge <= 0) continue
    const cur = (sub.currency ?? 'RUB').toUpperCase()
    map.set(cur, (map.get(cur) ?? 0) + charge)
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([currency, total]) => ({ currency, total }))
}
