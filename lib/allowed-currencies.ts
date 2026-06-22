// Currencies accepted on web writes, temporarily limited to RUB/USD/EUR because
// the shared mobile app only supports these three (its convertAmount has no
// rates for others). Existing rows in other currencies still display fine —
// this only constrains new/updated writes. Lives in its own module so it can be
// imported by both the 'use server' actions file and API routes.
export const ALLOWED_CURRENCIES = ['RUB', 'USD', 'EUR'] as const
export type AllowedCurrency = (typeof ALLOWED_CURRENCIES)[number]

export function isAllowedCurrency(raw: string | null | undefined): raw is AllowedCurrency {
  return (ALLOWED_CURRENCIES as readonly string[]).includes(String(raw ?? '').toUpperCase())
}

/** Returns the input (upper-cased) if it's an allowed currency, otherwise 'RUB'. */
export function normalizeAllowedCurrency(raw: string | null | undefined): AllowedCurrency {
  const up = String(raw ?? '').toUpperCase()
  return (ALLOWED_CURRENCIES as readonly string[]).includes(up) ? (up as AllowedCurrency) : 'RUB'
}
