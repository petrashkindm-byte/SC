import { describe, it, expect } from 'vitest'
import { validateBillingTypeFields } from './billing-type-validation'

describe('validateBillingTypeFields', () => {
  describe('paid', () => {
    it('accepts a positive amount', () => {
      const r = validateBillingTypeFields('paid', '599', '')
      expect(r).toEqual({ ok: true, amount: 599, price_after_trial: null })
    })

    it('rejects zero amount', () => {
      const r = validateBillingTypeFields('paid', '0', '')
      expect(r).toEqual({ ok: false, code: 'amount' })
    })

    it('rejects negative amount', () => {
      const r = validateBillingTypeFields('paid', '-10', '')
      expect(r).toEqual({ ok: false, code: 'amount' })
    })

    it('rejects empty amount', () => {
      const r = validateBillingTypeFields('paid', '', '')
      expect(r).toEqual({ ok: false, code: 'amount' })
    })

    it('accepts comma as decimal separator', () => {
      const r = validateBillingTypeFields('paid', '1,99', '')
      expect(r).toEqual({ ok: true, amount: 1.99, price_after_trial: null })
    })
  })

  describe('free', () => {
    it('always returns amount=0 and no price_after_trial', () => {
      const r = validateBillingTypeFields('free', '999', 'anything')
      expect(r).toEqual({ ok: true, amount: 0, price_after_trial: null })
    })
  })

  describe('trial', () => {
    it('accepts valid price_after_trial', () => {
      const r = validateBillingTypeFields('trial', '0', '299')
      expect(r).toEqual({ ok: true, amount: 0, price_after_trial: 299 })
    })

    it('rejects missing price_after_trial', () => {
      const r = validateBillingTypeFields('trial', '0', '')
      expect(r).toEqual({ ok: false, code: 'billing_type' })
    })

    it('rejects zero price_after_trial', () => {
      const r = validateBillingTypeFields('trial', '0', '0')
      expect(r).toEqual({ ok: false, code: 'billing_type' })
    })

    it('forces amount=0 regardless of passed amount', () => {
      const r = validateBillingTypeFields('trial', '500', '299')
      expect(r).toEqual({ ok: true, amount: 0, price_after_trial: 299 })
    })
  })

  describe('one_time', () => {
    it('accepts positive amount', () => {
      const r = validateBillingTypeFields('one_time', '1990', '')
      expect(r).toEqual({ ok: true, amount: 1990, price_after_trial: null })
    })

    it('rejects zero amount', () => {
      const r = validateBillingTypeFields('one_time', '0', '')
      expect(r).toEqual({ ok: false, code: 'amount' })
    })
  })

  describe('unknown / fallback', () => {
    it('falls back to paid validation for unknown type', () => {
      const r = validateBillingTypeFields('unknown_type', '100', '')
      expect(r).toEqual({ ok: true, amount: 100, price_after_trial: null })
    })
  })
})
