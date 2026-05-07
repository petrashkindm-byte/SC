export type AiLocale = 'ru' | 'en'

/** Поля в духе мобильного `SubscriptionForAI` / симулятора экономии. */
export interface SubscriptionForAI {
  name: string
  amount: number
  currency: string
  billingCycle: string
  /** Как `billing_interval` в БД; влияет на нормализацию к «в месяц». */
  billingInterval: number
  customIntervalDays: number | null
  nextChargeDate: string
  lastUsedAt?: string | null
  /** Как в приложении: regular | rarely_used | needs_review | unknown (если данных нет). */
  usageState?: string | null
  daysUntilRenewal: number
}
