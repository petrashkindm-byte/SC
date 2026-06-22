import type { BillingType } from '@/lib/supabase/types'

const BILLING_TYPES: BillingType[] = ['paid', 'free', 'trial', 'one_time']

export type BillingTypeValidationResult =
  | { ok: true; amount: number; price_after_trial: number | null }
  | { ok: false; code: 'amount' | 'billing_type' }

/**
 * Validates and normalises billing-type-dependent amount fields.
 * Pure function — no I/O, safe to unit-test.
 */
export function validateBillingTypeFields(
  billingType: string,
  amountRaw: string,
  priceAfterTrialRaw: string,
): BillingTypeValidationResult {
  const bt: BillingType = BILLING_TYPES.includes(billingType as BillingType)
    ? (billingType as BillingType)
    : 'paid'

  if (bt === 'free') {
    return { ok: true, amount: 0, price_after_trial: null }
  }

  if (bt === 'trial') {
    const pat = Number(priceAfterTrialRaw.replace(',', '.'))
    if (!Number.isFinite(pat) || pat <= 0) {
      return { ok: false, code: 'billing_type' }
    }
    return { ok: true, amount: 0, price_after_trial: pat }
  }

  // paid or one_time
  const amount = Number(amountRaw.replace(',', '.'))
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, code: 'amount' }
  }
  return { ok: true, amount, price_after_trial: null }
}
