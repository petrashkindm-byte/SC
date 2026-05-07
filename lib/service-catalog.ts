import type { BillingCycle, CategorySlug } from '@/lib/supabase/types'

export interface ServiceEntry {
  name: string
  /** id пресета из `payment-icon-presets` (SVG-логотип), не эмодзи */
  icon: string
  category_slug: CategorySlug
  billing_cycle: BillingCycle
  amount: number
  currency: string
  /** Альтернативные написания для поиска */
  aliases?: string[]
}

export const SERVICE_CATALOG: ServiceEntry[] = [
  // Стриминг и развлечения
  { name: 'Spotify', icon: 'music', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 299, currency: 'RUB', aliases: ['спотифай', 'spotify premium'] },
  { name: 'Apple Music', icon: 'music', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 299, currency: 'RUB', aliases: ['apple music'] },
  { name: 'VK Музыка', icon: 'music', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 169, currency: 'RUB', aliases: ['вк музыка', 'vkontakte музыка', 'вконтакте музыка'] },
  { name: 'Netflix', icon: 'video', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 799, currency: 'RUB', aliases: ['нетфликс'] },
  { name: 'Кинопоиск', icon: 'video', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 399, currency: 'RUB', aliases: ['kinopoisk', 'яндекс кинопоиск'] },
  { name: 'Яндекс Плюс', icon: 'tv', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 399, currency: 'RUB', aliases: ['yandex plus', 'яндекс+', 'ya plus'] },
  { name: 'YouTube Premium', icon: 'video', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 459, currency: 'RUB', aliases: ['ютуб премиум', 'youtube music'] },
  { name: 'Twitch', icon: 'game', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 299, currency: 'RUB', aliases: ['твич'] },
  { name: 'Okko', icon: 'video', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 399, currency: 'RUB', aliases: ['окко'] },
  { name: 'START', icon: 'video', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 399, currency: 'RUB', aliases: ['start.ru', 'старт'] },
  { name: 'Disney+', icon: 'travel', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 599, currency: 'RUB', aliases: ['disney plus', 'дисней плюс'] },
  { name: 'Wink', icon: 'tv', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 299, currency: 'RUB', aliases: ['wink.ru', 'ростелеком wink'] },

  // Продуктивность и ИИ
  { name: 'ChatGPT Plus', icon: 'ai', category_slug: 'productivity', billing_cycle: 'monthly', amount: 2000, currency: 'RUB', aliases: ['chatgpt', 'openai', 'gpt-4', 'чатgpt'] },
  { name: 'Claude Pro', icon: 'ai', category_slug: 'productivity', billing_cycle: 'monthly', amount: 2000, currency: 'RUB', aliases: ['anthropic', 'claude.ai'] },
  { name: 'Notion', icon: 'productivity', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1600, currency: 'RUB', aliases: ['notion.so'] },
  { name: 'Notion (годовой)', icon: 'productivity', category_slug: 'productivity', billing_cycle: 'yearly', amount: 16000, currency: 'RUB', aliases: [] },
  { name: 'GitHub Copilot', icon: 'code', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1000, currency: 'RUB', aliases: ['github', 'copilot'] },
  { name: 'Figma', icon: 'camera', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1800, currency: 'RUB', aliases: ['figma.com'] },
  { name: 'Adobe Creative Cloud', icon: 'camera', category_slug: 'productivity', billing_cycle: 'monthly', amount: 3500, currency: 'RUB', aliases: ['adobe cc', 'adobe', 'photoshop', 'illustrator'] },
  { name: 'Miro', icon: 'productivity', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1600, currency: 'RUB', aliases: ['miro.com'] },
  { name: 'Linear', icon: 'productivity', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1500, currency: 'RUB', aliases: [] },
  { name: 'Todoist', icon: 'productivity', category_slug: 'productivity', billing_cycle: 'monthly', amount: 500, currency: 'RUB', aliases: [] },
  { name: 'Readwise', icon: 'book', category_slug: 'productivity', billing_cycle: 'monthly', amount: 800, currency: 'RUB', aliases: ['readwise.io'] },
  { name: 'Grammarly', icon: 'book', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1200, currency: 'RUB', aliases: [] },
  { name: 'Canva Pro', icon: 'camera', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1299, currency: 'RUB', aliases: ['canva'] },
  { name: 'Perplexity', icon: 'news', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1700, currency: 'RUB', aliases: ['perplexity.ai'] },

  // Утилиты и сервисы
  { name: 'iCloud+', icon: 'cloud', category_slug: 'utilities', billing_cycle: 'monthly', amount: 169, currency: 'RUB', aliases: ['icloud 200gb', 'apple icloud', 'icloud storage'] },
  { name: '1Password', icon: 'shield', category_slug: 'utilities', billing_cycle: 'yearly', amount: 3500, currency: 'RUB', aliases: ['1 password', 'onepassword'] },
  { name: 'Bitwarden', icon: 'shield', category_slug: 'utilities', billing_cycle: 'yearly', amount: 1000, currency: 'RUB', aliases: [] },
  { name: 'NordVPN', icon: 'shield', category_slug: 'utilities', billing_cycle: 'monthly', amount: 800, currency: 'RUB', aliases: ['nord vpn'] },
  { name: 'ExpressVPN', icon: 'wifi', category_slug: 'utilities', billing_cycle: 'monthly', amount: 1200, currency: 'RUB', aliases: ['express vpn'] },
  { name: 'Dropbox', icon: 'delivery', category_slug: 'utilities', billing_cycle: 'monthly', amount: 1200, currency: 'RUB', aliases: [] },
  { name: 'Google One', icon: 'cloud', category_slug: 'utilities', billing_cycle: 'monthly', amount: 269, currency: 'RUB', aliases: ['google drive', 'гугл диск', 'google storage'] },
  { name: 'Антивирус Касперский', icon: 'shield', category_slug: 'utilities', billing_cycle: 'yearly', amount: 1800, currency: 'RUB', aliases: ['kaspersky', 'каспер'] },
  { name: 'SetApp', icon: 'code', category_slug: 'utilities', billing_cycle: 'monthly', amount: 1500, currency: 'RUB', aliases: ['setapp.com'] },

  // Образование
  { name: 'Duolingo Plus', icon: 'education', category_slug: 'education', billing_cycle: 'yearly', amount: 749, currency: 'RUB', aliases: ['duolingo', 'дуолинго'] },
  { name: 'Яндекс Практикум', icon: 'education', category_slug: 'education', billing_cycle: 'monthly', amount: 5000, currency: 'RUB', aliases: ['practicum', 'практикум'] },
  { name: 'Skillbox', icon: 'book', category_slug: 'education', billing_cycle: 'monthly', amount: 3500, currency: 'RUB', aliases: ['скилбокс'] },
  { name: 'Coursera Plus', icon: 'education', category_slug: 'education', billing_cycle: 'yearly', amount: 30000, currency: 'RUB', aliases: ['coursera'] },
  { name: 'MasterClass', icon: 'music', category_slug: 'education', billing_cycle: 'yearly', amount: 12000, currency: 'RUB', aliases: [] },

  // Здоровье и фитнес
  { name: 'Apple Fitness+', icon: 'fitness', category_slug: 'health', billing_cycle: 'monthly', amount: 399, currency: 'RUB', aliases: ['apple fitness'] },
  { name: 'Headspace', icon: 'health', category_slug: 'health', billing_cycle: 'monthly', amount: 800, currency: 'RUB', aliases: [] },
  { name: 'Calm', icon: 'health', category_slug: 'health', billing_cycle: 'yearly', amount: 5000, currency: 'RUB', aliases: [] },

  // Финансы
  { name: 'Тинькофф Про', icon: 'payments', category_slug: 'finance', billing_cycle: 'monthly', amount: 199, currency: 'RUB', aliases: ['tinkoff pro', 'т-банк про'] },
  { name: 'Сбер Прайм', icon: 'finance', category_slug: 'finance', billing_cycle: 'monthly', amount: 399, currency: 'RUB', aliases: ['sber prime', 'sberprime', 'сбер прайм+'] },
]

/** Поиск по каталогу — возвращает до 5 совпадений */
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
    .slice(0, 5)
    .map((s) => s.entry)
}
