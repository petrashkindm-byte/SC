'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  parseBankStatement,
  detectSubscriptions,
  detectBankFormat,
  type DetectedSubscription,
} from '@/lib/parse-bank-statement'
import { searchCatalog } from '@/lib/service-catalog'
import { actionButtonClass } from '@/app/dashboard/ui/action-button'

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

function formatDate(d: Date) {
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function guessIcon(merchant: string): string {
  const m = merchant.toLowerCase()
  const matches = searchCatalog(m.split(' ')[0])
  return matches[0]?.icon ?? 'payments'
}

export default function BankImportClient() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'review' | 'importing' | 'done'>('upload')
  const [detected, setDetected] = useState<DetectedSubscription[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bankName, setBankName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  const processFile = useCallback((file: File) => {
    setError(null)
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Нужен CSV-файл из интернет-банка')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text) { setError('Не удалось прочитать файл'); return }

      const format = detectBankFormat(text)
      setBankName(format === 'tinkoff' ? 'Тинькофф' : format === 'sberbank' ? 'Сбербанк' : 'Банк')

      const txns = parseBankStatement(text, format)
      if (txns.length === 0) {
        setError('Не нашли транзакций. Убедитесь что это выписка с расходами из Тинькофф или Сбера.')
        return
      }

      const subs = detectSubscriptions(txns)
      if (subs.length === 0) {
        setError(`Разобрали ${txns.length} транзакций, но регулярных списаний не нашли. Попробуйте выписку за более длинный период (от 3 месяцев).`)
        return
      }

      setDetected(subs)
      // Выбираем все с high и medium уверенностью
      setSelected(new Set(subs.map((_, i) => i).filter((i) => subs[i].confidence !== 'low')))
      setStep('review')
    }
    reader.onerror = () => setError('Ошибка чтения файла')
    reader.readAsText(file, 'utf-8')
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
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
        body: JSON.stringify({ subscriptions: toImport }),
      })
      const data = await res.json()
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

  // ─── Review ───
  if (step === 'review' || step === 'importing') {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm text-[#6b6b80]">
              Выписка: <strong className="text-[#1a1a2e]">{bankName}</strong> · найдено регулярных списаний: <strong>{detected.length}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setStep('upload'); setDetected([]); setError(null) }}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-white px-3.5 text-[13px] font-semibold text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.08)] hover:bg-[#f8f6f2] transition-colors"
          >
            <span aria-hidden>←</span> Загрузить другой файл
          </button>
        </div>

        <p className="text-xs text-[#8e8e93] mb-4">
          Выбери подписки которые хочешь добавить — отмеченные будут импортированы.
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
                {/* Чекбокс */}
                <div className={`shrink-0 w-12 flex items-center justify-center border-r border-[#f0ece6] rounded-l-2xl ${isSelected ? 'bg-[#ede9fc]' : 'hover:bg-[#f8f6f2]'}`}>
                  <span className={`h-5 w-5 rounded border flex items-center justify-center text-xs ${isSelected ? 'bg-[#5b43d4] border-[#5b43d4] text-white' : 'border-[#cfc8bf] bg-white'}`}>
                    {isSelected ? '✓' : ''}
                  </span>
                </div>

                {/* Контент */}
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
                        <span className="text-xs text-[#b0a9a0]">·</span>
                        <span className="text-xs text-[#8e8e93]">{sub.transactionCount} платежа</span>
                      </div>
                      <p className="text-xs text-[#8e8e93] mt-0.5">
                        Следующий ~{formatDate(sub.nextEstimated)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm text-[#1a1a2e]">
                      {sub.amount.toLocaleString('ru-RU')} {sub.currency}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={handleImport}
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
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        <div className="w-12 h-12 rounded-xl bg-[#f0ece6] flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b6b80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
        </div>
        <p className="text-[#1a1a2e] font-semibold mb-1">Перетащи CSV-выписку или нажми</p>
        <p className="text-sm text-[#6b6b80]">Формат CSV из интернет-банка</p>
      </div>

      {error && (
        <p className="mb-6 rounded-xl border border-[#f3c5c7] bg-[#fdecec] text-[#e5484d] text-sm px-4 py-3">{error}</p>
      )}

      <div className="rounded-2xl border border-[#e7e3dc] bg-white p-5">
        <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">Как получить выписку в CSV</h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-[#6b6b80]">
          <div>
            <p className="font-medium text-[#1a1a2e] mb-1">Мобильное приложение</p>
            <ol className="list-decimal pl-4 space-y-1 text-xs">
              <li>Открой историю операций по карте</li>
              <li>Найди «Выгрузить» или «Экспорт» → CSV</li>
              <li>Выбери период от 3+ месяцев</li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-[#1a1a2e] mb-1">Интернет-банк</p>
            <ol className="list-decimal pl-4 space-y-1 text-xs">
              <li>Открой раздел «Выписка» по счёту</li>
              <li>Скачай в формате CSV</li>
              <li>Период: минимум 3 месяца</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
