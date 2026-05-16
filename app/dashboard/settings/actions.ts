'use server'

import { createClient } from '@/lib/supabase/server'
import type { PriceAlertDigest } from '@/lib/supabase/types'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const BASE_CURRENCIES = ['RUB', 'USD', 'EUR'] as const
const PRICE_ALERT_DIGESTS = ['instant', 'daily', 'weekly'] as const

export async function setBaseCurrency(currency: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const c = currency.toUpperCase()
  const base_currency = (BASE_CURRENCIES as readonly string[]).includes(c) ? c : 'RUB'

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, base_currency }, { onConflict: 'user_id' })

  if (error) redirect('/dashboard/profile?error=save')

  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
}

export async function updateFullName(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const fullNameRaw = String(formData.get('full_name') ?? '').trim()
  const full_name = fullNameRaw.length > 0 ? fullNameRaw : null

  const { error } = await supabase.from('profiles').update({ full_name }).eq('id', user.id)

  if (error) redirect('/dashboard/profile?error=profile')

  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard')
  redirect('/dashboard/profile?saved=1')
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function deleteMyDataAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.rpc('delete_my_data')

  if (error) redirect('/dashboard/profile?error=delete')

  await supabase.auth.signOut()
  redirect('/login')
}

export async function setPushEnabled(enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthenticated' }

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, push_enabled: enabled }, { onConflict: 'user_id' })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function setPriceAlertPreferences(input: {
  enabled: boolean
  minChangePct: number
  digest: PriceAlertDigest
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const min = Number.isFinite(input.minChangePct) ? Math.max(1, Math.min(50, input.minChangePct)) : 3
  const digest: PriceAlertDigest = (PRICE_ALERT_DIGESTS as readonly string[]).includes(input.digest)
    ? input.digest
    : 'instant'

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      price_alerts_enabled: Boolean(input.enabled),
      price_alert_min_change_pct: min,
      price_alert_digest: digest,
    }, { onConflict: 'user_id' })

  if (error) redirect('/dashboard/settings?error=price_alerts')

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const nextRaw = String(formData.get('next') ?? '/dashboard/profile')
  const next = nextRaw.startsWith('/dashboard/') ? nextRaw : '/dashboard/profile'

  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('password_confirm') ?? '')

  if (password.length < 6) {
    redirect(`${next}?pwd_error=short`)
  }
  if (password !== confirm) {
    redirect(`${next}?pwd_error=mismatch`)
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(`${next}?pwd_error=auth`)
  }

  redirect(`${next}?pwd_ok=1`)
}
