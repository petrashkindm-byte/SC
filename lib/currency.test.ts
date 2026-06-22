import { describe, expect, it } from 'vitest'

import { getMonthlyAmount } from './currency'
import type { Subscription } from './supabase/types'

// Minimal subscription with only the fields getMonthlyAmount reads.
function sub(partial: Partial<Subscription>): Subscription {
  return {
    billing_cycle: 'monthly',
    billing_interval: 1,
    custom_interval_days: null,
    amount: 0,
    ...partial,
  } as Subscription
}

describe('getMonthlyAmount', () => {
  it('returns the amount for a paid monthly subscription', () => {
    expect(getMonthlyAmount(sub({ billing_type: 'paid', billing_cycle: 'monthly', amount: 500 }))).toBe(500)
  })

  it('normalizes a paid yearly subscription to amount / 12', () => {
    expect(getMonthlyAmount(sub({ billing_type: 'paid', billing_cycle: 'yearly', amount: 1200 }))).toBe(100)
  })

  it('returns 0 when amount is not finite', () => {
    expect(getMonthlyAmount(sub({ billing_type: 'paid', amount: Number.NaN }))).toBe(0)
  })

  it('returns 0 for free / trial / one_time regardless of amount', () => {
    expect(getMonthlyAmount(sub({ billing_type: 'free', amount: 500 }))).toBe(0)
    expect(getMonthlyAmount(sub({ billing_type: 'trial', amount: 500 }))).toBe(0)
    expect(getMonthlyAmount(sub({ billing_type: 'one_time', amount: 500 }))).toBe(0)
  })

  it('falls back to free when billing_type is missing and amount is 0', () => {
    expect(getMonthlyAmount(sub({ amount: 0 }))).toBe(0)
  })

  it('falls back to paid when billing_type is missing and amount > 0', () => {
    expect(getMonthlyAmount(sub({ billing_cycle: 'monthly', amount: 300 }))).toBe(300)
  })
})
