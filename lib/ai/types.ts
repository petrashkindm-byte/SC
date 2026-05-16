export type AiLocale = 'ru' | 'en'

/** Один проактивный совет для экрана «Сегодня» (ответ `/api/ai/daily-tip`). */
export type DailyTipResult = {
  text: string
  savings_rub: number | null
  action_path: string
  kind: string
  related_subscription_ids: string[]
}

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
  category: string
  renewalType: string
  monthlyEquivalent: number
}
