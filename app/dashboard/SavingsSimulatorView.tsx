'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { categoryLabelRu, formatBillingCycleRu } from '@/lib/subscription-labels'
import type { Subscription } from '@/lib/supabase/types'
import { fmtCurrency, groupMonthlyByCurrency, formatGroups, getMonthlyAmount, type CurrencyGroup } from '@/lib/currency'
import CurrencyAmount from './CurrencyAmount'

// ── AI helpers ────────────────────────────────────────────────

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function budgetPresets(currency: string): number[] {
  if (currency === 'RUB') return [1000, 2000, 3000, 5000, 7000, 10000]
  return [15, 30, 50, 100, 150, 250]
}

function AiSection({ selectedIds, currency }: { selectedIds: string[]; currency: string }) {
  const [openAnalyze, setOpenAnalyze] = useState(false)
  const [openWhatIf, setOpenWhatIf] = useState(false)
  const [openChat, setOpenChat] = useState(false)

  const [analyzeText, setAnalyzeText] = useState<string | null>(null)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const [budget, setBudget] = useState(currency === 'RUB' ? 3000 : 50)
  const [whatIfText, setWhatIfText] = useState<string | null>(null)
  const [whatIfLoading, setWhatIfLoading] = useState(false)
  const [whatIfError, setWhatIfError] = useState<string | null>(null)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const readTextStream = useCallback(
    async (
      res: Response,
      onChunk: (chunk: string) => void,
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!res.ok) {
        try {
          const data = await res.json()
          return { ok: false, error: typeof data.error === 'string' ? data.error : 'Ошибка' }
        } catch {
          return { ok: false, error: 'Ошибка' }
        }
      }
      const reader = res.body?.getReader()
      if (!reader) return { ok: false, error: 'Пустой ответ от сервера' }
      const decoder = new TextDecoder()
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        onChunk(decoder.decode(value, { stream: true }))
      }
      return { ok: true }
    },
    [],
  )

  const runAnalyze = useCallback(async () => {
    if (selectedIds.length === 0) return
    setAnalyzeLoading(true); setAnalyzeError(null); setAnalyzeText(null)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionIds: selectedIds, locale: 'ru' }),
      })
      const parsed = await readTextStream(res, (chunk) => {
        setAnalyzeText((prev) => (prev ?? '') + chunk)
      })
      if (!parsed.ok) setAnalyzeError(parsed.error)
    } catch { setAnalyzeError('Сеть недоступна.') }
    finally { setAnalyzeLoading(false) }
  }, [readTextStream, selectedIds])

  const runWhatIf = useCallback(async () => {
    setWhatIfLoading(true); setWhatIfError(null); setWhatIfText(null)
    try {
      const res = await fetch('/api/ai/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetLimit: budget, currency, locale: 'ru', subscriptionIds: selectedIds.length > 0 ? selectedIds : undefined }),
      })
      const parsed = await readTextStream(res, (chunk) => {
        setWhatIfText((prev) => (prev ?? '') + chunk)
      })
      if (!parsed.ok) setWhatIfError(parsed.error)
    } catch { setWhatIfError('Сеть недоступна.') }
    finally { setWhatIfLoading(false) }
  }, [budget, currency, readTextStream, selectedIds])

  const sendChat = useCallback(async () => {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    const nextMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: text }]
    setChatMessages(nextMessages); setChatInput(''); setChatLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, locale: 'ru' }),
      })
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }])
      const parsed = await readTextStream(res, (chunk) => {
        setChatMessages((prev) => {
          if (prev.length === 0) return prev
          const copy = [...prev]
          const last = copy[copy.length - 1]
          copy[copy.length - 1] = { ...last, content: (last.content ?? '') + chunk }
          return copy
        })
      })
      if (!parsed.ok) {
        setChatMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: parsed.error }
          return copy
        })
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Не удалось получить ответ.' }])
    } finally { setChatLoading(false) }
  }, [chatInput, chatMessages, chatLoading, readTextStream])

  const panels = [
    {
      key: 'analyze',
      open: openAnalyze,
      setOpen: setOpenAnalyze,
      dot: 'bg-[#5b43d4]',
      label: 'ИИ-анализ выбранных',
      content: (
        <div className="px-4 pb-4 space-y-3 border-t border-[#f0ece6] pt-3">
          {analyzeText ? (
            <>
              <p className="text-sm text-[#1a1a2e] whitespace-pre-wrap leading-relaxed">{analyzeText}</p>
              <button type="button" onClick={() => { setAnalyzeText(null); void runAnalyze() }} className="text-xs text-[#5b43d4] hover:text-[#4b36b6]">
                Обновить
              </button>
            </>
          ) : (
            <button
              type="button" onClick={() => void runAnalyze()}
              disabled={selectedIds.length === 0 || analyzeLoading}
              className="w-full rounded-lg bg-[#5b43d4] hover:bg-[#4b36b6] disabled:opacity-40 disabled:cursor-not-allowed py-2.5 text-sm font-medium text-white transition-colors"
            >
              {analyzeLoading ? 'Анализирую…' : selectedIds.length === 0 ? 'Отметьте подписки в списке' : `Разобрать ${selectedIds.length} с ИИ`}
            </button>
          )}
          {analyzeError && <p className="text-sm text-[#e5484d]">{analyzeError}</p>}
        </div>
      ),
    },
    {
      key: 'whatif',
      open: openWhatIf,
      setOpen: setOpenWhatIf,
      dot: 'bg-[#1479b8]',
      label: 'Что если… (лимит в месяц)',
      content: (
        <div className="px-4 pb-4 space-y-3 border-t border-[#f0ece6] pt-3">
          <div className="flex flex-wrap gap-2">
            {budgetPresets(currency).map((n) => (
              <button key={n} type="button"
                onClick={() => { setBudget(n); setWhatIfText(null) }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${budget === n ? 'bg-[#1479b8] text-white' : 'bg-[#f4f5f8] text-[#6b6b80] hover:bg-[#ececf0]'}`}
              >
                {n.toLocaleString()} {currency}
              </button>
            ))}
          </div>
          <label className="block text-xs text-[#6b6b80]">
            Лимит / мес
            <input type="number" min={1} value={budget}
              onChange={(e) => { setBudget(Number(e.target.value) || 1); setWhatIfText(null) }}
              className="mt-1 w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-sm text-[#1a1a2e]"
            />
          </label>
          {whatIfText ? (
            <>
              <p className="text-sm text-[#1a1a2e] whitespace-pre-wrap leading-relaxed">{whatIfText}</p>
              <button type="button" onClick={() => { setWhatIfText(null); void runWhatIf() }} className="text-xs text-[#1479b8] hover:text-[#0f6397]">
                Обновить
              </button>
            </>
          ) : (
            <button type="button" onClick={() => void runWhatIf()} disabled={whatIfLoading}
              className="w-full rounded-lg bg-[#1479b8] hover:bg-[#0f6397] disabled:opacity-40 py-2.5 text-sm font-medium text-white transition-colors"
            >
              {whatIfLoading ? 'Думаю…' : 'Подобрать набор'}
            </button>
          )}
          {whatIfError && <p className="text-sm text-[#e5484d]">{whatIfError}</p>}
        </div>
      ),
    },
    {
      key: 'chat',
      open: openChat,
      setOpen: setOpenChat,
      dot: 'bg-[#0d9f6e]',
      label: 'Спроси ИИ',
      content: (
        <div className="px-4 pb-4 space-y-3 border-t border-[#f0ece6] pt-3">
          {chatMessages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {['Сколько я трачу в месяц?', 'Что можно отменить?', 'Какая самая дорогая?'].map((hint) => (
                <button key={hint} type="button" onClick={() => setChatInput(hint)}
                  className="rounded-full border border-[#dcd6ce] bg-[#f8f6f2] px-3 py-1.5 text-xs text-[#6b6b80] hover:border-[#cfc8bf]"
                >
                  {hint}
                </button>
              ))}
            </div>
          )}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {chatMessages.map((m, i) => (
              <div key={i} className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#ede9fc] text-[#3f2b8f] ml-6' : 'bg-[#f4f5f8] text-[#1a1a2e] mr-6'}`}>
                {m.content}
              </div>
            ))}
            {chatLoading && <div className="rounded-lg bg-[#f4f5f8] text-[#8e8e93] text-sm px-3 py-2 mr-6">…</div>}
          </div>
          <div className="flex gap-2">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void sendChat())}
              placeholder="Вопрос о подписках…"
              className="flex-1 rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-sm text-[#1a1a2e] placeholder:text-[#9a9aaf]"
            />
            <button type="button" onClick={() => void sendChat()} disabled={!chatInput.trim() || chatLoading}
              className="rounded-lg bg-[#0d9f6e] hover:bg-[#0a875d] disabled:opacity-40 px-4 text-sm font-medium text-white"
            >→</button>
          </div>
          {chatMessages.length > 0 && (
            <button type="button" onClick={() => setChatMessages([])} className="text-xs text-[#6b6b80] hover:text-[#1a1a2e]">
              Очистить чат
            </button>
          )}
        </div>
      ),
    },
  ] as const

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-[#6b6b80] uppercase tracking-wide">ИИ-помощник</h2>
        <span className="text-xs text-[#8e8e93]">Анализ, «что если» и чат — ключ хранится только на сервере</span>
      </div>
      {panels.map(({ key, open, setOpen, dot, label, content }) => (
        <div key={key} className="rounded-2xl border border-[#e7e3dc] bg-white overflow-hidden shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
          <button type="button" onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#f8f6f2] transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-[#1a1a2e]">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              {label}
            </span>
            <span className="text-[#8e8e93] text-xs">{open ? '▲' : '▼'}</span>
          </button>
          {open && content}
        </div>
      ))}
    </section>
  )
}

