'use server'

import { createClient } from '@/lib/supabase/server'
import { logSavingsAction } from '@/lib/savings-history'

export type PlannedActionType =
  | 'switch_to_annual'
  | 'switch_to_family'
  | 'switch_to_cheaper'
  | 'switch_to_alternative'

/** Тип строки planned_actions из Supabase (snake_case → camelCase уже конвертирован) */
export interface DbPlannedAction {
  id: number
  subscriptionId: string
  subscriptionName: string
  savingMonthly: number
  currency: string
  actionType: PlannedActionType
  targetService?: string
  createdAt: Date
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function rowToAction(row: Record<string, unknown>): DbPlannedAction {
  return {
    id:               Number(row.id),
    subscriptionId:   String(row.subscription_id),
    subscriptionName: String(row.subscription_name),
    savingMonthly:    Number(row.saving_monthly),
    currency:         String(row.currency),
    actionType:       row.action_type as PlannedActionType,
    targetService:    row.target_service != null ? String(row.target_service) : undefined,
    createdAt:        new Date(String(row.created_at)),
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────

/**
 * Возвращает все запланированные действия текущего пользователя,
 * отсортированные по дате создания (новые первые).
 */
export async function getPlannedActions(): Promise<DbPlannedAction[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('planned_actions')
    .select('id, subscription_id, subscription_name, saving_monthly, currency, action_type, target_service, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToAction)
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Добавляет новое запланированное действие.
 * Возвращает id созданной строки.
 */
export async function addPlannedAction(params: {
  subscriptionId: string
  subscriptionName: string
  savingMonthly: number
  currency: string
  actionType: PlannedActionType
  targetService?: string
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Не авторизован' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('planned_actions')
    .insert({
      user_id:           user.id,
      subscription_id:   params.subscriptionId,
      subscription_name: params.subscriptionName,
      saving_monthly:    params.savingMonthly,
      currency:          params.currency,
      action_type:       params.actionType,
      target_service:    params.targetService ?? null,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? 'Ошибка' }
  return { ok: true, id: Number((data as Record<string, unknown>).id) }
}

/**
 * Удаляет запланированное действие по ID.
 */
export async function removePlannedAction(
  id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Не авторизован' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('planned_actions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ── Complete ──────────────────────────────────────────────────────────────────

/**
 * Фиксирует выполнение запланированного действия:
 * 1. Записывает в savings_actions (история сохранений).
 * 2. Удаляет из planned_actions.
 */
export async function completePlannedAction(params: {
  plannedActionId: number
  subscriptionId: string
  subscriptionName: string
  savingMonthly: number
  currency: string
  actionType: PlannedActionType
  targetService?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Не авторизован' }

  const savingsActionType: 'cancelled' | 'downgraded' | 'switched' =
    params.actionType === 'switch_to_annual'  ? 'downgraded'  :
    params.actionType === 'switch_to_family'  ? 'downgraded'  :
    'switched'

  const note = params.targetService
    ? `Переход на: ${params.targetService}`
    : ({
        switch_to_annual:      'Переход на годовой тариф',
        switch_to_family:      'Переход на семейный план',
        switch_to_cheaper:     'Замена на более дешёвый сервис',
        switch_to_alternative: 'Переход на рыночную альтернативу',
      } as Record<PlannedActionType, string>)[params.actionType]

  // Записываем в savings_actions (не бросаем ошибку при неудаче)
  await logSavingsAction({
    supabase,
    userId: user.id,
    subscriptionId: params.subscriptionId,
    subscriptionName: params.subscriptionName,
    amountMonthly: params.savingMonthly,
    currency: params.currency,
    actionType: savingsActionType,
    note,
  })

  // Удаляем из planned_actions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('planned_actions')
    .delete()
    .eq('id', params.plannedActionId)
    .eq('user_id', user.id)

  return { ok: true }
}
