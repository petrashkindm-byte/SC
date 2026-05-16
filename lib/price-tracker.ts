import { coerceNumber } from '@/lib/coerce-number'
import type { PriceSource } from '@/lib/supabase/types'

type ParsedPrice = { amount: number; currency: string; rawExcerpt: string | null }

function parseByRegex(html: string, source: PriceSource): ParsedPrice | null {
  if (!source.regex_pattern) return null
  const re = new RegExp(source.regex_pattern, 'i')
  const match = html.match(re)
  if (!match?.[1]) return null
  const amount = coerceNumber(match[1].replace(',', '.').replace(/\s/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) return null
  return { amount, currency: source.currency, rawExcerpt: match[0]?.slice(0, 180) ?? null }
}

function parseByMetaPrice(html: string, source: PriceSource): ParsedPrice | null {
  const m = html.match(/property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i)
  if (!m?.[1]) return null
  const amount = coerceNumber(m[1].replace(',', '.').replace(/\s/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) return null
  return { amount, currency: source.currency, rawExcerpt: m[0]?.slice(0, 180) ?? null }
}

function parseByJsonLd(html: string, source: PriceSource): ParsedPrice | null {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const s of scripts) {
    const raw = s[1]
    try {
      const parsed = JSON.parse(raw) as unknown
      const candidates = Array.isArray(parsed) ? parsed : [parsed]
      for (const c of candidates) {
        if (!c || typeof c !== 'object') continue
        const offer = ('offers' in c && (c as { offers?: unknown }).offers) ? (c as { offers?: unknown }).offers : c
        if (!offer || typeof offer !== 'object') continue
        const price = (offer as { price?: unknown }).price
        const priceCurrency = (offer as { priceCurrency?: unknown }).priceCurrency
        const amount = coerceNumber(String(price ?? ''))
        if (amount > 0) {
          const currency = String(priceCurrency ?? source.currency ?? 'RUB').toUpperCase()
          return { amount, currency, rawExcerpt: raw.slice(0, 180) }
        }
      }
    } catch {
      // skip invalid JSON-LD block
    }
  }
  return null
}

export async function fetchCurrentPriceFromSource(source: PriceSource): Promise<ParsedPrice | null> {
  const res = await fetch(source.source_url, {
    method: 'GET',
    headers: {
      'User-Agent': 'SubcuroPriceBot/1.0 (+https://subcuro.app)',
      Accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const html = await res.text()
  switch (source.parser_type) {
    case 'regex':
      return parseByRegex(html, source)
    case 'meta_price':
      return parseByMetaPrice(html, source)
    case 'jsonld_offer':
      return parseByJsonLd(html, source)
    default:
      return null
  }
}
