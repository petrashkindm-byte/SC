import Link from 'next/link'
import { coerceNumber } from '@/lib/coerce-number'
import type { Subscription } from '@/lib/supabase/types'
import { categoryLabelRu, STATUS_BADGE_RU } from '@/lib/subscription-labels'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import PaymentServiceIcon from './PaymentServiceIcon'

const BILLING_TYPE_BADGE: Record<string, string> = {
  free: 'Бесплатно',
  trial: 'Пробный',
  one_time: 'Разовый',
}

const CATEGORY_COLORS: Record<string, string> = {
  entertainment: 'bg-[#ede9fc] text-[#5b43d4]',
  productivity: 'bg-[#e8efff] text-[#3457d5]',
  utilities: 'bg-[#ececf0] text-[#6b6b80]',
  finance: 'bg-[#e8faf0] text-[#0d9f6e]',
  health: 'bg-[#fdecec] text-[#e5484d]',
  shopping: 'bg-[#fff4e0] text-[#b35a00]',
  education: 'bg-[#e6f5ff] text-[#1479b8]',
  other: 'bg-[#ececf0] text-[#6b6b80]',
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

type CardProps = {
  sub: Subscription
  selectable?: boolean
  selected?: boolean
  onToggle?: () => void
}

export default function SubscriptionCard({
  sub,
  selectable = false,
  selected = false,
  onToggle,
}: CardProps) {
  const days = daysUntil(sub.next_charge_date)
  const amount = coerceNumber(sub.amount)
  const fmt = (value: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: sub.currency }).format(value)

  const urgency = days <= 3 ? 'text-[#e5484d]' : days <= 7 ? 'text-[#b35a00]' : 'text-[#6b6b80]'
  const categoryColor = CATEGORY_COLORS[sub.category_slug] ?? CATEGORY_COLORS.other
  const statusExtra = STATUS_BADGE_RU[sub.status] ?? ''
  const billingTypeBadge = sub.billing_type ? BILLING_TYPE_BADGE[sub.billing_type] ?? null : null
  const href = `/dashboard/subscriptions/${sub.id}`
  const iconDisplay = resolveSubscriptionIconDisplay(sub.notes, sub.icon, sub.category_slug)

  const dayLabel =
    days === 0 ? 'Сегодня' : days === 1 ? 'Завтра' : `${days} дн.`

  return (
    <div
      className={`bg-white rounded-2xl border border-[#e7e3dc] shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] flex items-stretch gap-0 ${
        selectable && selected ? 'ring-2 ring-[#7b61ff]/60' : ''
      }`}
    >
      {selectable && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggle?.()
          }}
          className={`shrink-0 w-11 flex items-center justify-center border-r border-[#f0ece6] rounded-l-2xl ${
            selected ? 'bg-[#ede9fc]' : 'hover:bg-[#f8f6f2]'
          }`}
          aria-pressed={selected}
          aria-label={selected ? 'Снять выбор' : 'Выбрать для ИИ'}
        >
          <span
            className={`h-5 w-5 rounded border flex items-center justify-center text-xs ${
              selected
                ? 'bg-[#5b43d4] border-[#5b43d4] text-white'
                : 'border-[#cfc8bf] bg-white text-transparent'
            }`}
          >
            ✓
          </span>
        </button>
      )}
      <Link
        href={href}
        className={`flex flex-1 items-center justify-between gap-3 px-4 py-3 min-w-0 hover:bg-[#f8f6f2] transition-colors ${
          selectable ? 'rounded-r-2xl' : 'rounded-2xl'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <PaymentServiceIcon
            icon={sub.icon}
            categorySlug={sub.category_slug}
            iconBg={iconDisplay.iconBg}
            shape={iconDisplay.shape}
            size={32}
          />
          <div className="min-w-0">
            <p className="font-medium text-sm text-[#1a1a2e] truncate">{sub.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${categoryColor}`}>
                {categoryLabelRu(sub.category_slug)}
              </span>
              {statusExtra ? (
                <span className="text-xs px-1.5 py-0.5 rounded-md bg-[#ececf0] text-[#6b6b80]">
                  {statusExtra}
                </span>
              ) : null}
              {billingTypeBadge ? (
                <span className="text-xs px-1.5 py-0.5 rounded-md bg-[#e8faf0] text-[#0d9f6e]">
                  {billingTypeBadge}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="font-semibold text-sm text-[#1a1a2e]">{fmt(amount)}</p>
          <p className={`text-xs ${urgency}`}>{dayLabel}</p>
        </div>
      </Link>
    </div>
  )
}
