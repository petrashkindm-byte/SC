import { describe, expect, it } from 'vitest'

import { monthlyActualForSubscription } from './billing-engine'
import type { Subscription } from './supabase/types'

// Minimal subscription with only the fields monthlyActualForSubscription reads.
function sub(partial: Partial<Subscription>): Subscription {
  return {
    billing_cycle: 'monthly',
    billing_interval: 1,
    custom_interval_days: null,
    amount: 0,
    next_charge_date: '2026-06-15',
    ...partial,
  } as Subscription
}

// month is 0-indexed (June = 5).
const JUNE = 5
const JULY = 6

describe('monthlyActualForSubscription', () => {
  it('counts a paid monthly charge that lands in the target month', () => {
    const s = sub({ billing_type: 'paid', billing_cycle: 'monthly', amount: 500, next_charge_date: '2026-06-15' })
    expect(monthlyActualForSubscription(s, 2026, JUNE)).toBe(500)
  })

  it('handles a paid yearly subscription without throwing', () => {
    const s = sub({ billing_type: 'paid', billing_cycle: 'yearly', amount: 1200, next_charge_date: '2026-06-15' })
    expect(monthlyActualForSubscription(s, 2026, JUNE)).toBe(1200) // charge falls in June
    expect(monthlyActualForSubscription(s, 2026, JULY)).toBe(0) // no yearly charge in July
  })

  it('returns 0 for free / trial / one_time', () => {
    const base = { billing_cycle: 'monthly' as const, amount: 500, next_charge_date: '2026-06-15' }
    expect(monthlyActualForSubscription(sub({ ...base, billing_type: 'free' }), 2026, JUNE)).toBe(0)
    expect(monthlyActualForSubscription(sub({ ...base, billing_type: 'trial' }), 2026, JUNE)).toBe(0)
    expect(monthlyActualForSubscription(sub({ ...base, billing_type: 'one_time' }), 2026, JUNE)).toBe(0)
  })

  it('falls back to paid when billing_type is missing and amount > 0', () => {
    const s = sub({ billing_cycle: 'monthly', amount: 500, next_charge_date: '2026-06-15' })
    expect(monthlyActualForSubscription(s, 2026, JUNE)).toBe(500)
  })

  it('returns 0 when amount is not finite', () => {
    const s = sub({ billing_type: 'paid', billing_cycle: 'monthly', amount: Number.NaN, next_charge_date: '2026-06-15' })
    expect(monthlyActualForSubscription(s, 2026, JUNE)).toBe(0)
  })
})
