import type { BillingCycle, CategorySlug } from '@/lib/supabase/types'
import rawCatalog from '@/lib/service-catalog-data.json'

export interface ServiceEntry {
  name: string
  /** id пресета из `payment-icon-presets` */
  icon: string
  category_slug: CategorySlug
  billing_cycle: BillingCycle
  amount: number
  currency: string
  cancellation_url?: string
  management_url?: string
  pricing_url?: string
  /** Альтернативные написания для поиска */
  aliases?: string[]
}

// Extra entries not in the CSV (popular services added manually)
const EXTRA_ENTRIES: ServiceEntry[] = [
  { name: 'Теле2', icon: 'wifi', category_slug: 'utilities', billing_cycle: 'monthly', amount: 600, currency: 'RUB', cancellation_url: 'https://tele2.ru/personal', management_url: 'https://tele2.ru/personal', pricing_url: 'https://tele2.ru/tariffs', aliases: ['tele2', 'tele 2', 't2'] },
  { name: 'Ростелеком', icon: 'wifi', category_slug: 'utilities', billing_cycle: 'monthly', amount: 500, currency: 'RUB', cancellation_url: 'https://lk.rt.ru', management_url: 'https://lk.rt.ru', pricing_url: 'https://rostelecom.ru', aliases: ['rostelecom', 'ртк'] },
  { name: 'МТС', icon: 'wifi', category_slug: 'utilities', billing_cycle: 'monthly', amount: 700, currency: 'RUB', cancellation_url: 'https://mts.ru/personal', management_url: 'https://mts.ru/personal', pricing_url: 'https://mts.ru/tariffs', aliases: ['mts', 'мтс тариф'] },
  { name: 'МегаФон', icon: 'wifi', category_slug: 'utilities', billing_cycle: 'monthly', amount: 650, currency: 'RUB', cancellation_url: 'https://megafon.ru/services', management_url: 'https://megafon.ru/services', pricing_url: 'https://megafon.ru/tariffs', aliases: ['megafon', 'мегафон тариф'] },
  { name: 'Билайн', icon: 'wifi', category_slug: 'utilities', billing_cycle: 'monthly', amount: 600, currency: 'RUB', cancellation_url: 'https://beeline.ru/customers/products', management_url: 'https://beeline.ru/customers/products', pricing_url: 'https://beeline.ru/tariffs', aliases: ['beeline', 'билайн тариф'] },
  { name: 'Яндекс Музыка', icon: 'music', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 219, currency: 'RUB', cancellation_url: 'https://music.yandex.ru/settings', management_url: 'https://music.yandex.ru/settings', pricing_url: 'https://music.yandex.ru', aliases: ['яндекс музыка', 'yandex music'] },
]

export const SERVICE_CATALOG: ServiceEntry[] = [
  ...EXTRA_ENTRIES,
  ...(rawCatalog as ServiceEntry[]),
]

/** Поиск по каталогу — возвращает до 6 совпадений */
export function searchCatalog(query: string): ServiceEntry[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []

  const scored: { entry: ServiceEntry; score: number }[] = []

  for (const entry of SERVICE_CATALOG) {
    const nameLower = entry.name.toLowerCase()
    // Words of the name for word-boundary matching
    const words = nameLower.split(/\s+/)
    let score = 0

    if (nameLower === q) {
      // Exact full match
      score = 100
    } else if (nameLower.startsWith(q)) {
      // Name starts with query (e.g. "Теле" → "Теле2")
      score = 90
    } else if (words.some((w) => w.startsWith(q))) {
      // Any word in name starts with query (e.g. "Mu" → "Apple Music")
      score = 70
    } else if (entry.aliases?.some((a) => {
      const al = a.toLowerCase()
      return al === q || al.startsWith(q) || al.split(/\s+/).some((w) => w.startsWith(q))
    })) {
      // Alias word-start match
      score = 50
    } else if (nameLower.includes(q) && q.length >= 3) {
      // Substring anywhere — only kick in at 3+ chars to avoid noise
      score = 30
    } else if (entry.aliases?.some((a) => a.toLowerCase().includes(q)) && q.length >= 3) {
      score = 20
    }

    if (score > 0) scored.push({ entry, score })
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((s) => s.entry)
}
