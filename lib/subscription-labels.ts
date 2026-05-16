import type { BillingCycle, CategorySlug, Subscription, SubscriptionStatus } from '@/lib/supabase/types'
import type { Lang } from '@/lib/translations'

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

const CATEGORY_LABEL_EN: Record<CategorySlug, string> = {
  entertainment: 'Entertainment',
  productivity: 'Productivity',
  utilities: 'Utilities',
  finance: 'Finance',
  health: 'Health',
  shopping: 'Shopping',
  education: 'Education',
  other: 'Other',
}

/** Lang-aware category label */
export function categoryLabel(slug: string, lang: Lang = 'ru'): string {
  const map = lang === 'en' ? CATEGORY_LABEL_EN : CATEGORY_LABEL_RU
  return map[slug as CategorySlug] ?? slug
}

/** @deprecated Use categoryLabel(slug, lang) instead */
export function categoryLabelRu(slug: string): string {
  return CATEGORY_LABEL_RU[slug as CategorySlug] ?? slug
}

export const STATUS_LABEL_FULL_RU: Record<SubscriptionStatus, string> = {
  active: 'Активна',
  paused: 'На паузе',
  cancelled: 'Отменена',
  archived: 'В архиве',
}

const STATUS_LABEL_FULL_EN: Record<SubscriptionStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
  archived: 'Archived',
}

export function statusLabelFull(status: SubscriptionStatus, lang: Lang = 'ru'): string {
  return (lang === 'en' ? STATUS_LABEL_FULL_EN : STATUS_LABEL_FULL_RU)[status]
}

/** Короткий бейдж на карточке списка — только если не «активна». */
export const STATUS_BADGE_RU: Partial<Record<SubscriptionStatus, string>> = {
  paused: 'Пауза',
  cancelled: 'Отменена',
  archived: 'Архив',
}

const STATUS_BADGE_EN: Partial<Record<SubscriptionStatus, string>> = {
  paused: 'Paused',
  cancelled: 'Cancelled',
  archived: 'Archived',
}

export function statusBadge(status: SubscriptionStatus, lang: Lang = 'ru'): string | undefined {
  return (lang === 'en' ? STATUS_BADGE_EN : STATUS_BADGE_RU)[status]
}

export const BILLING_CYCLE_LABEL_RU: Record<BillingCycle, string> = {
  weekly: 'Раз в неделю',
  monthly: 'Раз в месяц',
  quarterly: 'Раз в квартал',
  yearly: 'Раз в год',
  custom: 'Свой интервал',
}

const BILLING_CYCLE_LABEL_EN: Record<BillingCycle, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
}

/** Lang-aware billing cycle label */
export function formatBillingCycle(
  sub: Pick<Subscription, 'billing_cycle' | 'billing_interval' | 'custom_interval_days'>,
  lang: Lang = 'ru',
): string {
  const map = lang === 'en' ? BILLING_CYCLE_LABEL_EN : BILLING_CYCLE_LABEL_RU
  const base = map[sub.billing_cycle]
  const mult = sub.billing_interval > 1 ? ` ×${sub.billing_interval}` : ''
  const custom =
    sub.billing_cycle === 'custom' && sub.custom_interval_days
      ? lang === 'en'
        ? ` (${sub.custom_interval_days}d)`
        : ` (${sub.custom_interval_days} дн.)`
      : ''
  return `${base}${mult}${custom}`
}

/** @deprecated Use formatBillingCycle(sub, lang) instead */
export function formatBillingCycleRu(
  sub: Pick<Subscription, 'billing_cycle' | 'billing_interval' | 'custom_interval_days'>,
): string {
  return formatBillingCycle(sub, 'ru')
}

export function getCategoryFormOptions(lang: Lang = 'ru'): { value: CategorySlug; label: string }[] {
  const map = lang === 'en' ? CATEGORY_LABEL_EN : CATEGORY_LABEL_RU
  return [
    { value: 'entertainment', label: map.entertainment },
    { value: 'productivity',  label: map.productivity },
    { value: 'utilities',     label: map.utilities },
    { value: 'finance',       label: map.finance },
    { value: 'health',        label: map.health },
    { value: 'shopping',      label: map.shopping },
    { value: 'education',     label: map.education },
    { value: 'other',         label: map.other },
  ]
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

export function getBillingFormOptions(lang: Lang = 'ru'): { value: BillingCycle; label: string }[] {
  const map = lang === 'en' ? BILLING_CYCLE_LABEL_EN : BILLING_CYCLE_LABEL_RU
  return [
    { value: 'weekly',    label: map.weekly },
    { value: 'monthly',   label: map.monthly },
    { value: 'quarterly', label: map.quarterly },
    { value: 'yearly',    label: map.yearly },
    { value: 'custom',    label: map.custom },
  ]
}

export const BILLING_FORM_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: 'weekly', label: BILLING_CYCLE_LABEL_RU.weekly },
  { value: 'monthly', label: BILLING_CYCLE_LABEL_RU.monthly },
  { value: 'quarterly', label: BILLING_CYCLE_LABEL_RU.quarterly },
  { value: 'yearly', label: BILLING_CYCLE_LABEL_RU.yearly },
  { value: 'custom', label: BILLING_CYCLE_LABEL_RU.custom },
]
