'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const ITEMS = [
  { id: 'today', label: 'Сегодня', href: '/dashboard', match: (pathname: string, tab: string) => pathname === '/dashboard' && tab === 'today' },
  { id: 'payments', label: 'Платежи', href: '/dashboard?tab=payments', match: (pathname: string, tab: string) => pathname === '/dashboard' && tab === 'payments' },
  { id: 'actions', label: 'Действия', href: '/dashboard/reminders', match: (pathname: string) => pathname.startsWith('/dashboard/reminders') },
  { id: 'savings', label: 'Экономия', href: '/dashboard/savings', match: (pathname: string) => pathname.startsWith('/dashboard/savings') },
  { id: 'profile', label: 'Профиль', href: '/dashboard/profile', match: (pathname: string) => pathname.startsWith('/dashboard/profile') },
] as const

export default function MobileBottomNav() {
  const pathname = usePathname()
  const tab = useSearchParams().get('tab') ?? 'today'
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
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
