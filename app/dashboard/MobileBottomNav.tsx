'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useLang } from '@/lib/LangContext'
import { useTabContext, type DashboardTab } from './TabContext'

// Tabs that live inside /dashboard and switch via TabContext (no full navigation)
const DASHBOARD_TABS: { id: DashboardTab; match: (pathname: string, tab: string) => boolean }[] = [
  { id: 'today',    match: (p, t) => p === '/dashboard' && t === 'today' },
  { id: 'payments', match: (p, t) => (p === '/dashboard' && t === 'payments') || p.startsWith('/dashboard/subscriptions') || p.startsWith('/dashboard/import') || p.startsWith('/dashboard/collections') },
]

// Tabs that navigate to a different route
const ROUTE_ITEMS = [
  { id: 'savings', href: '/dashboard/savings', match: (p: string) => p.startsWith('/dashboard/savings') },
  { id: 'profile', href: '/dashboard/profile', match: (p: string) => p.startsWith('/dashboard/profile') || p.startsWith('/dashboard/settings') },
]

export default function MobileBottomNav() {
  const pathname = usePathname()
  const tab = useSearchParams().get('tab') ?? 'today'
  const { setTab } = useTabContext()
  const { strings } = useLang()
  const nav = strings.nav
  const labels: Record<string, string> = {
    today: nav.today,
    payments: nav.payments,
    savings: nav.savings,
    profile: nav.profile,
  }

  const btnClass = (active: boolean) =>
    `flex min-w-0 flex-1 justify-center rounded-lg px-2 py-2 text-[11px] font-semibold ${
      active ? 'bg-[#ede9fc] text-[#5b43d4]' : 'text-[#6b6b80]'
    }`

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(26,26,61,0.08)] bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-[680px] items-center justify-between gap-1">
        {DASHBOARD_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={btnClass(item.match(pathname, tab))}
          >
            {labels[item.id]}
          </button>
        ))}
        {ROUTE_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={btnClass(item.match(pathname))}
          >
            {labels[item.id]}
          </Link>
        ))}
      </div>
    </nav>
  )
}
