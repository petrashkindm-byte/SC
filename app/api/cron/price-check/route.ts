import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { coerceNumber } from '@/lib/coerce-number'

const DEFAULT_THRESHOLD_PCT = 3

function remindAtByDigest(digest: 'instant' | 'daily' | 'weekly'): string {
  const now = new Date()
  if (digest === 'instant') return now.toISOString()
  if (digest === 'daily') {
    now.setDate(now.getDate() + 1)
    now.setHours(9, 0, 0, 0)
    return now.toISOString()
  }
  now.setDate(now.getDate() + 7)
  now.setHours(9, 0, 0, 0)
  return now.toISOString()
}

type ParsedPrice = { amount: number; currency: string }

function parsePrice(html: string, fallbackCurrency: string): ParsedPrice | null {
  // 1. JSON-LD offer
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const s of scripts) {
    try {
      const parsed = JSON.parse(s[1]) as unknown
      const candidates = Array.isArray(parsed) ? parsed : [parsed]
      for (const c of candidates) {
        if (!c || typeof c !== 'object') continue
        const offer = ('offers' in c && (c as Record<string, unknown>).offers)
          ? (c as Record<string, unknown>).offers
          : c
        if (!offer || typeof offer !== 'object') continue
        const price = (offer as Record<string, unknown>).price
        const priceCurrency = (offer as Record<string, unknown>).priceCurrency
        const amount = coerceNumber(String(price ?? ''))
        if (amount > 0) {
          return { amount, currency: String(priceCurrency ?? fallbackCurrency).toUpperCase() }
        }
      }
    } catch { /* skip */ }
  }

  // 2. meta price
  const metaMatch = html.match(/property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i)
  if (metaMatch?.[1]) {
    const amount = coerceNumber(metaMatch[1].replace(',', '.').replace(/\s/g, ''))
    if (amount > 0) return { amount, currency: fallbackCurrency }
  }

  // 3. first price-looking number in the page (last resort)
  const numMatch = html.match(/(\d[\d\s]*[.,]\d{2})\s*(?:₽|руб|RUB|USD|\$|€|EUR)/i)
    ?? html.match(/(?:₽|руб|RUB|USD|\$|€|EUR)\s*(\d[\d\s]*[.,]\d{2})/i)
  if (numMatch?.[1]) {
    const amount = coerceNumber(numMatch[1].replace(',', '.').replace(/\s/g, ''))
    if (amount > 0) return { amount, currency: fallbackCurrency }
  }

  return null
}

const BLOCKED_HOSTS = [
  'localhost', '127.0.0.1', '0.0.0.0', '::1',
  '169.254.169.254', // AWS metadata
  'metadata.google.internal', // GCP metadata
]

function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    if (!['http:', 'https:'].includes(u.protocol)) return false
    const host = u.hostname.toLowerCase()
    if (BLOCKED_HOSTS.includes(host)) return false
    // блокируем приватные диапазоны
    if (/^10\./.test(host)) return false
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false
    if (/^192\.168\./.test(host)) return false
    return true
  } catch { return false }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Берём активные подписки у которых заполнена pricing_url
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, name, amount, currency, pricing_url')
    .eq('status', 'active')
    .not('pricing_url', 'is', null)
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let checked = 0
  let alertsCreated = 0

  for (const sub of (subs ?? [])) {
    if (!sub.pricing_url) continue
    if (!isSafeUrl(sub.pricing_url)) continue  // SSRF защита

    // Скрапим страницу с тарифами
    let html: string
    try {
      const res = await fetch(sub.pricing_url, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'SubcuroPriceBot/1.0 (+https://subcuro.app)',
          Accept: 'text/html,application/xhtml+xml',
        },
        cache: 'no-store',
      })
      if (!res.ok || res.status !== 200) continue
      html = await res.text()
    } catch {
      continue
    }

    const current = parsePrice(html, sub.currency ?? 'RUB')
    if (!current) continue
    checked++

    // Сохраняем снимок цены
    await supabase.from('price_snapshots').insert({
      subscription_id: sub.id,
      amount: current.amount,
      currency: current.currency,
    })

    // Берём предыдущий снимок
    const { data: prev } = await supabase
      .from('price_snapshots')
      .select('amount, currency, observed_at')
      .eq('subscription_id', sub.id)
      .order('observed_at', { ascending: false })
      .range(1, 1)
      .maybeSingle()

    if (!prev) continue

    const oldAmount = coerceNumber(prev.amount)
    const newAmount = current.amount
    if (oldAmount <= 0 || newAmount <= 0) continue

    const changePct = ((newAmount - oldAmount) / oldAmount) * 100

    // Получаем настройки пользователя
    const { data: prefs } = await supabase
      .from('user_settings')
      .select('price_alerts_enabled, price_alert_min_change_pct, price_alert_digest')
      .eq('user_id', sub.user_id)
      .maybeSingle()

    const enabled = prefs?.price_alerts_enabled !== false
    const threshold = Number(prefs?.price_alert_min_change_pct ?? DEFAULT_THRESHOLD_PCT) || DEFAULT_THRESHOLD_PCT
    const digest = (prefs?.price_alert_digest ?? 'instant') as 'instant' | 'daily' | 'weekly'

    if (!enabled || Math.abs(changePct) < threshold) continue

    // Проверяем — не создавали ли уже такой алерт
    const { data: existing } = await supabase
      .from('price_alerts')
      .select('id')
      .eq('user_id', sub.user_id)
      .eq('subscription_id', sub.id)
      .eq('old_amount', oldAmount)
      .eq('new_amount', newAmount)
      .limit(1)
      .maybeSingle()

    if (existing) continue

    const { error: insertErr } = await supabase.from('price_alerts').insert({
      user_id: sub.user_id,
      subscription_id: sub.id,
      old_amount: oldAmount,
      new_amount: newAmount,
      currency: current.currency,
      change_pct: changePct,
      source_url: sub.pricing_url,
    })

    if (insertErr) continue
    alertsCreated++

    await supabase.from('reminders').insert({
      id: crypto.randomUUID(),
      user_id: sub.user_id,
      subscription_id: sub.id,
      type: 'price_check',
      channel: 'in_app',
      remind_at: remindAtByDigest(digest),
    })
  }

  return NextResponse.json({ checked, alertsCreated })
}
