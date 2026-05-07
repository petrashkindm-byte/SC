'use server'

import { createClient } from '@/lib/supabase/server'
import type { ReminderChannel, ReminderType } from '@/lib/supabase/types'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const REMINDER_TYPES: ReminderType[] = ['trial_end', 'renewal', 'price_check']
const CHANNELS: ReminderChannel[] = ['local_push', 'email', 'in_app']

export async function setReminderEnabled(reminderId: string, enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Требуется авторизация')

  const { error } = await supabase
    .from('reminders')
    .update({ enabled })
    .eq('id', reminderId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/reminders')
}

export async function createReminder(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const subscription_id = String(formData.get('subscription_id') ?? '').trim()
  const iso = String(formData.get('remind_at_iso') ?? '').trim()
  const typeRaw = String(formData.get('type') ?? 'renewal')
  const type: ReminderType = REMINDER_TYPES.includes(typeRaw as ReminderType)
    ? (typeRaw as ReminderType)
    : 'renewal'
  const channelRaw = String(formData.get('channel') ?? 'in_app')
  const channel: ReminderChannel = CHANNELS.includes(channelRaw as ReminderChannel)
    ? (channelRaw as ReminderChannel)
    : 'in_app'

  if (!subscription_id || !iso) {
    redirect('/dashboard/reminders?error=form')
  }

  const when = new Date(iso)
  if (Number.isNaN(when.getTime())) {
    redirect('/dashboard/reminders?error=date')
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('id', subscription_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!sub) {
    redirect('/dashboard/reminders?error=sub')
  }

  const id = crypto.randomUUID()

  const { error } = await supabase.from('reminders').insert({
    id,
    user_id: user.id,
    subscription_id,
    remind_at: when.toISOString(),
    channel,
    type,
    enabled: true,
  })

  if (error) {
    redirect('/dashboard/reminders?error=save')
  }

  revalidatePath('/dashboard/reminders')
  redirect('/dashboard/reminders?created=1')
}

export async function deleteReminder(reminderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Требуется авторизация')

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/reminders')
}

function shiftDateIso(dateYmd: string, deltaDays: number): string {
  const d = new Date(`${dateYmd}T12:00:00`)
  d.setDate(d.getDate() + deltaDays)
  return d.toISOString()
}

/** Напоминания из редактора подписки: создать/удалить по типу. */
export async function setSubscriptionReminderKind(
  subscriptionId: string,
  kind: ReminderType,
  enabled: boolean,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Требуется авторизация')

  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('id, next_charge_date, free_trial_end_date')
    .eq('id', subscriptionId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (subErr || !sub) throw new Error('Подписка не найдена')

  if (!enabled) {
    await supabase.from('reminders').delete().eq('subscription_id', subscriptionId).eq('type', kind)
    revalidatePath('/dashboard/reminders')
    revalidatePath(`/dashboard/subscriptions/${subscriptionId}/edit`)
    return
  }

  const next = sub.next_charge_date.slice(0, 10)
  let remindAtIso: string | null = null
  if (kind === 'renewal') {
    remindAtIso = shiftDateIso(next, -3)
  } else if (kind === 'trial_end') {
    const trial = sub.free_trial_end_date?.slice(0, 10)
    if (!trial) throw new Error('Нет даты окончания пробного периода')
    remindAtIso = shiftDateIso(trial, -3)
  } else if (kind === 'price_check') {
    remindAtIso = shiftDateIso(next, -1)
  }

  if (!remindAtIso) throw new Error('Не удалось вычислить дату напоминания')

  await supabase.from('reminders').delete().eq('subscription_id', subscriptionId).eq('type', kind)

  const id = crypto.randomUUID()
  const { error } = await supabase.from('reminders').insert({
    id,
    user_id: user.id,
    subscription_id: subscriptionId,
    remind_at: remindAtIso,
    channel: 'in_app',
    type: kind,
    enabled: true,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/reminders')
  revalidatePath(`/dashboard/subscriptions/${subscriptionId}/edit`)
}
