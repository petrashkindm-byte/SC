'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { categoryLabel, formatBillingCycle } from '@/lib/subscription-labels'
import type { Subscription } from '@/lib/supabase/types'
import { fmtCurrency, groupMonthlyByCurrency, formatGroups, getMonthlyAmount, type CurrencyGroup } from '@/lib/currency'
import { findServiceEntry, inferTypeFromName, getServicesByType, getServiceDisplayName, getUniqueAdvantages, TYPE_FEATURE_KEYS, type ServiceEntry, type ServiceType } from '@/lib/service-comparison-db'
import CurrencyAmount from './CurrencyAmount'
import { actionButtonClass } from './ui/action-button'
import { useLang } from '@/lib/LangContext'
import { useDarkMode } from '@/lib/hooks/use-dark-mode'
import {
  completePlannedAction,
  addPlannedAction,
  removePlannedAction,
  type DbPlannedAction,
  type PlannedActionType,
} from './savings/actions'

// ── Animated value hook ───────────────────────────────────────
/** Animates smoothly from previous value to new target (easeOutCubic) */
function useAnimatedValue(target: number, duration = 400): number {
  const [value, setValue] = useState(target)
  const prevRef = useRef(target)
  useEffect(() => {
    const from = prevRef.current
    if (from === target) { prevRef.current = target; return }
    prevRef.current = target
    let raf: number
    const start = Date.now()
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

// ── AI helpers ────────────────────────────────────────────────

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function budgetPresets(currency: string): number[] {
  if (currency === 'RUB') return [1000, 2000, 3000, 5000, 7000, 10000]
  return [15, 30, 50, 100, 150, 250]
}

function AiSection({
  selectedIds,
  currency,
  initialOpenChat,
  initialChatQuery,
}: {
  selectedIds: string[]
  currency: string
  initialOpenChat?: boolean
  initialChatQuery?: string | null
}) {
  const { strings } = useLang()
  const s = strings.simulator
  const [openAnalyze, setOpenAnalyze] = useState(false)
  const [openWhatIf, setOpenWhatIf] = useState(false)
  const [openChat, setOpenChat] = useState(Boolean(initialOpenChat))

  const [analyzeText, setAnalyzeText] = useState<string | null>(null)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const [budget, setBudget] = useState(currency === 'RUB' ? 3000 : 50)
  const [whatIfText, setWhatIfText] = useState<string | null>(null)
  const [whatIfLoading, setWhatIfLoading] = useState(false)
  const [whatIfError, setWhatIfError] = useState<string | null>(null)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState(() =>
    initialOpenChat && initialChatQuery?.trim() ? initialChatQuery.trim() : '',
  )
  const [chatLoading, setChatLoading] = useState(false)
  const [streamingMode, setStreamingMode] = useState<'analyze' | 'whatif' | 'chat' | null>(null)
  const activeControllerRef = useRef<AbortController | null>(null)

  const cancelStreaming = useCallback(() => {
    activeControllerRef.current?.abort()
    activeControllerRef.current = null
    setStreamingMode(null)
    setAnalyzeLoading(false)
    setWhatIfLoading(false)
    setChatLoading(false)
  }, [])

  const readTextStream = useCallback(
    async (
      res: Response,
      onChunk: (chunk: string) => void,
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!res.ok) {
        try {
          const data = await res.json()
          return { ok: false, error: typeof data.error === 'string' ? data.error : s.aiEmptyError }
        } catch {
          return { ok: false, error: s.aiEmptyError }
        }
      }
      const reader = res.body?.getReader()
      if (!reader) return { ok: false, error: s.aiEmptyError }
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          onChunk(decoder.decode(value, { stream: true }))
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return { ok: false, error: s.aiStoppedByUser }
        }
        throw e
      }
      return { ok: true }
    },
    [],
  )

  const runAnalyze = useCallback(async () => {
    if (selectedIds.length === 0) return
    activeControllerRef.current?.abort()
    const controller = new AbortController()
    activeControllerRef.current = controller
    setAnalyzeLoading(true); setAnalyzeError(null); setAnalyzeText(null)
    setStreamingMode('analyze')
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionIds: selectedIds, locale: 'ru' }),
        signal: controller.signal,
      })
      const parsed = await readTextStream(res, (chunk) => {
        setAnalyzeText((prev) => (prev ?? '') + chunk)
      })
      if (!parsed.ok) setAnalyzeError(parsed.error)
    } catch { setAnalyzeError(s.aiNetworkError) }
    finally {
      if (activeControllerRef.current === controller) activeControllerRef.current = null
      setAnalyzeLoading(false)
      setStreamingMode((prev) => (prev === 'analyze' ? null : prev))
    }
  }, [readTextStream, selectedIds])

  const runWhatIf = useCallback(async () => {
    activeControllerRef.current?.abort()
    const controller = new AbortController()
    activeControllerRef.current = controller
    setWhatIfLoading(true); setWhatIfError(null); setWhatIfText(null)
    setStreamingMode('whatif')
    try {
      const res = await fetch('/api/ai/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetLimit: budget, currency, locale: 'ru', subscriptionIds: selectedIds.length > 0 ? selectedIds : undefined }),
        signal: controller.signal,
      })
      const parsed = await readTextStream(res, (chunk) => {
        setWhatIfText((prev) => (prev ?? '') + chunk)
      })
      if (!parsed.ok) setWhatIfError(parsed.error)
    } catch { setWhatIfError(s.aiNetworkError) }
    finally {
      if (activeControllerRef.current === controller) activeControllerRef.current = null
      setWhatIfLoading(false)
      setStreamingMode((prev) => (prev === 'whatif' ? null : prev))
    }
  }, [budget, currency, readTextStream, selectedIds])

  const sendChat = useCallback(async () => {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    activeControllerRef.current?.abort()
    const controller = new AbortController()
    activeControllerRef.current = controller
    const nextMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: text }]
    setChatMessages(nextMessages); setChatInput(''); setChatLoading(true)
    setStreamingMode('chat')
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, locale: 'ru' }),
        signal: controller.signal,
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
      setChatMessages(prev => [...prev, { role: 'assistant', content: s.aiNoAnswerError }])
    } finally {
      if (activeControllerRef.current === controller) activeControllerRef.current = null
      setChatLoading(false)
      setStreamingMode((prev) => (prev === 'chat' ? null : prev))
    }
  }, [chatInput, chatMessages, chatLoading, readTextStream])

  const panels = [
    {
      key: 'analyze',
      open: openAnalyze,
      setOpen: setOpenAnalyze,
      dot: 'bg-[#5b43d4]',
      label: s.aiAnalyzeLabel,
      content: (
        <div className="px-4 pb-4 space-y-3 border-t border-[#f0ece6] pt-3">
          {analyzeText ? (
            <>
              <AiAnalysisBlock text={analyzeText} />
              <button type="button" onClick={() => { setAnalyzeText(null); void runAnalyze() }} className="text-xs text-[#5b43d4] hover:text-[#4b36b6]">
                {s.aiRefresh}
              </button>
            </>
          ) : (
            <button
              type="button" onClick={() => void runAnalyze()}
              disabled={selectedIds.length === 0 || analyzeLoading}
              className={`w-full ${actionButtonClass('primary', 'sm')} py-2.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
            >
              {analyzeLoading ? s.aiAnalyzing : selectedIds.length === 0 ? s.aiSelectSubs : s.aiAnalyzeCount(selectedIds.length)}
            </button>
          )}
          {streamingMode === 'analyze' && (
            <button type="button" onClick={cancelStreaming} className="text-xs text-[#6b6b80] hover:text-[#1a1a2e]">
              {s.aiStop}
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
      label: s.aiWhatIfLabel,
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
            {s.aiLimitLabel}
            <input type="number" min={1} value={budget}
              onChange={(e) => { setBudget(Number(e.target.value) || 1); setWhatIfText(null) }}
              className="mt-1 w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-sm text-[#1a1a2e]"
            />
          </label>
          {whatIfText ? (
            <>
              <AiAnalysisBlock text={whatIfText} />
              <button type="button" onClick={() => { setWhatIfText(null); void runWhatIf() }} className="text-xs text-[#1479b8] hover:text-[#0f6397]">
                {s.aiRefresh}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => void runWhatIf()} disabled={whatIfLoading}
              className="w-full rounded-lg bg-[#1479b8] hover:bg-[#0f6397] disabled:opacity-40 py-2.5 text-sm font-medium text-white transition-colors"
            >
              {whatIfLoading ? s.aiThinking : s.aiPickSet}
            </button>
          )}
          {streamingMode === 'whatif' && (
            <button type="button" onClick={cancelStreaming} className="text-xs text-[#6b6b80] hover:text-[#1a1a2e]">
              {s.aiStop}
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
      label: s.aiChatLabel,
      content: (
        <div className="px-4 pb-4 space-y-3 border-t border-[#f0ece6] pt-3">
          {chatMessages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {[s.chatHint1, s.chatHint2, s.chatHint3].map((hint) => (
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
            {chatLoading && <div className="rounded-lg bg-[#f4f5f8] text-[#8e8e93] text-sm px-3 py-2 mr-6">{s.aiTyping}</div>}
          </div>
          <div className="flex gap-2">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void sendChat())}
              placeholder={s.chatPlaceholder}
              className="flex-1 rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-sm text-[#1a1a2e] placeholder:text-[#9a9aaf]"
            />
            <button type="button" onClick={() => void sendChat()} disabled={!chatInput.trim() || chatLoading}
              className="rounded-lg bg-[#0d9f6e] hover:bg-[#0a875d] disabled:opacity-40 px-4 text-sm font-medium text-white"
            >→</button>
          </div>
          {streamingMode === 'chat' && (
            <button type="button" onClick={cancelStreaming} className="text-xs text-[#6b6b80] hover:text-[#1a1a2e]">
              {s.aiStopChat}
            </button>
          )}
          {chatMessages.length > 0 && (
            <button type="button" onClick={() => setChatMessages([])} className="text-xs text-[#6b6b80] hover:text-[#1a1a2e]">
              {s.aiClearChat}
            </button>
          )}
        </div>
      ),
    },
  ] as const

  const isDark = useDarkMode()
  const panelBg     = isDark ? '#16163a' : '#ffffff'
  const panelBorder = isDark ? '#2a2a52' : '#e7e3dc'
  const panelHover  = isDark ? '#1e1e42' : '#f8f6f2'
  const labelColor  = isDark ? '#d0d0f0' : '#1a1a2e'
  const chevronColor= isDark ? '#7070a0' : '#8e8e93'

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <h2 className="text-sm font-semibold text-[#6b6b80] uppercase tracking-wide whitespace-nowrap">{s.aiTitle}</h2>
        <span className="text-xs text-[#8e8e93] leading-snug">{s.aiSubtitle}</span>
      </div>
      {panels.map(({ key, open, setOpen, dot, label, content }) => (
        <div key={key} className="rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]"
          style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
        >
          <button type="button" onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
            style={{ background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = panelHover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span className="flex items-center gap-2 text-sm font-medium" style={{ color: labelColor }}>
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              {label}
            </span>
            <span
              className="text-xs transition-transform duration-300"
              style={{ display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: chevronColor }}
            >▼</span>
          </button>
          {/* Smooth accordion — always rendered, height-animated */}
          <div
            style={{
              maxHeight: open ? '9999px' : '0px',
              opacity: open ? 1 : 0,
              overflow: 'hidden',
              pointerEvents: open ? 'auto' : 'none',
              transition: open
                ? 'max-height 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.25s ease'
                : 'max-height 0.35s cubic-bezier(0.55,0,1,0.45), opacity 0.18s ease',
            }}
          >
            {content}
          </div>
        </div>
      ))}
    </section>
  )
}

function daysSinceLastUse(lastUsedAt: string | null): number | null {
  if (lastUsedAt == null || lastUsedAt === '') return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const past = new Date(lastUsedAt)
  past.setHours(0, 0, 0, 0)
  const d = Math.round((today.getTime() - past.getTime()) / 86400000)
  return Number.isFinite(d) ? Math.max(0, d) : null
}

type ServiceGroup = {
  groupKey: string        // type from DB, or category slug as fallback
  label: string
  subs: Subscription[]   // sorted by monthly cost descending
  entries: (ServiceEntry | undefined)[]
  featureKeys?: { key: string; label: string }[]
}

const MODULE_TYPE_LABELS_RU: Record<string, string> = {
  music: 'Музыкальный стриминг',
  video: 'Видеостриминг',
  ai: 'ИИ-ассистенты',
  dev: 'Инструменты разработки',
  cloud: 'Облачное хранилище',
  creative: 'Дизайн и творчество',
  productivity: 'Продуктивность',
  education: 'Образование и обучение',
}

const MODULE_TYPE_LABELS_EN: Record<string, string> = {
  music: 'Music streaming',
  video: 'Video streaming',
  ai: 'AI assistants',
  dev: 'Development tools',
  cloud: 'Cloud storage',
  creative: 'Design & creativity',
  productivity: 'Productivity',
  education: 'Education',
}

function getModuleTypeLabels(lang: string): Record<string, string> {
  return lang === 'en' ? MODULE_TYPE_LABELS_EN : MODULE_TYPE_LABELS_RU
}

// Short labels for the "checked types" indicator
const TYPE_LABELS_SHORT_RU: Record<string, string> = {
  music: 'музыка',
  video: 'видео',
  ai: 'AI',
  dev: 'разработка',
  cloud: 'облако',
  creative: 'графика',
  productivity: 'заметки',
  education: 'обучение',
}

const TYPE_LABELS_SHORT_EN: Record<string, string> = {
  music: 'music',
  video: 'video',
  ai: 'AI',
  dev: 'dev',
  cloud: 'cloud',
  creative: 'design',
  productivity: 'notes',
  education: 'education',
}

function getTypeLabelsShort(lang: string): Record<string, string> {
  return lang === 'en' ? TYPE_LABELS_SHORT_EN : TYPE_LABELS_SHORT_RU
}

// Groups subscriptions by semantic type (from DB) or category as fallback.
// Only returns groups with 2+ subs of the SAME type — avoids false duplicates.
function getCategoryComparisons(active: Subscription[], lang: string): ServiceGroup[] {
  // 1. Try DB match
  const byType = new Map<string, { subs: Subscription[]; entries: (ServiceEntry | undefined)[] }>()
  const unmatched: Subscription[] = []

  for (const s of active) {
    const entry = findServiceEntry(s.name)
    if (entry) {
      // Все типы сервиса: основной + дополнительные (для пакетов типа Яндекс Плюс)
      const allTypes = [entry.type, ...(entry.additionalTypes ?? [])]
      for (const t of allTypes) {
        const g = byType.get(t) ?? { subs: [], entries: [] }
        // Добавляем только если ещё нет в этой типовой группе
        if (!g.subs.some(x => x.id === s.id)) {
          g.subs.push(s)
          g.entries.push(entry)
          byType.set(t, g)
        }
      }
    } else {
      // попробуем угадать тип по ключевым словам
      const inferred = inferTypeFromName(s.name)
      if (inferred) {
        const g = byType.get(inferred) ?? { subs: [], entries: [] }
        if (!g.subs.some(x => x.id === s.id)) {
          g.subs.push(s)
          g.entries.push(undefined)
          byType.set(inferred, g)
        }
      } else {
        unmatched.push(s)
      }
    }
  }

  const groups: ServiceGroup[] = []

  // 2. DB-matched groups (same semantic type → real potential duplicates)
  const TYPE_LABELS = getModuleTypeLabels(lang)

  for (const [type, { subs, entries }] of byType) {
    if (subs.length < 2) continue
    const sorted = subs
      .map((s, i) => ({ s, e: entries[i] }))
      .sort((a, b) => getMonthlyAmount(b.s) - getMonthlyAmount(a.s))
    groups.push({
      groupKey: type,
      label: TYPE_LABELS[type] ?? type,
      subs: sorted.map(x => x.s),
      entries: sorted.map(x => x.e),
      featureKeys: TYPE_FEATURE_KEYS[type as ServiceType],
    })
  }

  // Сервисы без определённого типа (unmatched) намеренно исключаем из сравнения —
  // лучше ничего не показать, чем показать в чужой группе с чужими характеристиками.
  // (void unmatched — чтобы линтер не жаловался на неиспользуемую переменную)
  void unmatched

  return groups
}

const LEVEL_CLASS: Record<string, string> = {
  good: 'text-[#12b76a]',
  ok:   'text-[#1a1a2e]',
  muted: 'text-[#8e8e93]',
}

const LEVEL_ORDER: Record<string, number> = { good: 2, ok: 1, muted: 0 }

/** Для строки таблицы: какие ячейки «лучшие» — только если есть разброс */
function rowWinners(entries: (ServiceEntry | undefined)[], key: string): {
  bestIdx: Set<number>
  worstIdx: Set<number>
} {
  const levels = entries.map(e => e?.features.find(f => f.key === key)?.level)
  const orders = levels.map(l => l != null ? (LEVEL_ORDER[l] ?? -1) : -1)
  const defined = orders.filter(o => o >= 0)
  if (defined.length < 2) return { bestIdx: new Set(), worstIdx: new Set() }
  const max = Math.max(...defined)
  const min = Math.min(...defined)
  if (max === min) return { bestIdx: new Set(), worstIdx: new Set() } // все одинаковые — не выделяем
  const bestIdx = new Set(orders.map((o, i) => o === max ? i : -1).filter(i => i >= 0))
  const worstIdx = new Set(orders.map((o, i) => o === min ? i : -1).filter(i => i >= 0))
  return { bestIdx, worstIdx }
}


/** Генерирует одну ключевую рекомендацию для группы сервисов */
function generateGroupInsight(subs: Subscription[], entries: (ServiceEntry | undefined)[]): string | null {
  if (subs.length < 2) return null

  const data = subs.map((s, i) => ({
    sub: s,
    entry: entries[i],
    days: daysSinceLastUse(s.last_used_at),
    monthly: getMonthlyAmount(s),
  }))

  // Правило 1: один не использовался >30 дн, другой — активен (<14 дн)
  const unused = data.filter(d => d.days !== null && d.days >= 30)
  const recent = data.filter(d => d.days !== null && d.days < 14)
  if (unused.length > 0 && recent.length > 0) {
    const u = unused[0]
    const r = recent[0]
    return `Вы не открывали ${u.sub.name} ${u.days} дн., а ${r.sub.name} используете регулярно — сэкономите ${fmtCurrency(u.monthly, u.sub.currency)}/мес, отключив его.`
  }

  // Правило 2: пакетный сервис перекрывает отдельные подписки
  const bundle = data.find(d => {
    const feat = d.entry?.features.find(f => f.key === 'extras')
    return feat?.level === 'good' && !feat.value.includes('только')
  })
  if (bundle) {
    const feat = bundle.entry?.features.find(f => f.key === 'extras')
    const others = data.filter(d => d.sub.id !== bundle.sub.id)
    if (others.length > 0) {
      const saving = others.reduce((sum, d) => sum + d.monthly, 0)
      // Если у бандла есть bundleNote — добавляем контекст об ограничениях
      const limitNote = bundle.entry?.bundleNote
        ? ` Учтите: ${bundle.entry.bundleNote.toLowerCase()}.`
        : ''
      return `${bundle.sub.name} уже включает ${feat?.value}. Если вы пользуетесь этими сервисами, переплата ${fmtCurrency(saving, bundle.sub.currency)}/мес может быть лишней.${limitNote}`
    }
  }

  // Правило 3: уникальный эксклюзивный контент — объясняем, почему дорогой стоит оставить
  const defined = data.filter(d => d.entry !== undefined) as (typeof data[0] & { entry: ServiceEntry })[]
  if (defined.length >= 2) {
    const allEntries = defined.map(d => d.entry)
    const exclusiveLeader = defined.find(d => {
      const uniq = getUniqueAdvantages(d.entry, allEntries)
      return uniq.some(f => f.key === 'exclusive')
    })
    if (exclusiveLeader) {
      const sorted2 = [...data].sort((a, b) => b.monthly - a.monthly)
      const isExpensive = sorted2[0]?.sub.id === exclusiveLeader.sub.id
      const priceSuffix = isExpensive
        ? ` Это объясняет более высокую цену — ${fmtCurrency(exclusiveLeader.monthly, exclusiveLeader.sub.currency)}/мес.`
        : ''
      return `${exclusiveLeader.sub.name} предлагает эксклюзивный контент, которого нет у конкурентов.${priceSuffix} Если он вам важен — это весомый аргумент в пользу этой подписки.`
    }
  }

  // Правило 4: существенная разница в цене (>25%)
  const sorted = [...data].sort((a, b) => a.monthly - b.monthly)
  const cheapest = sorted[0]
  const priciest = sorted[sorted.length - 1]
  const diff = priciest.monthly - cheapest.monthly
  const pct = Math.round((diff / priciest.monthly) * 100)
  if (pct >= 25 && diff >= 80) {
    return `${cheapest.sub.name} на ${pct}% дешевле — переход сэкономит ${fmtCurrency(diff, cheapest.sub.currency)}/мес (${fmtCurrency(diff * 12, cheapest.sub.currency)}/год).`
  }

  // Правило 5: семейный план выгоднее индивидуального
  for (const d of data) {
    const fp = d.entry?.familyPlan
    if (!fp) continue
    const perPerson = Math.round(fp.monthlyApprox / fp.slots)
    if (perPerson < d.monthly * 0.85) { // семейный на ≥15% дешевле на человека
      const saving = d.monthly - perPerson
      return `${d.sub.name} Family на ${fp.slots} чел. стоит ≈${fmtCurrency(fp.monthlyApprox, fp.currency)}/мес. Если делить на ${fp.slots} — ≈${fmtCurrency(perPerson, fp.currency)}/чел. Экономия ${fmtCurrency(saving, fp.currency)}/мес с каждого.`
    }
  }

  return null
}

interface DuplicatesPanelProps {
  groups: ServiceGroup[]
  cutIds: Set<string>
  onCut: (id: string) => void
  onKeepOnly: (keepId: string, groupIds: string[]) => void
}

function usageLabel(days: number | null, lang: string): { text: string; cls: string } {
  const notMarked = lang === 'en' ? 'not marked' : 'не отмечалось'
  const today     = lang === 'en' ? 'today' : 'сегодня'
  const dAgo      = (d: number) => lang === 'en' ? `${d}d ago` : `${d} дн. назад`
  if (days === null) return { text: notMarked, cls: 'text-[#8e8e93]' }
  if (days === 0)   return { text: today,      cls: 'font-medium text-[#12b76a]' }
  if (days <= 7)    return { text: dAgo(days), cls: 'font-medium text-[#12b76a]' }
  if (days <= 30)   return { text: dAgo(days), cls: 'font-medium text-[#f59e0b]' }
  return               { text: dAgo(days), cls: 'font-medium text-[#e5484d]' }
}

function DuplicatesPanel({ groups, cutIds, onCut, onKeepOnly }: DuplicatesPanelProps) {
  const { lang, strings } = useLang()
  const s = strings.simulator
  if (groups.length === 0) return null
  return (
    <section className="space-y-4">
      <p className="text-xs font-semibold text-[#6b6b80] uppercase tracking-wide">
        {s.dupComparisons}
      </p>
      {groups.map(({ groupKey, label, subs, entries, featureKeys }) => {
        const n = subs.length
        const groupIds = subs.map(s => s.id)
        // Показываем таблицу только если хотя бы ОДИН сервис есть в базе И есть ключи характеристик.
        // entries[i] === undefined означает, что сервис не найден в базе — для него будет прочерк.
        const hasDb = entries.some(e => e !== undefined) && featureKeys && featureKeys.length > 0
        // Предупреждение, если часть сервисов не распознана
        const unknownCount = entries.filter(e => e === undefined).length
        // Уникальные преимущества по сервисам (для значка 👑)
        const definedEntries = entries.filter((e): e is ServiceEntry => e !== undefined)
        const uniqueAdvPerEntry = entries.map(entry =>
          entry ? getUniqueAdvantages(entry, definedEntries) : [],
        )
        return (
          <div key={groupKey} className="rounded-2xl border border-[#e7e3dc] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06)] overflow-hidden">

            {/* ── Service cards header ── */}
            <div className="px-4 pt-4 pb-3 border-b border-[#f0ece6]">
              <p className="text-[11px] font-bold text-[#6b6b80] uppercase tracking-wider mb-3">{label}</p>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
                {subs.map((s, i) => {
                  const entry = entries[i]
                  const isMax = i === 0
                  const isCut = cutIds.has(s.id)
                  const exclusiveUniq = uniqueAdvPerEntry[i].filter(f => f.key === 'exclusive')
                  return (
                    <div key={s.id} className={`flex flex-col gap-1 rounded-xl p-2.5 border transition-colors ${
                      isCut ? 'border-[#fde7ea] bg-[#fff8f8]' : 'border-[#f0ece6] bg-[#fafaf9]'
                    }`}>
                      {/* name + price badge */}
                      <div className="flex items-start justify-between gap-1 flex-wrap">
                        <p className={`text-[13px] font-bold leading-snug ${isCut ? 'text-[#8e8e93] line-through' : 'text-[#1a1a2e]'}`}>
                          {s.name}
                        </p>
                        {n > 1 && (
                          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0 border ${
                            isMax
                              ? 'text-[#e5484d] bg-white border-[#fde7ea]'
                              : 'text-[#6b6b80] bg-white border-[#e7e3dc]'
                          }`}>
                            {isMax ? strings.simulator.dupMore : strings.simulator.dupLess}
                          </span>
                        )}
                      </div>
                      {/* Значок уникальных эксклюзивов */}
                      {exclusiveUniq.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#92400e] bg-[#fef3c7] border border-[#fde68a] rounded-full px-2 py-0.5 w-fit">
                          {exclusiveUniq[0].value}
                        </span>
                      )}
                      {/* tagline */}
                      {entry && (
                        <p className="text-[11px] text-[#8e8e93] leading-snug">{(lang === 'en' && entry.taglineEn) ? entry.taglineEn : entry.tagline}</p>
                      )}
                      {/* family plan badge */}
                      {entry?.familyPlan && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#5b43d4] bg-[#ede9fc] rounded-full px-2 py-0.5 w-fit">
                          {strings.simulator.familyBadge(entry.familyPlan.slots)}
                        </span>
                      )}
                      {/* price + cost-per-day */}
                      <p className="text-base font-bold text-[#1a1a2e] mt-0.5">
                        {fmtCurrency(getMonthlyAmount(s), s.currency)}
                        <span className="text-xs font-normal text-[#8e8e93]"> {strings.simulator.perMonthSuffix}</span>
                      </p>
                      <p className="text-[11px] text-[#8e8e93]">
                        {formatBillingCycle(s, lang)}
                        {' · '}
                        <span className="text-[#6b6b80]">
                          ≈{fmtCurrency(Math.ceil(getMonthlyAmount(s) / 30), s.currency)}{strings.simulator.dayPerDay}
                        </span>
                      </p>

                      {/* action buttons */}
                      <div className="flex gap-1.5 mt-1.5">
                        <button
                          type="button"
                          onClick={() => onCut(s.id)}
                          className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold border transition-colors ${
                            isCut
                              ? 'border-[#fca5a5] bg-[#fde7ea] text-[#e5484d] hover:bg-[#ffd5d7]'
                              : 'border-[#e7e3dc] text-[#6b6b80] hover:border-[#e5484d] hover:text-[#e5484d] hover:bg-[#fff8f8]'
                          }`}
                        >
                          {isCut ? strings.simulator.dupRestore : strings.simulator.dupDisable}
                        </button>
                        {n > 1 && (
                          <button
                            type="button"
                            onClick={() => onKeepOnly(s.id, groupIds)}
                            className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold border border-[#e7e3dc] text-[#6b6b80] hover:border-[#12b76a] hover:text-[#12b76a] hover:bg-[#eef8f0] transition-colors"
                          >
                            {strings.simulator.dupKeep}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Уведомление о нераспознанных сервисах */}
            {unknownCount > 0 && (
              <div className="px-4 py-2 border-b border-[#f0ece6] bg-[#fffbeb]">
                <p className="text-[11px] text-[#92400e]">
                  {unknownCount === subs.length
                    ? s.dupUnknownAll
                    : s.dupUnknownPartial(unknownCount)}
                </p>
              </div>
            )}
            {/* Контекст для пакетных сервисов — что бандл перекрывает, а что нет */}
            {entries.map((entry, i) => entry?.bundleNote ? (
              <div key={i} className="px-4 py-2 border-b border-[#bfdbfe] bg-[#eff6ff]">
                <p className="text-[11px] text-[#1e40af] leading-snug">
                  <span className="font-semibold">{subs[i].name}:</span>{' '}{entry.bundleNote}
                </p>
              </div>
            ) : null)}

            {/* ── Feature comparison table ── */}
            <table className="w-full text-xs border-collapse">
              <tbody>
                {/* Usage row — always first */}
                <tr className="bg-[#fafaf9]">
                  <td className="px-4 py-2 text-[#6b6b80] font-medium whitespace-nowrap w-[140px]">
                    {strings.simulator.dupLastUsed}
                  </td>
                  {subs.map((s) => {
                    const { text, cls } = usageLabel(daysSinceLastUse(s.last_used_at), lang)
                    return (
                      <td key={s.id} className={`px-3 py-2 ${cls}`}>
                        {text}
                      </td>
                    )
                  })}
                </tr>
                {/* Feature rows from DB */}
                {hasDb && featureKeys && featureKeys.map(({ key, label: fLabel }, rowIdx) => {
                  const { bestIdx, worstIdx } = rowWinners(entries, key)
                  return (
                    <tr key={key} className={(rowIdx + 1) % 2 === 0 ? 'bg-[#fafaf9]' : 'bg-white'}>
                      <td className="px-4 py-2 text-[#6b6b80] font-medium whitespace-nowrap w-[140px]">
                        {fLabel}
                      </td>
                      {entries.map((entry, colIdx) => {
                        const feat = entry?.features.find(f => f.key === key)
                        const isBest  = bestIdx.has(colIdx)
                        const isWorst = worstIdx.has(colIdx)
                        return (
                          <td
                            key={colIdx}
                            className={`px-3 py-2 ${feat ? LEVEL_CLASS[feat.level] : 'text-[#8e8e93]'} ${
                              isBest  ? 'bg-[#f0fdf6]' :
                              isWorst ? 'bg-[#fff8f8]' : ''
                            }`}
                          >
                            {isBest && <span className="mr-1 text-[10px] font-bold">·</span>}
                            {feat?.value ?? '—'}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* ── Умная рекомендация ── */}
            {(() => {
              const insight = generateGroupInsight(subs, entries)
              if (!insight) return (
                <p className="px-4 py-2.5 text-[11px] text-[#8e8e93]">
                  {strings.simulator.dupKeepHint}
                </p>
              )
              return (
                <div className="px-4 py-3 border-t border-[#f0ece6]">
                  <p className="text-[12px] text-[#1a1a2e] leading-snug">{insight}</p>
                </div>
              )
            })()}
          </div>
        )
      })}
    </section>
  )
}

// ── Динамические сценарии ─────────────────────────────────────────────────

type ScenarioType = 'dup' | 'package' | 'cheaper' | 'pause' | 'yearly' | 'family' | 'unused' | 'alternative'

interface YearlyItem {
  subscriptionId: string
  name: string; currentMonthly: number; annualPrice: number
  annualMonthly: number; savingMonthly: number; currency: string
}
interface FamilyItem {
  subscriptionId: string
  name: string; currentMonthly: number; familyMonthly: number
  perPersonMonthly: number; slots: number; savingPerPerson: number; currency: string
}
interface PackageItem {
  packageName: string; redundantName: string
  redundantMonthly: number; currency: string
}
interface CheaperItem {
  subscriptionId: string   // ID дорогого сервиса пользователя
  expensiveName: string; cheaperName: string
  savingMonthly: number; currency: string; groupLabel: string
}
interface UnusedItem {
  name: string; daysSince: number; premiumFeatures: string[]
}
interface AlternativeItem {
  subscriptionId: string    // ID подписки пользователя
  currentName: string       // название подписки пользователя
  altDisplayName: string    // красивое имя альтернативы
  altTagline: string        // описание из базы
  currentMonthly: number    // фактическая стоимость пользователя
  altMonthly: number        // рыночная цена альтернативы
  savingMonthly: number
  currency: string
  groupLabel: string        // тип ('Музыкальный стриминг' и т.п.)
  featureScore: number      // 0-1: доля характеристик, где альтернатива ≥ текущего
}

// PlannedActionType и DbPlannedAction импортируются из './savings/actions'
interface DupGroupSummary {
  groupKey: string
  label: string
  names: string[]        // все сервисы в группе
  redundantNames: string[] // которые предлагается отключить
  savingsMonthly: number
  currency: string
}

interface Scenario {
  key: string
  type: ScenarioType
  title: string
  subtitle: string
  affectedIds: string[]       // IDs для cutIds; пусто у информационных сценариев
  savingsMonthly: number
  currency: string
  isInformational?: boolean   // не трогает cutIds — только раскрывает детали
  yearlyItems?: YearlyItem[]
  familyItems?: FamilyItem[]
  packageItems?: PackageItem[]
  cheaperItems?: CheaperItem[]
  unusedItems?: UnusedItem[]
  alternativeItems?: AlternativeItem[]
  dupGroupSummaries?: DupGroupSummary[]  // для отдельных строк по каждой группе
}


// Цветовой порог суммы экономии (применяется к тексту суммы в карточке сценария)
function savingsColorClass(monthly: number): string {
  if (monthly >= 500) return 'text-[#12b76a]'   // зелёный — отличная экономия
  if (monthly >= 100) return 'text-[#d97706]'   // жёлтый — хорошая
  return 'text-[#6b6b80]'                        // серый — незначительная
}

type SimulatorStrings = typeof import('@/lib/translations').t['ru']['simulator'] | typeof import('@/lib/translations').t['en']['simulator']

function buildScenarios(
  active: Subscription[],
  categoryComparisons: ReturnType<typeof getCategoryComparisons>,
  s: SimulatorStrings,
  lang: string,
): Scenario[] {
  const primaryCurrency = active[0]?.currency ?? 'RUB'
  const scenarios: Scenario[] = []
  // Claimed removal scenarios: сервис, уже попавший в removal-сценарий,
  // не попадает в другой — берём самый выгодный.
  const claimedIds = new Set<string>()

  // ─────────────────────────────────────────────────────────────────────────
  // 1. ДУБЛИКАТЫ В КАТЕГОРИЯХ
  // ─────────────────────────────────────────────────────────────────────────
  const dupIds = categoryComparisons.flatMap(g =>
    g.subs.slice(0, g.subs.length - 1).map(s => s.id),
  )
  if (dupIds.length > 0) {
    const savingsMonthly = dupIds.reduce((sum, id) => {
      const s = active.find(x => x.id === id)
      return sum + (s ? getMonthlyAmount(s) : 0)
    }, 0)
    dupIds.forEach(id => claimedIds.add(id))

    // Строим детализацию по каждой группе для отображения отдельными строками
    const dupGroupSummaries: DupGroupSummary[] = categoryComparisons.map(g => {
      const redundantIds = g.subs.slice(0, g.subs.length - 1).map(s => s.id)
      const redundantSavings = redundantIds.reduce((sum, id) => {
        const s = active.find(x => x.id === id)
        return sum + (s ? getMonthlyAmount(s) : 0)
      }, 0)
      return {
        groupKey: g.groupKey,
        label: g.label,
        names: g.subs.map(s => s.name),
        redundantNames: g.subs.slice(0, g.subs.length - 1).map(s => s.name),
        savingsMonthly: Math.round(redundantSavings),
        currency: g.subs[0]?.currency ?? primaryCurrency,
      }
    })

    scenarios.push({
      key: 'dup', type: 'dup',
      title: s.scenarioTitleDup,
      subtitle: categoryComparisons.map(g => g.label).join(', ') + (lang === 'en' ? ' — compare services ↓' : ' — сравни сервисы ↓'),
      affectedIds: dupIds,
      savingsMonthly: Math.round(savingsMonthly),
      currency: primaryCurrency,
      dupGroupSummaries,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. ПАКЕТНЫЕ ПОДПИСКИ — сервис уже входит в другую подписку
  // ─────────────────────────────────────────────────────────────────────────
  const packageItems: PackageItem[] = []
  const packageRedundantIds: string[] = []
  for (const sub of active) {
    const entry = findServiceEntry(sub.name)
    if (!entry?.includedServiceIds?.length) continue
    for (const other of active) {
      if (other.id === sub.id) continue
      if (claimedIds.has(other.id) || packageRedundantIds.includes(other.id)) continue
      const otherEntry = findServiceEntry(other.name)
      if (otherEntry && entry.includedServiceIds.includes(otherEntry.id)) {
        packageItems.push({
          packageName: sub.name,
          redundantName: other.name,
          redundantMonthly: getMonthlyAmount(other),
          currency: other.currency ?? primaryCurrency,
        })
        packageRedundantIds.push(other.id)
      }
    }
  }
  if (packageItems.length > 0) {
    const savingsMonthly = packageItems.reduce((sum, it) => sum + it.redundantMonthly, 0)
    packageRedundantIds.forEach(id => claimedIds.add(id))
    const subtitle = packageItems
      .map(it => lang === 'en'
        ? `${it.redundantName} already in ${it.packageName}`
        : `${it.redundantName} уже входит в ${it.packageName}`)
      .join(' · ')
    scenarios.push({
      key: 'package', type: 'package',
      title: s.scenarioTitlePackage,
      subtitle,
      affectedIds: packageRedundantIds,
      savingsMonthly: Math.round(savingsMonthly),
      currency: primaryCurrency,
      packageItems,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. ДОРОГОЙ АНАЛОГ — более дешёвый сервис с сопоставимым функционалом
  // ─────────────────────────────────────────────────────────────────────────
  const cheaperItems: CheaperItem[] = []
  const cheaperClaimedExpensive: string[] = []
  for (const group of categoryComparisons) {
    if (!group.featureKeys || group.subs.length < 2) continue
    // Группа отсортирована по убыванию цены: subs[0] — самый дорогой
    for (let i = 0; i < group.subs.length - 1; i++) {
      const expSub = group.subs[i]
      const expEntry = group.entries[i]
      if (!expEntry) continue
      if (claimedIds.has(expSub.id) || cheaperClaimedExpensive.includes(expSub.id)) continue
      for (let j = i + 1; j < group.subs.length; j++) {
        const chpSub = group.subs[j]
        const chpEntry = group.entries[j]
        if (!chpEntry || claimedIds.has(chpSub.id)) continue
        const priceDiff = getMonthlyAmount(expSub) - getMonthlyAmount(chpSub)
        const pricePct  = priceDiff / getMonthlyAmount(expSub)
        if (pricePct < 0.20 || priceDiff < 80) continue
        // Проверяем: дешёвый не хуже дорогого на ≥50% ключевых параметров
        let equalOrBetter = 0, defined = 0
        for (const { key } of group.featureKeys) {
          const eF = expEntry.features.find(f => f.key === key)
          const cF = chpEntry.features.find(f => f.key === key)
          if (!eF || !cF) continue
          defined++
          if ((LEVEL_ORDER[cF.level] ?? 0) >= (LEVEL_ORDER[eF.level] ?? 0)) equalOrBetter++
        }
        if (defined > 0 && equalOrBetter / defined >= 0.5) {
          cheaperItems.push({
            subscriptionId: expSub.id,
            expensiveName: expSub.name,
            cheaperName:   chpSub.name,
            savingMonthly: Math.round(priceDiff),
            currency:      expSub.currency ?? primaryCurrency,
            groupLabel:    group.label,
          })
          cheaperClaimedExpensive.push(expSub.id)
          break  // берём лучшую замену для каждого дорогого
        }
      }
    }
  }
  if (cheaperItems.length > 0) {
    const savingsMonthly = cheaperItems.reduce((sum, it) => sum + it.savingMonthly, 0)
    cheaperClaimedExpensive.forEach(id => claimedIds.add(id))
    const subtitle = cheaperItems
      .slice(0, 3)
      .map(it => lang === 'en'
        ? `${it.cheaperName} replaces ${it.expensiveName} (−${fmtCurrency(it.savingMonthly, it.currency)}/mo)`
        : `${it.cheaperName} заменит ${it.expensiveName} (−${fmtCurrency(it.savingMonthly, it.currency)}/мес)`)
      .join(' · ')
    scenarios.push({
      key: 'cheaper', type: 'cheaper',
      title: s.scenarioTitleCheaper,
      subtitle,
      affectedIds: cheaperClaimedExpensive,
      savingsMonthly,
      currency: primaryCurrency,
      cheaperItems,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. ПАУЗА — сервисы с last_used_at > 30 дней (не в других сценариях)
  // ─────────────────────────────────────────────────────────────────────────
  const pauseSubs = active.filter(s => {
    if (claimedIds.has(s.id)) return false
    const d = daysSinceLastUse(s.last_used_at)
    return d !== null && d >= 30
  })
  if (pauseSubs.length > 0) {
    const savingsMonthly = pauseSubs.reduce((sum, s) => sum + getMonthlyAmount(s), 0)
    pauseSubs.forEach(s => claimedIds.add(s.id))
    const daysSuffix = lang === 'en' ? 'd' : ' дн.'
    const names = pauseSubs.slice(0, 3)
      .map(sub => `${sub.name} (${daysSinceLastUse(sub.last_used_at)}${daysSuffix})`)
      .join(', ')
    const more = pauseSubs.length > 3
      ? (lang === 'en' ? ` +${pauseSubs.length - 3} more` : ` +ещё ${pauseSubs.length - 3}`)
      : ''
    scenarios.push({
      key: 'pause', type: 'pause',
      title: s.scenarioTitlePause,
      subtitle: names + more,
      affectedIds: pauseSubs.map(s => s.id),
      savingsMonthly: Math.round(savingsMonthly),
      currency: primaryCurrency,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. ГОДОВОЙ ТАРИФ — только для месячных подписок с annualPrice в базе
  // ─────────────────────────────────────────────────────────────────────────
  const yearlyItems: YearlyItem[] = []
  for (const s of active) {
    if (s.billing_cycle !== 'monthly') continue
    const entry = findServiceEntry(s.name)
    if (!entry?.annualPrice) continue
    const annualMonthly = entry.annualPrice / 12
    const currentMonthly = getMonthlyAmount(s)
    const savingMonthly = currentMonthly - annualMonthly
    if (savingMonthly <= 0) continue
    yearlyItems.push({ subscriptionId: s.id, name: s.name, currentMonthly, annualPrice: entry.annualPrice, annualMonthly, savingMonthly, currency: s.currency ?? 'RUB' })
  }
  if (yearlyItems.length > 0) {
    const savingsMonthly = yearlyItems.reduce((sum, it) => sum + it.savingMonthly, 0)
    const moSuffix = lang === 'en' ? '/mo' : '/мес'
    const subtitle = yearlyItems.slice(0, 3)
      .map(it => `${it.name} −${fmtCurrency(Math.round(it.savingMonthly), it.currency)}${moSuffix}`)
      .join(' · ')
    const more = yearlyItems.length > 3
      ? (lang === 'en' ? ` +${yearlyItems.length - 3} more` : ` +ещё ${yearlyItems.length - 3}`)
      : ''
    scenarios.push({
      key: 'yearly', type: 'yearly',
      title: s.scenarioTitleYearly,
      subtitle: subtitle + more,
      affectedIds: [], isInformational: true,
      savingsMonthly: Math.round(savingsMonthly),
      currency: primaryCurrency,
      yearlyItems,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. СЕМЕЙНЫЙ ПЛАН — индивидуальный дороже цены на человека в семейном
  // ─────────────────────────────────────────────────────────────────────────
  const familyItems: FamilyItem[] = []
  for (const s of active) {
    const entry = findServiceEntry(s.name)
    if (!entry?.familyPlan) continue
    const { slots, monthlyApprox, currency } = entry.familyPlan
    const perPerson = monthlyApprox / slots
    const currentMonthly = getMonthlyAmount(s)
    if (perPerson >= currentMonthly) continue  // семейный дороже — пропуск
    // Проверяем, что пользователь не уже на семейном (эвристика: если платит ≈ familyMonthly)
    const looksLikeFamily = Math.abs(currentMonthly - monthlyApprox) < monthlyApprox * 0.15
    if (looksLikeFamily) continue
    familyItems.push({
      subscriptionId: s.id,
      name: s.name,
      currentMonthly,
      familyMonthly: monthlyApprox,
      perPersonMonthly: Math.round(perPerson),
      slots,
      savingPerPerson: Math.round(currentMonthly - perPerson),
      currency: currency ?? primaryCurrency,
    })
  }
  if (familyItems.length > 0) {
    const savingsMonthly = familyItems.reduce((sum, it) => sum + it.savingPerPerson, 0)
    const familySubtitle = familyItems.slice(0, 3)
      .map(it => lang === 'en'
        ? `${it.name}: ≈${fmtCurrency(it.perPersonMonthly, it.currency)}/person vs ${fmtCurrency(Math.round(it.currentMonthly), it.currency)}`
        : `${it.name}: ≈${fmtCurrency(it.perPersonMonthly, it.currency)}/чел вместо ${fmtCurrency(Math.round(it.currentMonthly), it.currency)}`)
      .join(' · ')
    scenarios.push({
      key: 'family', type: 'family',
      title: s.scenarioTitleFamily,
      subtitle: familySubtitle,
      affectedIds: [], isInformational: true,
      savingsMonthly,
      currency: primaryCurrency,
      familyItems,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. НЕИСПОЛЬЗУЕМЫЕ PREMIUM-ФУНКЦИИ — 14-29 дней без входа + premium-сервис
  //    Estimate: ~30% экономии при переходе на базовый тариф
  // ─────────────────────────────────────────────────────────────────────────
  const unusedItems: UnusedItem[] = []
  for (const s of active) {
    if (claimedIds.has(s.id)) continue
    const d = daysSinceLastUse(s.last_used_at)
    if (d === null || d < 14 || d >= 30) continue  // только «серая зона» 14-29 дней
    const entry = findServiceEntry(s.name)
    if (!entry) continue
    const goodFeatures = entry.features.filter(f => f.level === 'good').map(f => f.value)
    if (goodFeatures.length < 3) continue           // не premium-тариф
    unusedItems.push({ name: s.name, daysSince: d, premiumFeatures: goodFeatures.slice(0, 3) })
  }
  if (unusedItems.length > 0) {
    // Находим сабы для расчёта сбережений
    const matchedSubs = unusedItems.map(it => active.find(s => s.name === it.name)).filter(Boolean) as Subscription[]
    const savingsMonthly = Math.round(matchedSubs.reduce((sum, s) => sum + getMonthlyAmount(s) * 0.3, 0))
    const subtitle = unusedItems.slice(0, 2)
      .map(it => s.unusedSubtitle(it.name, it.daysSince))
      .join(' · ')
    scenarios.push({
      key: 'unused', type: 'unused',
      title: s.scenarioTitleUnused,
      subtitle,
      affectedIds: [], isInformational: true,
      savingsMonthly,
      currency: primaryCurrency,
      unusedItems,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. РЫНОЧНЫЕ АЛЬТЕРНАТИВЫ — дешевле на рынке для одиночных подписок
  //    Ищем альтернативу в базе, если у пользователя только один сервис этого типа.
  //    Порог: ≥15% дешевле И разница ≥ 100₽ И ≥40% характеристик не хуже.
  // ─────────────────────────────────────────────────────────────────────────
  {
    // Какие типы уже покрыты дубликатами — для них альтернативы не нужны
    const dupTypeKeys = new Set(categoryComparisons.map(g => g.groupKey))
    const alternativeItems: AlternativeItem[] = []
    // Отслеживаем уже предложенные замены (currentSub.id → altEntry.id), чтобы не дублировать
    const proposedPairs = new Set<string>()

    for (const sub of active) {
      const entry = findServiceEntry(sub.name)
      if (!entry) continue  // нет в базе — не можем сравнивать характеристики

      // Пропускаем типы, где уже есть дубликаты (там работает сценарий 1)
      if (dupTypeKeys.has(entry.type)) continue

      const userMonthly = getMonthlyAmount(sub)
      const userCurrency = sub.currency ?? 'RUB'
      const featureKeys = TYPE_FEATURE_KEYS[entry.type] ?? []

      // Ищем дешевле в базе того же типа
      for (const altEntry of getServicesByType(entry.type)) {
        if (altEntry.id === entry.id) continue
        // Проверяем валюту (altEntry.priceCurrency по умолчанию RUB)
        const altCurrency = altEntry.priceCurrency ?? 'RUB'
        if (altCurrency !== userCurrency) continue
        // Пользователь уже подписан на этот сервис?
        const alreadyHave = active.some(s => findServiceEntry(s.name)?.id === altEntry.id)
        if (alreadyHave) continue

        const altMonthly = altEntry.monthlyPrice!
        const priceDiff = userMonthly - altMonthly
        const pricePct  = priceDiff / userMonthly
        if (pricePct < 0.15 || priceDiff < 100) continue

        const pairKey = `${sub.id}→${altEntry.id}`
        if (proposedPairs.has(pairKey)) continue

        // Сравниваем характеристики: альтернатива не хуже по ≥40% параметров
        let equalOrBetter = 0, defined = 0
        for (const { key } of featureKeys) {
          const userF = entry.features.find(f => f.key === key)
          const altF  = altEntry.features.find(f => f.key === key)
          if (!userF || !altF) continue
          defined++
          if ((LEVEL_ORDER[altF.level] ?? 0) >= (LEVEL_ORDER[userF.level] ?? 0)) equalOrBetter++
        }
        const featureScore = defined > 0 ? equalOrBetter / defined : 0.5
        if (defined > 0 && featureScore < 0.4) continue

        proposedPairs.add(pairKey)
        alternativeItems.push({
          subscriptionId: sub.id,
          currentName:    sub.name,
          altDisplayName: getServiceDisplayName(altEntry),
          altTagline:     (lang === 'en' && altEntry.taglineEn) ? altEntry.taglineEn : altEntry.tagline,
          currentMonthly: Math.round(userMonthly),
          altMonthly,
          savingMonthly:  Math.round(priceDiff),
          currency:       userCurrency,
          groupLabel:     getModuleTypeLabels(lang)[entry.type] ?? entry.type,
          featureScore,
        })
      }
    }

    if (alternativeItems.length > 0) {
      // Сортируем: наибольшая экономия первой, при равной — лучший feature score
      alternativeItems.sort((a, b) =>
        b.savingMonthly !== a.savingMonthly
          ? b.savingMonthly - a.savingMonthly
          : b.featureScore - a.featureScore,
      )
      const savingsMonthly = alternativeItems.reduce((sum, it) => sum + it.savingMonthly, 0)
      const perMoLabel = lang === 'en' ? '/mo' : '/мес'
      const subtitle = alternativeItems.slice(0, 2)
        .map(it => `${it.altDisplayName} ${lang === 'en' ? 'instead of' : 'вместо'} ${it.currentName}: −${fmtCurrency(it.savingMonthly, it.currency)}${perMoLabel}`)
        .join(' · ')
      scenarios.push({
        key: 'alternative', type: 'alternative',
        title: s.scenarioTitleAlternative,
        subtitle,
        affectedIds: [], isInformational: true,
        savingsMonthly: Math.round(savingsMonthly),
        currency: primaryCurrency,
        alternativeItems,
      })
    }
  }

  // Сортируем по экономии — самый выгодный сценарий первым
  return scenarios.sort((a, b) => b.savingsMonthly - a.savingsMonthly)
}


// ── AI-ответ: парсинг и стилизованный рендер ─────────────────────────────────

type AiVerdict = 'keep' | 'cancel' | 'annual' | 'downgrade' | 'review'

interface AiParagraph {
  name: string          // имя сервиса (или пусто)
  verdict: AiVerdict | null
  verdictLabel: string
  body: string          // остаток текста без имени
}

const VERDICT_PATTERNS: Array<[RegExp, AiVerdict]> = [
  [/перейт[иь] на годов|switch to annual|годовой тариф|annual plan/i, 'annual'],
  [/пониз[иь]|downgrade/i,                                            'downgrade'],
  [/отмен[иьуе]|cancel|стоит отказ|рекомен.{0,15}отмен|рекомендую отмен/i, 'cancel'],
  [/остав[иьл]|оставим|оставляем|остаться|сохран[иьею]|сохранени[юя]|сохраним|сохранять|к сохранению|keep|стоит остав|рекомен.{0,15}остав|давайте сохран/i, 'keep'],
  [/пересмотр[еи]|review|стоит рассмотр|рекомен.{0,15}пересмотр/i,  'review'],
]

const VERDICT_STYLE: Record<AiVerdict, {
  light: { badge: string; accentColor: string; dot: string }
  dark:  { badge: string; accentColor: string; dot: string }
}> = {
  keep:      { light: { badge: 'bg-[#dcfce7] text-[#15803d] border-[#86efac]', accentColor: '#22c55e', dot: 'bg-[#22c55e]' },
               dark:  { badge: 'bg-[#0a2318] text-[#4ade80] border-[#166534]',  accentColor: '#22c55e', dot: 'bg-[#22c55e]' } },
  cancel:    { light: { badge: 'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]', accentColor: '#ef4444', dot: 'bg-[#ef4444]' },
               dark:  { badge: 'bg-[#2a0808] text-[#f87171] border-[#7f1d1d]',  accentColor: '#ef4444', dot: 'bg-[#ef4444]' } },
  annual:    { light: { badge: 'bg-[#dbeafe] text-[#1d4ed8] border-[#93c5fd]', accentColor: '#3b82f6', dot: 'bg-[#3b82f6]' },
               dark:  { badge: 'bg-[#0c1a3a] text-[#60a5fa] border-[#1e3a8a]',  accentColor: '#3b82f6', dot: 'bg-[#3b82f6]' } },
  downgrade: { light: { badge: 'bg-[#fef3c7] text-[#b45309] border-[#fcd34d]', accentColor: '#f59e0b', dot: 'bg-[#f59e0b]' },
               dark:  { badge: 'bg-[#2a1800] text-[#fbbf24] border-[#78350f]',  accentColor: '#f59e0b', dot: 'bg-[#f59e0b]' } },
  review:    { light: { badge: 'bg-[#fef3c7] text-[#b45309] border-[#fcd34d]', accentColor: '#f59e0b', dot: 'bg-[#f59e0b]' },
               dark:  { badge: 'bg-[#2a1800] text-[#fbbf24] border-[#78350f]',  accentColor: '#f59e0b', dot: 'bg-[#f59e0b]' } },
}

function detectVerdict(text: string): AiVerdict | null {
  for (const [re, verdict] of VERDICT_PATTERNS) {
    if (re.test(text)) return verdict
  }
  return null
}

/** Парсит ответ ИИ (несколько абзацев через \n\n) в структурированные блоки */
function parseAiResponse(raw: string): AiParagraph[] {
  return raw
    .split(/\n{2,}/)
    .map(para => para.trim())
    .filter(Boolean)
    .map(para => {
      // Предпочтительный формат: «Название — вердикт: …»
      // Вердикт берём ТОЛЬКО из сегмента между тире и двоеточием, чтобы упоминание
      // отмены другого сервиса дальше в абзаце не перебивало вердикт этой подписки.
      const dashMatch = para.match(/^(.{1,40}?)\s+[—–]\s+([^:\n]{1,40}?):\s*/)
      if (dashMatch) {
        const name = dashMatch[1].trim()
        const verdictSegment = dashMatch[2].trim()
        const body = para.slice(dashMatch[0].length).trim()
        const verdict = detectVerdict(verdictSegment) ?? detectVerdict(body)
        return { name, verdict, verdictLabel: '', body }
      }
      // Запасной формат: «Название: …» (вердикт ищем по всему абзацу)
      const colonMatch = para.match(/^([A-ZА-ЯЁa-zа-яё][^.!?:,\n]{1,40}):\s*/)
      let name = ''
      let body = para
      if (colonMatch) {
        name = colonMatch[1].trim()
        body = para.slice(colonMatch[0].length).trim()
      }
      const verdict = detectVerdict(para)
      return { name, verdict, verdictLabel: '', body }
    })
}

function AiAnalysisBlock({ text }: { text: string }) {
  const { strings } = useLang()
  const s = strings.simulator
  const isDark = useDarkMode()
  const verdictLabels: Record<AiVerdict, string> = {
    cancel:    s.verdictCancel,
    keep:      s.verdictKeep,
    annual:    s.verdictAnnual,
    downgrade: s.verdictDowngrade,
    review:    s.verdictReview,
  }
  const paragraphs = parseAiResponse(text)
  const cardBg     = isDark ? '#1e1e3a' : '#ffffff'
  const cardBorder = isDark ? '#2e2e52' : '#f0ece6'
  const nameColor  = isDark ? '#e0e0f0' : '#1a1a2e'
  const bodyColor  = isDark ? '#b8b8d8' : '#3d3d56'

  return (
    <div className="space-y-2.5">
      {paragraphs.map((p, i) => {
        const vs = p.verdict ? VERDICT_STYLE[p.verdict][isDark ? 'dark' : 'light'] : null
        return (
          <div
            key={i}
            style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderLeftWidth: vs ? 3 : 1,
              borderLeftColor: vs ? vs.accentColor : cardBorder,
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {/* Шапка: имя + бейдж вердикта */}
            {(p.name || p.verdict) && (
              <div className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-1.5">
                {p.name ? (
                  <p className="text-[13px] font-semibold leading-snug" style={{ color: nameColor }}>{p.name}</p>
                ) : (
                  <span />
                )}
                {p.verdict && vs && (
                  <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 border ${vs.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${vs.dot}`} />
                    {verdictLabels[p.verdict]}
                  </span>
                )}
              </div>
            )}
            {/* Тело */}
            <p className="px-3.5 pb-3 pt-0.5 text-[13px] leading-relaxed" style={{ color: bodyColor }}>
              {p.body}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function ReminderCard({
  plan,
  onDone,
  onDismiss,
}: {
  plan: DbPlannedAction
  onDone: () => void
  onDismiss: () => void
}) {
  const { strings } = useLang()
  const s = strings.simulator
  const PLAN_ACTION_LABELS: Record<PlannedActionType, string> = {
    switch_to_annual:      s.planActionAnnual,
    switch_to_family:      s.planActionFamily,
    switch_to_cheaper:     s.planActionCheaper,
    switch_to_alternative: s.planActionAlternative,
  }
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const daysAgo = Math.floor((Date.now() - plan.createdAt.getTime()) / 86_400_000)

  const handleDone = async () => {
    setCompleting(true)
    setError(null)
    const result = await completePlannedAction({
      plannedActionId:  plan.id,
      subscriptionId:   plan.subscriptionId,
      subscriptionName: plan.subscriptionName,
      savingMonthly:    plan.savingMonthly,
      currency:         plan.currency,
      actionType:       plan.actionType,
      targetService:    plan.targetService,
    })
    setCompleting(false)
    if (result.ok) {
      onDone()
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="su-slide-down rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#92400e]">
          {s.reminderPlanned} {PLAN_ACTION_LABELS[plan.actionType]}
          {plan.targetService && ` → ${plan.targetService}`}
        </p>
        <p className="text-[11px] text-[#b45309] mt-0.5">
          {plan.subscriptionName} · {s.reminderDay(daysAgo)}
          {plan.savingMonthly > 0 && s.reminderSaving(fmtCurrency(plan.savingMonthly, plan.currency))}
        </p>
        {error && <p className="text-[11px] text-[#e5484d] mt-1">{error}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={completing}
          onClick={() => void handleDone()}
          className="rounded-lg bg-[#12b76a] hover:bg-[#0d9f5e] disabled:opacity-50 px-3 py-1.5 text-[11px] font-bold text-white transition-colors"
        >
          {completing ? '...' : s.reminderDoneButton}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg border border-[#d97706] text-[#92400e] px-3 py-1.5 text-[11px] font-medium hover:bg-[#fef3c7] transition-colors"
        >
          {s.reminderInProgress}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[#b45309] hover:text-[#92400e] text-[14px] leading-none"
          aria-label={s.reminderHide}
        >
          ×
        </button>
      </div>
    </div>
  )
}

function PlanButton({
  planned,
  onClick,
}: {
  planned: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  const { strings } = useLang()
  const s = strings.simulator
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border transition-colors ${
        planned
          ? 'bg-[#f0fdf4] border-[#86efac] text-[#15803d] hover:bg-[#dcfce7]'
          : 'bg-white border-[#e7e3dc] text-[#6b6b80] hover:border-[#0d9f6e] hover:text-[#0d9f6e] hover:bg-[#f0fdf9]'
      }`}
    >
      {planned ? s.planPlanned : s.planSchedule}
    </button>
  )
}

export default function SavingsSimulatorView({
  subs,
  initialPlannedActions,
  initialOpenChat,
  initialChatQuery,
}: {
  subs: Subscription[]
  initialPlannedActions: DbPlannedAction[]
  initialOpenChat?: boolean
  initialChatQuery?: string | null
}) {
  const { lang, strings } = useLang()
  const s = strings.simulator
  const active = useMemo(() => subs.filter((s) => s.status === 'active'), [subs])
  const primaryCurrency = active[0]?.currency ?? subs[0]?.currency ?? 'RUB'

  const monthlyGroups = useMemo(
    () => groupMonthlyByCurrency(active, getMonthlyAmount),
    [active],
  )

  const [cutIds, setCutIds] = useState<Set<string>>(() => new Set())
  const [activeScenarioKey, setActiveScenarioKey] = useState<string | null>(null)
  const [plannedActions, setPlannedActions] = useState<DbPlannedAction[]>(initialPlannedActions)
  // ID напоминаний, скрытых на текущую сессию («В процессе» / крестик)
  const [dismissedReminderIds, setDismissedReminderIds] = useState<Set<number>>(() => new Set())

  const togglePlan = useCallback(async (params: {
    subscriptionId: string
    subscriptionName: string
    savingMonthly: number
    currency: string
    actionType: PlannedActionType
    targetService?: string
  }) => {
    const existing = plannedActions.find(
      a => a.subscriptionId === params.subscriptionId && a.actionType === params.actionType,
    )
    if (existing) {
      // Оптимистично убираем
      setPlannedActions(prev => prev.filter(a => a.id !== existing.id))
      await removePlannedAction(existing.id)
    } else {
      // Оптимистично добавляем с temp id
      const tempId = -Date.now()
      setPlannedActions(prev => [
        ...prev,
        { ...params, id: tempId, createdAt: new Date() },
      ])
      const result = await addPlannedAction(params)
      if (result.ok) {
        // Заменяем temp id на настоящий
        setPlannedActions(prev => prev.map(a => a.id === tempId ? { ...a, id: result.id } : a))
      } else {
        // Откатываем
        setPlannedActions(prev => prev.filter(a => a.id !== tempId))
      }
    }
  }, [plannedActions])

  const isPlanned = useCallback((subscriptionId: string, actionType: PlannedActionType): boolean => {
    return plannedActions.some(a => a.subscriptionId === subscriptionId && a.actionType === actionType)
  }, [plannedActions])

  /** Все запланированные действия для конкретной подписки (для бейджа в списке) */
  const getSubPlans = useCallback((subscriptionId: string): DbPlannedAction[] => {
    return plannedActions.filter(a => a.subscriptionId === subscriptionId)
  }, [plannedActions])

  /** Напоминания: планы старше 14 дней, не скрытые на сессию */
  const overdueReminders = useMemo(() => {
    const cutoff = 14 * 24 * 60 * 60 * 1000 // 14 дней в мс
    return plannedActions
      .filter(plan =>
        Date.now() - plan.createdAt.getTime() > cutoff &&
        !dismissedReminderIds.has(plan.id),
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) // старые первыми
      .slice(0, 3) // не более трёх карточек сразу
  }, [plannedActions, dismissedReminderIds])

  const toggleCut = (id: string) => {
    setActiveScenarioKey(null)
    setCutIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applyScenario = (scenario: Scenario) => {
    if (scenario.isInformational) {
      // Информационные сценарии — только раскрываем/сворачиваем детали
      setActiveScenarioKey(prev => prev === scenario.key ? null : scenario.key)
      return
    }
    if (activeScenarioKey === scenario.key) {
      setActiveScenarioKey(null)
      setCutIds(new Set())
    } else {
      setActiveScenarioKey(scenario.key)
      setCutIds(new Set(scenario.affectedIds))
    }
  }

  // Из панели сравнения: пометить/снять одну подписку
  const handleCut = useCallback((id: string) => {
    setActiveScenarioKey(null)
    setCutIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Из панели сравнения: оставить одну, остальные в группе — отключить
  const handleKeepOnly = useCallback((keepId: string, groupIds: string[]) => {
    setActiveScenarioKey(null)
    setCutIds(prev => {
      const next = new Set(prev)
      next.delete(keepId)
      groupIds.forEach(id => { if (id !== keepId) next.add(id) })
      return next
    })
  }, [])

  // ── Animation state ──────────────────────────────────────────
  // Checkbox spring punch: counter per sub.id → drives key to retrigger CSS anim
  const [punchCounters, setPunchCounters] = useState<Record<string, number>>({})
  const toggleCutAnimated = useCallback((id: string) => {
    toggleCut(id)
    setPunchCounters(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }, [toggleCut])

  const selectedGroups = useMemo(
    () => groupMonthlyByCurrency(active.filter(s => cutIds.has(s.id)), getMonthlyAmount),
    [active, cutIds],
  )

  const categoryComparisons = useMemo(() => getCategoryComparisons(active, lang), [active, lang])
  const scenarios = useMemo(() => buildScenarios(active, categoryComparisons, s, lang), [active, categoryComparisons, s, lang])

  // Какие типы подписок были проверены и у скольких из них нашлись дубликаты
  const typeCoverage = useMemo(() => {
    const typeCount = new Map<string, number>()
    for (const s of active) {
      const entry = findServiceEntry(s.name)
      const types = entry
        ? [entry.type, ...(entry.additionalTypes ?? [])]
        : (() => { const inf = inferTypeFromName(s.name); return inf ? [inf] : [] })()
      for (const t of types) {
        typeCount.set(t, (typeCount.get(t) ?? 0) + 1)
      }
    }
    const dupTypeKeys = new Set(categoryComparisons.map(g => g.groupKey))
    const singletons = [...typeCount.entries()]
      .filter(([t, c]) => c === 1 && !dupTypeKeys.has(t))
      .map(([t]) => t)
    return { total: typeCount.size, singletons }
  }, [active, categoryComparisons])

  // Для отображения экономии в шапке: yearly сценарий — своя сумма, остальные — через cutIds
  const activeScenario = useMemo(
    () => scenarios.find(s => s.key === activeScenarioKey) ?? null,
    [scenarios, activeScenarioKey],
  )
  const displayGroups = useMemo(() => {
    if (activeScenario?.isInformational) {
      // Информационные сценарии не меняют cutIds, показываем сумму экономии напрямую
      // через виртуальные объекты, чтобы соблюсти интерфейс groupMonthlyByCurrency
      const saving = activeScenario.savingsMonthly
      return [{ currency: activeScenario.currency, total: saving }] satisfies CurrencyGroup[]
    }
    return selectedGroups
  }, [activeScenario, selectedGroups])

  // ── Animated savings display ─────────────────────────────────
  const displayMonthly = displayGroups[0]?.total ?? 0
  const displayCurrency = displayGroups[0]?.currency ?? primaryCurrency
  const animatedMonthly = useAnimatedValue(displayMonthly, 420)
  const animatedYearly  = useAnimatedValue(displayMonthly * 12, 420)

  // Safe icon wiggle: fires each time the saving amount changes
  const prevAmountRef = useRef(0)
  const [wiggleCount, setWiggleCount] = useState(0)
  useEffect(() => {
    if (displayMonthly !== prevAmountRef.current) {
      prevAmountRef.current = displayMonthly
      setWiggleCount(c => c + 1)
    }
  }, [displayMonthly])

  // Сумма дубликатов для подписи в шапке
  const dupScenario = useMemo(() => scenarios.find(s => s.type === 'dup'), [scenarios])

  if (subs.length === 0) {
    return (
      <section className="rounded-2xl border border-[#ebe6df] bg-white px-6 py-12 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] text-center max-w-xl mx-auto">
        <p className="text-sm text-[#6b6b80] mb-6">{s.emptyState}</p>
        <Link
          href="/dashboard/subscriptions/new"
          className={`${actionButtonClass('primary')} px-6 py-3`}
        >
          {s.emptyAddButton}
        </Link>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e]">{s.title}</h1>
          <p className="text-sm text-[#6b6b80] mt-1 max-w-xl">
            {s.subtitle}
          </p>
        </div>
      </header>

      {/* ── Напоминания о запланированных действиях (старше 14 дней) ── */}
      {overdueReminders.length > 0 && (
        <div className="space-y-2">
          {overdueReminders.map(plan => (
            <ReminderCard
              key={plan.id}
              plan={plan}
              onDone={() => setPlannedActions(prev => prev.filter(a => a.id !== plan.id))}
              onDismiss={() => setDismissedReminderIds(prev => new Set([...prev, plan.id]))}
            />
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-[#e7e3dc] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Safe icon — remount on wiggleCount to retrigger CSS anim */}
        <div
          key={wiggleCount}
          className="w-[92px] h-[92px] rounded-2xl bg-gradient-to-b from-[#f7f4ff] to-[#ede8fc] flex items-center justify-center flex-shrink-0"
          aria-hidden
        >
          <Image
            src="/icon-safe.svg"
            alt=""
            width={62}
            height={62}
            className={`w-[62px] h-[62px] object-contain ${wiggleCount > 0 ? 'su-safe-wiggle' : ''}`}
          />
        </div>
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[#6b6b80] uppercase tracking-wide mb-1">{s.potentialSaving}</p>
            <p className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#12b76a] leading-none tabular-nums">
              {fmtCurrency(animatedMonthly, displayCurrency)}
              <span className="text-base sm:text-lg font-semibold text-[#6b6b80]">{s.perMonth}</span>
            </p>
            <p className="text-xs text-[#8e8e93] mt-2">
              {activeScenario?.isInformational
                ? (({ yearly: s.savingInfoYearly, family: s.savingInfoFamily, unused: s.savingInfoUnused, alternative: s.savingInfoAlternative } as Partial<Record<ScenarioType, string>>)[activeScenario.type] ?? s.savingInfoDefault)
                : s.savingBySelected}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6b6b80] uppercase tracking-wide mb-1 opacity-0 sm:opacity-100"> </p>
            <p className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#1a1a2e] leading-none tabular-nums">
              {fmtCurrency(animatedYearly, displayCurrency)}
              <span className="text-base sm:text-lg font-semibold text-[#6b6b80]">{s.perYear}</span>
            </p>
            <p className="text-xs text-[#8e8e93] mt-2">{s.savingIfHeld}</p>
          </div>
        </div>
        {dupScenario && (
          <p className="text-xs text-[#6b6b80] sm:max-w-[200px] leading-snug sm:text-right">
            {s.dupPotential}{' '}
            <span className="font-semibold text-[#1a1a2e]">{fmtCurrency(dupScenario.savingsMonthly, dupScenario.currency)}</span> {s.perMonth}
          </p>
        )}
      </section>

<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:items-start">
        <article className="lg:col-span-2 rounded-2xl border border-[#e7e3dc] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f0ece6] flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[17px] font-bold text-[#1a1a2e] tracking-[-0.02em]">{s.whatToDisable}</h2>
            <button
              type="button"
              onClick={() => { setCutIds(new Set()); setActiveScenarioKey(null) }}
              className="text-sm font-medium text-[#5b43d4] hover:text-[#4b36b6]"
            >
              {s.resetSelection}
            </button>
          </div>
          <ul className="divide-y divide-[#ececee]">
            {active.length === 0 ? (
              <li className="px-5 py-8 text-sm text-[#8e8e93]">{s.noActivePayments}</li>
            ) : (
              active.map((sub) => {
                const m = getMonthlyAmount(sub)
                const on = cutIds.has(sub.id)
                const punchCount = punchCounters[sub.id] ?? 0
                return (
                  <li
                    key={sub.id}
                    className={`px-5 py-3.5 flex items-start gap-3 transition-colors duration-200 ${on ? 'bg-[#f4f2ff]' : ''}`}
                  >
                    {/* Wrapper keyed by punchCount so CSS anim re-fires on every toggle */}
                    <div key={punchCount} className={`mt-1 ${punchCount > 0 ? 'su-check-punch' : ''}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleCutAnimated(sub.id)}
                        className="h-4 w-4 rounded border-[#d8d8dc] text-[#5b43d4] focus:ring-[#5b43d4]"
                        aria-label={s.disableCheckboxLabel(sub.name)}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link
                          href={`/dashboard/subscriptions/${sub.id}`}
                          className={`text-[15px] font-semibold truncate transition-colors duration-150 ${on ? 'text-[#5b43d4]' : 'text-[#1a1a2e] hover:text-[#5b43d4]'}`}
                        >
                          {sub.name}
                        </Link>
                        <span className={`text-[15px] font-semibold tabular-nums transition-colors duration-200 ${on ? 'text-[#9a9aaf] line-through' : 'text-[#1a1a2e]'}`}>
                          {fmtCurrency(m, sub.currency ?? 'RUB')}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#8e8e93] mt-0.5">
                        {categoryLabel(sub.category_slug, lang)} · {formatBillingCycle(sub, lang)}
                      </p>
                      {/* Бейджи запланированных действий */}
                      {getSubPlans(sub.id).map(plan => {
                        const labels: Record<PlannedActionType, string> = {
                          switch_to_annual:      s.planSwitchAnnual,
                          switch_to_family:      s.planSwitchFamily,
                          switch_to_cheaper:     s.planSwitchCheaper(plan.targetService ?? '...'),
                          switch_to_alternative: s.planSwitchAlternative(plan.targetService ?? '...'),
                        }
                        return (
                          <span key={plan.actionType} className="inline-flex items-center gap-1 text-[11px] text-[#0d9f6e] font-medium mt-0.5">
                            {labels[plan.actionType]}
                          </span>
                        )
                      })}
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </article>

        <div className="space-y-4">
          <article className="rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="text-base font-bold text-[#1a1a2e]">{s.scenariosTitle}</h2>
              <span className="su-shimmer-tag text-[11px] font-semibold rounded-full px-2 py-0.5 text-[#5b43d4]">
                {s.scenariosByData}
              </span>
            </div>
            <p className="text-xs text-[#8e8e93] mb-3">
              {scenarios.length > 0 ? s.scenariosHint : s.scenariosEmpty}
            </p>

            {scenarios.length === 0 && (
              <div className="rounded-xl border border-[#e7e3dc] p-4 text-center">
                <p className="text-sm text-[#8e8e93]">{s.noSavings}</p>
                <p className="text-xs text-[#8e8e93] mt-1">{s.noSavingsHint}</p>
              </div>
            )}

            <div className="space-y-2.5">
              {scenarios.map((scenario) => {
                const isActive = activeScenarioKey === scenario.key
                const ACCENTS: Record<ScenarioType, { border: string; bg: string; ring: string; text: string; badge: string; badgeText: string; panelBorder: string; panelBg: string; panelDivide: string }> = {
                  dup:     { border: 'border-[#fde7ea]', bg: 'bg-[#fff8f8]',  ring: 'ring-[#12b76a]/20',  text: 'text-[#12b76a]', badge: 'border-[#12b76a]/30 text-[#12b76a]', badgeText: s.scenarioBadgeActive,   panelBorder: 'border-[#d1fae5]', panelBg: 'bg-[#f0fdf4]', panelDivide: 'divide-[#d1fae5]' },
                  package: { border: 'border-[#fde7ea]', bg: 'bg-[#fff8f8]',  ring: 'ring-[#e5484d]/20',  text: 'text-[#e5484d]', badge: 'border-[#e5484d]/30 text-[#e5484d]', badgeText: s.scenarioBadgeActive,   panelBorder: 'border-[#fde7ea]', panelBg: 'bg-[#fff8f8]', panelDivide: 'divide-[#fde7ea]' },
                  cheaper: { border: 'border-[#fef3c7]', bg: 'bg-[#fffbeb]',  ring: 'ring-[#f59e0b]/20',  text: 'text-[#d97706]', badge: 'border-[#f59e0b]/30 text-[#d97706]', badgeText: s.scenarioBadgeActive,   panelBorder: 'border-[#fde68a]', panelBg: 'bg-[#fffbeb]', panelDivide: 'divide-[#fde68a]' },
                  pause:   { border: 'border-[#e7e3dc]', bg: 'bg-white',      ring: 'ring-[#1479b8]/20',  text: 'text-[#1479b8]', badge: 'border-[#1479b8]/30 text-[#1479b8]', badgeText: s.scenarioBadgeActive,   panelBorder: 'border-[#bfdbfe]', panelBg: 'bg-[#eff6ff]', panelDivide: 'divide-[#bfdbfe]' },
                  yearly:  { border: 'border-[#e7e3dc]', bg: 'bg-white',      ring: 'ring-[#5b43d4]/20',  text: 'text-[#5b43d4]', badge: 'border-[#5b43d4]/30 text-[#5b43d4]', badgeText: s.scenarioBadgeExpanded, panelBorder: 'border-[#ede9fc]', panelBg: 'bg-[#f7f4ff]', panelDivide: 'divide-[#ede9fc]' },
                  family:  { border: 'border-[#e7e3dc]', bg: 'bg-white',      ring: 'ring-[#5b43d4]/20',  text: 'text-[#5b43d4]', badge: 'border-[#5b43d4]/30 text-[#5b43d4]', badgeText: s.scenarioBadgeExpanded, panelBorder: 'border-[#ede9fc]', panelBg: 'bg-[#f7f4ff]', panelDivide: 'divide-[#ede9fc]' },
                  unused:      { border: 'border-[#e7e3dc]', bg: 'bg-white',      ring: 'ring-[#6b6b80]/20',  text: 'text-[#6b6b80]', badge: 'border-[#6b6b80]/30 text-[#6b6b80]', badgeText: s.scenarioBadgeExpanded, panelBorder: 'border-[#e7e3dc]', panelBg: 'bg-[#fafaf9]',    panelDivide: 'divide-[#e7e3dc]' },
                  alternative: { border: 'border-[#e7e3dc]', bg: 'bg-white',      ring: 'ring-[#0d9f6e]/20',  text: 'text-[#0d9f6e]', badge: 'border-[#0d9f6e]/30 text-[#0d9f6e]', badgeText: s.scenarioBadgeExpanded, panelBorder: 'border-[#a7f3d0]', panelBg: 'bg-[#f0fdf9]',    panelDivide: 'divide-[#a7f3d0]' },
                }
                const ACTIVE_ACCENTS: Record<ScenarioType, { border: string; bg: string }> = {
                  dup:     { border: 'border-[#12b76a]', bg: 'bg-[#eef8f0]' },
                  package: { border: 'border-[#e5484d]', bg: 'bg-[#fff8f8]' },
                  cheaper: { border: 'border-[#f59e0b]', bg: 'bg-[#fffbeb]' },
                  pause:   { border: 'border-[#1479b8]', bg: 'bg-[#eef5fc]' },
                  yearly:  { border: 'border-[#5b43d4]', bg: 'bg-[#f7f4ff]' },
                  family:  { border: 'border-[#5b43d4]', bg: 'bg-[#f7f4ff]' },
                  unused:      { border: 'border-[#6b6b80]', bg: 'bg-[#fafaf9]' },
                  alternative: { border: 'border-[#0d9f6e]', bg: 'bg-[#f0fdf9]' },
                }
                const a = ACCENTS[scenario.type]
                const act = ACTIVE_ACCENTS[scenario.type]
                const savingYearly = scenario.savingsMonthly * 12
                return (
                  <div key={scenario.key}>
                    <button
                      type="button"
                      onClick={() => applyScenario(scenario)}
                      className={`w-full text-left rounded-xl border p-3 transition-all ${
                        isActive
                          ? `${act.border} ${act.bg} ring-2 ${a.ring}`
                          : `${a.border} ${a.bg} hover:${act.border} hover:${act.bg} hover:-translate-y-[3px] hover:shadow-[0_4px_14px_rgba(26,26,61,0.11)]`
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[#1a1a2e]">{scenario.title}</p>
                        {isActive && (
                          <span className={`text-[10px] font-bold bg-white border rounded-full px-2 py-0.5 shrink-0 ${a.badge}`}>
                            {a.badgeText}
                          </span>
                        )}
                      </div>

                      {/* Дубликаты: отдельная строка на каждую группу */}
                      {scenario.type === 'dup' && scenario.dupGroupSummaries ? (
                        <div className="mt-1.5 mb-1 space-y-1">
                          {scenario.dupGroupSummaries.map(g => (
                            <div key={g.groupKey} className="flex items-start gap-1.5">
                              <p className="text-[11px] text-[#6b6b80] leading-snug">
                                <span className="font-medium text-[#1a1a2e]">{g.label}</span>
                                {' '}({g.names.length}): {g.names.join(', ')}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#8e8e93] mt-0.5 mb-1 line-clamp-2">{scenario.subtitle}</p>
                      )}

                      {/* Сумма — цвет зависит от порога экономии */}
                      <p className={`text-lg font-bold mt-1 ${savingsColorClass(scenario.savingsMonthly)}`}>
                        {fmtCurrency(scenario.savingsMonthly, scenario.currency)} {s.perMonth}
                      </p>
                      <p className="text-xs text-[#6b6b80] mt-0.5">
                        {fmtCurrency(savingYearly, scenario.currency)} {s.perYear}
                        {scenario.isInformational && s.scenarioInfoSuffix}
                        {scenario.type === 'pause' && s.scenarioPauseSuffix(scenario.affectedIds.length)}
                        {scenario.type === 'package' && s.scenarioPackageSuffix(scenario.affectedIds.length)}
                        {scenario.type === 'cheaper' && s.scenarioCheaperSuffix}
                        {scenario.type === 'unused' && s.scenarioUnusedSuffix}
                        {scenario.type === 'alternative' && s.scenarioAlternativeSuffix(scenario.alternativeItems?.length ?? 0)}
                      </p>
                    </button>

                    {/* Detail panels — раскрываются при isActive */}
                    {isActive && (() => {
                      const pb = `mt-1.5 rounded-xl border ${a.panelBorder} ${a.panelBg} divide-y ${a.panelDivide} text-[12px]`
                      const row = 'px-3 py-2.5 flex items-center justify-between gap-2'
                      const nameClass = 'text-[13px] font-semibold text-[#1a1a2e]'
                      const subClass = 'text-[11px] text-[#6b6b80]'
                      const savClass = `text-sm font-bold ${a.text} shrink-0`

                      if (scenario.type === 'yearly' && scenario.yearlyItems) return (
                        <div className={pb}>
                          {scenario.yearlyItems.map((it, i) => (
                            <div key={i} className={`${row} flex-wrap gap-y-2`}>
                              <div className="flex-1 min-w-0">
                                <p className={nameClass}>{it.name}</p>
                                <p className={subClass}>
                                  {s.yearlyCurrentNow(fmtCurrency(Math.round(it.currentMonthly), it.currency))}
                                  {' → '}{s.yearlyAnnual(fmtCurrency(it.annualPrice, it.currency), fmtCurrency(Math.round(it.annualMonthly), it.currency))}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <p className={savClass}>−{fmtCurrency(Math.round(it.savingMonthly), it.currency)}{s.perMonthSuffix}</p>
                                <PlanButton
                                  planned={isPlanned(it.subscriptionId, 'switch_to_annual')}
                                  onClick={e => { e.stopPropagation(); void togglePlan({ subscriptionId: it.subscriptionId, subscriptionName: it.name, savingMonthly: Math.round(it.savingMonthly), currency: it.currency, actionType: 'switch_to_annual' }) }}
                                />
                              </div>
                            </div>
                          ))}
                          <div className={row}>
                            <p className={subClass}>{s.yearlyTotal}</p>
                            <p className={`font-bold ${a.text}`}>{fmtCurrency(scenario.savingsMonthly, scenario.currency)}{s.perMonthSuffix} · {fmtCurrency(scenario.savingsMonthly * 12, scenario.currency)}{s.perYear}</p>
                          </div>
                        </div>
                      )

                      if (scenario.type === 'package' && scenario.packageItems) return (
                        <div className={pb}>
                          {scenario.packageItems.map((it, i) => (
                            <div key={i} className={row}>
                              <div>
                                <p className={nameClass}>{it.redundantName}</p>
                                <p className={subClass}>{s.packageIncluded(it.packageName)}</p>
                              </div>
                              <p className={savClass}>+{fmtCurrency(Math.round(it.redundantMonthly), it.currency)}{s.perMonthSuffix}</p>
                            </div>
                          ))}
                        </div>
                      )

                      if (scenario.type === 'cheaper' && scenario.cheaperItems) return (
                        <div className={pb}>
                          {scenario.cheaperItems.map((it, i) => (
                            <div key={i} className={`${row} flex-wrap gap-y-2`}>
                              <div className="flex-1 min-w-0">
                                <p className={nameClass}>{s.cheaperInstead(it.cheaperName, it.expensiveName)}</p>
                                <p className={subClass}>{it.groupLabel}{s.cheaperFunctional}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <p className={savClass}>−{fmtCurrency(it.savingMonthly, it.currency)}{s.perMonthSuffix}</p>
                                <PlanButton
                                  planned={isPlanned(it.subscriptionId, 'switch_to_cheaper')}
                                  onClick={e => { e.stopPropagation(); void togglePlan({ subscriptionId: it.subscriptionId, subscriptionName: it.expensiveName, savingMonthly: it.savingMonthly, currency: it.currency, actionType: 'switch_to_cheaper', targetService: it.cheaperName }) }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )

                      if (scenario.type === 'family' && scenario.familyItems) return (
                        <div className={pb}>
                          {scenario.familyItems.map((it, i) => (
                            <div key={i} className={`${row} flex-wrap gap-y-2`}>
                              <div className="flex-1 min-w-0">
                                <p className={nameClass}>{it.name} Family ({s.familySlotSuffix(it.slots)})</p>
                                <p className={subClass}>
                                  {s.familyPerAll(fmtCurrency(it.familyMonthly, it.currency))}
                                  {' · '}{s.familyPerPerson(fmtCurrency(it.perPersonMonthly, it.currency))}
                                  {' '}{s.familyVsYours(fmtCurrency(Math.round(it.currentMonthly), it.currency))}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <p className={savClass}>−{fmtCurrency(it.savingPerPerson, it.currency)}{s.familyPersonSuffix}</p>
                                <PlanButton
                                  planned={isPlanned(it.subscriptionId, 'switch_to_family')}
                                  onClick={e => { e.stopPropagation(); void togglePlan({ subscriptionId: it.subscriptionId, subscriptionName: it.name, savingMonthly: it.savingPerPerson, currency: it.currency, actionType: 'switch_to_family' }) }}
                                />
                              </div>
                            </div>
                          ))}
                          <div className={`${row} text-[#6b6b80]`}>
                            <p className={subClass}>{s.familySavingNote}</p>
                          </div>
                        </div>
                      )

                      if (scenario.type === 'unused' && scenario.unusedItems) return (
                        <div className={pb}>
                          {scenario.unusedItems.map((it, i) => (
                            <div key={i} className="px-3 py-2.5">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className={nameClass}>{it.name}</p>
                                <p className={`${subClass} shrink-0`}>{s.unusedDaysWithout(it.daysSince)}</p>
                              </div>
                              <p className={subClass}>{s.unusedPremium} {it.premiumFeatures.join(' · ')}</p>
                              <p className="text-[11px] text-[#8e8e93] mt-1">{s.unusedHint}</p>
                            </div>
                          ))}
                        </div>
                      )

                      if (scenario.type === 'alternative' && scenario.alternativeItems) return (
                        <div className={pb}>
                          {scenario.alternativeItems.map((it, i) => (
                            <div key={i} className={`${row} flex-wrap gap-y-2`}>
                              <div className="min-w-0 flex-1">
                                <p className={nameClass}>{it.altDisplayName}</p>
                                <p className={subClass}>{it.altTagline}</p>
                                <p className={subClass}>
                                  {it.groupLabel} · {s.altInstead(it.currentName, fmtCurrency(it.currentMonthly, it.currency))}
                                  {it.featureScore >= 0.7 && s.altFunctional}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <div className="text-right">
                                  <p className={savClass}>−{fmtCurrency(it.savingMonthly, it.currency)}{s.perMonthSuffix}</p>
                                  <p className="text-[10px] text-[#8e8e93]">{s.altMarketPrice(fmtCurrency(it.altMonthly, it.currency))}</p>
                                </div>
                                <PlanButton
                                  planned={isPlanned(it.subscriptionId, 'switch_to_alternative')}
                                  onClick={e => { e.stopPropagation(); void togglePlan({ subscriptionId: it.subscriptionId, subscriptionName: it.currentName, savingMonthly: it.savingMonthly, currency: it.currency, actionType: 'switch_to_alternative', targetService: it.altDisplayName }) }}
                                />
                              </div>
                            </div>
                          ))}
                          <div className={row}>
                            <p className={subClass}>{s.altDisclaimer}</p>
                          </div>
                        </div>
                      )

                      return null
                    })()}
                  </div>
                )
              })}
            </div>

            {/* Пустые слоты — если < 3 сценариев, показываем подсказки */}
            {scenarios.length < 3 && !scenarios.some(sc => sc.type === 'pause') && (
              <p className="text-[11px] text-[#8e8e93] mt-3 leading-snug">
                {s.addUsageHint}
              </p>
            )}

            {/* Индикатор проверенных типов подписок */}
            {typeCoverage.total > 0 && (
              <p className="text-[11px] text-[#8e8e93] mt-3 leading-snug border-t border-[#f0ece6] pt-3">
                <span className="font-medium text-[#6b6b80]">{s.checkedTypes(typeCoverage.total)}</span>
                {typeCoverage.singletons.length > 0 && (
                  <>
                    {' '}
                    {typeCoverage.singletons
                      .map(t => getTypeLabelsShort(lang)[t] ?? t)
                      .join(', ')}
                    {' '}{s.singletonsSuffix}
                  </>
                )}
              </p>
            )}
          </article>

        </div>
      </div>

      {/* ── Сравнение дубликатов ── */}
      {activeScenarioKey === 'dup' && categoryComparisons.length > 0 && (
        <DuplicatesPanel
          groups={categoryComparisons}
          cutIds={cutIds}
          onCut={handleCut}
          onKeepOnly={handleKeepOnly}
        />
      )}

      {/* ── AI section: все три режима ── */}
      <AiSection
        selectedIds={cutIds.size > 0 ? [...cutIds] : active.map(s => s.id)}
        currency={primaryCurrency}
        initialOpenChat={initialOpenChat}
        initialChatQuery={initialChatQuery}
      />
    </div>
  )
}
