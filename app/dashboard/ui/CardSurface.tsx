import type { ReactNode } from 'react'

const BASE_CARD =
  'rounded-2xl border border-[#e7e3dc] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]'

export default function CardSurface({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`${BASE_CARD} ${className}`}>{children}</div>
}
