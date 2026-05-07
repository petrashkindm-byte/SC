import { monthlyNormalizedAmount } from '@/lib/ai/map-subscription'
import type { AiLocale, SubscriptionForAI } from '@/lib/ai/types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'openai/gpt-4o-mini'

function getKey(): string {
  return process.env.OPENROUTER_API_KEY?.trim() ?? ''
}

export function isOpenRouterConfigured(): boolean {
  return getKey().length > 0
}

function lastUsedLabel(lastUsedAt: string | null | undefined): string {
  if (!lastUsedAt) return 'unknown'
  const days = Math.round((Date.now() - new Date(lastUsedAt).getTime()) / 86400000)
  if (!Number.isFinite(days) || days < 0) return 'unknown'
  return `${days} days ago`
}

/** Блок подписки в промпте: как в мобильном симуляторе + интервал/кастом из БД. */
function formatSubscriptionBlock(
  s: SubscriptionForAI,
  index: number,
  opts: { includeNextCharge: boolean },
): string {
  const periodHint =
    s.billingInterval > 1
      ? ` (every ${s.billingInterval} periods)`
      : s.billingCycle === 'custom' && s.customIntervalDays
        ? ` (every ${s.customIntervalDays} days)`
        : ''
  const lines = [
    `${index + 1}. ${s.name}`,
    `   - Amount: ${s.amount} ${s.currency} per ${s.billingCycle}${periodHint}`,
  ]
  if (opts.includeNextCharge) {
    lines.push(`   - Next charge: in ${s.daysUntilRenewal} days`)
  }
  lines.push(
    `   - Last used: ${lastUsedLabel(s.lastUsedAt)}`,
    `   - Usage state: ${s.usageState ?? 'unknown'}`,
  )
  return `\n${lines.join('\n')}`
}

type MessageContentPart = { type?: string; text?: string; content?: string }

function extractChoiceText(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const root = data as {
    choices?: Array<{ message?: { content?: unknown }; finish_reason?: string }>
    error?: { message?: string }
  }
  if (root.error?.message) {
    throw new Error(root.error.message)
  }
  const raw = root.choices?.[0]?.message?.content
  if (raw == null) return ''
  if (typeof raw === 'string') return raw.trim()
  if (Array.isArray(raw)) {
    return (raw as MessageContentPart[])
      .map((part) => {
        if (part && typeof part.text === 'string') return part.text
        if (part && typeof part.content === 'string') return part.content
        return ''
      })
      .join('')
      .trim()
  }
  return ''
}

function mapOpenRouterHttpError(status: number, body: string): string {
  let detail = ''
  try {
    const j = JSON.parse(body) as { error?: { message?: string } }
    detail = (j.error?.message ?? '').trim()
  } catch {
    /* plain text body */
  }
  const suffix = detail ? `: ${detail}` : ''
  switch (status) {
    case 401:
      return `Ключ OpenRouter отклонён (401)${suffix}`
    case 402:
      return `Нет средств или квоты OpenRouter (402)${suffix}`
    case 403:
      return `Нет доступа к модели (403)${suffix}`
    case 429:
      return `Слишком много запросов (429)${suffix}`
    case 502:
    case 503:
      return `Модель временно недоступна (${status})${suffix}`
    default:
      return `Ошибка OpenRouter (${status})${suffix}`
  }
}

export async function analyzeSubscriptions(
  subscriptions: SubscriptionForAI[],
  locale: AiLocale = 'ru',
): Promise<string> {
  const key = getKey()
  const lang = locale === 'en' ? 'English' : 'Russian'

  const prompt = `You are a personal finance assistant helping a user manage their subscriptions.

The user has selected these subscriptions to review:
${subscriptions.map((s, i) => formatSubscriptionBlock(s, i, { includeNextCharge: true })).join('')}

Analyze EVERY subscription and give a brief, direct, personal recommendation for each one.
For each explain: should they cancel/keep/pause it and exactly why based on their usage data.

Rules:
- Cover ALL subscriptions — do not skip any
- Be direct and specific, not generic
- Reference actual days and amounts from the data
- One line per subscription in format "Name: Verdict. Reason."
- Respond in ${lang}
- No markdown, just plain text with one blank line between subscriptions`

  return completion(key, [
    { role: 'system', content: 'You are a helpful personal finance assistant.' },
    { role: 'user', content: prompt },
  ], 900)
}

