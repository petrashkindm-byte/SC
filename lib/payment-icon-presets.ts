import type { CategorySlug } from '@/lib/supabase/types'
import rawPresets from '@/lib/payment-icon-presets.json'

export type PaymentIconPresetRow = {
  id: string
  label: string
  bg: string
  h: string
}

export const PAYMENT_ICON_PRESETS = rawPresets as PaymentIconPresetRow[]

export const PAYMENT_ICON_MAP: Record<string, PaymentIconPresetRow> = Object.fromEntries(
  PAYMENT_ICON_PRESETS.map((p) => [p.id, p]),
)

export function isPaymentIconPresetId(id: string | null | undefined): id is string {
  return typeof id === 'string' && id.length > 0 && id in PAYMENT_ICON_MAP
}

export function getPaymentIconPreset(id: string): PaymentIconPresetRow | undefined {
  return PAYMENT_ICON_MAP[id]
}

/** Дефолтный пресет по категории (как в референсе редактора). */
export const CATEGORY_DEFAULT_PAYMENT_ICON: Record<CategorySlug, string> = {
  entertainment: 'music',
  productivity: 'productivity',
  utilities: 'cloud',
  finance: 'finance',
  health: 'health',
  shopping: 'delivery',
  education: 'education',
  other: 'payments',
}

/** Миграция со старых эмодзи из каталога / ручного ввода → id пресета. */
const EMOJI_TO_PRESET: Record<string, string> = {
  '🎵': 'music',
  '🎶': 'music',
  '🎧': 'music',
  '📺': 'tv',
  '🎬': 'video',
  '🍿': 'video',
  '🎥': 'video',
  '🎞️': 'video',
  '🏰': 'travel',
  '▶️': 'video',
  '💜': 'game',
  '🤖': 'ai',
  '🧠': 'ai',
  '📝': 'productivity',
  '👨‍💻': 'code',
  '🎨': 'camera',
  '🖌️': 'camera',
  '🗂️': 'productivity',
  '📐': 'productivity',
  '✅': 'productivity',
  '📚': 'book',
  '✍️': 'book',
  '🖼️': 'camera',
  '🔍': 'news',
  '☁️': 'cloud',
  '🔑': 'shield',
  '🛡️': 'shield',
  '🔒': 'shield',
  '🌐': 'wifi',
  '📦': 'delivery',
  '🗄️': 'cloud',
  '🧰': 'code',
  '🦉': 'education',
  '🎓': 'education',
  '📖': 'book',
  '🏫': 'education',
  '🎭': 'music',
  '😌': 'health',
  '🏃': 'fitness',
  '🧘': 'health',
  '💳': 'payments',
  '🟢': 'finance',
  '🟡': 'tv',
  '🎮': 'game',
  '✉️': 'news',
  '🛒': 'delivery',
  '💼': 'productivity',
  '⭐': 'home',
  '🔔': 'news',
  '🎯': 'productivity',
  '🧾': 'payments',
  '💡': 'ai',
  '📱': 'wifi',
  '💊': 'health',
  '🍔': 'food',
  '✈️': 'travel',
  '🏠': 'home',
  '📰': 'news',
  '🔐': 'shield',
}

/** Какой id пресета показывать в UI и сохранять при следующем сохранении формы. */
export function resolvePaymentIconIdForDisplay(
  icon: string | null | undefined,
  categorySlug: string,
): string {
  const cat = (categorySlug in CATEGORY_DEFAULT_PAYMENT_ICON ? categorySlug : 'other') as CategorySlug
  if (icon && isPaymentIconPresetId(icon)) return icon
  if (icon && EMOJI_TO_PRESET[icon]) return EMOJI_TO_PRESET[icon]
  return CATEGORY_DEFAULT_PAYMENT_ICON[cat]
}
