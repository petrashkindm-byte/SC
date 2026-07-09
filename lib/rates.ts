/**
 * Exchange rate storage — MVP static layer.
 *
 * IMPORTANT: These are STATIC PLACEHOLDER RATES, not live market data.
 * Named STATIC_RATES intentionally to make the temporary nature explicit.
 * When a real exchange-rate API or Supabase table is added:
 *   1. Fetch/cache rates into a RateMap with source: 'live'.
 *   2. Pass that map to convertAmount / getDisplayAmount.
 *   3. Remove or archive STATIC_RATES.
 * Nothing else in the codebase needs to change — all consumers accept RateMap.
 */

export type RateMap = Partial<Record<string, number>>

function key(from: string, to: string): string {
  return `${from.toUpperCase()}-${to.toUpperCase()}`
}

/**
 * Static placeholder rates (MVP only).
 * 1 USD = 92 RUB, 1 EUR = 100 RUB.
 * These numbers will become stale — replace with live rates before production.
 */
export const STATIC_RATES: RateMap = {
  [key('RUB', 'RUB')]: 1,
  [key('USD', 'USD')]: 1,
  [key('EUR', 'EUR')]: 1,
  [key('USD', 'RUB')]: 92,        // static — not a live market rate
  [key('RUB', 'USD')]: 1 / 92,
  [key('EUR', 'RUB')]: 100,       // static — not a live market rate
  [key('RUB', 'EUR')]: 1 / 100,
  [key('USD', 'EUR')]: 92 / 100,
  [key('EUR', 'USD')]: 100 / 92,
}

/**
 * Look up the conversion rate from→to in the given rate map.
 * Returns null if no rate is available — callers MUST handle this explicitly
 * (never substitute 0 silently, as null means "cannot calculate", not "zero cost").
 */
export function lookupRate(
  from: string,
  to: string,
  rates: RateMap = STATIC_RATES,
): number | null {
  const f = from.toUpperCase()
  const t = to.toUpperCase()
  if (f === t) return 1
  return rates[key(f, t)] ?? null
}

/**
 * Returns true if the currency pair can be converted using the given rates.
 * Use this to split subscriptions into "convertible" and "excluded" before aggregating.
 */
export function canConvert(from: string, to: string, rates: RateMap = STATIC_RATES): boolean {
  return lookupRate(from, to, rates) !== null
}
