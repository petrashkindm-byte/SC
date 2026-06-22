import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { searchSubscriptionTemplates } from '@/lib/subscription-templates'
import { loadCategoryIdBySlug } from '@/lib/category-id'
import { normalizeAllowedCurrency } from '@/lib/allowed-currencies'
import type { DetectedSubscription } from '@/lib/parse-bank-statement'
import type { CategorySlug } from '@/lib/supabase/types'

const CYCLE_TO_DAYS: Record<string, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
}

function guessCategory(merchant: string): CategorySlug {
  const m = merchant.toLowerCase()
  const matches = searchSubscriptionTemplates(m.split(' ')[0])
  return matches[0]?.category_slug ?? 'other'
}

function guessIcon(merchant: string): string | null {
  const m = merchant.toLowerCase()
  const matches = searchSubscriptionTemplates(m.split(' ')[0])
  return matches[0]?.icon ?? null
}

function nextChargeDate(lastDate: Date, intervalDays: number): string {
  const next = new Date(lastDate.getTime() + intervalDays * 86400000)
  // Если уже прошло — сдвигаем вперёд
  const today = new Date()
  while (next < today) {
    next.setDate(next.getDate() + intervalDays)
  }
  return next.toISOString().slice(0, 10)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  let body: { subscriptions: DetectedSubscription[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 })
  }

  const { subscriptions } = body
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return NextResponse.json({ error: 'Нет подписок для импорта' }, { status: 400 })
  }

  const categorySlugs = subscriptions.map((sub) => guessCategory(sub.merchant))
  const slugToCategoryId = await loadCategoryIdBySlug(supabase, user.id, categorySlugs)

  const rows = subscriptions.map((sub) => {
    const intervalDays = CYCLE_TO_DAYS[sub.billingCycle] ?? sub.intervalDays
    const lastDate = new Date(sub.lastDate)
    const firstDate = lastDate.toISOString().slice(0, 10)
    const nextDate = nextChargeDate(lastDate, intervalDays)
    const categorySlug = guessCategory(sub.merchant)

    return {
      id: crypto.randomUUID(),
      user_id: user.id,
      category_id: slugToCategoryId.get(categorySlug) ?? null,
      category_slug: categorySlug,
      name: sub.merchant.length > 60 ? sub.merchant.slice(0, 60) : sub.merchant,
      amount: sub.amount,
      currency: normalizeAllowedCurrency(sub.currency),
      billing_cycle: sub.billingCycle,
      billing_interval: 1,
      custom_interval_days: null,
      first_charge_date: firstDate,
      next_charge_date: nextDate,
      free_trial_end_date: null,
      renewal_type: 'auto_renew' as const,
      cancellation_url: null,
      management_url: null,
      notes: `Импорт из банковской выписки · ${sub.transactionCount} платежей`,
      icon: guessIcon(sub.merchant),
      status: 'active' as const,
      price_increase_flag: false,
      annual_renewal_at_risk: false,
    }
  })

  const { error } = await supabase.from('subscriptions').insert(rows)

  if (error) {
    console.error('Bank import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ imported: rows.length })
}
