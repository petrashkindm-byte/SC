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
      <Link href="/dashboard" className="text-sm text-[#6b6b80] hover:text-[#1a1a2e] mb-6 inline-block">
        ← К обзору
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
            <div className="text-3xl mb-3">🏦</div>
            <h2 className="font-bold text-[#1a1a2e] mb-1 group-hover:text-[#5b43d4]">Из банковской выписки</h2>
            <p className="text-sm text-[#6b6b80]">
              Загрузи CSV из Тинькофф или Сбера — мы сами найдём повторяющиеся списания
            </p>
            <p className="mt-3 text-xs font-medium text-[#5b43d4]">Рекомендуем →</p>
          </Link>

          <Link
            href="/dashboard/import?mode=csv"
            className="rounded-2xl border border-[#e7e3dc] bg-white p-6 hover:border-[#5b43d4] hover:shadow-[0_4px_20px_rgba(91,67,212,0.12)] transition-all group shadow-[0_1px_3px_rgba(26,26,61,0.06)]"
          >
            <div className="text-3xl mb-3">📄</div>
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
          <Link href="/dashboard/import" className="text-sm text-[#6b6b80] hover:text-[#1a1a2e] mb-6 inline-block">
            ← Назад к выбору способа
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
