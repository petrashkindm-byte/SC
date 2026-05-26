'use client'

import { useCallback, useState } from 'react'
import { useLang } from '@/lib/LangContext'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

// ── Simple markdown renderer ──────────────────────────────────────────────────
// Handles **bold**, *italic*, numbered lists, bullet lists, and blank lines.
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  function inlineFormat(raw: string): React.ReactNode {
    // Split on **…** and *…*
    const parts = raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={idx}>{part.slice(2, -2)}</strong>
      if (part.startsWith('*') && part.endsWith('*'))
        return <em key={idx}>{part.slice(1, -1)}</em>
      return part
    })
  }

  while (i < lines.length) {
    const line = lines[i]

    // Blank line → spacer
    if (line.trim() === '') {
      nodes.push(<div key={i} className="h-2" />)
      i++
      continue
    }

    // Numbered list item: "1. text"
    const numbered = line.match(/^(\d+)\.\s+(.+)$/)
    if (numbered) {
      const listItems: React.ReactNode[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s+.+$/)) {
        const m = lines[i].match(/^(\d+)\.\s+(.+)$/)!
        listItems.push(
          <li key={i} className="mb-0.5">
            <span className="font-semibold text-[#5b43d4] mr-1">{m[1]}.</span>
            {inlineFormat(m[2])}
          </li>
        )
        i++
      }
      nodes.push(<ol key={`ol-${i}`} className="pl-1 mb-1 space-y-0.5 list-none">{listItems}</ol>)
      continue
    }

    // Bullet list: "- text" or "• text"
    if (/^[-•]\s+/.test(line)) {
      const listItems: React.ReactNode[] = []
      while (i < lines.length && /^[-•]\s+/.test(lines[i])) {
        const content = lines[i].replace(/^[-•]\s+/, '')
        listItems.push(
          <li key={i} className="flex gap-1.5 mb-0.5">
            <span className="text-[#5b43d4] mt-0.5">•</span>
            <span>{inlineFormat(content)}</span>
          </li>
        )
        i++
      }
      nodes.push(<ul key={`ul-${i}`} className="pl-0 mb-1 space-y-0.5 list-none">{listItems}</ul>)
      continue
    }

    // Regular paragraph line
    nodes.push(
      <p key={i} className="mb-0.5 leading-relaxed">
        {inlineFormat(line)}
      </p>
    )
    i++
  }

  return <div className="text-sm text-[#1a1a2e]">{nodes}</div>
}

// ── Fetch helper: streaming text/plain success, JSON error ────────────────────
async function fetchAiText(url: string, body: unknown): Promise<{ text: string } | { error: string }> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    return { error: 'network' }
  }
  if (!res.ok) {
    try {
      const data = await res.json() as { error?: string }
      return { error: typeof data.error === 'string' ? data.error : `Ошибка ${res.status}` }
    } catch {
      return { error: `Ошибка ${res.status}` }
    }
  }
  const text = await res.text()
  return { text }
}

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
    const result = await fetchAiText('/api/ai/analyze', { subscriptionIds: selectedIds, locale: lang })
    if ('error' in result) {
      setAnalyzeError(result.error === 'network' ? s.aiNetworkError : result.error || s.aiNoAnswerError)
    } else {
      setAnalyzeText(result.text)
    }
    setAnalyzeLoading(false)
  }, [selectedIds, lang, s])

  const runWhatIf = useCallback(async () => {
    setWhatIfLoading(true)
    setWhatIfError(null)
    setWhatIfText(null)
    const result = await fetchAiText('/api/ai/what-if', { budgetLimit: budget, currency, locale: lang })
    if ('error' in result) {
      setWhatIfError(result.error === 'network' ? s.aiNetworkError : result.error || s.aiNoAnswerError)
    } else {
      setWhatIfText(result.text)
    }
    setWhatIfLoading(false)
  }, [budget, currency, lang, s])

  const sendChat = useCallback(async () => {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    const nextMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: text }]
    setChatMessages(nextMessages)
    setChatInput('')
    setChatLoading(true)
    const result = await fetchAiText('/api/ai/chat', { messages: nextMessages, locale: lang })
    if ('error' in result) {
      const msg = result.error === 'network' ? s.aiNetworkError : result.error || s.aiNoAnswerError
      setChatMessages((prev) => [...prev, { role: 'assistant', content: msg }])
    } else {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: result.text }])
    }
    setChatLoading(false)
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
                <div className="text-sm text-[#1a1a2e]">{renderMarkdown(analyzeText)}</div>
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
                <div className="text-sm text-[#1a1a2e]">{renderMarkdown(whatIfText)}</div>
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
                  className={`rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-[#ede9fc] text-[#3f2b8f] ml-6 whitespace-pre-wrap'
                      : 'bg-[#f4f5f8] text-[#1a1a2e] mr-6'
                  }`}
                >
                  {m.role === 'user' ? m.content : renderMarkdown(m.content)}
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
