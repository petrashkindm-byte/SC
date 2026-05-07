'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const ITEMS = [
  { id: 'today', href: '/dashboard?tab=today', label: 'Сегодня', icon: 'calendar' },
  { id: 'payments', href: '/dashboard?tab=payments', label: 'Платежи', icon: 'wallet' },
  { id: 'actions', href: '/dashboard/reminders', label: 'Действия', icon: 'zap' },
  { id: 'analytics', href: '/dashboard?tab=analytics', label: 'Аналитика', icon: 'chart' },
  { id: 'savings', href: '/dashboard/savings', label: 'Симулятор', icon: 'calc' },
  { id: 'divider-main', divider: true },
  { id: 'profile', href: '/dashboard/profile', label: 'Профиль', icon: 'user' },
  { id: 'settings', href: '/dashboard/settings', label: 'Настройки', icon: 'gear' },
] as const

function NavIcon({ type }: { type: string }) {
  const cls = 'h-[22px] w-[22px]'
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (type === 'calendar') {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    )
  }
  if (type === 'wallet') {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}>
        <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
        <path d="M16 12h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z" />
        <circle cx="17.5" cy="14" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (type === 'zap') {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}>
        <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
      </svg>
    )
  }
  if (type === 'chart') {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}>
        <path d="M4 20V10M12 20V4M20 20v-6" />
      </svg>
    )
  }
  if (type === 'calc') {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M8 6h8M8 10h2M12 10h2M16 10h2M8 14h2M12 14h2M16 14h2M8 18h8" />
      </svg>
    )
  }
  if (type === 'user') {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
      </svg>
    )
  }
  if (type === 'upload') {
    return (
      <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

type DashboardSidebarProps = {
  displayName: string
  paymentsCount: number
  actionsCount: number
}

export default function DashboardSidebar({ displayName, paymentsCount, actionsCount }: DashboardSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const dashboardTab = searchParams.get('tab') ?? 'today'
  const userInitial = displayName.trim().charAt(0).toUpperCase() || 'U'

  return (
    <aside className="w-[250px] shrink-0 bg-[#1a1a3d] text-white px-3 py-4 min-h-screen sticky top-0 flex flex-col">
      <div className="flex items-center gap-2 px-2 pb-4">
        <Image src="/subcuro_ribbon_s_transparent.png?v=20260505b" width={28} height={28} alt="Subcuro" />
        <span className="font-semibold text-lg tracking-tight">Subcuro</span>
      </div>

      <nav className="space-y-1">
        {ITEMS.map((it) => {
          if ('divider' in it) {
            return <div key={it.id} className="my-3 h-px bg-white/15" />
          }
          const itHref = (it as { href: string }).href
          let active = false
          if (it.id === 'profile') active = pathname.startsWith('/dashboard/profile')
          else if (it.id === 'settings') active = pathname.startsWith('/dashboard/settings')
          else if (it.id === 'actions') active = pathname.startsWith('/dashboard/reminders')
          else if (it.id === 'savings') active = pathname === '/dashboard/savings' || pathname.startsWith('/dashboard/savings/')
          else if (it.id === 'today' || it.id === 'payments' || it.id === 'analytics')
            active = pathname === '/dashboard' && dashboardTab === it.id
          else active = pathname === itHref || pathname.startsWith(itHref)
          const badgeValue = it.id === 'payments' ? paymentsCount : it.id === 'actions' ? actionsCount : 0
          const badgeClass = it.id === 'payments' ? 'green' : 'red'
          return (
            <Link
              key={it.id}
              href={itHref}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                active ? 'bg-[#5b43d4] text-white' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span className="w-8 h-6 inline-flex items-center justify-center">
                <NavIcon type={(it as { icon: string }).icon} />
              </span>
              <span>{(it as { label: string }).label}</span>
              {badgeValue > 0 ? (
                <span
                  className={`ml-auto h-8 min-w-8 rounded-full px-2 text-xs font-semibold flex items-center justify-center ${
                    badgeClass === 'green' ? 'bg-[#12b76a] text-white' : 'bg-[#e5484d] text-white'
                  }`}
                >
                  {badgeValue}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto mb-5 border-t border-white/15 pt-4 px-2">
        <div className="rounded-xl bg-black/20 p-3 flex items-center gap-3">
          <Link href="/dashboard/profile" className="min-w-0 flex flex-1 items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#6b55f6] text-white text-base font-semibold flex items-center justify-center">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{displayName}</p>
            </div>
          </Link>
          <span className="inline-flex h-8 w-8 items-center justify-center text-white/60" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </div>
      </div>
    </aside>
  )
}
