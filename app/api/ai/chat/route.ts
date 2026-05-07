import { subscriptionToAiPayload } from '@/lib/ai/map-subscription'
import { requireUserSubscriptions } from '@/lib/ai/require-user-subs'
import type { AiLocale } from '@/lib/ai/types'
import { chatWithAIStream, isOpenRouterConfigured } from '@/lib/openrouter'
import { NextResponse } from 'next/server'

const MAX_MESSAGES = 24

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function sanitizeMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: ChatMessage[] = []
  for (const item of raw.slice(-MAX_MESSAGES)) {
    if (!item || typeof item !== 'object') continue
    const role = (item as { role?: string }).role
    const content = (item as { content?: string }).content
    if (role !== 'user' && role !== 'assistant') continue
    if (typeof content !== 'string' || !content.trim()) continue
    out.push({ role, content: content.slice(0, 8000) })
  }
  if (out.length === 0) return null
  if (out[out.length - 1].role !== 'user') return null
  return out
}

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

  let body: { messages?: unknown; locale?: AiLocale }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
  }

  const messages = sanitizeMessages(body.messages)
  if (!messages) {
    return NextResponse.json({ error: 'Некорректная история чата' }, { status: 400 })
  }

  const locale = body.locale === 'en' ? 'en' : 'ru'
  const forAi = auth.subs.map(subscriptionToAiPayload)

  try {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of chatWithAIStream(messages, forAi, locale)) {
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
