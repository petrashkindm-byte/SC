'use server'

import { createClient } from '@/lib/supabase/server'
import { getSafeExternalUrl } from '@/lib/safe-url'
import { loadCategoryIdBySlug } from '@/lib/category-id'
import { ALLOWED_CURRENCIES, normalizeAllowedCurrency, type AllowedCurrency } from '@/lib/allowed-currencies'
import { mergeUserNotesWithViz, vizFillToColorPreset, type SubcuroEditViz } from '@/lib/subscription-viz-notes'
import { advanceBillingDate } from '@/lib/billing-engine'
import type {
  BillingCycle,
  CategorySlug,
  Database,
  RenewalType,
  SubscriptionStatus,
} from '@/lib/supabase/types'
import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { logSavingsAction, toMonthlyAmount } from '@/lib/savings-history'
import { dashboardCacheTag } from '@/lib/dashboard-cache'

/** Сбрасывает кэш дашборда для конкретного пользователя */
function revalidateDashboard(userId: string) {
  revalidateTag(dashboardCacheTag(userId), 'default')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/reminders')
  revalidatePath('/dashboard/savings')
  revalidatePath('/dashboard/collections')
}

const CATEGORY_SLUGS: CategorySlug[] = [
  'entertainment',
  'productivity',
  'utilities',
  'finance',
  'health',
  'shopping',
  'education',
  'other',
]

function nowIso() {
  return new Date().toISOString()
}

/**
 * Автоматически создаёт/обновляет push-напоминание за 3 дня до списания.
 * Удаляет старые renewal-напоминания для подписки и вставляет новое,
 * только если у пользователя включён push и есть активная подписка на пуши.
 */
async function upsertAutoRenewalReminder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  subscriptionId: string,
  nextChargeDate: string,
) {
  try {
    // 1. Check push is enabled in user settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('push_enabled')
      .eq('user_id', userId)
      .maybeSingle()
    if (!settings?.push_enabled) return

    // 2. Check there's an actual push subscription registered
    const { data: pushSubs } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
    if (!pushSubs || pushSubs.length === 0) return

    // 3. Delete existing auto renewal reminders for this subscription
    await supabase
      .from('reminders')
      .delete()
      .eq('user_id', userId)
      .eq('subscription_id', subscriptionId)
      .eq('channel', 'local_push')
      .eq('type', 'renewal')
      .is('delivered_at', null)

    // 4. Calculate remind_at: 3 days before next_charge_date
    const chargeDate = new Date(nextChargeDate)
    chargeDate.setDate(chargeDate.getDate() - 3)
    chargeDate.setHours(9, 0, 0, 0) // 09:00 local server time
    // Only create if the reminder date is in the future
    if (chargeDate <= new Date()) return

    await supabase.from('reminders').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      subscription_id: subscriptionId,
      remind_at: chargeDate.toISOString(),
      channel: 'local_push',
      type: 'renewal',
      enabled: true,
    })
  } catch (e) {
    // Non-critical — don't break the main flow
    console.warn('[upsertAutoRenewalReminder] failed:', e)
  }
}

type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

function subscriptionStatusPatch(next: SubscriptionStatus): SubscriptionUpdate {
  const t = nowIso()
  switch (next) {
    case 'active':
      return { status: 'active', paused_at: null, cancelled_at: null, archived_at: null }
    case 'paused':
      return { status: 'paused', paused_at: t, cancelled_at: null, archived_at: null }
    case 'cancelled':
      return { status: 'cancelled', paused_at: null, cancelled_at: t, archived_at: null }
    case 'archived':
      return { status: 'archived', paused_at: null, cancelled_at: null, archived_at: t }
  }
}

import type { BillingType } from '@/lib/supabase/types'

const BILLING_TYPES: BillingType[] = ['paid', 'free', 'trial', 'one_time']

type ParsedForm =
  | {
      ok: true
      name: string
      amount: number
      currency: string
      category_slug: CategorySlug
      billing_cycle: BillingCycle
      billing_interval: number
      custom_interval_days: number | null
      first_charge_date: string
      next_charge_date: string
      free_trial_end_date: string | null
      renewal_type: RenewalType
      cancellation_url: string | null
      management_url: string | null
      pricing_url: string | null
      notes: string | null
      icon: string | null
      billing_type: BillingType
      price_after_trial: number | null
      plan_name: string | null
    }
  | { ok: false; code: 'name' | 'amount' | 'dates' | 'custom' | 'billing_type' }

