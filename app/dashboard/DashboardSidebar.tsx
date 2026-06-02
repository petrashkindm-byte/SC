'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useRef } from 'react'
import { useLang } from '@/lib/LangContext'
import { useTabContext, type DashboardTab } from './TabContext'

// ── Per-route color config ────────────────────────────────────
const NAV_COLORS: Record<string, { color: string; bg: string; ripple: string }> = {
  today:    { color: '#a78bfa', bg: 'rgba(108,92,231,0.22)',  ripple: 'rgba(108,92,231,0.35)' },
  payments: { color: '#34d399', bg: 'rgba(0,184,148,0.20)',   ripple: 'rgba(0,184,148,0.32)'  },
  analytics:{ color: '#60a5fa', bg: 'rgba(9,132,227,0.20)',   ripple: 'rgba(9,132,227,0.32)'  },
  savings:  { color: '#fb923c', bg: 'rgba(225,112,85,0.20)',  ripple: 'rgba(225,112,85,0.32)' },
  profile:  { color: '#c4b5fd', bg: 'rgba(162,155,254,0.22)', ripple: 'rgba(162,155,254,0.35)'},
  settings: { color: '#cbd5e1', bg: 'rgba(178,190,195,0.18)', ripple: 'rgba(178,190,195,0.30)'},
}

const NAV_IDS = ['today', 'payments', 'analytics', 'savings', 'divider-main', 'profile', 'settings'] as const
const NAV_HREFS: Record<string, string> = {
  today:    '/dashboard?tab=today',
  payments: '/dashboard?tab=payments',
  analytics:'/dashboard?tab=analytics',
  savings:  '/dashboard/savings',
  profile:  '/dashboard/profile',
  settings: '/dashboard/settings',
}
const NAV_ICONS: Record<string, string> = {
  today:    'calendar',
  payments: 'wallet',
  analytics:'chart',
  savings:  'calc',
  profile:  'user',
  settings: 'gear',
}

function NavIcon({ type }: { type: string }) {
  const cls = 'h-[22px] w-[22px]'
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (type === 'calendar') return (
    <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
  if (type === 'wallet') return (
    <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}>
      <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
      <path d="M16 12h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z" />
      <circle cx="17.5" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
  if (type === 'chart') return (
    <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}>
      <path d="M4 20V10M12 20V4M20 20v-6" />
    </svg>
  )
  if (type === 'calc') return (
    <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h2M12 10h2M16 10h2M8 14h2M12 14h2M16 14h2M8 18h8" />
    </svg>
  )
  if (type === 'user') return (
    <svg viewBox="0 0 24 24" className={cls} aria-hidden="true" {...common}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </svg>
  )
  // gear (settings)
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
}