function daysSinceLastUse(lastUsedAt: string | null): number | null {
  if (lastUsedAt == null || lastUsedAt === '') return null
  const d = Math.round((Date.now() - new Date(lastUsedAt).getTime()) / 86400000)
  return Number.isFinite(d) ? d : null
}

// IDs дублей — все кроме самого дешёвого в каждой категории с 2+ сервисами
function getDuplicateIds(active: Subscription[]): string[] {
  const byCat = new Map<string, Subscription[]>()
  for (const s of active) {
    const g = byCat.get(s.category_slug) ?? []
    g.push(s)
    byCat.set(s.category_slug, g)
  }
  const ids: string[] = []
  for (const [, group] of byCat) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => getMonthlyAmount(a) - getMonthlyAmount(b))
    sorted.slice(1).forEach(s => ids.push(s.id)) // оставляем самый дешёвый
  }
  return ids
}

// IDs редко используемых (last_used_at >= 30 дней назад)
function getPauseIds(active: Subscription[]): string[] {
  return active
    .filter(s => { const d = daysSinceLastUse(s.last_used_at); return d !== null && d >= 30 })
    .map(s => s.id)
}

// IDs кандидатов на более дешёвый тариф — ежемесячные подписки дороже медианы
function getTierIds(active: Subscription[]): string[] {
  const monthlies = active.filter(s => s.billing_cycle === 'monthly')
  if (monthlies.length === 0) return active.map(s => s.id)
  const amounts = monthlies.map(s => getMonthlyAmount(s)).sort((a, b) => a - b)
  const median = amounts[Math.floor(amounts.length / 2)]!
  return monthlies.filter(s => getMonthlyAmount(s) >= median).map(s => s.id)
}

