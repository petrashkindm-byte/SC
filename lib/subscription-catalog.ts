/**
 * Каталог регулярных платежей (веб) — "умный чек-лист", помогающий вспомнить
 * подписки и регулярные платежи без доступа к банку.
 * Нейтральные иконки из payment-icon-presets, без официальных логотипов.
 * Зеркалирует мобильный src/data/subscriptionCatalog.ts.
 */
import type { CategorySlug } from '@/lib/supabase/types'

export type CatalogCategoryId =
  | 'video' | 'music' | 'mobile' | 'cloud' | 'shopping' | 'health'
  | 'education' | 'games' | 'work' | 'home' | 'other'

export interface CatalogServiceEntry {
  id: string
  name: string
  category: CatalogCategoryId
  categorySlug: CategorySlug
  /** payment-icon-presets id */
  icon: string
  aliases?: string[]
  popular?: boolean
  canBeTrial?: boolean
  typicalPriceRange?: [number, number]
}

export const CATALOG_CATEGORY_IDS: CatalogCategoryId[] = [
  'video', 'music', 'mobile', 'cloud', 'shopping', 'health',
  'education', 'games', 'work', 'home', 'other',
]

const e = (
  id: string,
  name: string,
  category: CatalogCategoryId,
  categorySlug: CategorySlug,
  icon: string,
  extra: Partial<CatalogServiceEntry> = {},
): CatalogServiceEntry => ({ id, name, category, categorySlug, icon, ...extra })

