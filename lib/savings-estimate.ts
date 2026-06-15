import type { Subscription } from '@/lib/supabase/types'
import { getMonthlyAmount, groupMonthlyByCurrency, type CurrencyGroup } from '@/lib/currency'
import { findServiceEntry } from '@/lib/service-comparison-db'

export type SavingsScenario = 'flagged' | 'annual_switch' | 'none'

export interface AnnualSwitchItem {
  id: string
  name: string
  savingMonthly: number
  currency: string
}

export interface SavingsEstimate {
  groups: CurrencyGroup[]
  scenario: SavingsScenario
  annualSwitchItems: AnnualSwitchItem[]
}

export function estimateSavingsGroups(subs: Subscription[]): SavingsEstimate {
  // Primary scenario: stale subscriptions or flagged ones
  const candidates = subs.filter((s) =>
    s.status === 'active' && Boolean(s.price_increase_flag || s.annual_renewal_at_risk)
  )

  if (candidates.length > 0) {
    return {
      groups: groupMonthlyByCurrency(candidates, getMonthlyAmount),
      scenario: 'flagged',
      annualSwitchItems: [],
    }
  }

  // Fallback scenario: monthly subscriptions that could switch to annual.
  // Use real annual prices from service DB where available; skip unknowns.
  const annualSwitchItems: AnnualSwitchItem[] = []
  for (const s of subs) {
    if (s.status !== 'active' || s.billing_cycle !== 'monthly') continue
    const entry = findServiceEntry(s.name)
    if (!entry?.annualPrice) continue
    const annualMonthly = entry.annualPrice / 12
    const currentMonthly = getMonthlyAmount(s)
    const savingMonthly = currentMonthly - annualMonthly
    if (savingMonthly <= 0) continue
    annualSwitchItems.push({ id: s.id, name: s.name, savingMonthly, currency: s.currency ?? 'RUB' })
  }

  if (annualSwitchItems.length > 0) {
    const byCurrency = new Map<string, number>()
    for (const it of annualSwitchItems) {
      byCurrency.set(it.currency, (byCurrency.get(it.currency) ?? 0) + it.savingMonthly)
    }
    const groups: CurrencyGroup[] = Array.from(byCurrency.entries()).map(([currency, total]) => ({ currency, total }))
    return { groups, scenario: 'annual_switch', annualSwitchItems }
  }

  return { groups: [], scenario: 'none', annualSwitchItems: [] }
}