export async function* analyzeSubscriptionsStream(
  subscriptions: SubscriptionForAI[],
  locale: AiLocale = 'ru',
): AsyncGenerator<string> {
  const key = getKey()
  const lang = locale === 'en' ? 'English' : 'Russian'
  const prompt = `You are a personal finance assistant helping a user manage their subscriptions.

The user has selected these subscriptions to review:
${subscriptions.map((s, i) => formatSubscriptionBlock(s, i, { includeNextCharge: true })).join('')}

Analyze EVERY subscription and give a brief, direct, personal recommendation for each one.
For each explain: should they cancel/keep/pause it and exactly why based on their usage data.

Rules:
- Cover ALL subscriptions — do not skip any
- Be direct and specific, not generic
- Reference actual days and amounts from the data
- One line per subscription in format "Name: Verdict. Reason."
- Respond in ${lang}
- No markdown, just plain text with one blank line between subscriptions`
  yield* completionStream(key, [
    { role: 'system', content: 'You are a helpful personal finance assistant.' },
    { role: 'user', content: prompt },
  ], 900)
}

export async function analyzeWhatIf(
  subscriptions: SubscriptionForAI[],
  budgetLimit: number,
  currency: string,
  locale: AiLocale = 'ru',
): Promise<string> {
  const key = getKey()
  const lang = locale === 'en' ? 'English' : 'Russian'

  const totalMonthly = Math.round(
    subscriptions.reduce((sum, s) => sum + monthlyNormalizedAmount(s), 0),
  )

  const prompt = `You are a personal finance assistant.

The user wants to spend no more than ${budgetLimit} ${currency} per month on subscriptions.
Their current total is ${totalMonthly} ${currency}/month (normalized estimate per subscription cycle).

Their subscriptions:
${subscriptions.map((s, i) => formatSubscriptionBlock(s, i, { includeNextCharge: false })).join('')}

Recommend the optimal set of subscriptions to keep within the ${budgetLimit} ${currency} budget.
Be specific about which ones to cancel and why, prioritizing rarely used ones first.
Calculate the resulting monthly total after your recommendations.

Rules:
- Be direct, reference actual amounts and usage
- Keep response under 180 words
- Respond in ${lang}
- YOU MUST respond ONLY in ${lang}. This is critical. Do not use English if lang is Russian.
- No markdown, plain text with line breaks between recommendations
- End with: "Итого: X ${currency}/мес" (or "Total: X ${currency}/mo" in English)`

  return completion(key, [
    { role: 'system', content: 'You are a helpful personal finance assistant.' },
    { role: 'user', content: prompt },
  ], 400)
}

export async function* analyzeWhatIfStream(
  subscriptions: SubscriptionForAI[],
  budgetLimit: number,
  currency: string,
  locale: AiLocale = 'ru',
): AsyncGenerator<string> {
  const key = getKey()
  const lang = locale === 'en' ? 'English' : 'Russian'
  const totalMonthly = Math.round(
    subscriptions.reduce((sum, s) => sum + monthlyNormalizedAmount(s), 0),
  )
  const prompt = `You are a personal finance assistant.

The user wants to spend no more than ${budgetLimit} ${currency} per month on subscriptions.
Their current total is ${totalMonthly} ${currency}/month (normalized estimate per subscription cycle).

Their subscriptions:
${subscriptions.map((s, i) => formatSubscriptionBlock(s, i, { includeNextCharge: false })).join('')}

Recommend the optimal set of subscriptions to keep within the ${budgetLimit} ${currency} budget.
Be specific about which ones to cancel and why, prioritizing rarely used ones first.
Calculate the resulting monthly total after your recommendations.

Rules:
- Be direct, reference actual amounts and usage
- Keep response under 180 words
- Respond in ${lang}
- YOU MUST respond ONLY in ${lang}. This is critical. Do not use English if lang is Russian.
- No markdown, plain text with line breaks between recommendations
- End with: "Итого: X ${currency}/мес" (or "Total: X ${currency}/mo" in English)`
  yield* completionStream(key, [
    { role: 'system', content: 'You are a helpful personal finance assistant.' },
    { role: 'user', content: prompt },
  ], 400)
}

