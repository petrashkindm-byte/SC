import type { CategorySlug } from '../supabase/types.ts'

/**
 * Периодичность шаблона. Отличается от app-wide `BillingCycle`
 * (lib/supabase/types.ts) тем, что шаблон может описывать разовую
 * покупку или сервис без известной периодичности — то, чем не может
 * быть настоящая подписка пользователя.
 */
export type TemplateBillingCycle =
  | 'monthly'
  | 'yearly'
  | 'weekly'
  | 'quarterly'
  | 'one_time'
  | 'unknown'

/**
 * Насколько `amount` пригоден для автоподстановки.
 * - fixed: точная цена для региона/тарифа пользователя
 * - from: цена «от X» (минимальный тариф линейки)
 * - approximate: примерная, может отличаться
 * - promo: вводная/акционная цена — не регулярная
 * - one_time: разовый платёж (для license/покупок)
 * - free: бесплатно
 * - unknown: цена не определена
 */
export type AmountType =
  | 'fixed'
  | 'from'
  | 'approximate'
  | 'promo'
  | 'one_time'
  | 'free'
  | 'unknown'

/** Тип платёжных отношений пользователя с сервисом. */
export type PaymentModel =
  | 'subscription'
  | 'license'
  | 'free'
  | 'usage_based'
  | 'marketplace'
  | 'bank_fee'
  | 'operator_option'
  | 'unknown'

/** Насколько мы уверены в указанной цене. */
export type PriceConfidence =
  | 'verified'
  | 'high'
  | 'medium'
  | 'low'
  | 'unknown'

/** Регион, для которого актуальна цена плана. */
export type RegionCode =
  | 'RU'
  | 'US'
  | 'EU'
  | 'GLOBAL'
  | 'UNKNOWN'

/** Где пользователь мог оформить подписку — влияет на то, как её отменить. */
export type PaymentSource =
  | 'website'
  | 'app_store'
  | 'google_play'
  | 'operator'
  | 'bank'
  | 'marketplace'
  | 'unknown'

export interface SubscriptionPlanTemplate {
  id: string
  name: string
  aliases?: string[]
  billing_cycle: TemplateBillingCycle
  amount: number | null
  currency: string | null
  amount_type: AmountType
  price_confidence: PriceConfidence
  region: RegionCode[]
  payment_sources?: PaymentSource[]
  notes?: string
}

export interface SubscriptionTemplate {
  id: string
  /** Компания/правообладатель сервиса (для группировки и provider-логики). */
  provider: string
  /** Внутреннее нормализованное имя для поиска/дедупликации. */
  name: string
  /** Имя, которое видит пользователь. */
  display_name: string
  aliases: string[]
  /** id пресета из `payment-icon-presets`. */
  icon: string
  category_slug: CategorySlug
  subcategory_slug?: string
  payment_model: PaymentModel
  /** Пакет, включающий другие сервисы (напр. Яндекс Плюс включает Кинопоиск). */
  is_bundle?: boolean
  included_services?: string[]
  /**
   * Тарифы сервиса. Первый план считается «основным» —
   * именно он используется для автоподстановки/подсказки в списке.
   */
  plans: SubscriptionPlanTemplate[]
  management_url?: string
  cancellation_url?: string
  pricing_url?: string
  /** Ключевые слова для распознавания в банковских/почтовых выписках. */
  detection_keywords?: string[]
  /**
   * Можно ли автоматически подставить сумму основного плана в форму.
   * true допустимо только при amount_type:'fixed' и price_confidence
   * 'verified'|'high' для подходящего региона — это проверяется валидатором.
   */
  should_autofill_amount: boolean
  /** Показывать ли сервис в подсказках автокомплита вообще. */
  should_show_in_suggestions: boolean
  /** Понижать приоритет в выдаче (B2B/неприоритетные для частного пользователя). */
  is_low_priority?: boolean
  /** Предупреждение, которое нужно показать пользователю при выборе сервиса. */
  user_warning?: string
  /** Заметки для редакторов справочника — не показываются пользователю. */
  notes?: string
}
