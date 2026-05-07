import { getPaymentIconPreset, resolvePaymentIconIdForDisplay } from '@/lib/payment-icon-presets'
import type { SubcuroEditViz } from '@/lib/subscription-viz-notes'
import { parseNotesAndViz } from '@/lib/subscription-viz-notes'

/** Насыщенные цвета категории для фона глифа (как «Как у категории» в редакторе). */
export const CATEGORY_ICON_HEX: Record<string, string> = {
  entertainment: '#5b43d4',
  productivity: '#2563eb',
  utilities: '#6b6b80',
  finance: '#0d9f6e',
  health: '#e5484d',
  shopping: '#ea580c',
  education: '#2563eb',
  other: '#5b43d4',
}

/** Текущий фон иконки в UI: сохранённый цвет или цвет категории. */
export function effectiveIconBackgroundFromViz(viz: SubcuroEditViz, categorySlug: string): string {
  return viz.iconBg ?? CATEGORY_ICON_HEX[categorySlug] ?? '#5b43d4'
}

export type SubscriptionIconDisplay = {
  iconBg: string
  shape: SubcuroEditViz['shape']
}

/**
 * Фон и форма иконки для списков/карточек (один раз парсит notes).
 */
export function resolveSubscriptionIconDisplay(
  notes: string | null | undefined,
  icon: string | null | undefined,
  categorySlug: string,
): SubscriptionIconDisplay {
  const { viz } = parseNotesAndViz(notes ?? '')
  let iconBg: string
  if (viz.iconBg) iconBg = viz.iconBg
  else if (CATEGORY_ICON_HEX[categorySlug]) iconBg = CATEGORY_ICON_HEX[categorySlug]
  else {
    const id = resolvePaymentIconIdForDisplay(icon, categorySlug)
    iconBg = getPaymentIconPreset(id)?.bg ?? '#5b43d4'
  }
  return { iconBg, shape: viz.shape }
}

/**
 * Только фон — удобно, когда форма не нужна (парсит notes).
 */
export function resolveSubscriptionIconBackground(
  notes: string | null | undefined,
  icon: string | null | undefined,
  categorySlug: string,
): string {
  return resolveSubscriptionIconDisplay(notes, icon, categorySlug).iconBg
}
