import { createClient } from '@/lib/supabase/server'
import type { Reminder, Subscription } from '@/lib/supabase/types'
import { redirect } from 'next/navigation'
import SettingsPageClient from './SettingsPageClient'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    pwd_ok?: string
    pwd_error?: string
    error?: string
  }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams

  const { data: settingsRow } = await supabase
    .from('user_settings')
    .select('push_enabled, price_alerts_enabled, price_alert_min_change_pct, price_alert_digest')
    .eq('user_id', user.id)
    .maybeSingle()

  const pushRaw = settingsRow as {
    push_enabled?: boolean
    price_alerts_enabled?: boolean
    price_alert_min_change_pct?: number | string
    price_alert_digest?: 'instant' | 'daily' | 'weekly'
  } | null
  const pushEnabled = Boolean(pushRaw?.push_enabled)
  const priceAlertsEnabled = pushRaw?.price_alerts_enabled !== false
  const priceAlertMinChangePct = Number(pushRaw?.price_alert_min_change_pct ?? 3) || 3
  const priceAlertDigest = pushRaw?.price_alert_digest ?? 'instant'

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('next_charge_date', { ascending: true })

  const subs = (subscriptions ?? []) as Subscription[]
  const { data: priceAlertReminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'price_check')
    .order('created_at', { ascending: false })
    .limit(12)
  const reminderHistory = (priceAlertReminders ?? []) as Reminder[]

  return (
    <main className="max-w-[1180px] px-6 py-6 pb-8">
      <SettingsPageClient
        subs={subs}
        pushEnabledInitial={pushEnabled}
        priceAlertsEnabledInitial={priceAlertsEnabled}
        priceAlertMinChangePctInitial={priceAlertMinChangePct}
        priceAlertDigestInitial={priceAlertDigest}
        reminderHistory={reminderHistory}
        pwdOk={sp.pwd_ok === '1'}
        pwdError={sp.pwd_error ?? null}
        error={sp.error ?? null}
      />
    </main>
  )
}
