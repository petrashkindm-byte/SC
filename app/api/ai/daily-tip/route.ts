import { requireUserAndSubscriptionsByIds } from '@/lib/ai/require-user-subs'
import type { AiLocale } from '@/lib/ai/types'
import { analyzeDailyTip, isOpenRouterConfigured } from '@/lib/openrouter'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  if (!isOpenRouterConfigured()) {
    return NextResponse.json(
      { error: 'AI не настроен: добавьте OPENROUTER_API_KEY на сервер (не в NEXT_PUBLIC).' },
      { status: 503 },
    )
  }

  let body: { subscriptionIds?: string[]; locale?: AiLocale; avoidSummary?: string }
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

  const locale = body.locale === 'en' ? 'en' : 'ru'
  const avoid =
    typeof body.avoidSummary === 'string' && body.avoidSummary.trim().length > 0
      ? body.avoidSummary.trim().slice(0, 500)
      : undefined

  try {
    const tip = await analyzeDailyTip(auth.subs, locale, { avoidSummary: avoid })
    return NextResponse.json(tip)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ошибка модели'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
