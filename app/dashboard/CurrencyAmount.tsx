'use client'

import { fmtCurrency, type CurrencyGroup } from '@/lib/currency'

interface CurrencyAmountProps {
  /** Группы валют с суммами (из groupMonthlyByCurrency) */
  groups: CurrencyGroup[]
  /** Множитель (например 12 для годовой суммы) */
  multiply?: number
  /** CSS-класс для основной суммы */
  className?: string
  /** CSS-класс для второстепенных валют */
  secondaryClassName?: string
}

/**
 * Отображает итоговую сумму.
 * Одна валюта → обычное число.
 * Несколько → основная валюта большим шрифтом, остальные меньше под ней.
 */
export default function CurrencyAmount({
  groups,
  multiply = 1,
  className,
  secondaryClassName,
}: CurrencyAmountProps) {
  if (groups.length === 0) {
    return <span className={className}>—</span>
  }

  // Round each group's total before multiplying so that
  // displayed monthly (rounded) × factor = displayed annual (no phantom cents).
  const rounded = groups.map((g) => ({ ...g, total: Math.round(g.total) }))

  if (rounded.length === 1) {
    return (
      <span className={className}>
        {fmtCurrency(rounded[0].total * multiply, rounded[0].currency)}
      </span>
    )
  }

  const [primary, ...rest] = rounded
  return (
    <span>
      <span className={className}>
        {fmtCurrency(primary.total * multiply, primary.currency)}
      </span>
      <span
        className={
          secondaryClassName ??
          'block text-[13px] font-medium opacity-55 mt-0.5 leading-snug'
        }
      >
        {rest.map((g) => fmtCurrency(g.total * multiply, g.currency)).join(' · ')}
      </span>
    </span>
  )
}
