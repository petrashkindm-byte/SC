import { describe, expect, it } from 'vitest'

import { ALLOWED_CURRENCIES, isAllowedCurrency, normalizeAllowedCurrency } from './allowed-currencies'

describe('ALLOWED_CURRENCIES', () => {
  it('is exactly RUB/USD/EUR', () => {
    expect([...ALLOWED_CURRENCIES]).toEqual(['RUB', 'USD', 'EUR'])
  })
})

describe('normalizeAllowedCurrency', () => {
  it('keeps RUB/USD/EUR', () => {
    expect(normalizeAllowedCurrency('RUB')).toBe('RUB')
    expect(normalizeAllowedCurrency('USD')).toBe('USD')
    expect(normalizeAllowedCurrency('EUR')).toBe('EUR')
  })

  it('upper-cases the input', () => {
    expect(normalizeAllowedCurrency('usd')).toBe('USD')
    expect(normalizeAllowedCurrency('eur')).toBe('EUR')
  })

  it('falls back to RUB for empty / null / undefined', () => {
    expect(normalizeAllowedCurrency('')).toBe('RUB')
    expect(normalizeAllowedCurrency('   ')).toBe('RUB')
    expect(normalizeAllowedCurrency(null)).toBe('RUB')
    expect(normalizeAllowedCurrency(undefined)).toBe('RUB')
  })

  it('falls back to RUB for unsupported / arbitrary currencies', () => {
    for (const code of ['TRY', 'KZT', 'AMD', 'GEL', 'BYN', 'GBP', 'CNY', 'XYZ', 'JPY']) {
      expect(normalizeAllowedCurrency(code)).toBe('RUB')
    }
  })
})

describe('isAllowedCurrency', () => {
  it('is true only for RUB/USD/EUR (case-insensitive)', () => {
    expect(isAllowedCurrency('RUB')).toBe(true)
    expect(isAllowedCurrency('usd')).toBe(true)
    expect(isAllowedCurrency('Eur')).toBe(true)
  })

  it('is false for unsupported / empty / null / undefined', () => {
    expect(isAllowedCurrency('TRY')).toBe(false)
    expect(isAllowedCurrency('')).toBe(false)
    expect(isAllowedCurrency(null)).toBe(false)
    expect(isAllowedCurrency(undefined)).toBe(false)
  })
})
