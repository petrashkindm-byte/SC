import { createClient } from '@/lib/supabase/server'
import type { Subscription } from '@/lib/supabase/types'
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
    .select('push_enabled')
    .eq('user_id', user.id)
    .maybeSingle()

  const pushRaw = settingsRow as { push_enabled?: boolean } | null
  const pushEnabled = Boolean(pushRaw?.push_enabled)

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('next_charge_date', { ascending: true })

  const subs = (subscriptions ?? []) as Subscription[]

  return (
    <main className="max-w-[1180px] px-6 py-6 pb-8">
      <SettingsPageClient
        subs={subs}
        pushEnabledInitial={pushEnabled}
        pwdOk={sp.pwd_ok === '1'}
        pwdError={sp.pwd_error ?? null}
        error={sp.error ?? null}
      />
    </main>
  )
}
