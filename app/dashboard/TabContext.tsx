'use client'

import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'

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

function readCurrentTab(): DashboardTab {
  if (typeof window === 'undefined') return 'today'
  return parseTab(new URL(window.location.href).searchParams.get('tab'))
}

function subscribeToTabChange(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener('popstate', onStoreChange)
  window.addEventListener('subcuro:tab-change', onStoreChange)
  return () => {
    window.removeEventListener('popstate', onStoreChange)
    window.removeEventListener('subcuro:tab-change', onStoreChange)
  }
}

export function TabProvider({ children }: { children: ReactNode }) {
  const tab = useSyncExternalStore(subscribeToTabChange, readCurrentTab, () => 'today')

  const setTab = (t: DashboardTab) => {
    // Update URL for back/forward support — history.replaceState bypasses the
    // Next.js router so no server round-trip is triggered.
    const url = new URL(window.location.href)
    url.searchParams.set('tab', t)
    // Remove openSub when manually switching tabs (avoids stale panel on re-open)
    url.searchParams.delete('openSub')
    window.history.replaceState(null, '', url.toString())
    window.dispatchEvent(new Event('subcuro:tab-change'))
  }

  return <TabCtx.Provider value={{ tab, setTab }}>{children}</TabCtx.Provider>
}

export const useTabContext = () => useContext(TabCtx)
