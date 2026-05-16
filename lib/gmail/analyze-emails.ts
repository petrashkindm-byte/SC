/**
 * AI-анализ писем из Gmail для поиска подписок.
 */

import type { EmailSnippet } from './fetch-emails'
import type { AiDetectedSubscription } from '@/lib/ai/scan-subscriptions'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'openai/gpt-4o-mini'

function getKey(): string {
  return process.env.OPENROUTER_API_KEY?.trim() ?? ''
}

/** Паттерны отправителей которые часто означают подписки */
const SUBSCRIPTION_SENDER_PATTERNS = [
  /noreply|no-reply|billing|invoice|receipt|payment|notify|notification/i,
  /subscription|renewal|charge|debit/i,
  /яндекс|yandex|sber|тинькофф|tinkoff|vtb|alfabank|raiffeisen/i,
  /netflix|spotify|apple|google|microsoft|adobe|dropbox|github/i,
  /amazon|aws|cloudflare|digitalocean|vercel|heroku/i,
  /chatgpt|openai|anthropic|midjourney|figma|notion|slack/i,
  /zoom|loom|linear|jira|confluence|atlassian/i,
]

/** Тематические паттерны в subject */
const SUBSCRIPTION_SUBJECT_PATTERNS = [
  /счёт|квитанция|чек|оплата|списание|платёж/i,
  /invoice|receipt|billing|payment|charge|subscription/i,
  /renewed|renewal|next billing|your subscription/i,
  /ваша подписка|продление|оформлен заказ/i,
  /thank you for your purchase|thanks for subscribing/i,
]

export function filterSubscriptionEmails(emails: EmailSnippet[]): EmailSnippet[] {
  return emails.filter((email) => {
    const fromMatch = SUBSCRIPTION_SENDER_PATTERNS.some((re) => re.test(email.from))
    const subjectMatch = SUBSCRIPTION_SUBJECT_PATTERNS.some((re) => re.test(email.subject))
    return fromMatch || subjectMatch
  })
}

function buildPrompt(emails: EmailSnippet[]): string {
  const today = new Date().toISOString().slice(0, 10)

  const emailList = emails
    .slice(0, 80) // ограничиваем контекст
    .map((e, i) =>
      `[${i + 1}] Date: ${e.date}\nFrom: ${e.from}\nSubject: ${e.subject}\nSnippet: ${e.snippet}`,
    )
    .join('\n\n')

  return `You are a subscription detector analyzing emails.
Today is ${today}.

Find recurring subscription payments from these emails.
Group by service. A subscription must appear at least 2 times OR be clearly a renewal notice.

Return ONLY a valid JSON array. Each object must have:
{
  "merchant": "Clean service name (e.g. Netflix, Spotify, Яндекс Плюс)",
  "amount": <number or 0 if unknown>,
  "currency": "<ISO code or RUB>",
  "billingCycle": "weekly" | "monthly" | "quarterly" | "yearly",
  "confidence": "high" | "medium" | "low",
  "transactionCount": <number of emails about this service>,
  "lastDate": "YYYY-MM-DD",
  "nextEstimated": "YYYY-MM-DD",
  "sampleDescriptions": ["<email subject>"]
}

Rules:
- confidence "high": clear subscription with amount and date
- confidence "medium": subscription confirmed but amount unclear
- confidence "low": might be subscription but uncertain
- If no subscriptions found, return []
- Return ONLY valid JSON array, no markdown

Emails:
${emailList}`
}

function extractJsonArray(text: string): unknown[] {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

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

export async function analyzeEmailsForSubscriptions(
  emails: EmailSnippet[],
): Promise<AiDetectedSubscription[]> {
  const key = getKey()
  if (!key) throw new Error('OpenRouter не настроен')
  if (emails.length === 0) return []

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
      max_tokens: 2000,
      messages: [
        { role: 'system', content: 'You are a financial analysis assistant. Respond with valid JSON only.' },
        { role: 'user', content: buildPrompt(emails) },
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

  if (data.error?.message) throw new Error(data.error.message)

  const content = data.choices?.[0]?.message?.content ?? ''
  const raw = extractJsonArray(content)

  return raw
    .filter(isValidSubscription)
    .map((s) => ({
      ...s,
      transactionCount: typeof s.transactionCount === 'number' ? s.transactionCount : 1,
      sampleDescriptions: Array.isArray(s.sampleDescriptions) ? s.sampleDescriptions : [],
    }))
}
