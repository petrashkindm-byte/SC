import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import GmailScanClient from './GmailScanClient'

export default async function GmailImportPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const sp = await searchParams

  // Проверяем есть ли подключение
  const { data: conn } = await supabase
    .from('gmail_connections')
    .select('email')
    .eq('user_id', user.id)
    .single()

  const isConnected = !!conn
  const gmailEmail = (conn?.email as string | null) ?? ''

  const ERROR_LABELS: Record<string, string> = {
    access_denied: 'Вы отменили доступ к Gmail.',
    token_exchange: 'Ошибка при подключении. Попробуйте ещё раз.',
    token_error: 'Не удалось получить токен. Попробуйте ещё раз.',
    db_error: 'Ошибка сохранения. Попробуйте ещё раз.',
  }

  const errorMsg = sp.error ? ERROR_LABELS[sp.error] ?? 'Произошла ошибка.' : null

  return (
    <main className="px-6 py-6 max-w-[860px]">
      <Link
        href="/dashboard/import"
        className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white px-4 text-[14px] font-semibold text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.08)] no-underline hover:bg-[#f8f6f2] mb-6 transition-colors"
      >
        <span aria-hidden>←</span> К выбору способа
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e]">
          Сканировать Gmail
        </h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#ede9fc] px-2.5 py-1 text-[11px] font-semibold text-[#5b43d4]">
          ✨ AI
        </span>
      </div>
      <p className="text-[#6b6b80] text-sm mb-8">
        Подключи Gmail — AI найдёт письма о подписках и автоматически их распознает
      </p>

      {errorMsg && (
        <p className="mb-6 rounded-xl border border-[#f3c5c7] bg-[#fdecec] text-[#e5484d] text-sm px-4 py-3">
          {errorMsg}
        </p>
      )}

      {sp.connected === '1' && !errorMsg && (
        <p className="mb-6 rounded-xl border border-[#bfe7d1] bg-[#e8faf0] text-[#0d9f6e] text-sm px-4 py-3 font-medium">
          Gmail успешно подключён! Нажми «Начать сканирование».
        </p>
      )}

      {isConnected ? (
        <GmailScanClient gmailEmail={gmailEmail} isConnected={isConnected} />
      ) : (
        /* Не подключён — показываем CTA */
        <div>
          <div className="rounded-2xl border border-[#e7e3dc] bg-white p-8 mb-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#fef3e2] flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16v12H4V6zm0 0l8 6 8-6" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="font-bold text-[#1a1a2e] text-lg mb-2">Gmail не подключён</h2>
            <p className="text-sm text-[#6b6b80] mb-6 max-w-sm mx-auto">
              Разреши доступ к почте — мы читаем только письма о платежах, не храним содержимое
            </p>
            <a
              href="/api/gmail/auth"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-[#1a1a2e] text-white font-semibold text-sm hover:bg-[#2d2d50] transition-colors no-underline"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Подключить Gmail
            </a>
          </div>

          <div className="rounded-2xl border border-[#e7e3dc] bg-white p-5">
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">Что мы читаем и как защищаем данные</h3>
            <ul className="text-sm text-[#6b6b80] space-y-2">
              <li>— Только письма с чеками, счетами и уведомлениями о платежах</li>
              <li>— Личная переписка не читается, тексты писем не сохраняются</li>
              <li>— Токен доступа хранится в зашифрованной базе данных</li>
              <li>— Можно отключить в любой момент — токен удаляется сразу</li>
            </ul>
          </div>
        </div>
      )}
    </main>
  )
}
