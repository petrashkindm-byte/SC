import type { Subscription } from '@/lib/supabase/types'
import { getMonthlyAmount, groupMonthlyByCurrency } from '@/lib/currency'

export function estimateSavingsGroups(subs: Subscription[]) {
  const candidates = subs.filter((s) => {
    if (s.status !== 'active') return false
    const staleDays = s.last_used_at
      ? Math.round((Date.now() - new Date(s.last_used_at).getTime()) / 86400000)
      : null
    if (staleDays !== null && staleDays >= 30) return true
    return Boolean(s.price_increase_flag || s.annual_renewal_at_risk)
  })
  return groupMonthlyByCurrency(candidates, getMonthlyAmount)
}
