'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'

export type DashboardTab = 'today' | 'payments' | 'analytics'

const VALID_TABS: DashboardTab[] = ['today', 'payments', 'analytics']

function parseTab(raw: string | null): DashboardTab {
  return VALID_TABS.includes(raw as DashboardTab) ? (raw as DashboardTab) : 'today'
}

type TabCtxValue = {
  tab: DashboardTab
  setTab: (t: DashboardTab) => void
}

const TabCtx = createContext<TabCtxValue>({ tab: 'today', setTab: () => {} })

export function TabProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const [tab, setTabState] = useState<DashboardTab>(() => parseTab(searchParams.get('tab')))

  // Sync when URL changes externally (e.g. openSub navigation from Today view,
  // or browser back/forward)
  useEffect(() => {
    const incoming = parseTab(searchParams.get('tab'))
    setTabState(incoming)
  }, [searchParams])

  const setTab = (t: DashboardTab) => {
    setTabState(t)
    // Update URL for back/forward support — history.replaceState bypasses the
    // Next.js router so no server round-trip is triggered.
    const url = new URL(window.location.href)
    url.searchParams.set('tab', t)
    // Remove openSub when manually switching tabs (avoids stale panel on re-open)
    url.searchParams.delete('openSub')
    window.history.replaceState(null, '', url.toString())
  }

  return <TabCtx.Provider value={{ tab, setTab }}>{children}</TabCtx.Provider>
}

export const useTabContext = () => useContext(TabCtx)
