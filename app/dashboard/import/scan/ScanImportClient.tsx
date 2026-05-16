'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { searchCatalog } from '@/lib/service-catalog'
import { actionButtonClass } from '@/app/dashboard/ui/action-button'
import type { AiDetectedSubscription } from '@/lib/ai/scan-subscriptions'

const CYCLE_LABEL: Record<string, string> = {
  weekly: 'каждую неделю',
  monthly: 'каждый месяц',
  quarterly: 'раз в квартал',
  yearly: 'раз в год',
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: '● Уверен',
  medium: '◐ Вероятно',
  low: '○ Возможно',
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high: 'text-[#0d9f6e]',
  medium: 'text-[#b35a00]',
  low: 'text-[#6b6b80]',
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

function guessIcon(merchant: string): string {
  const m = merchant.toLowerCase()
  const matches = searchCatalog(m.split(' ')[0])
  return matches[0]?.icon ?? 'payments'
}

export default function ScanImportClient() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'importing' | 'done'>('upload')
  const [detected, setDetected] = useState<AiDetectedSubscription[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [txCount, setTxCount] = useState(0)

  const processFile = useCallback(async (file: File) => {
    setError(null)
    setFileName(file.name)

    const ext = file.name.toLowerCase()
    if (!ext.endsWith('.pdf') && !ext.endsWith('.csv') && !ext.endsWith('.txt')) {
      setError('Поддерживаются форматы: PDF, CSV, TXT')
      return
    }

    setStep('processing')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/scan/file', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json() as {
        subscriptions?: AiDetectedSubscription[]
        transactionCount?: number
        error?: string
      }

      if (!res.ok || data.error) {
        setError(data.error ?? 'Ошибка анализа файла')
        setStep('upload')
        return
      }

      const subs = data.subscriptions ?? []
      setTxCount(data.transactionCount ?? 0)

      if (subs.length === 0) {
        setError('Подписок не найдено. Попробуйте выписку за более длинный период (от 3 месяцев).')
        setStep('upload')
        return
      }

      setDetected(subs)
      setSelected(new Set(subs.map((_, i) => i).filter((i) => subs[i].confidence !== 'low')))
      setStep('review')
    } catch {
      setError('Сеть недоступна. Попробуйте ещё раз.')
      setStep('upload')
    }
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void processFile(file)
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
      setError('Сеть недоступна. Попробуйте ещё раз.')
      setStep('review')
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

  // ─── Processing ───
  if (step === 'processing') {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ede9fc] mb-6">
          <svg className="w-8 h-8 text-[#5b43d4] animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28 56" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">AI анализирует файл…</h2>
        <p className="text-sm text-[#6b6b80]">{fileName} · это займёт несколько секунд</p>
      </div>
    )
  }

  // ─── Review ───
  if (step === 'review' || step === 'importing') {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-[#6b6b80]">
            Файл: <strong className="text-[#1a1a2e]">{fileName}</strong>
            {txCount > 0 && <> · транзакций: <strong>{txCount}</strong></>}
            {' '}· найдено подписок: <strong>{detected.length}</strong>
          </p>
          <button
            type="button"
            onClick={() => { setStep('upload'); setDetected([]); setError(null) }}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-white px-3.5 text-[13px] font-semibold text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.08)] hover:bg-[#f8f6f2] transition-colors"
          >
            <span aria-hidden>←</span> Другой файл
          </button>
        </div>

        <p className="text-xs text-[#8e8e93] mb-4">
          Выбери подписки которые хочешь добавить.
        </p>

        {error && (
          <p className="mb-4 rounded-xl border border-[#f3c5c7] bg-[#fdecec] text-[#e5484d] text-sm px-4 py-3">{error}</p>
        )}

        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => setSelected(new Set(detected.map((_, i) => i)))} className="text-xs text-[#5b43d4] hover:text-[#4b36b6]">
            Выбрать все
          </button>
          <span className="text-[#b0a9a0]">·</span>
          <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-[#6b6b80] hover:text-[#1a1a2e]">
            Снять выбор
          </button>
        </div>

        <div className="space-y-2 mb-6">
          {detected.map((sub, i) => {
            const isSelected = selected.has(i)
            return (
              <div
                key={i}
                onClick={() => toggle(i)}
                className={`rounded-2xl border bg-white flex items-stretch gap-0 cursor-pointer transition-all ${
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
                        <span className={`text-xs ${CONFIDENCE_COLOR[sub.confidence]}`}>
                          {CONFIDENCE_LABEL[sub.confidence]}
                        </span>
                        {sub.transactionCount > 1 && (
                          <>
                            <span className="text-xs text-[#b0a9a0]">·</span>
                            <span className="text-xs text-[#8e8e93]">{sub.transactionCount} раза</span>
                          </>
                        )}
                      </div>
                      {sub.nextEstimated && (
                        <p className="text-xs text-[#8e8e93] mt-0.5">
                          Следующий ~{formatDate(sub.nextEstimated)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {sub.amount > 0 ? (
                      <p className="font-semibold text-sm text-[#1a1a2e]">
                        {sub.amount.toLocaleString('ru-RU')} {sub.currency}
                      </p>
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

  // ─── Upload ───
  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center py-16 px-8 text-center mb-6 ${
          dragOver ? 'border-[#5b43d4] bg-[#ede9fc]/30' : 'border-[#d8d2cb] bg-white hover:border-[#5b43d4] hover:bg-[#f8f6f2]'
        }`}
      >
        <input ref={inputRef} type="file" accept=".pdf,.csv,.txt" className="hidden" onChange={handleFile} />
        <div className="w-12 h-12 rounded-xl bg-[#ede9fc] flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b43d4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="15" y2="17" />
          </svg>
        </div>
        <p className="text-[#1a1a2e] font-semibold mb-1">Перетащи выписку или нажми</p>
        <p className="text-sm text-[#6b6b80]">PDF или CSV · AI найдёт подписки автоматически</p>
      </div>

      {error && (
        <p className="mb-6 rounded-xl border border-[#f3c5c7] bg-[#fdecec] text-[#e5484d] text-sm px-4 py-3">{error}</p>
      )}

      <div className="rounded-2xl border border-[#e7e3dc] bg-white p-5">
        <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">Как получить выписку</h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-[#6b6b80]">
          <div>
            <p className="font-medium text-[#1a1a2e] mb-1">CSV из интернет-банка</p>
            <ol className="list-decimal pl-4 space-y-1 text-xs">
              <li>Открой историю операций по карте</li>
              <li>Найди «Экспорт» или «Выгрузить» → CSV</li>
              <li>Период: от 3 месяцев</li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-[#1a1a2e] mb-1">PDF-выписка</p>
            <ol className="list-decimal pl-4 space-y-1 text-xs">
              <li>Скачай выписку в PDF из любого банка</li>
              <li>AI распознает формат автоматически</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

function cycleToDays(cycle: string): number {
  const map: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 90, yearly: 365 }
  return map[cycle] ?? 30
}
