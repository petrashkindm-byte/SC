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
  // ── Российские мобильные операторы ──────────────────────────────────────
  { name: 'Теле2', icon: 'wifi', category_slug: 'utilities', billing_cycle: 'monthly', amount: 600, currency: 'RUB', cancellation_url: 'https://tele2.ru/personal', management_url: 'https://tele2.ru/personal', pricing_url: 'https://tele2.ru/tariffs', aliases: ['tele2', 'tele 2', 't2'] },
  { name: 'Ростелеком', icon: 'wifi', category_slug: 'utilities', billing_cycle: 'monthly', amount: 500, currency: 'RUB', cancellation_url: 'https://lk.rt.ru', management_url: 'https://lk.rt.ru', pricing_url: 'https://rostelecom.ru', aliases: ['rostelecom', 'ртк'] },
  { name: 'МТС', icon: 'wifi', category_slug: 'utilities', billing_cycle: 'monthly', amount: 700, currency: 'RUB', cancellation_url: 'https://mts.ru/personal', management_url: 'https://mts.ru/personal', pricing_url: 'https://mts.ru/tariffs', aliases: ['mts', 'мтс тариф'] },
  { name: 'МегаФон', icon: 'wifi', category_slug: 'utilities', billing_cycle: 'monthly', amount: 650, currency: 'RUB', cancellation_url: 'https://megafon.ru/services', management_url: 'https://lk.megafon.ru/subscriptions', pricing_url: 'https://megafon.ru/tariffs', aliases: ['megafon', 'мегафон тариф'] },
  { name: 'Билайн', icon: 'wifi', category_slug: 'utilities', billing_cycle: 'monthly', amount: 600, currency: 'RUB', cancellation_url: 'https://beeline.ru/customers/products', management_url: 'https://beeline.ru/customers/products', pricing_url: 'https://beeline.ru/tariffs', aliases: ['beeline', 'билайн тариф'] },
  { name: 'Yota', icon: 'wifi', category_slug: 'utilities', billing_cycle: 'monthly', amount: 400, currency: 'RUB', cancellation_url: 'https://yota.ru/content/b2c/main/lk', management_url: 'https://yota.ru/content/b2c/main/lk', pricing_url: 'https://yota.ru/tariffs', aliases: ['йота', 'yota mobile'] },
  { name: 'Тинькофф Мобайл', icon: 'wifi', category_slug: 'utilities', billing_cycle: 'monthly', amount: 350, currency: 'RUB', cancellation_url: 'https://tinkoff.ru/mobile-operator', management_url: 'https://tinkoff.ru/mobile-operator', pricing_url: 'https://tinkoff.ru/mobile-operator/tariffs', aliases: ['tinkoff mobile', 'тмобайл', 'т-мобайл'] },

  // ── Российский стриминг ──────────────────────────────────────────────────
  { name: 'Яндекс Музыка', icon: 'music', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 219, currency: 'RUB', cancellation_url: 'https://music.yandex.ru/settings', management_url: 'https://music.yandex.ru/settings', pricing_url: 'https://music.yandex.ru', aliases: ['яндекс музыка', 'yandex music'] },
  { name: 'Яндекс Плюс Мульти', icon: 'tv', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 699, currency: 'RUB', cancellation_url: 'https://plus.yandex.ru/lk', management_url: 'https://plus.yandex.ru/lk', pricing_url: 'https://plus.yandex.ru', aliases: ['яндекс плюс мульти', 'ya plus multi', 'яндекс+ мульти'] },
  { name: 'KION', icon: 'video', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 299, currency: 'RUB', cancellation_url: 'https://kion.ru/settings', management_url: 'https://kion.ru/settings', pricing_url: 'https://kion.ru/subscription', aliases: ['kion мтс', 'кион', 'мтс кион'] },
  { name: 'НТВ-Плюс', icon: 'tv', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 350, currency: 'RUB', cancellation_url: 'https://ntvplus.ru/lk', management_url: 'https://ntvplus.ru/lk', pricing_url: 'https://ntvplus.ru/subscriptions', aliases: ['ntv plus', 'нтв плюс'] },
  { name: 'Триколор', icon: 'tv', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 300, currency: 'RUB', cancellation_url: 'https://tricolor.tv/cabinet', management_url: 'https://tricolor.tv/cabinet', pricing_url: 'https://tricolor.tv/subscriptions', aliases: ['tricolor', 'триколор тв'] },

  // ── ИИ-инструменты ───────────────────────────────────────────────────────
  { name: 'Grok (xAI)', icon: 'ai', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1700, currency: 'RUB', cancellation_url: 'https://x.com/settings/subscriptions', management_url: 'https://x.com/i/premium_sign_up', pricing_url: 'https://x.ai/grok', aliases: ['grok', 'supergrok', 'super grok', 'xai', 'x ai', 'твиттер', 'twitter premium'] },
  { name: 'Microsoft Copilot Pro', icon: 'ai', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1700, currency: 'RUB', cancellation_url: 'https://account.microsoft.com/services', management_url: 'https://account.microsoft.com/services', pricing_url: 'https://copilot.microsoft.com', aliases: ['copilot pro', 'microsoft copilot', 'ms copilot', 'bing ai'] },
  { name: 'ChatGPT Team', icon: 'ai', category_slug: 'productivity', billing_cycle: 'monthly', amount: 3000, currency: 'RUB', cancellation_url: 'https://chat.openai.com/settings', management_url: 'https://chat.openai.com/settings', pricing_url: 'https://openai.com/chatgpt/pricing', aliases: ['chatgpt команда', 'openai team'] },
  { name: 'Windsurf Pro', icon: 'ai', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1500, currency: 'RUB', cancellation_url: 'https://codeium.com/account/billing', management_url: 'https://codeium.com/account/billing', pricing_url: 'https://codeium.com/pricing', aliases: ['windsurf', 'codeium', 'codeium pro'] },
  { name: 'Replit Core', icon: 'code', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1500, currency: 'RUB', cancellation_url: 'https://replit.com/account', management_url: 'https://replit.com/account', pricing_url: 'https://replit.com/pricing', aliases: ['replit', 'replit pro'] },
  { name: 'v0.dev Pro', icon: 'ai', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1500, currency: 'RUB', cancellation_url: 'https://v0.dev/settings', management_url: 'https://v0.dev/settings', pricing_url: 'https://v0.dev/pricing', aliases: ['v0', 'v0 dev', 'vercel v0'] },
  { name: 'Bolt.new Pro', icon: 'ai', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1700, currency: 'RUB', cancellation_url: 'https://bolt.new/settings', management_url: 'https://bolt.new/settings', pricing_url: 'https://bolt.new/pricing', aliases: ['bolt', 'bolt.new', 'stackblitz bolt'] },
  { name: 'Lovable', icon: 'ai', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1700, currency: 'RUB', cancellation_url: 'https://lovable.dev/settings/billing', management_url: 'https://lovable.dev/settings/billing', pricing_url: 'https://lovable.dev/pricing', aliases: ['lovable.dev', 'lovable ai', 'gptengineer'] },
  { name: 'Mistral Le Chat Pro', icon: 'ai', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1700, currency: 'RUB', cancellation_url: 'https://chat.mistral.ai/settings', management_url: 'https://chat.mistral.ai/settings', pricing_url: 'https://mistral.ai/pricing', aliases: ['mistral', 'le chat', 'mistral ai'] },
  { name: 'Anthropic Claude API', icon: 'ai', category_slug: 'productivity', billing_cycle: 'monthly', amount: 5000, currency: 'RUB', cancellation_url: 'https://console.anthropic.com/settings/billing', management_url: 'https://console.anthropic.com/settings/billing', pricing_url: 'https://anthropic.com/pricing', aliases: ['claude api', 'anthropic api'] },

  // ── Переводчики ──────────────────────────────────────────────────────────
  { name: 'DeepL Pro', icon: 'productivity', category_slug: 'productivity', billing_cycle: 'monthly', amount: 1000, currency: 'RUB', cancellation_url: 'https://deepl.com/account', management_url: 'https://deepl.com/account', pricing_url: 'https://deepl.com/pro', aliases: ['deepl', 'deep l', 'деepll'] },

  // ── Образование ──────────────────────────────────────────────────────────
  { name: 'Stepik', icon: 'education', category_slug: 'education', billing_cycle: 'monthly', amount: 2490, currency: 'RUB', cancellation_url: 'https://stepik.org/account/billing', management_url: 'https://stepik.org/account/billing', pricing_url: 'https://stepik.org/catalog?features=has_certificate', aliases: ['степик', 'stepic'] },
  { name: 'Hexlet', icon: 'code', category_slug: 'education', billing_cycle: 'monthly', amount: 2500, currency: 'RUB', cancellation_url: 'https://ru.hexlet.io/account/billing', management_url: 'https://ru.hexlet.io/account/billing', pricing_url: 'https://ru.hexlet.io/pro', aliases: ['хекслет'] },
  { name: 'HTML Academy', icon: 'code', category_slug: 'education', billing_cycle: 'monthly', amount: 1990, currency: 'RUB', cancellation_url: 'https://htmlacademy.ru/profile', management_url: 'https://htmlacademy.ru/profile', pricing_url: 'https://htmlacademy.ru/pro', aliases: ['html academy', 'хтмл академия'] },
  { name: 'Яндекс Образование', icon: 'education', category_slug: 'education', billing_cycle: 'monthly', amount: 990, currency: 'RUB', cancellation_url: 'https://education.yandex.ru/profile', management_url: 'https://education.yandex.ru/profile', pricing_url: 'https://education.yandex.ru', aliases: ['yandex education', 'яндекс обучение'] },
  { name: 'Checkio', icon: 'code', category_slug: 'education', billing_cycle: 'monthly', amount: 800, currency: 'RUB', cancellation_url: 'https://py.checkio.org/settings/subscription', management_url: 'https://py.checkio.org/settings/subscription', pricing_url: 'https://py.checkio.org/landing/subscription', aliases: ['чекио', 'check io'] },
  { name: 'Codecademy Pro', icon: 'code', category_slug: 'education', billing_cycle: 'monthly', amount: 1500, currency: 'RUB', cancellation_url: 'https://codecademy.com/account/billing', management_url: 'https://codecademy.com/account/billing', pricing_url: 'https://codecademy.com/pro', aliases: ['codecademy', 'code academy'] },
  { name: 'Pluralsight', icon: 'education', category_slug: 'education', billing_cycle: 'monthly', amount: 2000, currency: 'RUB', cancellation_url: 'https://app.pluralsight.com/settings/subscription', management_url: 'https://app.pluralsight.com/settings/subscription', pricing_url: 'https://pluralsight.com/pricing', aliases: ['плюралсайт'] },
  { name: 'Frontend Masters', icon: 'code', category_slug: 'education', billing_cycle: 'monthly', amount: 2500, currency: 'RUB', cancellation_url: 'https://frontendmasters.com/settings/billing', management_url: 'https://frontendmasters.com/settings/billing', pricing_url: 'https://frontendmasters.com/join', aliases: ['frontend masters', 'фронтенд мастерс'] },
  { name: 'Egghead.io', icon: 'code', category_slug: 'education', billing_cycle: 'yearly', amount: 5000, currency: 'RUB', cancellation_url: 'https://egghead.io/user/edit', management_url: 'https://egghead.io/user/edit', pricing_url: 'https://egghead.io/pricing', aliases: ['egghead'] },

  // ── Здоровье и фитнес ────────────────────────────────────────────────────
  { name: 'Apple Fitness+', icon: 'fitness', category_slug: 'health', billing_cycle: 'monthly', amount: 399, currency: 'RUB', cancellation_url: 'https://reportaproblem.apple.com', management_url: 'https://appleid.apple.com/account/manage', pricing_url: 'https://apple.com/apple-fitness-plus', aliases: ['apple fitness', 'фитнес плюс', 'fitness plus'] },
  { name: 'Fitbit Premium', icon: 'fitness', category_slug: 'health', billing_cycle: 'monthly', amount: 599, currency: 'RUB', cancellation_url: 'https://fitbit.com/settings/subscriptions', management_url: 'https://fitbit.com/settings/subscriptions', pricing_url: 'https://fitbit.com/global/en-gb/products/services/premium', aliases: ['fitbit', 'фитбит', 'google fitbit'] },
  { name: 'Freeletics', icon: 'fitness', category_slug: 'health', billing_cycle: 'monthly', amount: 900, currency: 'RUB', cancellation_url: 'https://freeletics.com/r/subscriptions', management_url: 'https://freeletics.com/r/subscriptions', pricing_url: 'https://freeletics.com/coach', aliases: ['фрилилетикс', 'free letics'] },
  { name: 'VSCO', icon: 'camera', category_slug: 'productivity', billing_cycle: 'yearly', amount: 2000, currency: 'RUB', cancellation_url: 'https://vsco.co/settings', management_url: 'https://vsco.co/settings', pricing_url: 'https://vsco.co/about/membership', aliases: ['вско', 'vsco pro', 'vsco membership'] },
  { name: 'Zepp Health', icon: 'fitness', category_slug: 'health', billing_cycle: 'monthly', amount: 299, currency: 'RUB', cancellation_url: 'https://account.zepp.com/account', management_url: 'https://account.zepp.com/account', pricing_url: 'https://zepp.com/health', aliases: ['zepp', 'amazfit health', 'zepp life'] },
  { name: 'FitStars', icon: 'fitness', category_slug: 'health', billing_cycle: 'monthly', amount: 999, currency: 'RUB', cancellation_url: 'https://fitstars.ru/profile/subscription', management_url: 'https://fitstars.ru/profile/subscription', pricing_url: 'https://fitstars.ru', aliases: ['фитстарс', 'fit stars'] },

  // ── Игры ─────────────────────────────────────────────────────────────────
  { name: 'Xbox PC Game Pass', icon: 'game', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 499, currency: 'RUB', cancellation_url: 'https://account.microsoft.com/services', management_url: 'https://account.microsoft.com/services', pricing_url: 'https://xbox.com/game-pass/pc-game-pass', aliases: ['game pass pc', 'gamepass pc', 'xbox pc'] },
  { name: 'Roblox Premium', icon: 'game', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 499, currency: 'RUB', cancellation_url: 'https://roblox.com/premium/membership', management_url: 'https://roblox.com/premium/membership', pricing_url: 'https://roblox.com/premium/membership', aliases: ['roblox', 'роблокс', 'роблокс премиум'] },
  { name: 'Minecraft Realms', icon: 'game', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 399, currency: 'RUB', cancellation_url: 'https://realms.minecraft.net', management_url: 'https://realms.minecraft.net', pricing_url: 'https://minecraft.net/realms', aliases: ['minecraft', 'майнкрафт', 'майнкрафт realms'] },
  { name: 'Roblox Robux', icon: 'game', category_slug: 'entertainment', billing_cycle: 'monthly', amount: 799, currency: 'RUB', cancellation_url: 'https://roblox.com/robux', management_url: 'https://roblox.com/robux', pricing_url: 'https://roblox.com/robux', aliases: ['robux', 'робуксы'] },

  // ── Безопасность и VPN ───────────────────────────────────────────────────
  { name: 'Windscribe Pro', icon: 'shield', category_slug: 'utilities', billing_cycle: 'monthly', amount: 700, currency: 'RUB', cancellation_url: 'https://windscribe.com/account', management_url: 'https://windscribe.com/account', pricing_url: 'https://windscribe.com/upgrade', aliases: ['windscribe', 'виндскрайб'] },
  { name: 'hide.me VPN', icon: 'shield', category_slug: 'utilities', billing_cycle: 'monthly', amount: 700, currency: 'RUB', cancellation_url: 'https://hide.me/en/member', management_url: 'https://hide.me/en/member', pricing_url: 'https://hide.me/en/pricing', aliases: ['hide.me', 'hideme', 'хайдми'] },
  { name: 'Proton Pass', icon: 'shield', category_slug: 'utilities', billing_cycle: 'monthly', amount: 400, currency: 'RUB', cancellation_url: 'https://account.proton.me/pass', management_url: 'https://account.proton.me/pass', pricing_url: 'https://proton.me/pass/pricing', aliases: ['proton pass', 'протон пасс', 'protonpass'] },
  { name: 'Proton Drive', icon: 'cloud', category_slug: 'utilities', billing_cycle: 'monthly', amount: 499, currency: 'RUB', cancellation_url: 'https://account.proton.me/drive', management_url: 'https://account.proton.me/drive', pricing_url: 'https://proton.me/drive/pricing', aliases: ['proton drive', 'протон драйв', 'protondrive'] },
  { name: 'Keeper', icon: 'shield', category_slug: 'utilities', billing_cycle: 'yearly', amount: 1800, currency: 'RUB', cancellation_url: 'https://keepersecurity.com/account', management_url: 'https://keepersecurity.com/account', pricing_url: 'https://keepersecurity.com/pricing.html', aliases: ['keeper security', 'keeper password'] },

  // ── Резервное копирование ────────────────────────────────────────────────
  { name: 'Backblaze Personal', icon: 'cloud', category_slug: 'utilities', billing_cycle: 'monthly', amount: 700, currency: 'RUB', cancellation_url: 'https://secure.backblaze.com/account.htm', management_url: 'https://secure.backblaze.com/account.htm', pricing_url: 'https://backblaze.com/cloud-backup/pricing', aliases: ['backblaze', 'бэкблейз', 'backblaze backup'] },

  // ── Фото и видеоредакторы ────────────────────────────────────────────────
  { name: 'Luminar Neo', icon: 'camera', category_slug: 'productivity', billing_cycle: 'yearly', amount: 4000, currency: 'RUB', cancellation_url: 'https://skylum.com/account', management_url: 'https://skylum.com/account', pricing_url: 'https://skylum.com/luminar-neo/pricing', aliases: ['luminar', 'skylum', 'luminar ai'] },
  { name: 'Topaz Photo AI', icon: 'camera', category_slug: 'productivity', billing_cycle: 'yearly', amount: 5000, currency: 'RUB', cancellation_url: 'https://topazlabs.com/account', management_url: 'https://topazlabs.com/account', pricing_url: 'https://topazlabs.com/topaz-photo-ai', aliases: ['topaz', 'topaz ai', 'topaz labs'] },
  { name: 'KineMaster Premium', icon: 'video', category_slug: 'productivity', billing_cycle: 'monthly', amount: 499, currency: 'RUB', cancellation_url: 'https://kinemaster.com/account', management_url: 'https://kinemaster.com/account', pricing_url: 'https://kinemaster.com/pricing', aliases: ['kinemaster', 'кинемастер'] },
  { name: 'InShot Pro', icon: 'video', category_slug: 'productivity', billing_cycle: 'monthly', amount: 399, currency: 'RUB', cancellation_url: 'https://inshot.com', management_url: 'https://inshot.com', pricing_url: 'https://inshot.com/pricing', aliases: ['inshot', 'иншот'] },

  // ── Написание и текст ────────────────────────────────────────────────────
  { name: 'Ulysses', icon: 'book', category_slug: 'productivity', billing_cycle: 'monthly', amount: 399, currency: 'RUB', cancellation_url: 'https://ulysses.app/account', management_url: 'https://ulysses.app/account', pricing_url: 'https://ulysses.app/pricing', aliases: ['улисс', 'ulysses app'] },
  { name: 'iA Writer', icon: 'book', category_slug: 'productivity', billing_cycle: 'monthly', amount: 2900, currency: 'RUB', cancellation_url: 'https://ia.net/writer', management_url: 'https://ia.net/writer', pricing_url: 'https://ia.net/writer', aliases: ['ia writer', 'ia writer', 'айэй райтер'] },
  { name: 'Scrivener', icon: 'book', category_slug: 'productivity', billing_cycle: 'monthly', amount: 5000, currency: 'RUB', cancellation_url: 'https://literatureandlatte.com/account', management_url: 'https://literatureandlatte.com/account', pricing_url: 'https://literatureandlatte.com/scrivener', aliases: ['scrivener 3', 'скривенер'] },
  { name: 'Hemingway Editor', icon: 'book', category_slug: 'productivity', billing_cycle: 'monthly', amount: 2000, currency: 'RUB', cancellation_url: 'https://hemingwayapp.com', management_url: 'https://hemingwayapp.com', pricing_url: 'https://hemingwayapp.com', aliases: ['hemingway', 'хемингуэй редактор'] },

  // ── Финансы и инвестиции ─────────────────────────────────────────────────
  { name: 'Альфа Инвестиции', icon: 'finance', category_slug: 'finance', billing_cycle: 'monthly', amount: 0, currency: 'RUB', cancellation_url: 'https://alfabank.ru/investments', management_url: 'https://alfabank.ru/investments', pricing_url: 'https://alfabank.ru/investments', aliases: ['альфа инвест', 'alfa invest', 'альфабанк инвестиции'] },
  { name: 'ВТБ Мои Инвестиции', icon: 'finance', category_slug: 'finance', billing_cycle: 'monthly', amount: 0, currency: 'RUB', cancellation_url: 'https://invest.vtb.ru', management_url: 'https://invest.vtb.ru', pricing_url: 'https://invest.vtb.ru', aliases: ['втб инвестиции', 'vtb invest', 'vtb мои инвестиции'] },
  { name: 'Газпромбанк Инвестиции', icon: 'finance', category_slug: 'finance', billing_cycle: 'monthly', amount: 0, currency: 'RUB', cancellation_url: 'https://gazprombank.ru/personal/invest', management_url: 'https://gazprombank.ru/personal/invest', pricing_url: 'https://gazprombank.ru/personal/invest', aliases: ['газпромбанк', 'gpb invest'] },

  // ── Доставка еды ─────────────────────────────────────────────────────────
  { name: 'Яндекс Лавка Прайм', icon: 'delivery', category_slug: 'other', billing_cycle: 'monthly', amount: 299, currency: 'RUB', cancellation_url: 'https://lavka.yandex.ru', management_url: 'https://lavka.yandex.ru', pricing_url: 'https://lavka.yandex.ru', aliases: ['яндекс лавка', 'lavka', 'лавка плюс'] },
  { name: 'СберМаркет Premium', icon: 'delivery', category_slug: 'other', billing_cycle: 'monthly', amount: 199, currency: 'RUB', cancellation_url: 'https://sbermarket.ru/account', management_url: 'https://sbermarket.ru/account', pricing_url: 'https://sbermarket.ru/subscription', aliases: ['сберmarket', 'сбермаркет'] },
  { name: 'Перекрёсток Online', icon: 'delivery', category_slug: 'shopping', billing_cycle: 'monthly', amount: 249, currency: 'RUB', cancellation_url: 'https://perekrestok.ru/account', management_url: 'https://perekrestok.ru/account', pricing_url: 'https://perekrestok.ru', aliases: ['перекресток онлайн', 'vprok'] },
  { name: 'Самокат Плюс', icon: 'delivery', category_slug: 'other', billing_cycle: 'monthly', amount: 199, currency: 'RUB', cancellation_url: 'https://samokat.ru/account', management_url: 'https://samokat.ru/account', pricing_url: 'https://samokat.ru/plus', aliases: ['самокат плюс', 'samokat plus'] },
  { name: 'Uber One', icon: 'car', category_slug: 'other', billing_cycle: 'monthly', amount: 299, currency: 'RUB', cancellation_url: 'https://help.uber.com/ubereats', management_url: 'https://help.uber.com/ubereats', pricing_url: 'https://uber.com/one', aliases: ['uber pass', 'uber eats', 'убер ван'] },
]

export const SERVICE_CATALOG: ServiceEntry[] = [
  ...EXTRA_ENTRIES,
  ...(rawCatalog as ServiceEntry[]),
]

/** Точный поиск management_url по названию сервиса (case-insensitive, trim).
 *  Используется как fallback когда поле не заполнено в БД. */
export function lookupManagementUrl(name: string): string | null {
  const n = name.trim().toLowerCase()
  return SERVICE_CATALOG.find((e) => e.name.trim().toLowerCase() === n)?.management_url ?? null
}

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

  // Дедупликация по name (case-insensitive, trim): даже если оба источника
  // (EXTRA_ENTRIES и rawCatalog) вернут одинаковое название, в выдачу попадёт
  // только первое — с наибольшим score, а при равенстве курируемое, т.к.
  // EXTRA_ENTRIES идут первыми в SERVICE_CATALOG.
  const seen = new Set<string>()
  const result: ServiceEntry[] = []
  for (const { entry } of scored.sort((a, b) => b.score - a.score)) {
    const key = entry.name.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(entry)
    if (result.length >= 6) break
  }
  return result
}
