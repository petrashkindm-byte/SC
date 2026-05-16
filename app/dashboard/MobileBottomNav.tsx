'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useLang } from '@/lib/LangContext'

const ITEMS = [
  { id: 'today', href: '/dashboard', match: (pathname: string, tab: string) => pathname === '/dashboard' && tab === 'today' },
  { id: 'payments', href: '/dashboard?tab=payments', match: (pathname: string, tab: string) => (pathname === '/dashboard' && tab === 'payments') || pathname.startsWith('/dashboard/subscriptions') || pathname.startsWith('/dashboard/import') || pathname.startsWith('/dashboard/collections') },
  { id: 'savings', href: '/dashboard/savings', match: (pathname: string) => pathname.startsWith('/dashboard/savings') },
  { id: 'profile', href: '/dashboard/profile', match: (pathname: string) => pathname.startsWith('/dashboard/profile') || pathname.startsWith('/dashboard/settings') },
] as const

export default function MobileBottomNav() {
  const pathname = usePathname()
  const tab = useSearchParams().get('tab') ?? 'today'
  const { strings } = useLang()
  const nav = strings.nav
  const labels: Record<string, string> = {
    today: nav.today,
    payments: nav.payments,
    savings: nav.savings,
    profile: nav.profile,
  }
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(26,26,61,0.08)] bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-[680px] items-center justify-between gap-1">
        {ITEMS.map((item) => {
          const active = item.match(pathname, tab)
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex min-w-0 flex-1 justify-center rounded-lg px-2 py-2 text-[11px] font-semibold ${
                active ? 'bg-[#ede9fc] text-[#5b43d4]' : 'text-[#6b6b80]'
              }`}
            >
              {labels[item.id]}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
