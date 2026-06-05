'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { coerceNumber } from '@/lib/coerce-number'
import { categoryLabel, formatBillingCycle } from '@/lib/subscription-labels'
import { useLang } from '@/lib/LangContext'
import type { Subscription } from '@/lib/supabase/types'
import { resolveSubscriptionIconDisplay } from '@/lib/subscription-icon-background'
import PaymentServiceIcon from '../PaymentServiceIcon'
import DashboardScreenHeader from '../DashboardScreenHeader'
import { updateSubscriptionStatus } from '../subscriptions/actions'
import { getMonthlyAmount } from '@/lib/currency'
import { useDarkMode } from '@/lib/hooks/use-dark-mode'

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(dateStr).getTime() - today.getTime()) / 86400000)
}

function pluralDays(n: number): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m100 >= 11 && m100 <= 14) return 'дней'
  if (m10 === 1) return 'день'
  if (m10 >= 2 && m10 <= 4) return 'дня'
  return 'дней'
}

function actionsWord(n: number): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m100 >= 11 && m100 <= 14) return 'действий'
  if (m10 === 1) return 'действие'
  if (m10 >= 2 && m10 <= 4) return 'действия'
  return 'действий'
}

function actionHint(sub: Subscription): string {
  if (sub.status !== 'active') return 'Подписка не активна — откройте карточку, чтобы изменить статус.'
  const d = daysUntil(sub.next_charge_date)
  if (d < 0) return 'Дата списания прошла — проверьте подписку в «Платежах».'
  if (d === 0) return 'Сегодня плановое списание по этой подписке.'
  if (d <= 3) return `Списание через ${d} ${pluralDays(d)} — успейте изменить условия при необходимости.`
  if (d <= 14) return 'Скоро очередное списание; сверьте сумму и тариф.'
  return 'Активная подписка из вашего списка — при необходимости откройте карточку.'
}

function priorityLabel(sub: Subscription): string {
  if (sub.status !== 'active') return 'Не активна'
  const d = daysUntil(sub.next_charge_date)
  if (d < 0) return 'Просрочено'
  if (d <= 3) return 'Срочно'
  if (d <= 14) return 'Скоро'
  return 'В плане'
}

function duplicatePotential(active: Subscription[]): number {
  const byCat = new Map<string, Subscription[]>()
  for (const s of active) {
    const g = byCat.get(s.category_slug) ?? []
    g.push(s)
    byCat.set(s.category_slug, g)
  }
  let sum = 0
  for (const [, group] of byCat) {
    if (group.length < 2) continue
    const monthlies = group.map((s) => getMonthlyAmount(s)).sort((a, b) => a - b)
    const total = monthlies.reduce((a, b) => a + b, 0)
    sum += total - monthlies[0]!
  }
  return sum
}

type Insight = { prio: 'high' | 'med' | 'low'; title: string; detail: string; saveLabel: string }

function buildActionInsights(active: Subscription[], monthlyTotal: number): Insight[] {
  const out: Insight[] = []
  const dup = duplicatePotential(active)
  if (dup > 0 && monthlyTotal > 0) {
    out.push({
      prio: 'high',
      title: 'Похожие сервисы в одной категории',
      detail: 'Несколько подписок в одной категории — часто достаточно одного тарифа.',
      saveLabel: `до ${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: active[0]?.currency ?? 'RUB', maximumFractionDigits: 0 }).format(dup)}/мес`,
    })
  }
  const autoN = active.filter((s) => s.renewal_type === 'auto_renew').length
  if (autoN >= 6) {
    out.push({
      prio: 'med',
      title: 'Много автопродлений',
      detail: `${autoN} сервисов продлеваются автоматически — есть смысл пройти симулятор.`,
      saveLabel: 'разбор →',
    })
  }
  return out.slice(0, 3)
}

