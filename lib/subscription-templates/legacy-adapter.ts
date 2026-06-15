import type { ServiceEntry } from '../service-catalog.ts'
import type { RegionCode, SubscriptionTemplate } from './types.ts'

/**
 * Конвертация старой плоской записи каталога (`service-catalog.ts`) в новую
 * модель «сервис + тарифы» — БЕЗ ручной перепроверки цены.
 *
 * Правило по умолчанию: легаси-цена считается непроверенной примеркой.
 * Поэтому каждая запись получает консервативные флаги
 * (`price_confidence: 'low'`, `should_autofill_amount: false`) и не
 * автозаполняет сумму, даже если у записи была конкретная `amount`.
 * Это безопаснее, чем доверять старым числам как точным.
 *
 * Записи с `amount: 0` трактуются как «цена неизвестна» (а не «бесплатно») —
 * в легаси-каталоге 0 использовался как заглушка, а не как признак free-тарифа.
 */
export function adaptLegacyEntry(entry: ServiceEntry): SubscriptionTemplate {
  const id = `legacy:${slugify(entry.name)}`
  const region: RegionCode[] = entry.currency === 'RUB' ? ['RU'] : ['UNKNOWN']
  const hasAmount = entry.amount > 0

  return {
    id,
    provider: entry.name,
    name: entry.name,
    display_name: entry.name,
    aliases: entry.aliases ?? [],
    icon: entry.icon,
    category_slug: entry.category_slug,
    payment_model: 'unknown',
    plans: [
      {
        id: `${id}:legacy`,
        name: entry.name,
        billing_cycle: entry.billing_cycle === 'custom' ? 'unknown' : entry.billing_cycle,
        amount: hasAmount ? entry.amount : null,
        currency: hasAmount ? entry.currency : null,
        amount_type: hasAmount ? 'approximate' : 'unknown',
        price_confidence: 'low',
        region,
      },
    ],
    management_url: entry.management_url,
    cancellation_url: entry.cancellation_url,
    pricing_url: entry.pricing_url,
    should_autofill_amount: false,
    should_show_in_suggestions: true,
    is_low_priority: true,
    notes: 'Migrated from legacy catalog — price not re-verified, treat as approximate at best.',
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}
