'use server'

import { createClient } from '@/lib/supabase/server'
import { loadCategoryIdBySlug } from '@/lib/category-id'
import { mergeUserNotesWithViz, type SubcuroEditViz } from '@/lib/subscription-viz-notes'
import type {
  BillingCycle,
  CategorySlug,
  Database,
  RenewalType,
  SubscriptionStatus,
} from '@/lib/supabase/types'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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
      notes: string | null
      icon: string | null
    }
  | { ok: false; code: 'name' | 'amount' | 'dates' | 'custom' }

function parseSubscriptionForm(formData: FormData, billingInterval: number): ParsedForm {
  const name = String(formData.get('name') ?? '').trim()
  const amount = Number(String(formData.get('amount') ?? '').replace(',', '.'))
  const currencyRaw = String(formData.get('currency') ?? 'USD').toUpperCase()
  const currency = currencyRaw.length === 3 ? currencyRaw : 'USD'
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
  const notesRaw = String(formData.get('notes') ?? '').trim()
  const notes = notesRaw || null
  const iconRaw = String(formData.get('icon') ?? '').trim()
  const icon = iconRaw ? iconRaw.slice(0, 48) : null
  const customIntervalDays = billing_cycle === 'custom'
    ? Number(String(formData.get('custom_interval_days') ?? ''))
    : null

  const trialRaw = String(formData.get('free_trial_end_date') ?? '').slice(0, 10)
  const free_trial_end_date = trialRaw || null

  const cancelRaw = String(formData.get('cancellation_url') ?? '').trim()
  const cancellation_url = cancelRaw || null
  const manageRaw = String(formData.get('management_url') ?? '').trim()
  const management_url = manageRaw || null

  const renewRaw = String(formData.get('renewal_type') ?? 'auto_renew')
  const renewal_type: RenewalType = renewRaw === 'manual' ? 'manual' : 'auto_renew'

  if (name.length < 2) return { ok: false, code: 'name' }
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, code: 'amount' }
  if (!first || !next) return { ok: false, code: 'dates' }
  if (billing_cycle === 'custom' && (!Number.isFinite(customIntervalDays) || (customIntervalDays ?? 0) <= 0)) {
    return { ok: false, code: 'custom' }
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
    notes,
    icon,
  }
}

export async function updateSubscriptionStatus(
  subscriptionId: string,
  nextStatus: 'active' | 'paused' | 'cancelled',
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Требуется авторизация')

  const patch = subscriptionStatusPatch(nextStatus)

  const { error } = await supabase
    .from('subscriptions')
    .update(patch)
    .eq('id', subscriptionId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/reminders')
  revalidatePath('/dashboard/savings')
  revalidatePath('/dashboard/collections')
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
    .select('billing_interval')
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

  const baseUpdate = {
    name: parsed.name,
    amount: parsed.amount,
    currency: parsed.currency,
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
    notes: mergedNotes,
    icon: parsed.icon,
    ...(nextStatus ? subscriptionStatusPatch(nextStatus) : {}),
  }

  const { error } = await supabase.from('subscriptions').update(baseUpdate).eq('id', id).eq('user_id', user.id)

  if (error) {
    redirect(`/dashboard/subscriptions/${id}/edit?error=save`)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/reminders')
  revalidatePath('/dashboard/savings')
  revalidatePath('/dashboard/collections')
  revalidatePath(`/dashboard/subscriptions/${id}`)
  revalidatePath(`/dashboard/subscriptions/${id}/edit`)
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
  const categoryMap = await loadCategoryIdBySlug(supabase, user.id, [parsed.category_slug])

  const { error } = await supabase.from('subscriptions').insert({
    id: newId,
    user_id: user.id,
    category_id: categoryMap.get(parsed.category_slug) ?? null,
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
    notes: parsed.notes,
    icon: parsed.icon,
    status: 'active',
  })

  if (error) {
    if (back === 'payments') {
      redirect('/dashboard?tab=payments&subscriptionFormError=save')
    }
    redirect('/dashboard/subscriptions/new?error=save')
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/collections')
  if (back === 'payments') {
    redirect('/dashboard?tab=payments&subscriptionCreated=1')
  }
  redirect(`/dashboard/subscriptions/${newId}`)
}

/** Вычисляет следующую дату оплаты, сдвигая от baseDate на один платёжный цикл */
function advanceDate(
  baseDate: string,
  cycle: BillingCycle,
  interval: number,
  customDays: number | null,
): string {
  const d = new Date(baseDate)
  const n = Math.max(1, interval)
  switch (cycle) {
    case 'weekly':
      d.setDate(d.getDate() + 7 * n)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + n)
      break
    case 'quarterly':
      d.setMonth(d.getMonth() + 3 * n)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + n)
      break
    case 'custom':
      d.setDate(d.getDate() + (customDays ?? 30) * n)
      break
  }
  return d.toISOString().slice(0, 10)
}

export async function markAsPaid(subscriptionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Требуется авторизация')

  const { data: sub, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('next_charge_date, billing_cycle, billing_interval, custom_interval_days')
    .eq('id', subscriptionId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !sub) throw new Error('Подписка не найдена')

  const base = sub.next_charge_date ?? new Date().toISOString().slice(0, 10)
  const nextDate = advanceDate(
    base,
    sub.billing_cycle as BillingCycle,
    Number(sub.billing_interval) || 1,
    sub.custom_interval_days,
  )

  const { error } = await supabase
    .from('subscriptions')
    .update({ next_charge_date: nextDate })
    .eq('id', subscriptionId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/reminders')
  revalidatePath('/dashboard/savings')
  revalidatePath('/dashboard/collections')
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

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/collections')
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

  revalidatePath(`/dashboard/subscriptions/${subscriptionId}`)
  revalidatePath('/dashboard')
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

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/collections')
}
