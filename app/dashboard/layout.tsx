import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSidebar from './DashboardSidebar'
import MobileBottomNav from './MobileBottomNav'
import { LangProvider } from '@/lib/LangContext'
import { TabProvider } from './TabContext'
import { getCachedDashboardData } from '@/lib/dashboard-cache'
import AppToast from './ui/AppToast'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Auth + profile in parallel — profile is small (1 row)
  const [{ data: { user } }, ] = await Promise.all([
    supabase.auth.getUser(),
  ])
  if (!user) redirect('/login')

  // Use cached subs (same cache as page.tsx) — no extra query for the badge count
  const [profileResult, { subs }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    getCachedDashboardData(user.id),
  ])

  const profile = profileResult.data
  const paymentsCount = subs.filter((s) => s.status !== 'archived').length

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
    <LangProvider>
      {/* TabProvider needs Suspense because it uses useSearchParams */}
      <Suspense fallback={null}>
        <TabProvider>
          <div className="h-screen flex overflow-hidden bg-background text-foreground">
            <div className="relative z-0 hidden md:flex md:shrink-0">
              <DashboardSidebar
                displayName={displayName}
                paymentsCount={paymentsCount}
              />
            </div>
            <div className="relative z-10 flex-1 min-w-0 overflow-y-auto pb-20 md:pb-0">{children}</div>
            <MobileBottomNav />
            <AppToast />
          </div>
        </TabProvider>
      </Suspense>
    </LangProvider>
  )
}