function parseSubscriptionForm(formData: FormData, billingInterval: number): ParsedForm {
  const name = String(formData.get('name') ?? '').trim()
  // Allowlist: keep RUB/USD/EUR, otherwise fall back to RUB. The update path
  // additionally preserves an existing exotic currency (see updateSubscriptionFields).
  const currency = normalizeAllowedCurrency(formData.get('currency') as string | null)
  const cat = String(formData.get('category_slug') ?? 'other')
  const category_slug: CategorySlug = CATEGORY_SLUGS.includes(cat as CategorySlug)
    ? (cat as CategorySlug)
    : 'other'
  const cycle = String(formData.get('billing_cycle') ?? 'monthly')
  const billing_cycle: BillingCycle = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'].includes(cycle)
    ? (cycle as BillingCycle)
    : 'monthly'
  const first = String(formData.get('first_charge_date') ?? '').slice(0, 10)
  const next = String(formData.get('next_charge_date') ?? '').slice(0, 10)
  const notesRaw = String(formData.get('notes') ?? '').trim().slice(0, 2000)
  const notes = notesRaw || null
  const iconRaw = String(formData.get('icon') ?? '').trim()
  const icon = iconRaw ? iconRaw.slice(0, 48) : null
  const customIntervalDays = billing_cycle === 'custom'
    ? Number(String(formData.get('custom_interval_days') ?? ''))
    : null

  const trialRaw = String(formData.get('free_trial_end_date') ?? '').slice(0, 10)
  const free_trial_end_date = trialRaw || null

  const cancellation_url = getSafeExternalUrl(String(formData.get('cancellation_url') ?? ''))
  const management_url = getSafeExternalUrl(String(formData.get('management_url') ?? ''))
  const pricing_url = getSafeExternalUrl(String(formData.get('pricing_url') ?? ''))

  const renewRaw = String(formData.get('renewal_type') ?? 'auto_renew')
  const renewal_type: RenewalType = renewRaw === 'manual' ? 'manual' : 'auto_renew'

  // Billing type
  const btRaw = String(formData.get('billing_type') ?? 'paid')
  const billing_type: BillingType = BILLING_TYPES.includes(btRaw as BillingType)
    ? (btRaw as BillingType)
    : 'paid'

  // plan_name
  const planNameRaw = String(formData.get('plan_name') ?? '').trim().slice(0, 120)
  const plan_name = planNameRaw || null

  // price_after_trial — only for trial type
  let price_after_trial: number | null = null
  if (billing_type === 'trial') {
    const patRaw = String(formData.get('price_after_trial') ?? '').replace(',', '.')
    const patNum = Number(patRaw)
    price_after_trial = Number.isFinite(patNum) && patNum > 0 ? patNum : null
  }

  // Derive amount from billing_type
  let amount: number
  if (billing_type === 'free' || billing_type === 'trial') {
    amount = 0
  } else {
    amount = Number(String(formData.get('amount') ?? '').replace(',', '.'))
  }

  if (name.length < 2) return { ok: false, code: 'name' }
  if (!first || !next) return { ok: false, code: 'dates' }
  if (billing_cycle === 'custom' && (!Number.isFinite(customIntervalDays) || (customIntervalDays ?? 0) <= 0)) {
    return { ok: false, code: 'custom' }
  }

  // Validate amount by billing type
  if (billing_type === 'paid' || billing_type === 'one_time') {
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, code: 'amount' }
  }
  if (billing_type === 'trial') {
    if (price_after_trial === null) return { ok: false, code: 'billing_type' }
  }

  return {
    ok: true,
    name,
    amount,
    currency,
    category_slug,
    billing_cycle,
    billing_interval: billingInterval,
    custom_interval_days: billing_cycle === 'custom' ? customIntervalDays : null,
    first_charge_date: first,
    next_charge_date: next,
    free_trial_end_date,
    renewal_type,
    cancellation_url,
    management_url,
    pricing_url,
    notes,
    icon,
    billing_type,
    price_after_trial,
    plan_name,
  }
}

