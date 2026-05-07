import type { BillingCycle, CategorySlug, Subscription, SubscriptionStatus } from '@/lib/supabase/types'

export const CATEGORY_LABEL_RU: Record<CategorySlug, string> = {
  entertainment: 'Развлечения',
  productivity: 'Продуктивность',
  utilities: 'Сервисы',
  finance: 'Финансы',
  health: 'Здоровье',
  shopping: 'Покупки',
  education: 'Обучение',
  other: 'Другое',
}

export function categoryLabelRu(slug: string): string {
  return CATEGORY_LABEL_RU[slug as CategorySlug] ?? slug
}

export const STATUS_LABEL_FULL_RU: Record<SubscriptionStatus, string> = {
  active: 'Активна',
  paused: 'На паузе',
  cancelled: 'Отменена',
  archived: 'В архиве',
}

/** Короткий бейдж на карточке списка — только если не «активна». */
export const STATUS_BADGE_RU: Partial<Record<SubscriptionStatus, string>> = {
  paused: 'Пауза',
  cancelled: 'Отменена',
  archived: 'Архив',
}

export const BILLING_CYCLE_LABEL_RU: Record<BillingCycle, string> = {
  weekly: 'Раз в неделю',
  monthly: 'Раз в месяц',
  quarterly: 'Раз в квартал',
  yearly: 'Раз в год',
  custom: 'Свой интервал',
}

export function formatBillingCycleRu(
  sub: Pick<Subscription, 'billing_cycle' | 'billing_interval' | 'custom_interval_days'>,
): string {
  const base = BILLING_CYCLE_LABEL_RU[sub.billing_cycle]
  const mult = sub.billing_interval > 1 ? ` ×${sub.billing_interval}` : ''
  const custom =
    sub.billing_cycle === 'custom' && sub.custom_interval_days
      ? ` (${sub.custom_interval_days} дн.)`
      : ''
  return `${base}${mult}${custom}`
}

export const CATEGORY_FORM_OPTIONS: { value: CategorySlug; label: string }[] = [
  { value: 'entertainment', label: CATEGORY_LABEL_RU.entertainment },
  { value: 'productivity', label: CATEGORY_LABEL_RU.productivity },
  { value: 'utilities', label: CATEGORY_LABEL_RU.utilities },
  { value: 'finance', label: CATEGORY_LABEL_RU.finance },
  { value: 'health', label: CATEGORY_LABEL_RU.health },
  { value: 'shopping', label: CATEGORY_LABEL_RU.shopping },
  { value: 'education', label: CATEGORY_LABEL_RU.education },
  { value: 'other', label: CATEGORY_LABEL_RU.other },
]

export const BILLING_FORM_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: 'weekly', label: BILLING_CYCLE_LABEL_RU.weekly },
  { value: 'monthly', label: BILLING_CYCLE_LABEL_RU.monthly },
  { value: 'quarterly', label: BILLING_CYCLE_LABEL_RU.quarterly },
  { value: 'yearly', label: BILLING_CYCLE_LABEL_RU.yearly },
  { value: 'custom', label: BILLING_CYCLE_LABEL_RU.custom },
]
