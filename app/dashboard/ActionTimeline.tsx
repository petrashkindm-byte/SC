'use client'

import { useState } from 'react'

import type { SavingsAction } from '@/lib/savings-history'
import type { DbPlannedAction, PlannedActionType } from './savings/actions'
import { formatMoney } from '@/lib/currency'

function relativeDate(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso
  const diff = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (diff === 0) return 'сегодня'
  if (diff === 1) return 'вчера'
  if (diff < 7) return `${diff} дн. назад`
  if (diff < 30) return `${Math.floor(diff / 7)} нед. назад`
  if (diff < 365) return `${Math.floor(diff / 30)} мес. назад`
  return `${Math.floor(diff / 365)} г. назад`
}

function fmtAmount(amount: number, currency: string): string {
  return formatMoney(amount, currency)
}

const PLAN_LABELS: Record<PlannedActionType, string> = {
  switch_to_annual:      'Запланирован переход на годовой тариф',
  switch_to_family:      'Запланирован переход на семейный план',
  switch_to_cheaper:     'Запланирована замена на более дешёвый',
  switch_to_alternative: 'Запланирован переход на рыночную альтернативу',
}

const SAVINGS_LABELS: Record<string, string> = {
  cancelled:  'Отменена',
  downgraded: 'Понижен тариф',
  switched:   'Заменена',
}

type TimelineItem =
  | { kind: 'completed'; date: Date; action: SavingsAction }
  | { kind: 'planned';   date: Date; action: DbPlannedAction }

export default function ActionTimeline({
  initialPlannedActions,
  recentSavingsActions,
}: {
  initialPlannedActions: DbPlannedAction[]
  recentSavingsActions: SavingsAction[]
}) {
  const [renderNowTs] = useState(() => Date.now())
  const items: TimelineItem[] = [
    ...recentSavingsActions.map(a => ({
      kind: 'completed' as const,
      date: new Date(a.acted_at),
      action: a,
    })),
    ...initialPlannedActions.map(a => ({
      kind: 'planned' as const,
      date: a.createdAt,
      action: a,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()) // новые первые

  if (items.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="text-base font-semibold text-neutral-800 mb-3">Лента действий</h2>
      <ul className="space-y-2">
        {items.map((item) => {
          if (item.kind === 'completed') {
            const a = item.action
            return (
              <li
                key={`done-${a.id}`}
                className="flex items-center justify-between rounded-xl bg-white border border-neutral-100 px-4 py-3 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{a.subscription_name}</p>
                    <p className="text-xs text-neutral-400">
                      {SAVINGS_LABELS[a.action_type] ?? a.action_type}
                      {a.note ? ` · ${a.note}` : ''}
                      {' · '}{relativeDate(a.acted_at)}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-emerald-600 shrink-0">
                  +{fmtAmount(a.amount_monthly, a.currency)}/мес
                </p>
              </li>
            )
          }

          const a = item.action
          const daysAgo = Math.floor((renderNowTs - a.createdAt.getTime()) / 86_400_000)
          const isOverdue = daysAgo >= 14
          return (
            <li
              key={`plan-${a.id}`}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 gap-3 ${
                isOverdue
                  ? 'bg-amber-50 border-amber-100'
                  : 'bg-neutral-50 border-neutral-100'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`shrink-0 w-2 h-2 rounded-full mt-0.5 ${isOverdue ? 'bg-amber-400' : 'bg-neutral-300'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{a.subscriptionName}</p>
                  <p className={`text-xs ${isOverdue ? 'text-amber-600' : 'text-neutral-400'}`}>
                    {PLAN_LABELS[a.actionType]}
                    {a.targetService ? ` → ${a.targetService}` : ''}
                    {' · '}{relativeDate(a.createdAt)}
                    {isOverdue && ' · давно ждёт выполнения'}
                  </p>
                </div>
              </div>
              <p className={`text-sm font-semibold shrink-0 ${isOverdue ? 'text-amber-600' : 'text-neutral-500'}`}>
                {fmtAmount(a.savingMonthly, a.currency)}/мес
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
