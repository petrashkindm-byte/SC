import { createClient } from '@/lib/supabase/server'
import ProfilePageClient from './ProfilePageClient'
import type { Subscription } from '@/lib/supabase/types'
import { redirect } from 'next/navigation'

const DEFAULT_SETTINGS = {
  base_currency: 'RUB',
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string
    error?: string
    pwd_ok?: string
    pwd_error?: string
  }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()

  const { data: settingsRow } = await supabase
    .from('user_settings')
    .select('base_currency')
    .eq('user_id', user.id)
    .maybeSingle()

  const raw = settingsRow as Record<string, unknown> | null
  const base_currency =
    typeof raw?.base_currency === 'string' ? raw.base_currency : DEFAULT_SETTINGS.base_currency

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('next_charge_date', { ascending: true })

  const subs = (subscriptions ?? []) as Subscription[]

  const profileRow = profile as { full_name?: string | null } | null
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const metadataNameParts = [metadata.first_name, metadata.last_name]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim())
    .join(' ')

  const metadataDisplayNameCandidates = [
    profileRow?.full_name,
    typeof metadata.full_name === 'string' ? metadata.full_name : null,
    typeof metadata.name === 'string' ? metadata.name : null,
    metadataNameParts || null,
    typeof metadata.given_name === 'string' ? metadata.given_name : null,
    typeof metadata.nickname === 'string' ? metadata.nickname : null,
    user.email?.split('@')[0] ?? null,
  ]
  const displayName =
    metadataDisplayNameCandidates.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() ??
    'Пользователь'

  const isSyntheticVkEmail = /^vk\d+@users\.subcuro\.app$/.test(user.email ?? '')

  return (
    <main className="max-w-[1180px] px-6 py-6 pb-8">
      <ProfilePageClient
        displayName={displayName}
        email={isSyntheticVkEmail ? null : user.email ?? null}
        isVkAccount={isSyntheticVkEmail}
        fullName={profileRow?.full_name ?? null}
        baseCurrency={base_currency}
        subs={subs}
        saved={sp.saved === '1'}
        error={sp.error ?? null}
        pwdOk={sp.pwd_ok === '1'}
        pwdError={sp.pwd_error ?? null}
      />
    </main>
  )
}