export async function updateSubscriptionStatus(
  subscriptionId: string,
  nextStatus: 'active' | 'paused' | 'cancelled',
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Требуется авторизация')

  // Если отменяем — записываем в историю сохранений
  if (nextStatus === 'cancelled') {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('name, amount, currency, billing_cycle, billing_interval')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (sub) {
      const amountMonthly = toMonthlyAmount(
        Number(sub.amount) || 0,
        sub.billing_cycle ?? 'monthly',
        Number(sub.billing_interval) || 1,
      )
      await logSavingsAction({
        supabase,
        userId: user.id,
        subscriptionId,
        subscriptionName: sub.name,
        amountMonthly,
        currency: sub.currency ?? 'RUB',
        actionType: 'cancelled',
      })
    }
  }

  const patch = subscriptionStatusPatch(nextStatus)

  const { error } = await supabase
    .from('subscriptions')
    .update(patch)
    .eq('id', subscriptionId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidateDashboard(user.id)
  revalidatePath(`/dashboard/subscriptions/${subscriptionId}`)
  revalidatePath(`/dashboard/subscriptions/${subscriptionId}/edit`)
}

export async function updateSubscriptionFields(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = String(formData.get('subscription_id') ?? '').trim()
  if (!id) redirect('/dashboard')

  const { data: existing, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('billing_interval, currency')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchErr || !existing) {
    redirect(`/dashboard/subscriptions/${id}/edit?error=save`)
  }

  const billingInterval = Number(existing.billing_interval) > 0 ? Number(existing.billing_interval) : 1
  const parsed = parseSubscriptionForm(formData, billingInterval)
  if (!parsed.ok) {
    redirect(`/dashboard/subscriptions/${id}/edit?error=${parsed.code}`)
  }

  const statusRaw = String(formData.get('subscription_status') ?? '').trim()
  const allowedStatus: SubscriptionStatus[] = ['active', 'paused', 'cancelled', 'archived']
  const nextStatus = allowedStatus.includes(statusRaw as SubscriptionStatus)
    ? (statusRaw as SubscriptionStatus)
    : null

  let viz: SubcuroEditViz | null = null
  const vizRaw = String(formData.get('subcuro_viz') ?? '').trim()
  if (vizRaw) {
    try {
      viz = JSON.parse(vizRaw) as SubcuroEditViz
    } catch {
      viz = null
    }
  }
  const mergedNotes = mergeUserNotesWithViz(parsed.notes, viz)

  // Currency on update: keep the submitted value if it's allowed; otherwise, if
  // the user left an existing exotic currency unchanged, preserve it (don't
  // silently convert an old TRY/KZT/GBP subscription to RUB); else fall back to RUB.
  const submittedCurrency = String(formData.get('currency') ?? '').toUpperCase()
  const existingCurrency = String(existing.currency ?? '').toUpperCase()
  const resolvedCurrency: string = ALLOWED_CURRENCIES.includes(submittedCurrency as AllowedCurrency)
    ? submittedCurrency
    : submittedCurrency && submittedCurrency === existingCurrency
      ? existingCurrency
      : 'RUB'

  const baseUpdate = {
    name: parsed.name,
    amount: parsed.amount,
    currency: resolvedCurrency,
    category_slug: parsed.category_slug,
    billing_cycle: parsed.billing_cycle,
    billing_interval: parsed.billing_interval,
    custom_interval_days: parsed.custom_interval_days,
    first_charge_date: parsed.first_charge_date,
    next_charge_date: parsed.next_charge_date,
    free_trial_end_date: parsed.free_trial_end_date,
    renewal_type: parsed.renewal_type,
    cancellation_url: parsed.cancellation_url,
    management_url: parsed.management_url,
    pricing_url: parsed.pricing_url,
    notes: mergedNotes,
    card_color_preset: viz ? vizFillToColorPreset(viz.cardFill) : null,
    icon: parsed.icon,
    billing_type: parsed.billing_type,
    price_after_trial: parsed.price_after_trial,
    plan_name: parsed.plan_name,
    ...(nextStatus ? subscriptionStatusPatch(nextStatus) : {}),
  }

  const { error } = await supabase.from('subscriptions').update(baseUpdate).eq('id', id).eq('user_id', user.id)

  if (error) {
    redirect(`/dashboard/subscriptions/${id}/edit?error=save`)
  }

  // Не ждём reminder — не блокирует ответ
  void upsertAutoRenewalReminder(supabase, user.id, id, parsed.next_charge_date)

  revalidateDashboard(user.id)
  revalidatePath(`/dashboard/subscriptions/${id}`)

  // Пришли из списка платежей — возвращаемся туда с авто-открытием панели (1 клик)
  const from = String(formData.get('from') ?? '')
  if (from === 'payments') {
    redirect(`/dashboard?tab=payments&openSub=${id}&subscriptionSaved=1`)
  }
  redirect(`/dashboard/subscriptions/${id}/edit?saved=1`)
}

function afterCreateTarget(formData: FormData): 'detail' | 'payments' {
  return String(formData.get('after_create') ?? '').trim() === 'payments' ? 'payments' : 'detail'
}

export async function createSubscription(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const back = afterCreateTarget(formData)
  const parsed = parseSubscriptionForm(formData, 1)
  if (!parsed.ok) {
    if (back === 'payments') {
      redirect(`/dashboard?tab=payments&subscriptionFormError=${parsed.code}`)
    }
    redirect(`/dashboard/subscriptions/new?error=${parsed.code}`)
  }

  const newId = crypto.randomUUID()

  // Запускаем загрузку category_id параллельно с insert — не ждём последовательно
  const [categoryMap, insertResult] = await Promise.all([
    loadCategoryIdBySlug(supabase, user.id, [parsed.category_slug]),
    supabase.from('subscriptions').insert({
      id: newId,
      user_id: user.id,
      category_id: null, // обновим ниже если нужно
      category_slug: parsed.category_slug,
      name: parsed.name,
      amount: parsed.amount,
      currency: parsed.currency,
      billing_cycle: parsed.billing_cycle,
      billing_interval: parsed.billing_interval,
      custom_interval_days: parsed.custom_interval_days,
      first_charge_date: parsed.first_charge_date,
      next_charge_date: parsed.next_charge_date,
      free_trial_end_date: parsed.free_trial_end_date,
      renewal_type: parsed.renewal_type,
      cancellation_url: parsed.cancellation_url,
      management_url: parsed.management_url,
      pricing_url: parsed.pricing_url,
      notes: parsed.notes,
      icon: parsed.icon,
      billing_type: parsed.billing_type,
      price_after_trial: parsed.price_after_trial,
      plan_name: parsed.plan_name,
      status: 'active',
    }),
  ])

  if (insertResult.error) {
    if (back === 'payments') {
      redirect('/dashboard?tab=payments&subscriptionFormError=save')
    }
    redirect('/dashboard/subscriptions/new?error=save')
  }

  // Обновляем category_id и запускаем reminder — оба не блокируют redirect
  const categoryId = categoryMap.get(parsed.category_slug) ?? null
  void Promise.all([
    categoryId
      ? supabase.from('subscriptions').update({ category_id: categoryId }).eq('id', newId)
      : Promise.resolve(),
    upsertAutoRenewalReminder(supabase, user.id, newId, parsed.next_charge_date),
  ])

  revalidateDashboard(user.id)
  if (back === 'payments') {
    redirect('/dashboard?tab=payments&subscriptionCreated=1')
  }
  redirect(`/dashboard/subscriptions/${newId}`)
}

export async function markAsPaid(subscriptionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Требуется авторизация')

  const { data: sub, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('next_charge_date, billing_cycle, billing_interval, custom_interval_days, amount, currency')
    .eq('id', subscriptionId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !sub) throw new Error('Подписка не найдена')

  const base = sub.next_charge_date ?? new Date().toISOString().slice(0, 10)
  const nextDate = advanceBillingDate(
    base,
    sub.billing_cycle as BillingCycle,
    Number(sub.billing_interval) || 1,
    sub.custom_interval_days,
  )
  await supabase.from('subscription_payments').insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    subscription_id: subscriptionId,
    charged_for_date: base,
    amount: Number(sub.amount) || 0,
    currency: sub.currency ?? 'RUB',
  })

  const { error } = await supabase
    .from('subscriptions')
    .update({ next_charge_date: nextDate })
    .eq('id', subscriptionId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidateDashboard(user.id)
  revalidatePath(`/dashboard/subscriptions/${subscriptionId}`)
}

export async function archiveSubscription(subscriptionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Требуется авторизация')

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'archived',
      archived_at: nowIso(),
    })
    .eq('id', subscriptionId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidateDashboard(user.id)
  revalidatePath(`/dashboard/subscriptions/${subscriptionId}`)
  revalidatePath(`/dashboard/subscriptions/${subscriptionId}/edit`)
}

export async function markLastUsed(subscriptionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Требуется авторизация')

  const { error } = await supabase
    .from('subscriptions')
    .update({ last_used_at: nowIso() })
    .eq('id', subscriptionId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidateDashboard(user.id)
  revalidatePath(`/dashboard/subscriptions/${subscriptionId}`)
}

export async function deleteSubscription(subscriptionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Требуется авторизация')

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', subscriptionId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidateDashboard(user.id)
}
