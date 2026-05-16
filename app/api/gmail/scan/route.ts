import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { refreshIfNeeded, listMessageIds, fetchEmails, type GmailTokens } from '@/lib/gmail/fetch-emails'
import { filterSubscriptionEmails, analyzeEmailsForSubscriptions } from '@/lib/gmail/analyze-emails'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  // Загружаем токены из БД
  const { data: conn, error: connError } = await supabase
    .from('gmail_connections')
    .select('access_token, refresh_token, expires_at, email')
    .eq('user_id', user.id)
    .single()

  if (connError || !conn) {
    return NextResponse.json({ error: 'Gmail не подключён' }, { status: 400 })
  }

  let tokens: GmailTokens = {
    accessToken: conn.access_token as string,
    refreshToken: conn.refresh_token as string | null,
    expiresAt: new Date(conn.expires_at as string),
  }

  // Обновляем токен если нужно
  try {
    tokens = await refreshIfNeeded(tokens)
    // Сохраняем обновлённый токен
    if (tokens.accessToken !== conn.access_token) {
      await supabase
        .from('gmail_connections')
        .update({
          access_token: tokens.accessToken,
          expires_at: tokens.expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка обновления токена'
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  // Дата 3 месяца назад для запроса Gmail
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const afterDate = `${threeMonthsAgo.getFullYear()}/${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}/${String(threeMonthsAgo.getDate()).padStart(2, '0')}`

  // Запрос к Gmail API
  const query = `after:${afterDate} (subject:чек OR subject:квитанция OR subject:счёт OR subject:оплата OR subject:списание OR subject:receipt OR subject:invoice OR subject:billing OR subject:subscription OR subject:renewal OR subject:payment)`

  let messageIds: string[]
  try {
    messageIds = await listMessageIds(tokens.accessToken, query, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка доступа к Gmail'
    console.error('[gmail/scan] listMessages error:', err)
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  if (messageIds.length === 0) {
    return NextResponse.json({
      subscriptions: [],
      emailCount: 0,
      message: 'Писем о подписках за последние 3 месяца не найдено',
    })
  }

  // Загружаем письма
  let emails
  try {
    emails = await fetchEmails(tokens.accessToken, messageIds.slice(0, 100))
  } catch (err) {
    console.error('[gmail/scan] fetchEmails error:', err)
    return NextResponse.json({ error: 'Ошибка загрузки писем' }, { status: 502 })
  }

  // Фильтруем по паттернам
  const filtered = filterSubscriptionEmails(emails)

  if (filtered.length === 0) {
    return NextResponse.json({
      subscriptions: [],
      emailCount: emails.length,
      message: 'Не нашли писем о подписках. Попробуйте загрузить выписку из банка.',
    })
  }

  // AI-анализ
  let subscriptions
  try {
    subscriptions = await analyzeEmailsForSubscriptions(filtered)
  } catch (err) {
    console.error('[gmail/scan] AI error:', err)
    return NextResponse.json({ error: 'AI-анализ недоступен. Попробуйте позже.' }, { status: 503 })
  }

  return NextResponse.json({
    subscriptions,
    emailCount: emails.length,
    filteredCount: filtered.length,
  })
}
