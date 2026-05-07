import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSidebar from './DashboardSidebar'
import MobileBottomNav from './MobileBottomNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const { count: paymentsCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .neq('status', 'archived')

  const { count: actionsCount } = await supabase
    .from('reminders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('enabled', true)

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

  return (
    <div className="min-h-screen flex bg-[#f5f0e8] text-[#1a1a2e]">
      <div className="hidden md:block">
        <DashboardSidebar
          displayName={displayName}
          paymentsCount={paymentsCount ?? 0}
          actionsCount={actionsCount ?? 0}
        />
      </div>
      <div className="flex-1 min-w-0 pb-20 md:pb-0">{children}</div>
      <MobileBottomNav />
    </div>
  )
}
