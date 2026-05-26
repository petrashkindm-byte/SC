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

export const SERVICE_CATALOG: ServiceEntry[] = rawCatalog as ServiceEntry[]

/** Поиск по каталогу — возвращает до 6 совпадений */
export function searchCatalog(query: string): ServiceEntry[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []

  const scored: { entry: ServiceEntry; score: number }[] = []

  for (const entry of SERVICE_CATALOG) {
    const nameLower = entry.name.toLowerCase()
    let score = 0

    if (nameLower === q) score = 100
    else if (nameLower.startsWith(q)) score = 80
    else if (nameLower.includes(q)) score = 60
    else if (entry.aliases?.some((a) => a.toLowerCase().includes(q))) score = 40

    if (score > 0) scored.push({ entry, score })
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((s) => s.entry)
}
