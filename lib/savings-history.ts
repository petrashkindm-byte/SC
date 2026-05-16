import { createClient } from '@/lib/supabase/server'

export interface SavingsAction {
  id: string
  subscription_id: string
  subscription_name: string
  amount_monthly: number
  currency: string
  action_type: 'cancelled' | 'downgraded' | 'switched'
  note: string | null
  acted_at: string
}

export interface SavingsHistoryResult {
  actions: SavingsAction[]
  totalSavedMonthly: number   // сумма в месяц всех отменённых
  totalSavedYearly: number    // × 12
  currency: string            // валюта большинства записей (эвристика)
}

/** Возвращает историю сохранений для авторизованного пользователя */
export async function getSavingsHistory(): Promise<SavingsHistoryResult | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('savings_actions')
    .select('id, subscription_id, subscription_name, amount_monthly, currency, action_type, note, acted_at')
    .eq('user_id', user.id)
    .order('acted_at', { ascending: false })
    .limit(100)

  if (error || !data) return { actions: [], totalSavedMonthly: 0, totalSavedYearly: 0, currency: 'RUB' }

  const actions = data as SavingsAction[]

  // эвристика: берём валюту, которая встречается чаще всего
  const currencyCount: Record<string, number> = {}
  for (const a of actions) {
    currencyCount[a.currency] = (currencyCount[a.currency] ?? 0) + 1
  }
  const dominantCurrency = Object.entries(currencyCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'RUB'

  // суммируем только записи в доминирующей валюте (упрощение; мультивалюта — TODO)
  const totalSavedMonthly = actions
    .filter(a => a.currency === dominantCurrency)
    .reduce((sum, a) => sum + Number(a.amount_monthly), 0)

  return {
    actions,
    totalSavedMonthly,
    totalSavedYearly: totalSavedMonthly * 12,
    currency: dominantCurrency,
  }
}

/** Записывает одно действие — вызывается из Server Action */
export async function logSavingsAction(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  subscriptionId: string
  subscriptionName: string
  amountMonthly: number
  currency: string
  actionType?: 'cancelled' | 'downgraded' | 'switched'
  note?: string
}) {
  const {
    supabase, userId, subscriptionId, subscriptionName,
    amountMonthly, currency, actionType = 'cancelled', note,
  } = params

  // Не бросаем ошибку — если история не записалась, основная операция всё равно должна пройти
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('savings_actions').insert({
    user_id: userId,
    subscription_id: subscriptionId,
    subscription_name: subscriptionName,
    amount_monthly: amountMonthly,
    currency,
    action_type: actionType,
    note: note ?? null,
  })
}

/** Вычисляет месячный эквивалент суммы подписки */
export function toMonthlyAmount(amount: number, billingCycle: string, billingInterval = 1): number {
  switch (billingCycle) {
    case 'weekly':    return (amount / 7) * 30.44
    case 'monthly':   return amount * billingInterval
    case 'quarterly': return (amount * billingInterval) / 3
    case 'yearly':    return (amount * billingInterval) / 12
    case 'custom':    return amount  // нет достаточно данных — возвращаем как есть
    default:          return amount
  }
}
