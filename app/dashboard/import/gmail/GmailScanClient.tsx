'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { searchSubscriptionTemplates } from '@/lib/subscription-templates'
import { actionButtonClass } from '@/app/dashboard/ui/action-button'
import type { AiDetectedSubscription } from '@/lib/ai/scan-subscriptions'

const CYCLE_LABEL: Record<string, string> = {
  weekly: 'каждую неделю',
  monthly: 'каждый месяц',
  quarterly: 'раз в квартал',
  yearly: 'раз в год',
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high: 'text-[#0d9f6e]',
  medium: 'text-[#b35a00]',
  low: 'text-[#6b6b80]',
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: '● Уверен',
  medium: '◐ Вероятно',
  low: '○ Возможно',
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return d }
}

function guessIcon(merchant: string): string {
  const matches = searchSubscriptionTemplates(merchant.toLowerCase().split(' ')[0])
  return matches[0]?.icon ?? 'payments'
}

function cycleToDays(cycle: string): number {
  const map: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 90, yearly: 365 }
  return map[cycle] ?? 30
}

interface Props {
  gmailEmail: string
  isConnected: boolean
}

export default function GmailScanClient({ gmailEmail, isConnected }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'idle' | 'scanning' | 'review' | 'importing' | 'done'>('idle')
  const [detected, setDetected] = useState<AiDetectedSubscription[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)
  const [emailCount, setEmailCount] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  const handleScan = async () => {
    setError(null)
    setMessage(null)
    setStep('scanning')

    try {
      const res = await fetch('/api/gmail/scan', { method: 'POST' })
      const data = await res.json() as {
        subscriptions?: AiDetectedSubscription[]
        emailCount?: number
        message?: string
        error?: string
      }

      if (!res.ok || data.error) {
        setError(data.error ?? 'Ошибка сканирования')
        setStep('idle')
        return
      }

      setEmailCount(data.emailCount ?? 0)
      const subs = data.subscriptions ?? []

      if (subs.length === 0) {
        setMessage(data.message ?? 'Подписок не найдено.')
        setStep('idle')
        return
      }

      setDetected(subs)
      setSelected(new Set(subs.map((_, i) => i).filter((i) => subs[i].confidence !== 'low')))
      setStep('review')
    } catch {
      setError('Сеть недоступна. Попробуйте ещё раз.')
      setStep('idle')
    }
  }

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const handleImport = async () => {
    const toImport = [...selected].map((i) => detected[i])
    if (toImport.length === 0) return
    setStep('importing')

    try {
      const res = await fetch('/api/import/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptions: toImport.map((s) => ({
            merchant: s.merchant,
            amount: s.amount,
            currency: s.currency,
            billingCycle: s.billingCycle,
            intervalDays: cycleToDays(s.billingCycle),
            confidence: s.confidence,
            transactionCount: s.transactionCount,
            lastDate: new Date(s.lastDate),
            nextEstimated: new Date(s.nextEstimated),
            sampleDescriptions: s.sampleDescriptions,
          })),
        }),
      })
      const data = await res.json() as { imported?: number; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Ошибка импорта')
        setStep('review')
        return
      }
      setImportedCount(data.imported ?? toImport.length)
      setStep('done')
    } catch {
      setError('Сеть недоступна.')
      setStep('review')
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Отключить Gmail? Токены доступа будут удалены.')) return
    setDisconnecting(true)
    try {
      await fetch('/api/gmail/connection', { method: 'DELETE' })
      router.refresh()
    } finally {
      setDisconnecting(false)
    }
  }

  // ─── Done ───
  if (step === 'done') {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">Готово!</h2>
        <p className="text-[#6b6b80] mb-8">Добавлено подписок: <strong>{importedCount}</strong></p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className={`${actionButtonClass('primary')} px-8 py-3`}
        >
          Перейти к обзору →
        </button>
      </div>
    )
  }

  // ─── Review / Importing ───
  if (step === 'review' || step === 'importing') {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-[#6b6b80]">
            Gmail: <strong className="text-[#1a1a2e]">{gmailEmail}</strong>
            {emailCount > 0 && <> · писем проверено: <strong>{emailCount}</strong></>}
            {' '}· подписок найдено: <strong>{detected.length}</strong>
          </p>
          <button
            type="button"
            onClick={() => { setStep('idle'); setDetected([]); setError(null) }}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-white px-3.5 text-[13px] font-semibold text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.08)] hover:bg-[#f8f6f2] transition-colors"
          >
            <span aria-hidden>←</span> Назад
          </button>
        </div>

        <p className="text-xs text-[#8e8e93] mb-4">Выбери подписки которые хочешь добавить.</p>

        {error && (
          <p className="mb-4 rounded-xl border border-[#f3c5c7] bg-[#fdecec] text-[#e5484d] text-sm px-4 py-3">{error}</p>
        )}

        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => setSelected(new Set(detected.map((_, i) => i)))} className="text-xs text-[#5b43d4] hover:text-[#4b36b6]">Выбрать все</button>
          <span className="text-[#b0a9a0]">·</span>
          <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-[#6b6b80] hover:text-[#1a1a2e]">Снять выбор</button>
        </div>

        <div className="space-y-2 mb-6">
          {detected.map((sub, i) => {
            const isSelected = selected.has(i)
            return (
              <div
                key={i}
                onClick={() => toggle(i)}
                className={`rounded-2xl border bg-white flex items-stretch cursor-pointer transition-all ${
                  isSelected ? 'border-[#7b61ff]/60 ring-2 ring-[#7b61ff]/30' : 'border-[#e7e3dc]'
                } shadow-[0_1px_3px_rgba(26,26,61,0.06)]`}
              >
                <div className={`shrink-0 w-12 flex items-center justify-center border-r border-[#f0ece6] rounded-l-2xl ${isSelected ? 'bg-[#ede9fc]' : 'hover:bg-[#f8f6f2]'}`}>
                  <span className={`h-5 w-5 rounded border flex items-center justify-center text-xs ${isSelected ? 'bg-[#5b43d4] border-[#5b43d4] text-white' : 'border-[#cfc8bf] bg-white'}`}>
                    {isSelected ? '✓' : ''}
                  </span>
                </div>
                <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{guessIcon(sub.merchant)}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-[#1a1a2e] truncate">{sub.merchant}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-[#6b6b80]">{CYCLE_LABEL[sub.billingCycle]}</span>
                        <span className="text-xs text-[#b0a9a0]">·</span>
                        <span className={`text-xs ${CONFIDENCE_COLOR[sub.confidence]}`}>{CONFIDENCE_LABEL[sub.confidence]}</span>
                      </div>
                      {sub.nextEstimated && (
                        <p className="text-xs text-[#8e8e93] mt-0.5">Следующий ~{formatDate(sub.nextEstimated)}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {sub.amount > 0 ? (
                      <p className="font-semibold text-sm text-[#1a1a2e]">{sub.amount.toLocaleString('ru-RU')} {sub.currency}</p>
                    ) : (
                      <p className="text-xs text-[#8e8e93]">сумма неизвестна</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => void handleImport()}
          disabled={selected.size === 0 || step === 'importing'}
          className={`w-full ${actionButtonClass('primary')} py-3.5 disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {step === 'importing'
            ? 'Импортирую…'
            : `Добавить ${selected.size} подписк${selected.size === 1 ? 'у' : selected.size < 5 ? 'и' : 'ок'}`}
        </button>
      </div>
    )
  }

  // ─── Scanning ───
  if (step === 'scanning') {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ede9fc] mb-6">
          <svg className="w-8 h-8 text-[#5b43d4] animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28 56" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">AI сканирует почту…</h2>
        <p className="text-sm text-[#6b6b80]">Ищем письма о подписках за последние 3 месяца</p>
      </div>
    )
  }

  // ─── Idle (подключён) ───
  if (isConnected) {
    return (
      <div>
        {/* Статус подключения */}
        <div className="rounded-2xl border border-[#bfe7d1] bg-[#e8faf0] p-4 flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-[#0d9f6e]/10 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9f6e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0d9f6e]">Gmail подключён</p>
            <p className="text-xs text-[#6b6b80] truncate">{gmailEmail}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleDisconnect()}
            disabled={disconnecting}
            className="ml-auto text-xs text-[#6b6b80] hover:text-[#e5484d] transition-colors disabled:opacity-50"
          >
            Отключить
          </button>
        </div>

        {message && (
          <p className="mb-4 rounded-xl border border-[#e7e3dc] bg-[#f8f6f2] text-[#6b6b80] text-sm px-4 py-3">{message}</p>
        )}

        {error && (
          <p className="mb-4 rounded-xl border border-[#f3c5c7] bg-[#fdecec] text-[#e5484d] text-sm px-4 py-3">{error}</p>
        )}

        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-6 mb-6">
          <h3 className="font-semibold text-[#1a1a2e] mb-1">Как это работает</h3>
          <ul className="text-sm text-[#6b6b80] space-y-1.5 mt-3">
            <li>— Читаем письма с чеками, счетами и уведомлениями о платежах</li>
            <li>— AI анализирует содержимое и определяет регулярные платежи</li>
            <li>— Ты выбираешь что добавить — мы ничего не меняем без подтверждения</li>
            <li>— Содержимое писем не сохраняется на наших серверах</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={() => void handleScan()}
          className={`w-full ${actionButtonClass('primary')} py-3.5`}
        >
          Начать сканирование →
        </button>
      </div>
    )
  }

  return null
}
