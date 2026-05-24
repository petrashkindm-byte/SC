import { subscriptionToAiPayload } from '@/lib/ai/map-subscription'
import { requireUserAndSubscriptionsByIds } from '@/lib/ai/require-user-subs'
import type { AiLocale } from '@/lib/ai/types'
import { analyzeSubscriptionsStream, isOpenRouterConfigured } from '@/lib/openrouter'
import { checkAiLimit } from '@/lib/ratelimit'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  if (!isOpenRouterConfigured()) {
    return NextResponse.json(
      { error: 'AI не настроен: добавьте OPENROUTER_API_KEY на сервер (не в NEXT_PUBLIC).' },
      { status: 503 },
    )
  }

  let body: { subscriptionIds?: string[]; locale?: AiLocale }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
  }

  const ids = body.subscriptionIds?.filter(Boolean) ?? []
  if (ids.length === 0) {
    return NextResponse.json({ error: 'Выберите хотя бы одну подписку' }, { status: 400 })
  }

  const auth = await requireUserAndSubscriptionsByIds(ids)
  if (!auth.ok) {
    const status = auth.status === 401 ? 401 : 400
    return NextResponse.json(
      { error: auth.status === 401 ? 'Нужна авторизация' : 'Неверный выбор подписок' },
      { status },
    )
  }

  const { limited, retryAfter } = await checkAiLimit(auth.userId)
  if (limited) {
    return NextResponse.json(
      { error: 'Too many requests — please wait before sending another request.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  const byId = new Map(auth.subs.map((s) => [s.id, s]))
  const selected = ids.map((id) => byId.get(id)).filter(Boolean) as typeof auth.subs
  const forAi = selected.map(subscriptionToAiPayload)
  const locale = body.locale === 'en' ? 'en' : 'ru'

  try {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of analyzeSubscriptionsStream(forAi, locale)) {
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
