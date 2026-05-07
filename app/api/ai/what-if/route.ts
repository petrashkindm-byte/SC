import { subscriptionToAiPayload } from '@/lib/ai/map-subscription'
import { requireUserSubscriptions } from '@/lib/ai/require-user-subs'
import type { AiLocale } from '@/lib/ai/types'
import { analyzeWhatIfStream, isOpenRouterConfigured } from '@/lib/openrouter'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  if (!isOpenRouterConfigured()) {
    return NextResponse.json(
      { error: 'AI не настроен: добавьте OPENROUTER_API_KEY на сервер.' },
      { status: 503 },
    )
  }

  const auth = await requireUserSubscriptions()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Нужна авторизация' }, { status: 401 })
  }

  if (auth.subs.length === 0) {
    return NextResponse.json({ error: 'Нет активных подписок' }, { status: 400 })
  }

  let body: { budgetLimit?: number; currency?: string; locale?: AiLocale; subscriptionIds?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
  }

  const budgetLimit = typeof body.budgetLimit === 'number' && body.budgetLimit > 0
    ? body.budgetLimit
    : null
  if (budgetLimit === null) {
    return NextResponse.json({ error: 'Укажите лимит бюджета' }, { status: 400 })
  }

  const filteredSubs = Array.isArray(body.subscriptionIds) && body.subscriptionIds.length > 0
    ? auth.subs.filter((s) => (body.subscriptionIds as string[]).includes(s.id))
    : auth.subs
  if (filteredSubs.length === 0) {
    return NextResponse.json({ error: 'Нет подписок для анализа' }, { status: 400 })
  }

  const currency = typeof body.currency === 'string' && body.currency.length === 3
    ? body.currency
    : filteredSubs[0]?.currency ?? 'USD'

  const locale = body.locale === 'en' ? 'en' : 'ru'
  const forAi = filteredSubs.map(subscriptionToAiPayload)

  try {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of analyzeWhatIfStream(forAi, budgetLimit, currency, locale)) {
            controller.enqueue(encoder.encode(chunk))
          }
          controller.close()
        } catch (e) {
          controller.error(e)
        }
      },
    })
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Неизвестная ошибка при обращении к модели'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