export default function ActionsPageClient({
  subs,
  remindersSection,
}: {
  subs: Subscription[]
  remindersSection: React.ReactNode
}) {
  const isDark = useDarkMode()
  const { lang } = useLang()
  const [search, setSearch] = useState('')
  const [simCut, setSimCut] = useState<Set<string>>(() => new Set())
  const [pending, startTransition] = useTransition()

  const active = useMemo(() => subs.filter((s) => s.status === 'active'), [subs])
  const currency = active[0]?.currency ?? subs[0]?.currency ?? 'RUB'
  const locale = lang === 'en' ? 'en-US' : 'ru-RU'
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

  const monthlyTotal = useMemo(() => active.reduce((sum, s) => sum + getMonthlyAmount(s), 0), [active])
  const potentialOpt = useMemo(() => Math.max(duplicatePotential(active), monthlyTotal * 0.15), [active, monthlyTotal])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = [...active].sort((a, b) => a.next_charge_date.localeCompare(b.next_charge_date))
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) || categoryLabel(s.category_slug, lang).toLowerCase().includes(q),
      )
    }
    return list
  }, [active, lang, search])

  const urgent = useMemo(() => shown.filter((s) => s.status === 'active' && daysUntil(s.next_charge_date) <= 3).length, [shown])
  const week = useMemo(
    () =>
      shown.filter((s) => {
        const d = daysUntil(s.next_charge_date)
        return s.status === 'active' && d > 3 && d <= 7
      }).length,
    [shown],
  )
  const auto = useMemo(() => shown.filter((s) => s.renewal_type === 'auto_renew').length, [shown])

  const insights = useMemo(() => buildActionInsights(active, monthlyTotal), [active, monthlyTotal])

  const simRows = useMemo(() => {
    return [...active]
      .map((s) => ({ s, m: getMonthlyAmount(s) }))
      .sort((a, b) => b.m - a.m)
      .slice(0, 12)
  }, [active])

  const simSum = useMemo(() => {
    let t = 0
    for (const { s, m } of simRows) {
      if (simCut.has(s.id)) t += m
    }
    return t
  }, [simRows, simCut])

  const after = Math.max(0, monthlyTotal - simSum)
  const pctAfter = monthlyTotal > 0 ? Math.min(100, (after / monthlyTotal) * 100) : 100
  const pctSave = monthlyTotal > 0 ? Math.min(100, (simSum / monthlyTotal) * 100) : 0

  const toggleSim = (id: string) => {
    setSimCut((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const onPause = (id: string, name: string) => {
    if (!window.confirm(`Поставить «${name}» на паузу? Её можно снова включить в редакторе.`)) return
    startTransition(() => {
      updateSubscriptionStatus(id, 'paused').catch(() => alert('Не удалось обновить статус'))
    })
  }

  return (
    <div className="space-y-5">
      <DashboardScreenHeader
        title="Действия"
        subs={active}
        searchValue={search}
        onSearchChange={setSearch}
      />

      <section
        className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:px-[22px] rounded-2xl mb-1"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #1e1a3a 0%, #1a1730 100%)'
            : 'linear-gradient(135deg, #f0ebff 0%, #ede9fc 100%)',
          border: `1px solid ${isDark ? 'rgba(91,67,212,0.3)' : 'rgba(91,67,212,0.12)'}`,
        }}
      >
        <div className="w-[52px] h-[52px] rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]" aria-hidden>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5b43d4" strokeWidth="2">
            <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="m-0 mb-1.5 text-base font-semibold text-[#1a1a2e]">
            ⚡ Очередь по подпискам — {shown.length}
            {active.length > shown.length ? ` из ${active.length}` : ''} {actionsWord(shown.length)}
          </h2>
          <p className="m-0 mb-2.5 text-[13px] text-[#6b6b80]">
            Подсказки по активным подпискам из «Платежей». Потенциально до {fmt(potentialOpt)} / мес при оптимизации.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-[5px] rounded-full text-xs font-semibold bg-[#fde7ea] text-[#d94851]">Срочно {urgent}</span>
            <span className="px-3 py-[5px] rounded-full text-xs font-semibold bg-[#ffeadd] text-[#b35a00]">На неделе {week}</span>
            <span className="px-3 py-[5px] rounded-full text-xs font-semibold bg-[#e4f6ec] text-[#0f8f54]">Авто {auto}</span>
          </div>
        </div>
        <span className="text-5xl leading-none hidden sm:block select-none" aria-hidden>
          ⚡
        </span>
      </section>

      <p className="text-sm text-[#6b6b80] leading-relaxed max-w-[720px] m-0">
        Каждая карточка — это <strong className="text-[#1a1a2e] font-semibold">та же подписка</strong>, что в разделе{' '}
        <Link href="/dashboard?tab=payments" className="text-[#5b43d4] font-semibold hover:underline">
          «Платежи»
        </Link>
        : те же сумма, дата списания и статус. «Открыть подписку» ведёт в карточку записи; «Все платежи» — к общему
        списку; «На паузу» отключает подписку (как в таблице платежей).
      </p>

      <section
        className="rounded-2xl border border-[#e7e3dc] bg-white py-3.5 px-4 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]"
        aria-labelledby="actions-ai-alerts-title"
      >
        <div className="flex justify-between items-center gap-2.5 mb-2.5">
          <h2 id="actions-ai-alerts-title" className="m-0 text-[17px] font-bold text-[#1a1a2e]">
            AI-предупреждения о рисках трат
          </h2>
          <Link href="/dashboard/savings" className="text-[13px] font-medium text-[#5b43d4] shrink-0 hover:text-[#4b36b6]">
            Детальный разбор →
          </Link>
        </div>
        {insights.length === 0 ? (
          <p className="text-sm text-[#6b6b80] py-1 m-0">
            Явных дублей по категориям не найдено. Новые сигналы появятся при изменении подписок — загляните в{' '}
            <Link href="/dashboard/savings" className="font-semibold text-[#5b43d4] hover:underline">
              симулятор
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-2">
            {insights.map((it, i) => (
              <div
                key={i}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 border border-[#e7e3dc] rounded-xl py-2.5 px-3 bg-white"
              >
                <span
                  className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${
                    it.prio === 'high'
                      ? 'bg-[#ffe8ea] text-[#c53b4a]'
                      : it.prio === 'med'
                        ? 'bg-[#fff3df] text-[#b35a00]'
                        : 'bg-[#e8f8ef] text-[#1f8a4c]'
                  }`}
                >
                  {it.prio === 'high' ? 'СРОЧНО' : it.prio === 'med' ? 'ВАЖНО' : 'НАБЛЮДАТЬ'}
                </span>
                <div className="min-w-0">
                  <strong className="block text-sm font-semibold text-[#1a1a2e]">{it.title}</strong>
                  <span className="block text-[13px] text-[#6b6b80] mt-0.5">{it.detail}</span>
                </div>
                <span className="text-xs font-semibold text-[#12b76a] whitespace-nowrap">{it.saveLabel}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="space-y-3.5">
        {shown.length === 0 ? (
          <p className="text-sm text-[#6b6b80] py-6">
            {search.trim() ? 'Ничего не найдено — уточните запрос.' : 'Нет активных подписок для очереди действий.'}
          </p>
        ) : (
          shown.map((sub) => {
            const iconDisplay = resolveSubscriptionIconDisplay(sub.notes, sub.icon, sub.category_slug)
            return (
              <article
                key={sub.id}
                className="rounded-2xl border border-[#e7e3dc] bg-white p-[18px] shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] mb-3.5"
              >
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="flex gap-3.5 min-w-0 items-start">
                    <PaymentServiceIcon
                      icon={sub.icon}
                      categorySlug={sub.category_slug}
                      iconBg={iconDisplay.iconBg}
                      shape={iconDisplay.shape}
                      size={48}
                    />
                    <div className="min-w-0">
                      <h3 className="m-0 mb-1 text-[15px] font-semibold text-[#1a1a2e] truncate">{sub.name}</h3>
                      <p className="m-0 text-[13px] text-[#6b6b80]">{actionHint(sub)}</p>
                      <p className="mt-1 text-[12px] text-[#6b6b80] leading-snug m-0">
                        Из{' '}
                        <Link href="/dashboard?tab=payments" className="text-[#5b43d4] font-semibold hover:underline">
                          «Платежей»
                        </Link>
                        {' · '}
                        {formatBillingCycle(sub, lang)} · {fmt(coerceNumber(sub.amount))}
                      </p>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#6b6b80] whitespace-nowrap shrink-0">{priorityLabel(sub)}</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Link
                    href={`/dashboard/subscriptions/${sub.id}`}
                    className="inline-flex items-center rounded-lg border border-[#e7e3dc] bg-white px-3 py-2 text-xs font-semibold text-[#1a1a2e] hover:bg-[#f8f6f2]"
                  >
                    Открыть подписку
                  </Link>
                  <Link
                    href="/dashboard?tab=payments"
                    className="inline-flex items-center rounded-lg border border-[#e7e3dc] bg-white px-3 py-2 text-xs font-semibold text-[#5b43d4] hover:bg-[#f8f6f2]"
                  >
                    Все платежи
                  </Link>
                  {sub.status === 'active' ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onPause(sub.id, sub.name)}
                      className="inline-flex items-center rounded-lg bg-[#5b43d4] px-3 py-2 text-xs font-semibold text-white hover:brightness-105 disabled:opacity-50"
                    >
                      На паузу
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })
        )}
      </div>

      <section
        className="rounded-2xl border border-[#e7e3dc] bg-white px-[22px] pt-[22px] pb-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] mt-7"
        aria-labelledby="actions-sim-title"
      >
        <div className="mb-[18px]">
          <h2 id="actions-sim-title" className="m-0 mb-2 text-[1.05rem] font-bold text-[#1a1a2e]">
            Симулятор экономии
          </h2>
          <p className="m-0 text-sm text-[#6b6b80] leading-relaxed max-w-[820px]">
            Отметьте подписки, от которых теоретически могли бы отказаться — сразу увидите экономию в месяц и в год. Данные
            берутся из ваших активных платежей. Полная версия сценариев —{' '}
            <Link href="/dashboard/savings" className="text-[#5b43d4] font-semibold hover:underline">
              отдельная страница симулятора
            </Link>
            .
          </p>
        </div>

        {active.length === 0 ? (
          <p className="text-sm text-[#6b6b80] m-0">
            Нет активных подписок.{' '}
            <Link href="/dashboard?tab=payments" className="text-[#5b43d4] font-semibold hover:underline">
              Добавьте в «Платежах»
            </Link>
            , чтобы симулятор посчитал экономию.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4 p-[18px] rounded-xl bg-gradient-to-br from-[#e8faf0] to-[#f0fdf4] border border-[rgba(18,183,106,0.22)] mb-[18px]">
              <div>
                <p className="m-0 mb-1.5 text-[13px] text-[#6b6b80]">Экономия при отмеченных отказах</p>
                <p className="m-0 text-[1.65rem] font-bold text-[#12b76a] leading-tight">
                  {fmt(simSum)} <span className="text-lg font-semibold text-[#6b6b80]">/ мес</span>
                </p>
                <p className="mt-1 text-[1.05rem] font-semibold text-[#0d7a4d] opacity-95 m-0">
                  {fmt(simSum * 12)} / год
                </p>
              </div>
              <div className="text-[12px] font-medium max-w-[260px] leading-snug bg-white border border-[#e7e3dc] rounded-full px-3 py-2">
                Ориентир: до {fmt(potentialOpt)} / мес при оптимизации портфеля
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
              <div className="flex flex-col gap-1 p-3 rounded-lg border border-[#e7e3dc] bg-[rgba(255,255,255,0.6)]">
                <span className="text-xs text-[#6b6b80]">Сейчас в месяц (все активные)</span>
                <strong className="text-base text-[#1a1a2e]">{fmt(monthlyTotal)}</strong>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-lg border border-[#e7e3dc] bg-[rgba(255,255,255,0.6)]">
                <span className="text-xs text-[#6b6b80]">Останется после отказов</span>
                <strong className="text-base text-[#12b76a]">{fmt(after)}</strong>
              </div>
            </div>

            <div className="mb-[18px]">
              <div className="flex w-full h-3 rounded-full overflow-hidden bg-[#ececf0]">
                <span className="h-full transition-all duration-200 bg-gradient-to-r from-[#12b76a] to-[#34d399]" style={{ width: `${pctAfter}%` }} />
                <span className="h-full transition-all duration-200 bg-[rgba(91,67,212,0.22)]" style={{ width: `${pctSave}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-[11px] text-[#6b6b80]">
                <span>Остаётся</span>
                <span>Экономия</span>
              </div>
            </div>

            <p className="m-0 mb-2.5 text-[13px] font-semibold text-[#6b6b80] uppercase tracking-wide">Что могли бы отключить</p>
            <ul className="list-none m-0 mb-3.5 p-0 border border-[#e7e3dc] rounded-xl overflow-hidden">
              {simRows.map(({ s, m }) => {
                const simIcon = resolveSubscriptionIconDisplay(s.notes, s.icon, s.category_slug)
                return (
                <li key={s.id} className="border-b border-[#e7e3dc] last:border-b-0">
                  <label className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-[rgba(91,67,212,0.04)]">
                    <input
                      type="checkbox"
                      checked={simCut.has(s.id)}
                      onChange={() => toggleSim(s.id)}
                      className="h-4 w-4 rounded border-[#d8d8dc] text-[#5b43d4]"
                    />
                    <PaymentServiceIcon
                      icon={s.icon}
                      categorySlug={s.category_slug}
                      iconBg={simIcon.iconBg}
                      shape={simIcon.shape}
                      size={28}
                      className="shrink-0"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-[#1a1a2e] truncate">{s.name}</span>
                      <span className="block text-xs text-[#6b6b80]">~ {fmt(m)} / мес</span>
                    </span>
                  </label>
                </li>
                )
              })}
            </ul>
            <p className="text-sm text-[#6b6b80] m-0">
              Ничего не меняется автоматически — снимите галочки или поставьте подписку на паузу в{' '}
              <Link href="/dashboard?tab=payments" className="text-[#5b43d4] font-semibold hover:underline">
                «Платежах»
              </Link>
              .
            </p>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
        <h2 className="text-[17px] font-bold text-[#1a1a2e] tracking-[-0.02em] mb-1">Напоминания по расписанию</h2>
        <p className="text-sm text-[#6b6b80] mb-6">
          Push и локальные напоминания из приложения; здесь — дата и время срабатывания.
        </p>
        {remindersSection}
      </section>
    </div>
  )
}
