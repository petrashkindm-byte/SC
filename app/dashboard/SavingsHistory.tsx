'use client'

import type { SavingsAction, SavingsHistoryResult } from '@/lib/savings-history'
import { useLang } from '@/lib/LangContext'
import { formatMoney } from '@/lib/currency'

function formatAmount(amount: number, currency: string): string {
  return formatMoney(amount, currency)
}

function relativeDate(iso: string, lang: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (lang === 'en') {
    if (diff === 0) return 'today'
    if (diff === 1) return 'yesterday'
    if (diff < 7) return `${diff}d ago`
    if (diff < 30) return `${Math.floor(diff / 7)}wk ago`
    if (diff < 365) return `${Math.floor(diff / 30)}mo ago`
    return `${Math.floor(diff / 365)}yr ago`
  }
  if (diff === 0) return 'сегодня'
  if (diff === 1) return 'вчера'
  if (diff < 7) return `${diff} дн. назад`
  if (diff < 30) return `${Math.floor(diff / 7)} нед. назад`
  if (diff < 365) return `${Math.floor(diff / 30)} мес. назад`
  return `${Math.floor(diff / 365)} г. назад`
}

type Props = {
  data: SavingsHistoryResult | null
}

export default function SavingsHistory({ data }: Props) {
  const { lang } = useLang()

  const title = lang === 'en' ? 'Savings history' : 'История сохранений'
  const emptyText = lang === 'en'
    ? 'Nothing yet. When you cancel a subscription, a record of savings will appear here.'
    : 'Пока ничего нет. Когда вы отменяете подписку — здесь появится запись о сэкономленных деньгах.'
  const totalLabel = lang === 'en' ? 'Total saved' : 'Всего сохранено'
  const perYearLabel = lang === 'en' ? 'per year' : 'в год'
  const perMonthSuffix = lang === 'en' ? '/mo' : '/мес'

  const actionLabel = (type: SavingsAction['action_type']) => {
    if (lang === 'en') {
      if (type === 'cancelled') return 'Cancelled'
      if (type === 'downgraded') return 'Downgraded'
      return 'Switched'
    }
    if (type === 'cancelled') return 'Отменена'
    if (type === 'downgraded') return 'Понижен тариф'
    return 'Заменена'
  }

  if (!data || data.actions.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="text-base font-semibold text-neutral-800 mb-3">{title}</h2>
        <p className="text-sm text-neutral-400">{emptyText}</p>
      </section>
    )
  }

  const { actions, totalSavedMonthly, totalSavedYearly, currency } = data

  return (
    <section className="mt-10">
      <h2 className="text-base font-semibold text-neutral-800 mb-4">{title}</h2>

      <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-5 py-4 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-1">{totalLabel}</p>
          <p className="text-2xl font-bold text-emerald-700">
            {formatAmount(totalSavedMonthly, currency)}<span className="text-base font-normal text-emerald-500">{perMonthSuffix}</span>
          </p>
          <p className="text-sm text-emerald-600 mt-0.5">
            ≈ {formatAmount(totalSavedYearly, currency)} {perYearLabel}
          </p>
        </div>
        <div className="text-4xl select-none">🏆</div>
      </div>

      <ul className="space-y-2">
        {actions.map(action => (
          <li
            key={action.id}
            className="flex items-center justify-between rounded-xl bg-white border border-neutral-100 px-4 py-3 gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0" aria-hidden>
                {action.action_type === 'cancelled' ? '✂️' : action.action_type === 'downgraded' ? '⬇️' : '🔄'}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">{action.subscription_name}</p>
                <p className="text-xs text-neutral-400">
                  {actionLabel(action.action_type)} · {relativeDate(action.acted_at, lang)}
                </p>
                {action.note && (
                  <p className="text-xs text-neutral-500 mt-0.5 italic">{action.note}</p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-emerald-600">
                +{formatAmount(action.amount_monthly, action.currency)}{perMonthSuffix}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
