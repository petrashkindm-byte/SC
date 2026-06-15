import { SERVICE_CATALOG, type ServiceEntry } from '../service-catalog.ts'
import { CURATED_TEMPLATES } from './curated-entries.ts'
import { adaptLegacyEntry } from './legacy-adapter.ts'
import type { SubscriptionTemplate } from './types.ts'

/** Легаси-каталог, сохранённый как историческая справка (не редактируется). */
export const LEGACY_SERVICE_CATALOG: ServiceEntry[] = SERVICE_CATALOG

function normalizedKey(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Объединение курируемых шаблонов с адаптированным легаси-каталогом.
 * При совпадении нормализованного имени курируемая запись побеждает —
 * та же логика приоритета, что у `EXTRA_ENTRIES` относительно `rawCatalog`.
 */
export const SUBSCRIPTION_TEMPLATES: SubscriptionTemplate[] = (() => {
  const seen = new Set<string>()
  const result: SubscriptionTemplate[] = []

  for (const template of CURATED_TEMPLATES) {
    seen.add(normalizedKey(template.name))
    result.push(template)
  }

  for (const entry of LEGACY_SERVICE_CATALOG) {
    const key = normalizedKey(entry.name)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(adaptLegacyEntry(entry))
  }

  return result
})()

/** Точный поиск management_url по названию (case-insensitive, trim). */
export function lookupManagementUrl(name: string): string | null {
  const n = normalizedKey(name)
  return SUBSCRIPTION_TEMPLATES.find((t) => normalizedKey(t.name) === n)?.management_url ?? null
}

/**
 * Поиск по каталогу шаблонов — возвращает до 6 совпадений.
 *
 * Базовый скоринг — тот же алгоритм, что в легаси `searchCatalog`
 * (точное/префиксное/по словам/по алиасам/по подстроке совпадение),
 * расширенный двумя вещами:
 * - совпадение по `detection_keywords` (вес как у алиасов);
 * - понижение приоритета записей, которые не стоит продвигать в подсказках
 *   («низкий приоритет»/B2B, бесплатные/разовые при неточном совпадении —
 *   правило 9 из ТЗ: не показывать free/license впереди при нечётком запросе).
 */
export function searchSubscriptionTemplates(query: string): SubscriptionTemplate[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []

  const scored: { template: SubscriptionTemplate; score: number }[] = []

  for (const template of SUBSCRIPTION_TEMPLATES) {
    const nameLower = template.name.toLowerCase()
    const displayLower = template.display_name.toLowerCase()
    const words = nameLower.split(/\s+/)
    let score = 0

    if (nameLower === q || displayLower === q) {
      score = 100
    } else if (nameLower.startsWith(q) || displayLower.startsWith(q)) {
      score = 90
    } else if (words.some((w) => w.startsWith(q))) {
      score = 70
    } else if (template.aliases.some((a) => {
      const al = a.toLowerCase()
      return al === q || al.startsWith(q) || al.split(/\s+/).some((w) => w.startsWith(q))
    })) {
      score = 50
    } else if (template.detection_keywords?.some((k) => {
      const kl = k.toLowerCase()
      return kl === q || kl.startsWith(q) || kl.split(/\s+/).some((w) => w.startsWith(q))
    })) {
      score = 50
    } else if ((nameLower.includes(q) || displayLower.includes(q)) && q.length >= 3) {
      score = 30
    } else if (
      q.length >= 3 &&
      (template.aliases.some((a) => a.toLowerCase().includes(q)) ||
        template.detection_keywords?.some((k) => k.toLowerCase().includes(q)))
    ) {
      score = 20
    }

    if (score === 0) continue

    // Правило 9 из ТЗ: сервисы, скрытые из подсказок по умолчанию (бесплатные,
    // низкоприоритетные и т.п.), показываем только при точном/префиксном
    // совпадении — иначе они будут засорять выдачу при нечётком запросе.
    if (!template.should_show_in_suggestions && score < 90) continue

    // Бесплатные и разовые сервисы не должны опережать обычные подписки
    // в выдаче, кроме случаев точного/префиксного совпадения.
    const isFreeOrOneTime = template.payment_model === 'free' || template.payment_model === 'license'
    if (isFreeOrOneTime && score < 90) {
      score -= 15
    }

    // B2B/неприоритетные записи отходят на второй план при нечётком совпадении.
    if (template.is_low_priority && score < 90) {
      score -= 10
    }

    if (score > 0) scored.push({ template, score })
  }

  const seen = new Set<string>()
  const result: SubscriptionTemplate[] = []
  for (const { template } of scored.sort((a, b) => b.score - a.score)) {
    const key = normalizedKey(template.name)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(template)
    if (result.length >= 6) break
  }
  return result
}

export type { SubscriptionTemplate, SubscriptionPlanTemplate } from './types.ts'
