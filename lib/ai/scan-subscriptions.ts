/**
 * AI-модуль для обнаружения подписок в списке транзакций.
 * Используется OpenRouter (gpt-4o-mini) для анализа и обогащения результатов.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'openai/gpt-4o-mini'

function getKey(): string {
  return process.env.OPENROUTER_API_KEY?.trim() ?? ''
}

export interface RawTransaction {
  date: string        // YYYY-MM-DD
  amount: number      // всегда положительное (расход)
  currency: string
  description: string
}

export interface AiDetectedSubscription {
  merchant: string
  amount: number
  currency: string
  billingCycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  confidence: 'high' | 'medium' | 'low'
  /** Число совпадающих транзакций (если AI смог определить) */
  transactionCount: number
  /** Последняя дата транзакции YYYY-MM-DD */
  lastDate: string
  /** Примерная следующая дата списания YYYY-MM-DD */
  nextEstimated: string
  sampleDescriptions: string[]
}

function buildPrompt(transactions: RawTransaction[]): string {
  const txList = transactions
    .slice(0, 500) // ограничиваем контекст
    .map((t) => `${t.date} | ${t.amount} ${t.currency} | ${t.description}`)
    .join('\n')

  const today = new Date().toISOString().slice(0, 10)

  return `You are a subscription detector analyzing bank transactions.
Today is ${today}.

Analyze the following transactions and identify RECURRING subscription payments.
Look for: streaming services, SaaS, cloud storage, music, games, fitness apps, etc.
Group transactions by merchant. A subscription must appear at least 2 times.

Return ONLY a valid JSON array. Each object must have these exact fields:
{
  "merchant": "Clean service name (e.g. Netflix, Spotify, ChatGPT)",
  "amount": <number, most recent charge>,
  "currency": "<ISO code>",
  "billingCycle": "weekly" | "monthly" | "quarterly" | "yearly",
  "confidence": "high" | "medium" | "low",
  "transactionCount": <number of occurrences>,
  "lastDate": "YYYY-MM-DD",
  "nextEstimated": "YYYY-MM-DD",
  "sampleDescriptions": ["<raw description from transactions>"]
}

Rules:
- confidence "high": clear service name + regular interval
- confidence "medium": likely subscription but interval is irregular
- confidence "low": possibly subscription but uncertain
- Do NOT include one-time purchases
- Do NOT include cash withdrawals or bank fees
- If no subscriptions found, return []
- Return ONLY the JSON array, no markdown, no explanation

Transactions:
${txList}`
}

/** Извлекаем JSON-массив из ответа модели (может быть обёрнут в markdown) */
function extractJsonArray(text: string): unknown[] {
  // Убираем markdown code blocks если есть
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // Ищем первый '[' и последний ']'
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return []

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function isValidSubscription(obj: unknown): obj is AiDetectedSubscription {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  return (
    typeof o.merchant === 'string' &&
    typeof o.amount === 'number' &&
    typeof o.currency === 'string' &&
    ['weekly', 'monthly', 'quarterly', 'yearly'].includes(o.billingCycle as string) &&
    ['high', 'medium', 'low'].includes(o.confidence as string) &&
    typeof o.lastDate === 'string' &&
    typeof o.nextEstimated === 'string'
  )
}

export async function detectSubscriptionsWithAI(
  transactions: RawTransaction[],
): Promise<AiDetectedSubscription[]> {
  const key = getKey()
  if (!key) {
    throw new Error('OpenRouter не настроен')
  }

  if (transactions.length === 0) return []

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
      max_tokens: 1500,
      messages: [
        { role: 'system', content: 'You are a financial analysis assistant. Always respond with valid JSON only.' },
        { role: 'user', content: buildPrompt(transactions) },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenRouter error ${response.status}: ${body.slice(0, 200)}`)
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message?: string }
  }

  if (data.error?.message) {
    throw new Error(data.error.message)
  }

  const content = data.choices?.[0]?.message?.content ?? ''
  const raw = extractJsonArray(content)

  return raw
    .filter(isValidSubscription)
    .map((s) => ({
      ...s,
      transactionCount: typeof s.transactionCount === 'number' ? s.transactionCount : 2,
      sampleDescriptions: Array.isArray(s.sampleDescriptions) ? s.sampleDescriptions : [],
    }))
}
