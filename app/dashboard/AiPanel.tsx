'use client'

import { useCallback, useState } from 'react'
import { useLang } from '@/lib/LangContext'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

type Props = {
  selectedIds: string[]
  currency: string
  hasSubscriptions: boolean
}

function budgetPresets(currency: string): number[] {
  if (currency === 'RUB') return [1000, 2000, 3000, 5000, 7000, 10000]
  return [15, 30, 50, 100, 150, 250]
}

export default function AiPanel({ selectedIds, currency, hasSubscriptions }: Props) {
  const { lang, strings } = useLang()
  const s = strings.simulator

  const [openAnalyze, setOpenAnalyze] = useState(true)
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

  const runAnalyze = useCallback(async () => {
    if (selectedIds.length === 0) return
    setAnalyzeLoading(true)
    setAnalyzeError(null)
    setAnalyzeText(null)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionIds: selectedIds, locale: lang }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAnalyzeError(typeof data.error === 'string' ? data.error : s.aiNoAnswerError)
        return
      }
      setAnalyzeText(data.text ?? '')
    } catch {
      setAnalyzeError(s.aiNetworkError)
    } finally {
      setAnalyzeLoading(false)
    }
  }, [selectedIds, lang, s])

  const runWhatIf = useCallback(async () => {
    setWhatIfLoading(true)
    setWhatIfError(null)
    setWhatIfText(null)
    try {
      const res = await fetch('/api/ai/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetLimit: budget, currency, locale: lang }),
      })
      const data = await res.json()
      if (!res.ok) {
        setWhatIfError(typeof data.error === 'string' ? data.error : s.aiNoAnswerError)
        return
      }
      setWhatIfText(data.text ?? '')
    } catch {
      setWhatIfError(s.aiNetworkError)
    } finally {
      setWhatIfLoading(false)
    }
  }, [budget, currency, lang, s])

  const sendChat = useCallback(async () => {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    const nextMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: text }]
    setChatMessages(nextMessages)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, locale: lang }),
      })
      const data = await res.json()
      if (!res.ok) {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: typeof data.error === 'string' ? data.error : s.aiNoAnswerError },
        ])
        return
      }
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.text ?? '' }])
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: s.aiNoAnswerError }])
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatMessages, chatLoading, lang, s])

  if (!hasSubscriptions) return null

  const chatHints = [s.chatHint1, s.chatHint2, s.chatHint3]

  return (
    <section className="mt-10 space-y-3">
      <h2 className="text-sm font-medium text-[#6b6b80] uppercase tracking-wide">
        {s.aiTitle}
      </h2>
      <p className="text-xs text-[#8e8e93]">{s.aiSubtitle}</p>

      {/* AI analysis */}
      <div className="rounded-2xl border border-[#e7e3dc] bg-white overflow-hidden shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
        <button
          type="button"
          onClick={() => setOpenAnalyze((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#f8f6f2] transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-[#1a1a2e]">
            <span className="h-2 w-2 rounded-full bg-[#5b43d4]" />
            {s.aiAnalyzeLabel}
          </span>
          <span className="text-[#8e8e93] text-xs">{openAnalyze ? '▲' : '▼'}</span>
        </button>
        {openAnalyze && (
          <div className="px-4 pb-4 space-y-3 border-t border-[#f0ece6]">
            {analyzeText ? (
              <div className="space-y-2">
                <p className="text-sm text-[#1a1a2e] whitespace-pre-wrap">{analyzeText}</p>
                <button
                  type="button"
                  onClick={() => { setAnalyzeText(null); void runAnalyze() }}
                  className="text-xs text-[#5b43d4] hover:text-[#4b36b6]"
                >
                  {s.aiRefresh}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void runAnalyze()}
                disabled={selectedIds.length === 0 || analyzeLoading}
                className="w-full rounded-lg bg-[#5b43d4] hover:bg-[#4b36b6] disabled:opacity-40 disabled:cursor-not-allowed py-2.5 text-sm font-medium text-white transition-colors"
              >
                {analyzeLoading ? s.aiAnalyzing : selectedIds.length === 0 ? s.aiSelectSubs : s.aiAnalyzeCount(selectedIds.length)}
              </button>
            )}
            {analyzeError && <p className="text-sm text-[#e5484d]">{analyzeError}</p>}
          </div>
        )}
      </div>

      {/* What if */}
      <div className="rounded-2xl border border-[#e7e3dc] bg-white overflow-hidden shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
        <button
          type="button"
          onClick={() => setOpenWhatIf((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#f8f6f2] transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-[#1a1a2e]">
            <span className="h-2 w-2 rounded-full bg-[#1479b8]" />
            {s.aiWhatIfLabel}
          </span>
          <span className="text-[#8e8e93] text-xs">{openWhatIf ? '▲' : '▼'}</span>
        </button>
        {openWhatIf && (
          <div className="px-4 pb-4 space-y-3 border-t border-[#f0ece6]">
            <div className="flex flex-wrap gap-2 pt-3">
              {budgetPresets(currency).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setBudget(n); setWhatIfText(null) }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    budget === n
                      ? 'bg-[#1479b8] text-white'
                      : 'bg-[#f4f5f8] text-[#6b6b80] hover:bg-[#ececf0]'
                  }`}
                >
                  {n.toLocaleString()} {currency}
                </button>
              ))}
            </div>
            <label className="block text-xs text-[#6b6b80]">
              {s.aiLimitLabel}
              <input
                type="number"
                min={1}
                value={budget}
                onChange={(e) => {
                  setBudget(Number(e.target.value) || 1)
                  setWhatIfText(null)
                }}
                className="mt-1 w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-sm text-[#1a1a2e]"
              />
            </label>
            {whatIfText ? (
              <div className="space-y-2">
                <p className="text-sm text-[#1a1a2e] whitespace-pre-wrap">{whatIfText}</p>
                <button
                  type="button"
                  onClick={() => { setWhatIfText(null); void runWhatIf() }}
                  className="text-xs text-[#1479b8] hover:text-[#0f6397]"
                >
                  {s.aiRefresh}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void runWhatIf()}
                disabled={whatIfLoading}
                className="w-full rounded-lg bg-[#1479b8] hover:bg-[#0f6397] disabled:opacity-40 py-2.5 text-sm font-medium text-white transition-colors"
              >
                {whatIfLoading ? s.aiThinking : s.aiPickSet}
              </button>
            )}
            {whatIfError && <p className="text-sm text-[#e5484d]">{whatIfError}</p>}
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="rounded-2xl border border-[#e7e3dc] bg-white overflow-hidden shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
        <button
          type="button"
          onClick={() => setOpenChat((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#f8f6f2] transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-[#1a1a2e]">
            <span className="h-2 w-2 rounded-full bg-[#0d9f6e]" />
            {s.aiChatLabel}
          </span>
          <span className="text-[#8e8e93] text-xs">{openChat ? '▲' : '▼'}</span>
        </button>
        {openChat && (
          <div className="px-4 pb-4 space-y-3 border-t border-[#f0ece6] pt-3">
            {chatMessages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {chatHints.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => setChatInput(hint)}
                    className="rounded-full border border-[#dcd6ce] bg-[#f8f6f2] px-3 py-1.5 text-xs text-[#6b6b80] hover:border-[#cfc8bf]"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            )}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#ede9fc] text-[#3f2b8f] ml-6'
                      : 'bg-[#f4f5f8] text-[#1a1a2e] mr-6'
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {chatLoading && (
                <div className="rounded-lg bg-[#f4f5f8] text-[#8e8e93] text-sm px-3 py-2 mr-6">…</div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void sendChat())}
                placeholder={s.chatPlaceholder}
                className="flex-1 rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-sm text-[#1a1a2e] placeholder:text-[#9a9aaf]"
              />
              <button
                type="button"
                onClick={() => void sendChat()}
                disabled={!chatInput.trim() || chatLoading}
                className="rounded-lg bg-[#0d9f6e] hover:bg-[#0a875d] disabled:opacity-40 px-4 text-sm font-medium text-white"
              >
                →
              </button>
            </div>
            {chatMessages.length > 0 && (
              <button
                type="button"
                onClick={() => setChatMessages([])}
                className="text-xs text-[#6b6b80] hover:text-[#1a1a2e]"
              >
                {s.aiClearChat}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