export const SUBSCRIPTION_CATALOG: CatalogServiceEntry[] = [
  e('kinopoisk', 'Кинопоиск', 'video', 'entertainment', 'video', { aliases: ['kinopoisk', 'плюс'], popular: true, canBeTrial: true, typicalPriceRange: [299, 399] }),
  e('ivi', 'Иви', 'video', 'entertainment', 'video', { aliases: ['ivi'], popular: true, canBeTrial: true, typicalPriceRange: [199, 599] }),
  e('okko', 'Okko', 'video', 'entertainment', 'video', { aliases: ['окко'], popular: true, canBeTrial: true, typicalPriceRange: [199, 699] }),
  e('start', 'Start', 'video', 'entertainment', 'tv', { aliases: ['старт'], canBeTrial: true, typicalPriceRange: [299, 499] }),
  e('premier', 'Premier', 'video', 'entertainment', 'tv', { aliases: ['премьер'], canBeTrial: true, typicalPriceRange: [299, 399] }),
  e('wink', 'Wink', 'video', 'entertainment', 'tv', { aliases: ['винк'], canBeTrial: true, typicalPriceRange: [249, 499] }),
  e('kion', 'Kion', 'video', 'entertainment', 'tv', { aliases: ['кион'], canBeTrial: true, typicalPriceRange: [199, 399] }),
  e('more-tv', 'more.tv', 'video', 'entertainment', 'tv', { aliases: ['море тв'], canBeTrial: true, typicalPriceRange: [299, 399] }),
  e('netflix', 'Netflix', 'video', 'entertainment', 'video', { aliases: ['нетфликс'], typicalPriceRange: [600, 1200] }),
  e('amediateka', 'Амедиатека', 'video', 'entertainment', 'video', { aliases: ['amediateka'], canBeTrial: true, typicalPriceRange: [599, 699] }),

  e('vk-music', 'VK Музыка', 'music', 'entertainment', 'music', { aliases: ['vk music', 'boom'], popular: true, canBeTrial: true, typicalPriceRange: [149, 299] }),
  e('yandex-music', 'Яндекс Музыка', 'music', 'entertainment', 'music', { aliases: ['yandex music'], popular: true, canBeTrial: true, typicalPriceRange: [199, 399] }),
  e('zvuk', 'Звук', 'music', 'entertainment', 'music', { aliases: ['zvuk', 'сберзвук'], canBeTrial: true, typicalPriceRange: [169, 299] }),
  e('mts-music', 'МТС Music', 'music', 'entertainment', 'music', { aliases: ['мтс музыка'], canBeTrial: true, typicalPriceRange: [169, 269] }),
  e('spotify', 'Spotify', 'music', 'entertainment', 'music', { aliases: ['спотифай'], canBeTrial: true, typicalPriceRange: [300, 700] }),
  e('apple-music', 'Apple Music', 'music', 'entertainment', 'music', { aliases: ['эпл музыка'], canBeTrial: true, typicalPriceRange: [169, 269] }),

  e('megafon', 'МегаФон', 'mobile', 'utilities', 'wifi', { aliases: ['megafon'], popular: true, typicalPriceRange: [300, 900] }),
  e('mts', 'МТС', 'mobile', 'utilities', 'wifi', { aliases: ['mts'], popular: true, typicalPriceRange: [300, 900] }),
  e('beeline', 'Билайн', 'mobile', 'utilities', 'wifi', { aliases: ['beeline'], popular: true, typicalPriceRange: [300, 900] }),
  e('tele2', 'Tele2', 'mobile', 'utilities', 'wifi', { aliases: ['теле2', 'т2'], typicalPriceRange: [250, 700] }),
  e('yota', 'Yota', 'mobile', 'utilities', 'wifi', { aliases: ['йота'], typicalPriceRange: [250, 600] }),
  e('t-mobile', 'Т-Мобайл', 'mobile', 'utilities', 'wifi', { aliases: ['tinkoff mobile', 'т-мобайл'], typicalPriceRange: [250, 700] }),

  e('icloud', 'iCloud+', 'cloud', 'utilities', 'cloud', { aliases: ['айклауд'], popular: true, typicalPriceRange: [59, 599] }),
  e('google-one', 'Google One', 'cloud', 'utilities', 'cloud', { aliases: ['гугл'], typicalPriceRange: [139, 699] }),
  e('yandex-360', 'Яндекс 360', 'cloud', 'utilities', 'cloud', { aliases: ['яндекс диск'], typicalPriceRange: [99, 399] }),
  e('dropbox', 'Dropbox', 'cloud', 'utilities', 'cloud', { aliases: ['дропбокс'], canBeTrial: true, typicalPriceRange: [700, 1400] }),
  e('onedrive', 'OneDrive', 'cloud', 'utilities', 'cloud', { aliases: ['microsoft 365'], canBeTrial: true, typicalPriceRange: [300, 700] }),
  e('telegram-premium', 'Telegram Premium', 'cloud', 'utilities', 'news', { aliases: ['телеграм премиум'], popular: true, typicalPriceRange: [299, 449] }),
  e('vpn', 'VPN-сервис', 'cloud', 'utilities', 'shield', { aliases: ['впн'], typicalPriceRange: [150, 700] }),
  e('antivirus', 'Антивирус', 'cloud', 'utilities', 'shield', { aliases: ['kaspersky', 'касперский'], typicalPriceRange: [150, 500] }),

  e('ozon-premium', 'Ozon Premium', 'shopping', 'shopping', 'delivery', { aliases: ['озон'], popular: true, canBeTrial: true, typicalPriceRange: [199, 399] }),
  e('yandex-plus', 'Яндекс Плюс', 'shopping', 'shopping', 'delivery', { aliases: ['yandex plus'], popular: true, canBeTrial: true, typicalPriceRange: [299, 399] }),
  e('samokat', 'Самокат', 'shopping', 'shopping', 'delivery', { aliases: ['samokat'], typicalPriceRange: [149, 299] }),
  e('kuper', 'Купер', 'shopping', 'shopping', 'delivery', { aliases: ['сбермаркет'], typicalPriceRange: [149, 299] }),
  e('yandex-eda', 'Яндекс Еда', 'shopping', 'shopping', 'food', { aliases: ['yandex eda'], typicalPriceRange: [149, 299] }),
  e('wb-club', 'WB Клуб', 'shopping', 'shopping', 'delivery', { aliases: ['wildberries'], typicalPriceRange: [149, 249] }),
  e('sberprime', 'СберПрайм', 'shopping', 'shopping', 'delivery', { aliases: ['sberprime'], canBeTrial: true, typicalPriceRange: [199, 399] }),
  e('magnit-plus', 'Магнит Плюс', 'shopping', 'shopping', 'delivery', { aliases: ['magnit'], typicalPriceRange: [99, 199] }),

  e('fitness-club', 'Фитнес-клуб', 'health', 'health', 'fitness', { aliases: ['спортзал', 'gym'], popular: true, typicalPriceRange: [1500, 5000] }),
  e('online-workouts', 'Онлайн-тренировки', 'health', 'health', 'fitness', { aliases: ['fitstars'], canBeTrial: true, typicalPriceRange: [300, 1000] }),
  e('meditation', 'Медитации', 'health', 'health', 'health', { aliases: ['calm', 'headspace'], canBeTrial: true, typicalPriceRange: [300, 900] }),
  e('health-app', 'Приложение здоровья', 'health', 'health', 'health', { aliases: ['трекер'], canBeTrial: true, typicalPriceRange: [200, 800] }),
  e('dms', 'Страховка / ДМС', 'health', 'health', 'shield', { aliases: ['страхование', 'полис'], typicalPriceRange: [500, 5000] }),
  e('pharmacy-sub', 'Аптечная подписка', 'health', 'health', 'health', { aliases: ['аптека', 'витамины'], typicalPriceRange: [300, 1500] }),

  e('skyeng', 'Skyeng', 'education', 'education', 'education', { aliases: ['английский'], typicalPriceRange: [1000, 4000] }),
  e('skillbox', 'Skillbox', 'education', 'education', 'education', { aliases: ['скиллбокс'], typicalPriceRange: [3000, 8000] }),
  e('netology', 'Нетология', 'education', 'education', 'education', { aliases: ['netology'], typicalPriceRange: [3000, 8000] }),
  e('duolingo', 'Duolingo', 'education', 'education', 'book', { aliases: ['дуолинго'], canBeTrial: true, typicalPriceRange: [500, 1000] }),
  e('coursera', 'Coursera', 'education', 'education', 'book', { aliases: ['курсера'], canBeTrial: true, typicalPriceRange: [3000, 5000] }),
  e('yandex-praktikum', 'Яндекс Практикум', 'education', 'education', 'education', { aliases: ['praktikum'], typicalPriceRange: [5000, 15000] }),
  e('uchi-ru', 'Учи.ру', 'education', 'education', 'kids', { aliases: ['uchi.ru'], typicalPriceRange: [300, 900] }),

  e('ps-plus', 'PlayStation Plus', 'games', 'entertainment', 'game', { aliases: ['ps plus'], canBeTrial: true, typicalPriceRange: [500, 1500] }),
  e('xbox-gamepass', 'Xbox Game Pass', 'games', 'entertainment', 'game', { aliases: ['game pass'], canBeTrial: true, typicalPriceRange: [500, 1500] }),
  e('nintendo-online', 'Nintendo Switch Online', 'games', 'entertainment', 'game', { aliases: ['нинтендо'], typicalPriceRange: [300, 700] }),
  e('steam-services', 'Steam-сервисы', 'games', 'entertainment', 'game', { aliases: ['стим'], typicalPriceRange: [100, 1000] }),
  e('game-sub', 'Игровая подписка', 'games', 'entertainment', 'game', { aliases: ['battle pass'], typicalPriceRange: [200, 1500] }),
  e('vk-play', 'VK Play', 'games', 'entertainment', 'game', { aliases: ['вк плей'], typicalPriceRange: [300, 1000] }),

  e('notion', 'Notion', 'work', 'productivity', 'productivity', { aliases: ['ноушн'], typicalPriceRange: [500, 1500] }),
  e('canva', 'Canva', 'work', 'productivity', 'camera', { aliases: ['канва'], canBeTrial: true, typicalPriceRange: [500, 1500] }),
  e('chatgpt', 'ChatGPT', 'work', 'productivity', 'ai', { aliases: ['openai', 'gpt'], popular: true, typicalPriceRange: [1500, 2500] }),
  e('midjourney', 'Midjourney', 'work', 'productivity', 'ai', { aliases: ['миджорни'], typicalPriceRange: [800, 3000] }),
  e('figma', 'Figma', 'work', 'productivity', 'camera', { aliases: ['фигма'], typicalPriceRange: [1000, 1500] }),
  e('github', 'GitHub', 'work', 'productivity', 'code', { aliases: ['copilot'], typicalPriceRange: [400, 1000] }),
  e('trello', 'Trello', 'work', 'productivity', 'productivity', { aliases: ['трелло'], canBeTrial: true, typicalPriceRange: [500, 1000] }),
  e('todoist', 'Todoist', 'work', 'productivity', 'productivity', { aliases: ['тудуист'], canBeTrial: true, typicalPriceRange: [300, 500] }),
  e('adobe', 'Adobe Creative Cloud', 'work', 'productivity', 'camera', { aliases: ['photoshop'], canBeTrial: true, typicalPriceRange: [1500, 5000] }),
  e('zoom', 'Zoom', 'work', 'productivity', 'productivity', { aliases: ['зум'], typicalPriceRange: [1000, 2000] }),

  e('home-internet', 'Домашний интернет', 'home', 'utilities', 'home', { aliases: ['провайдер'], popular: true, typicalPriceRange: [400, 1200] }),
  e('rostelecom', 'Ростелеком', 'home', 'utilities', 'home', { aliases: ['rostelecom'], typicalPriceRange: [400, 1200] }),
  e('domru', 'Дом.ру', 'home', 'utilities', 'home', { aliases: ['dom.ru'], typicalPriceRange: [400, 1000] }),
  e('mgts', 'МГТС', 'home', 'utilities', 'home', { aliases: ['mgts'], typicalPriceRange: [400, 1000] }),
  e('intercom', 'Домофон', 'home', 'utilities', 'home', { aliases: ['умный домофон'], typicalPriceRange: [50, 300] }),
  e('utilities-bill', 'ЖКХ', 'home', 'utilities', 'home', { aliases: ['коммуналка'], typicalPriceRange: [3000, 12000] }),
  e('security', 'Охрана', 'home', 'utilities', 'shield', { aliases: ['сигнализация'], typicalPriceRange: [300, 1500] }),
  e('smart-home', 'Умный дом', 'home', 'utilities', 'home', { aliases: ['алиса'], typicalPriceRange: [100, 500] }),

  e('news-media', 'Новости и медиа', 'other', 'other', 'news', { aliases: ['журнал'], typicalPriceRange: [200, 700] }),
  e('charity', 'Благотворительность', 'other', 'other', 'payments', { aliases: ['донат'], typicalPriceRange: [100, 1000] }),
  e('bank-service', 'Платное обслуживание карты', 'other', 'finance', 'finance', { aliases: ['банк', 'карта'], typicalPriceRange: [99, 1990] }),
  e('parking', 'Парковка / каршеринг', 'other', 'other', 'car', { aliases: ['каршеринг'], typicalPriceRange: [300, 3000] }),
  e('pets', 'Питомцы', 'other', 'other', 'pets', { aliases: ['корм по подписке'], typicalPriceRange: [500, 3000] }),
]

export function matchesCatalogQuery(entry: CatalogServiceEntry, query: string, categoryLabel?: string): boolean {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return true
  if (entry.name.toLowerCase().includes(q)) return true
  if (entry.aliases?.some((a) => a.toLowerCase().includes(q))) return true
  if (categoryLabel && categoryLabel.toLowerCase().includes(q)) return true
  return false
}
