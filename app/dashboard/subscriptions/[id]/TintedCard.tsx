'use client'

import type { ReactNode } from 'react'
import { useDarkMode } from '@/lib/hooks/use-dark-mode'

type Props = {
  tint: string | null
  darkTint: string | null
  swatch: string | null
  children: ReactNode
}

export default function TintedCard({ tint, darkTint, swatch, children }: Props) {
  const isDark = useDarkMode()
  const activeTint = isDark ? darkTint : tint
  return (
    <div
      className="rounded-2xl border p-6 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] mb-4"
      style={{
        background: activeTint
          ? isDark
            ? `linear-gradient(135deg, ${activeTint} 0%, #1c1c38 100%)`
            : `linear-gradient(135deg, ${activeTint} 0%, #fff 100%)`
          : isDark ? '#1c1c38' : '#fff',
        borderColor: swatch ?? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,61,0.08)'),
      }}
    >
      {children}
    </div>
  )
}
