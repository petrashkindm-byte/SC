import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import ImportCsvForm from './ImportCsvForm'

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{
    imported?: string
    skipped?: string
    hints?: string
    error?: string
    mode?: string
  }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const mode = sp.mode ?? 'choose'

  const ERR: Record<string, string> = {
    no_file: 'Выберите CSV-файл.',
    empty: 'В файле нет данных или неверный формат.',
  }

  const imported = Number(sp.imported ?? '0') || 0
  const skipped = Number(sp.skipped ?? '0') || 0
  const hints = sp.hints ? sp.hints.split('|').filter(Boolean) : []

  return (
    <main className="px-6 py-6 max-w-[860px]">
      <Link href="/dashboard" className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white px-4 text-[14px] font-semibold text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.08)] no-underline hover:bg-[#f8f6f2] mb-6 transition-colors">
        <span aria-hidden>←</span> К обзору
      </Link>
      <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e] mb-2">Импорт</h1>
      <p className="text-[#6b6b80] text-sm mb-8">Выбери способ добавления подписок</p>

      {/* Карточки выбора способа */}
      {mode === 'choose' && (
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Link
            href="/dashboard/import/bank"
            className="rounded-2xl border border-[#e7e3dc] bg-white p-6 hover:border-[#5b43d4] hover:shadow-[0_4px_20px_rgba(91,67,212,0.12)] transition-all group shadow-[0_1px_3px_rgba(26,26,61,0.06)]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#f0ece6] flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b6b80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </div>
            <h2 className="font-bold text-[#1a1a2e] mb-1 group-hover:text-[#5b43d4]">Из банковской выписки</h2>
            <p className="text-sm text-[#6b6b80]">
              Загрузи CSV-выписку из своего банка — сами найдём повторяющиеся списания
            </p>
            <p className="mt-3 text-xs font-medium text-[#5b43d4]">Загрузить CSV →</p>
          </Link>

          <Link
            href="/dashboard/import/scan"
            className="rounded-2xl border border-[#e7e3dc] bg-white p-6 hover:border-[#5b43d4] hover:shadow-[0_4px_20px_rgba(91,67,212,0.12)] transition-all group shadow-[0_1px_3px_rgba(26,26,61,0.06)]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#ede9fc] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5b43d4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" y1="13" x2="15" y2="13" />
                  <line x1="9" y1="17" x2="15" y2="17" />
                </svg>
              </div>
              <span className="inline-flex items-center rounded-full bg-[#ede9fc] px-2 py-0.5 text-[10px] font-semibold text-[#5b43d4]">AI</span>
            </div>
            <h2 className="font-bold text-[#1a1a2e] mb-1 group-hover:text-[#5b43d4]">AI-сканирование выписки</h2>
            <p className="text-sm text-[#6b6b80]">
              Загрузи PDF или CSV из любого банка — AI распознает подписки автоматически
            </p>
            <p className="mt-3 text-xs font-medium text-[#5b43d4]">Загрузить PDF / CSV →</p>
          </Link>

          <Link
            href="/dashboard/import/gmail"
            className="rounded-2xl border border-[#e7e3dc] bg-white p-6 hover:border-[#5b43d4] hover:shadow-[0_4px_20px_rgba(91,67,212,0.12)] transition-all group shadow-[0_1px_3px_rgba(26,26,61,0.06)]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#ede9fc] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5b43d4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <span className="inline-flex items-center rounded-full bg-[#ede9fc] px-2 py-0.5 text-[10px] font-semibold text-[#5b43d4]">AI</span>
            </div>
            <h2 className="font-bold text-[#1a1a2e] mb-1 group-hover:text-[#5b43d4]">Сканировать Gmail</h2>
            <p className="text-sm text-[#6b6b80]">
              Подключи почту — AI найдёт письма о платежах и распознает подписки автоматически
            </p>
            <p className="mt-3 text-xs font-medium text-[#5b43d4]">Подключить →</p>
          </Link>

          <Link
            href="/dashboard/import?mode=csv"
            className="rounded-2xl border border-[#e7e3dc] bg-white p-6 hover:border-[#5b43d4] hover:shadow-[0_4px_20px_rgba(91,67,212,0.12)] transition-all group shadow-[0_1px_3px_rgba(26,26,61,0.06)]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#f0ece6] flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b6b80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
            </div>
            <h2 className="font-bold text-[#1a1a2e] mb-1 group-hover:text-[#5b43d4]">CSV с подписками</h2>
            <p className="text-sm text-[#6b6b80]">
              Загрузи таблицу в нашем формате — подходит для переноса данных из другого сервиса
            </p>
            <p className="mt-3 text-xs text-[#8e8e93]">Для продвинутых →</p>
          </Link>
        </div>
      )}

      {/* Режим CSV-таблицы */}
      {mode === 'csv' && (
        <>
          <Link href="/dashboard/import" className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white px-4 text-[14px] font-semibold text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.08)] no-underline hover:bg-[#f8f6f2] mb-6 transition-colors">
            <span aria-hidden>←</span> К выбору способа
          </Link>

          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-1">CSV с подписками</h2>
          <p className="text-[#6b6b80] text-sm mb-4">
            Минимум: <code className="text-[#5b43d4] text-xs">name</code>,{' '}
            <code className="text-[#5b43d4] text-xs">amount</code>,{' '}
            <code className="text-[#5b43d4] text-xs">first_charge_date</code>,{' '}
            <code className="text-[#5b43d4] text-xs">next_charge_date</code>. Даты — <code className="text-[#5b43d4] text-xs">YYYY-MM-DD</code>.
          </p>

          {sp.error && ERR[sp.error] && (
            <p className="mb-4 rounded-xl border border-[#f3c5c7] bg-[#fdecec] text-[#e5484d] text-sm px-4 py-3">
              {ERR[sp.error]}
            </p>
          )}

          {(imported > 0 || skipped > 0) && (
            <div className="mb-6 rounded-xl border border-[#bfe7d1] bg-[#e8faf0] px-4 py-3 text-sm">
              <p className="text-[#0d9f6e]">
                Импортировано: <strong>{imported}</strong>
                {skipped > 0 && <> · пропущено: <strong>{skipped}</strong></>}
              </p>
              {hints.length > 0 && (
                <ul className="mt-2 text-xs text-[#b35a00] list-disc pl-4 space-y-1">
                  {hints.map((h) => <li key={h}>{h}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="mb-4">
            <a
              href="/sample-import.csv"
              download
              className="inline-flex items-center gap-2 text-sm text-[#5b43d4] hover:text-[#4b36b6]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Скачать пример файла
            </a>
          </div>

          <ImportCsvForm />
        </>
      )}
    </main>
  )
}