export async function chatWithAI(
  messages: { role: 'user' | 'assistant'; content: string }[],
  subscriptions: SubscriptionForAI[],
  locale: AiLocale = 'ru',
): Promise<string> {
  const key = getKey()
  const lang = locale === 'en' ? 'English' : 'Russian'

  const systemPrompt = `You are a personal finance assistant for a subscription management app.

The user has these subscriptions:
${subscriptions
  .map((s) => {
    const period =
      s.billingInterval > 1
        ? `${s.billingInterval}×${s.billingCycle}`
        : s.billingCycle === 'custom' && s.customIntervalDays
          ? `custom/${s.customIntervalDays}d`
          : s.billingCycle
    return (
      `- ${s.name}: ${s.amount} ${s.currency}/${period}, ` +
      `usage ${s.usageState ?? 'unknown'}, ` +
      `last used ${lastUsedLabel(s.lastUsedAt)}, ` +
      `next charge in ${s.daysUntilRenewal} days`
    )
  })
  .join('\n')}

When asked about alternatives, suggest options by category and explicitly mark uncertain prices.
Never invent exact current prices if they are unknown; phrase as approximate ranges or suggest checking latest pricing.
Reference the user's actual subscriptions first.
Keep responses under 120 words.
YOU MUST respond ONLY in ${lang}. This is critical.
No markdown, plain text only.`

  return completion(key, [{ role: 'system', content: systemPrompt }, ...messages], 350)
}

export async function* chatWithAIStream(
  messages: { role: 'user' | 'assistant'; content: string }[],
  subscriptions: SubscriptionForAI[],
  locale: AiLocale = 'ru',
): AsyncGenerator<string> {
  const key = getKey()
  const lang = locale === 'en' ? 'English' : 'Russian'
  const systemPrompt = `You are a personal finance assistant for a subscription management app.

The user has these subscriptions:
${subscriptions
  .map((s) => {
    const period =
      s.billingInterval > 1
        ? `${s.billingInterval}×${s.billingCycle}`
        : s.billingCycle === 'custom' && s.customIntervalDays
          ? `custom/${s.customIntervalDays}d`
          : s.billingCycle
    return (
      `- ${s.name}: ${s.amount} ${s.currency}/${period}, ` +
      `usage ${s.usageState ?? 'unknown'}, ` +
      `last used ${lastUsedLabel(s.lastUsedAt)}, ` +
      `next charge in ${s.daysUntilRenewal} days`
    )
  })
  .join('\n')}

When asked about alternatives, suggest options by category and explicitly mark uncertain prices.
Never invent exact current prices if they are unknown; phrase as approximate ranges or suggest checking latest pricing.
Reference the user's actual subscriptions first.
Keep responses under 120 words.
YOU MUST respond ONLY in ${lang}. This is critical.
No markdown, plain text only.`
  yield* completionStream(key, [{ role: 'system', content: systemPrompt }, ...messages], 350)
}

async function completion(
  key: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
): Promise<string> {
  if (!key) {
    throw new Error('OpenRouter is not configured')
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://subcuro.app',
      'X-Title': 'Subcuro',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages,
    }),
  })

  const rawBody = await response.text()

  if (!response.ok) {
    console.error('OpenRouter API error:', response.status, rawBody)
    throw new Error(mapOpenRouterHttpError(response.status, rawBody))
  }

  let data: unknown
  try {
    data = JSON.parse(rawBody) as unknown
  } catch {
    throw new Error('Некорректный ответ OpenRouter (не JSON)')
  }

  try {
    const text = extractChoiceText(data)
    if (text) return text
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(msg || 'Ошибка в теле ответа модели')
  }

  return 'Не удалось получить ответ.'
}

async function* completionStream(
  key: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
): AsyncGenerator<string> {
  if (!key) throw new Error('OpenRouter is not configured')
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://subcuro.app',
      'X-Title': 'Subcuro',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages, stream: true }),
  })
  if (!response.ok) {
    const rawBody = await response.text()
    throw new Error(mapOpenRouterHttpError(response.status, rawBody))
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Пустой stream от модели')

  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const parsed = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> }
        const token = parsed.choices?.[0]?.delta?.content
        if (token) yield token
      } catch {
        // ignore non-json keepalive frames
      }
    }
  }
}