export default function DashboardSidebar({ displayName, paymentsCount }: DashboardSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { strings } = useLang()
  const { tab: contextTab, setTab } = useTabContext()

  const TAB_IDS = new Set(['today', 'payments', 'analytics'] as const)
  const nav = strings.nav

  // ── Animation refs ────────────────────────────────────────────
  const itemRefs   = useRef<Record<string, HTMLDivElement | null>>({})
  const rippleRefs = useRef<Record<string, HTMLSpanElement | null>>({})

  function triggerAnim(id: string) {
    const el   = itemRefs.current[id]
    const icon = el?.querySelector('svg') as HTMLElement | null
    if (!icon) return

    if (id === 'settings') {
      icon.style.transition = 'transform 0.4s ease'
      icon.style.transform  = 'rotate(90deg)'
      setTimeout(() => { icon.style.transform = 'rotate(0deg)' }, 420)

    } else if (id === 'savings') {
      icon.style.transition = 'transform 0.18s ease'
      icon.style.transform  = 'translateY(-5px) rotate(-5deg)'
      setTimeout(() => { icon.style.transform = 'translateY(0) rotate(5deg)' }, 180)
      setTimeout(() => { icon.style.transform = 'translateY(0) rotate(0deg)' }, 320)

    } else if (id === 'analytics') {
      icon.style.transition = 'transform 0.2s ease'
      icon.style.transform  = 'translateY(4px)'
      setTimeout(() => { icon.style.transform = 'translateY(0)' }, 200)

    } else if (id === 'profile') {
      icon.style.transition   = 'transform 0.15s ease, border-radius 0.2s ease'
      icon.style.transform    = 'scale(1.25)'
      icon.style.borderRadius = '50%'
      setTimeout(() => {
        icon.style.transform    = 'scale(1)'
        icon.style.borderRadius = '4px'
      }, 250)

    } else {
      // today, payments — scale punch
      icon.style.transition = 'transform 0.12s ease'
      icon.style.transform  = 'scale(1.25)'
      setTimeout(() => { icon.style.transform = 'scale(1)' }, 200)
    }

    // Badge bounce for payments
    if (id === 'payments') {
      const badge = el?.querySelector('.nav-badge') as HTMLElement | null
      if (badge) {
        badge.style.transition = 'transform 0.15s ease'
        badge.style.transform  = 'scale(1.5)'
        setTimeout(() => { badge.style.transform = 'scale(1)' }, 300)
      }
    }

    // Ripple
    const ripple = rippleRefs.current[id]
    const cfg    = NAV_COLORS[id]
    if (ripple && cfg) {
      ripple.style.background  = cfg.ripple
      ripple.style.transition  = 'none'
      ripple.style.transform   = 'scale(0)'
      ripple.style.opacity     = '0.85'
      void ripple.offsetWidth  // force reflow
      ripple.style.transition  = 'transform 0.45s ease-out, opacity 0.45s ease-out'
      ripple.style.transform   = 'scale(4)'
      ripple.style.opacity     = '0'
    }
  }

  function handleSignOut() {
    window.location.href = '/logout'
  }

  // Use context tab for the three main tabs (instant client-side switching)
  const dashboardTab = pathname === '/dashboard' ? contextTab : (searchParams.get('tab') ?? 'today')

  return (
    <aside className="w-[250px] shrink-0 bg-[#1a1a3d] text-white px-3 py-4 h-full flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 pb-4">
        <Image src="/subcuro_ribbon_s_transparent.png" width={28} height={28} alt="SubCuro" />
        <span style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.7px' }}>SubCuro</span>
      </div>

      {/* Nav items */}
      <nav className="space-y-1">
        {NAV_IDS.map((id) => {
          if (id === 'divider-main') {
            return <div key={id} className="my-3 h-px bg-white/15" />
          }

          const itHref = NAV_HREFS[id]
          const navLabel: Record<string, string> = {
            today:    nav.today,
            payments: nav.payments,
            analytics:nav.analytics,
            savings:  nav.simulator,
            profile:  nav.profile,
            settings: nav.settings,
          }

          let active = false
          if (id === 'profile')   active = pathname.startsWith('/dashboard/profile')
          else if (id === 'settings') active = pathname.startsWith('/dashboard/settings')
          else if (id === 'savings')  active = pathname === '/dashboard/savings' || pathname.startsWith('/dashboard/savings/')
          else if (id === 'today' || id === 'payments' || id === 'analytics')
            active = pathname === '/dashboard' && dashboardTab === id

          const isTabItem = TAB_IDS.has(id as DashboardTab)
          const cfg        = NAV_COLORS[id] ?? { color: '#fff', bg: 'rgba(255,255,255,0.08)', ripple: 'rgba(255,255,255,0.15)' }
          const iconColor  = active ? cfg.color : 'rgba(255,255,255,0.7)'
          const labelColor = active ? cfg.color : 'rgba(255,255,255,0.8)'
          const badgeValue = id === 'payments' ? paymentsCount : 0

          return (
            <div
              key={id}
              ref={el => { itemRefs.current[id] = el }}
              className="relative overflow-hidden rounded-xl"
              onClick={() => {
                triggerAnim(id)
                // Tab items (today/payments/analytics) switch client-side — no server round-trip
                if (isTabItem && pathname === '/dashboard') {
                  setTab(id as DashboardTab)
                }
              }}
            >
              <Link
                href={itHref}
                onClick={isTabItem && pathname === '/dashboard' ? (e) => e.preventDefault() : undefined}
                className="flex items-center gap-3 px-3 py-3 text-sm w-full"
                style={{
                  background: active ? cfg.bg : 'transparent',
                  transition: 'background 0.18s ease',
                  borderRadius: '0.75rem',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span
                  className="w-8 h-6 inline-flex items-center justify-center"
                  style={{ color: iconColor, transition: 'color 0.18s ease' }}
                >
                  <NavIcon type={NAV_ICONS[id]} />
                </span>
                <span style={{ color: labelColor, fontWeight: active ? 500 : 400, transition: 'color 0.18s ease, font-weight 0.18s ease', flex: 1 }}>
                  {navLabel[id]}
                </span>
                {badgeValue > 0 && (
                  <span className="nav-badge ml-auto h-6 min-w-6 rounded-full px-1.5 text-xs font-semibold flex items-center justify-center bg-[#12b76a] text-white">
                    {badgeValue}
                  </span>
                )}
              </Link>

              {/* Ripple element */}
              <span
                ref={el => { rippleRefs.current[id] = el }}
                style={{
                  position: 'absolute',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  left: 20,
                  top: '50%',
                  marginTop: -30,
                  opacity: 0,
                  transform: 'scale(0)',
                }}
              />
            </div>
          )
        })}
      </nav>

      {/* Sign out button */}
      <div className="mt-auto border-t border-white/15 pt-3 pb-2 px-1">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/50 hover:text-[#f87171] hover:bg-white/05 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] fill-none stroke-current shrink-0" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          {nav.signOut}
        </button>
      </div>
    </aside>
  )
}