export default function SavingsSimulatorView({ subs }: { subs: Subscription[] }) {
  const active = useMemo(() => subs.filter((s) => s.status === 'active'), [subs])
  const primaryCurrency = active[0]?.currency ?? subs[0]?.currency ?? 'RUB'

  const monthlyGroups = useMemo(
    () => groupMonthlyByCurrency(active, getMonthlyAmount),
    [active],
  )

  const [cutIds, setCutIds] = useState<Set<string>>(() => new Set())
  const [activeScenario, setActiveScenario] = useState<'dup' | 'pause' | 'tier' | null>(null)

  const toggleCut = (id: string) => {
    setActiveScenario(null)
    setCutIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applyScenario = (key: 'dup' | 'pause' | 'tier', ids: string[]) => {
    if (activeScenario === key) {
      setActiveScenario(null)
      setCutIds(new Set())
    } else {
      setActiveScenario(key)
      setCutIds(new Set(ids))
    }
  }

  const selectedGroups = useMemo(
    () => groupMonthlyByCurrency(active.filter(s => cutIds.has(s.id)), getMonthlyAmount),
    [active, cutIds],
  )

  const dupIds   = useMemo(() => getDuplicateIds(active), [active])
  const pauseIds = useMemo(() => getPauseIds(active), [active])
  const tierIds  = useMemo(() => getTierIds(active), [active])

  const dupGroups = useMemo(
    () => groupMonthlyByCurrency(dupIds.map(id => active.find(s => s.id === id)!).filter(Boolean), getMonthlyAmount),
    [dupIds, active],
  )
  const pauseGroups = useMemo(
    () => groupMonthlyByCurrency(pauseIds.map(id => active.find(s => s.id === id)!).filter(Boolean), s => getMonthlyAmount(s) * 0.5),
    [pauseIds, active],
  )
  const tierGroups: CurrencyGroup[] = useMemo(
    () => monthlyGroups.map(g => ({ ...g, total: g.total * 0.12 })),
    [monthlyGroups],
  )

  if (subs.length === 0) {
    return (
      <section className="rounded-2xl border border-[#ebe6df] bg-white px-6 py-12 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] text-center max-w-xl mx-auto">
        <p className="text-sm text-[#6b6b80] mb-6">Добавьте подписки — симулятор покажет сценарии экономии.</p>
        <Link
          href="/dashboard/subscriptions/new"
          className="inline-flex rounded-xl bg-[#5b43d4] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(91,67,212,0.35)] hover:brightness-105"
        >
          Добавить платёж
        </Link>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard"
        className="inline-flex text-sm font-medium text-[#5b43d4] hover:text-[#4b36b6] mb-1"
      >
        ← Назад к Сегодня
      </Link>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e]">Симулятор экономии</h1>
          <p className="text-sm text-[#6b6b80] mt-1 max-w-xl">
            Посмотрите, сколько можно сэкономить, если отключить выбранные платежи. Сценарии ниже — быстрые оценки по
            данным учёта.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard?tab=analytics"
            className="h-10 inline-flex items-center rounded-xl border border-[#e7e3dc] bg-white px-4 text-sm font-medium text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.06)] hover:bg-[#f8f6f2]"
          >
            Аналитика
          </Link>
          <Link
            href="/dashboard/subscriptions/new"
            className="h-10 inline-flex items-center rounded-xl bg-[#5b43d4] px-4 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(91,67,212,0.35)] hover:brightness-105"
          >
            + Добавить
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border border-[#e7e3dc] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] flex flex-col sm:flex-row sm:items-center gap-6">
        <div
          className="w-[92px] h-[92px] rounded-2xl bg-gradient-to-b from-[#f7f4ff] to-[#ede8fc] flex items-center justify-center flex-shrink-0"
          aria-hidden
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-[#5b43d4]" aria-hidden>
            <path
              d="M7 2h10v3H7V2zM5 6h14v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6zM9 10h6M9 14h4"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[#6b6b80] uppercase tracking-wide mb-1">Потенциальная экономия</p>
            <p className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#12b76a] leading-none">
              <CurrencyAmount groups={selectedGroups} className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#12b76a] leading-none" />
              <span className="text-base sm:text-lg font-semibold text-[#6b6b80]"> / мес</span>
            </p>
            <p className="text-xs text-[#8e8e93] mt-2">по отмеченным ниже отключениям</p>
          </div>
          <div>
            <p className="text-xs text-[#6b6b80] uppercase tracking-wide mb-1 opacity-0 sm:opacity-100"> </p>
            <p className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#1a1a2e] leading-none">
              <CurrencyAmount groups={selectedGroups} multiply={12} className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#1a1a2e] leading-none" />
              <span className="text-base sm:text-lg font-semibold text-[#6b6b80]"> / год</span>
            </p>
            <p className="text-xs text-[#8e8e93] mt-2">если удерживать сценарий год</p>
          </div>
        </div>
        {dupGroups.length > 0 ? (
          <p className="text-xs text-[#6b6b80] sm:max-w-[200px] leading-snug sm:text-right">
            Оценка по дублям в категориях:{' '}
            <span className="font-semibold text-[#1a1a2e]">{formatGroups(dupGroups)}</span> / мес — отметьте лишние в списке.
          </p>
        ) : null}
      </section>

<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <article className="lg:col-span-2 rounded-2xl border border-[#e7e3dc] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f0ece6] flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[17px] font-bold text-[#1a1a2e] tracking-[-0.02em]">Что отключить в сценарии</h2>
            <button
              type="button"
              onClick={() => { setCutIds(new Set()); setActiveScenario(null) }}
              className="text-sm font-medium text-[#5b43d4] hover:text-[#4b36b6]"
            >
              Сбросить выбор
            </button>
          </div>
          <ul className="divide-y divide-[#ececee] max-h-[min(520px,55vh)] overflow-y-auto">
            {active.length === 0 ? (
              <li className="px-5 py-8 text-sm text-[#8e8e93]">Нет активных платежей</li>
            ) : (
              active.map((s) => {
                const m = getMonthlyAmount(s)
                const on = cutIds.has(s.id)
                return (
                  <li key={s.id} className="px-5 py-3.5 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleCut(s.id)}
                      className="mt-1 h-4 w-4 rounded border-[#d8d8dc] text-[#5b43d4] focus:ring-[#5b43d4]"
                      aria-label={`Отключить ${s.name} в сценарии`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link
                          href={`/dashboard/subscriptions/${s.id}`}
                          className="text-[15px] font-semibold text-[#1a1a2e] hover:text-[#5b43d4] truncate"
                        >
                          {s.name}
                        </Link>
                        <span className="text-[15px] font-semibold tabular-nums text-[#1a1a2e]">{fmtCurrency(m, s.currency ?? 'RUB')}</span>
                      </div>
                      <p className="text-[13px] text-[#8e8e93] mt-0.5">
                        {categoryLabelRu(s.category_slug)} · {formatBillingCycleRu(s)}
                      </p>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </article>

        <div className="space-y-4">
          <article className="rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-base font-bold text-[#1a1a2e]">Сценарии</h2>
              <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-[#ede9fc] text-[#5b43d4]">
                оценка
              </span>
            </div>
            <p className="text-xs text-[#8e8e93] mb-3">Нажми — автоматически отметятся нужные подписки</p>
            <div className="space-y-3">
              {/* Дубликаты */}
              <button
                type="button"
                onClick={() => applyScenario('dup', dupIds)}
                disabled={dupIds.length === 0}
                className={`w-full text-left rounded-xl border p-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeScenario === 'dup'
                    ? 'border-[#12b76a] bg-[#eef8f0] ring-2 ring-[#12b76a]/20'
                    : 'border-[#fde7ea] bg-[#fff8f8] hover:border-[#12b76a] hover:bg-[#eef8f0]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#1a1a2e]">Отключить дубликаты в категориях</p>
                  {activeScenario === 'dup' && <span className="text-[10px] font-bold text-[#12b76a] bg-white border border-[#12b76a]/30 rounded-full px-2 py-0.5 shrink-0">активен</span>}
                </div>
                <p className="text-lg font-bold text-[#12b76a] mt-1">{formatGroups(dupGroups)} / мес</p>
                <p className="text-xs text-[#6b6b80] mt-0.5">
                  {formatGroups(dupGroups, 12)} / год · {dupIds.length} сервис{dupIds.length === 1 ? '' : dupIds.length < 5 ? 'а' : 'ов'}
                </p>
              </button>

              {/* Пауза */}
              <button
                type="button"
                onClick={() => applyScenario('pause', pauseIds)}
                disabled={pauseIds.length === 0}
                className={`w-full text-left rounded-xl border p-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeScenario === 'pause'
                    ? 'border-[#1479b8] bg-[#eef5fc] ring-2 ring-[#1479b8]/20'
                    : 'border-[#e7e3dc] bg-white hover:border-[#1479b8] hover:bg-[#eef5fc]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#1a1a2e]">Пауза для редко используемых</p>
                  {activeScenario === 'pause' && <span className="text-[10px] font-bold text-[#1479b8] bg-white border border-[#1479b8]/30 rounded-full px-2 py-0.5 shrink-0">активен</span>}
                </div>
                <p className="text-xs text-[#8e8e93] mt-0.5 mb-1">нет входа 30+ дн. → ~50% эквивалента</p>
                <p className="text-lg font-bold text-[#1479b8]">
                  {pauseIds.length === 0 ? 'нет данных' : `${formatGroups(pauseGroups)} / мес`}
                </p>
                {pauseIds.length > 0
                  ? <p className="text-xs text-[#6b6b80] mt-0.5">{formatGroups(pauseGroups, 12)} / год · {pauseIds.length} сервис{pauseIds.length < 2 ? '' : pauseIds.length < 5 ? 'а' : 'ов'}</p>
                  : <p className="text-xs text-[#8e8e93] mt-0.5">Добавь «Использовал сегодня» на карточках</p>
                }
              </button>

              {/* Тариф */}
              <button
                type="button"
                onClick={() => applyScenario('tier', tierIds)}
                disabled={tierIds.length === 0}
                className={`w-full text-left rounded-xl border p-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeScenario === 'tier'
                    ? 'border-[#5b43d4] bg-[#f7f4ff] ring-2 ring-[#5b43d4]/20'
                    : 'border-[#e7e3dc] bg-white hover:border-[#5b43d4] hover:bg-[#f7f4ff]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#1a1a2e]">Перейти на более дешёвый тариф</p>
                  {activeScenario === 'tier' && <span className="text-[10px] font-bold text-[#5b43d4] bg-white border border-[#5b43d4]/30 rounded-full px-2 py-0.5 shrink-0">активен</span>}
                </div>
                <p className="text-xs text-[#8e8e93] mt-0.5 mb-1">условно −12% от ежемесячных платежей</p>
                <p className="text-lg font-bold text-[#5b43d4]">{formatGroups(tierGroups)} / мес</p>
                <p className="text-xs text-[#6b6b80] mt-0.5">{formatGroups(tierGroups, 12)} / год · {tierIds.length} кандидат{tierIds.length < 2 ? '' : tierIds.length < 5 ? 'а' : 'ов'}</p>
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-[rgba(91,67,212,0.2)] bg-gradient-to-b from-[#f7f4ff] to-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold rounded-full px-2 py-0.5 bg-white border border-[#e7e3dc] text-[#5b43d4]">
                ✦ AI
              </span>
              <h2 className="text-base font-bold text-[#1a1a2e]">Рекомендация по подпискам</h2>
            </div>
            <p className="text-sm text-[#6b6b80] mb-3 leading-snug">
              Модель смотрит на выбранные вами активные платежи и кратко подсказывает, что пересмотреть.
            </p>
            <p className="text-xs text-[#8e8e93]">
              Полный ИИ-помощник — три режима — доступен ниже ↓
            </p>
          </article>
        </div>
      </div>

      {/* ── AI section: все три режима ── */}
      <AiSection
        selectedIds={cutIds.size > 0 ? [...cutIds] : active.map(s => s.id)}
        currency={primaryCurrency}
      />
    </div>
  )
}
