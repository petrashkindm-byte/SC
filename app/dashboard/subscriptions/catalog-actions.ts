'use server'

import { createClient } from '@/lib/supabase/server'
import { loadCategoryIdBySlug } from '@/lib/category-id'
import { normalizeAllowedCurrency } from '@/lib/allowed-currencies'
import type { CategorySlug } from '@/lib/supabase/types'
import { revalidatePath, revalidateTag } from 'next/cache'
import { dashboardCacheTag } from '@/lib/dashboard-cache'
import { SUBSCRIPTION_CATALOG } from '@/lib/subscription-catalog'

export interface CatalogSaveItem {
  /** Catalog entry id — validated against SUBSCRIPTION_CATALOG on the server */
  catalogId: string
  /** Amount in the user's currency; 0 = "не помню сумму" (requires amount >= 0 in DB) */
  amount: number
  currency: string
  /** YYYY-MM-DD; null = "уточнить позже" → estimate +30 days */
  nextChargeDate: string | null
  isTrial: boolean
}

export interface CatalogSaveResult {
  ok: boolean
  created: number
  error?: string
}

function ymdInDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Bulk-create subscriptions picked from the catalog. Unlike createSubscription
 * this allows amount = 0 ("не помню сумму") — such payments show up in the
 * payments list and can be clarified later; amount 0 contributes nothing to
 * totals.
 */
export async function createSubscriptionsFromCatalog(
  items: CatalogSaveItem[],
): Promise<CatalogSaveResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, created: 0, error: 'auth' }
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return { ok: false, created: 0, error: 'items' }
  }

  const nowYmd = new Date().toISOString().slice(0, 10)
  const rows = []
  const slugs: CategorySlug[] = []

  for (const item of items) {
    const entry = SUBSCRIPTION_CATALOG.find((s) => s.id === item.catalogId)
    if (!entry) continue
    const amountNum = Number(item.amount)
    const amount = Number.isFinite(amountNum) && amountNum > 0 ? amountNum : 0
    const dateRaw = typeof item.nextChargeDate === 'string' ? item.nextChargeDate.slice(0, 10) : ''
    const next = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : ymdInDays(30)
    const isTrial = !!item.isTrial

    slugs.push(entry.categorySlug)
    rows.push({
      id: crypto.randomUUID(),
      user_id: user.id,
      category_id: null as string | null,
      category_slug: entry.categorySlug,
      name: entry.name,
      amount: isTrial ? 0 : amount,
      currency: normalizeAllowedCurrency(item.currency),
      billing_cycle: 'monthly' as const,
      billing_interval: 1,
      custom_interval_days: null,
      first_charge_date: nowYmd,
      next_charge_date: next,
      free_trial_end_date: isTrial ? next : null,
      renewal_type: 'auto_renew' as const,
      cancellation_url: null,
      management_url: null,
      pricing_url: null,
      notes: null,
      icon: entry.icon,
      billing_type: isTrial ? 'trial' : 'paid',
      price_after_trial: isTrial && amount > 0 ? amount : null,
      plan_name: null,
      status: 'active' as const,
    })
  }

  if (rows.length === 0) return { ok: false, created: 0, error: 'items' }

  const [categoryMap, insertResult] = await Promise.all([
    loadCategoryIdBySlug(supabase, user.id, Array.from(new Set(slugs))),
    supabase.from('subscriptions').insert(rows as never),
  ])

  if (insertResult.error) {
    return { ok: false, created: 0, error: 'save' }
  }

  // category_id backfill — non-blocking, mirrors createSubscription
  void Promise.all(
    rows.map((row) => {
      const categoryId = categoryMap.get(row.category_slug) ?? null
      return categoryId
        ? supabase.from('subscriptions').update({ category_id: categoryId }).eq('id', row.id)
        : Promise.resolve()
    }),
  )

  revalidateTag(dashboardCacheTag(user.id), 'default')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/reminders')
  revalidatePath('/dashboard/savings')
  revalidatePath('/dashboard/collections')

  return { ok: true, created: rows.length }
}
