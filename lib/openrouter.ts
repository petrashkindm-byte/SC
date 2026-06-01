import { monthlyNormalizedAmount, subscriptionToAiPayload } from '@/lib/ai/map-subscription'
import type { AiLocale, DailyTipResult, SubscriptionForAI } from '@/lib/ai/types'
import type { Subscription } from '@/lib/supabase/types'
import { findServiceEntry } from '@/lib/service-comparison-db'
import type { ServiceEntry } from '@/lib/service-comparison-db'

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

/**
 * Форматирует блок характеристик сервиса из базы для промта.
 * Включает: сильные стороны (good), уникальное преимущество (exclusive),
 * годовой тариф со скидкой, семейный план, bundleNote (что входит в пакет).
 */
function formatDbFeatures(entry: ServiceEntry): string {
  const lines: string[] = []

  // Сильные стороны: только good-фичи, кроме exclusive (он идёт отдельно)
  const strengths = entry.features
    .filter(f => f.level === 'good' && f.key !== 'exclusive' && f.key !== 'lossless')
    .map(f => f.value)
  // Lossless отдельно — важная аудиофича
  const lossless = entry.features.find(f => f.key === 'lossless' && f.level === 'good')
  if (lossless) strengths.unshift(`Lossless: ${lossless.value}`)

  if (strengths.length > 0) {
    lines.push(`   - Strengths: ${strengths.join(' · ')}`)
  }

  // Уникальное преимущество (exclusive) — только если good
  const exclusive = entry.features.find(f => f.key === 'exclusive' && f.level === 'good')
  if (exclusive) {
    lines.push(`   - Unique value: ${exclusive.value}`)
  }

  // Что входит в пакет (bundleNote)
  if (entry.bundleNote) {
    lines.push(`   - Bundle note: ${entry.bundleNote}`)
  }

  // Годовой тариф + расчёт экономии
  if (entry.annualPrice && entry.monthlyPrice) {
    const monthlyFromAnnual = Math.round(entry.annualPrice / 12)
    const saving = Math.round((entry.monthlyPrice - monthlyFromAnnual) * 12)
    const cur = entry.priceCurrency ?? 'RUB'
    if (saving > 0) {
      lines.push(`   - Annual plan: ${entry.annualPrice} ${cur} (≈${monthlyFromAnnual} ${cur}/mo, saves ~${saving} ${cur}/year vs monthly)`)
    }
  }

  // Семейный план
  if (entry.familyPlan) {
    const fp = entry.familyPlan
    lines.push(`   - Family plan: ${fp.monthlyApprox} ${fp.currency}/mo for up to ${fp.slots} people`)
  }

  return lines.join('\n')
}

/** Блок подписки в промпте */
function formatSubscriptionBlock(
  s: SubscriptionForAI,
  index: number,
  opts: { includeNextCharge: boolean; entry?: ServiceEntry | null },
): string {
  const cycleParts: string[] = [`${s.amount} ${s.currency}/${s.billingCycle}`]
  if (s.billingInterval > 1) cycleParts.push(`×${s.billingInterval}`)
  if (s.billingCycle === 'custom' && s.customIntervalDays) cycleParts.push(`every ${s.customIntervalDays}d`)
  cycleParts.push(`≈${s.monthlyEquivalent} ${s.currency}/mo`)

  // Тип из базы точнее, чем категория из БД пользователя
  const typeLabel = opts.entry ? opts.entry.type : s.category

  const lines = [
    `${index + 1}. ${s.name} [${typeLabel}, renewal: ${s.renewalType}]`,
    `   - Cost: ${cycleParts.join(', ')}`,
  ]
  if (opts.includeNextCharge) {
    lines.push(`   - Next charge: in ${s.daysUntilRenewal} days`)
  }
  const usedLabel = lastUsedLabel(s.lastUsedAt)
  lines.push(`   - Last marked as used: ${usedLabel}`)

  // Данные из базы характеристик
  if (opts.entry) {
    const featBlock = formatDbFeatures(opts.entry)
    if (featBlock) lines.push(featBlock)
  }

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

function buildAnalyzePrompt(subscriptions: SubscriptionForAI[], lang: string): string {
  // Находим каждую подписку в базе характеристик
  const entries = subscriptions.map(s => findServiceEntry(s.name) ?? null)

  const list = subscriptions
    .map((s, i) => formatSubscriptionBlock(s, i, { includeNextCharge: true, entry: entries[i] }))
    .join('')

  // Детектируем дубликаты по типу из базы — точнее, чем category_slug пользователя.
  // Для мультитиповых сервисов (Яндекс Плюс: music+video) учитываем все типы.
  const typeCount = new Map<string, string[]>()
  for (let i = 0; i < subscriptions.length; i++) {
    const s = subscriptions[i]
    const entry = entries[i]
    const types = entry
      ? [entry.type, ...(entry.additionalTypes ?? [])]
      : [s.category]
    for (const t of types) {
      const arr = typeCount.get(t) ?? []
      arr.push(s.name)
      typeCount.set(t, arr)
    }
  }
  const dupes = [...typeCount.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([type, names]) => `${type}: ${names.join(', ')}`)
  const dupeNote = dupes.length > 0
    ? `\nOverlapping service types (evaluate trade-offs carefully):\n${dupes.map(d => `  - ${d}`).join('\n')}`
    : ''

  const isRu = lang === 'Russian'
  const vKeep   = isRu ? 'оставить' : 'keep'
  const vCancel = isRu ? 'отменить' : 'cancel'
  const vAnnual = isRu ? 'перейти на годовой' : 'switch to annual'
  const vDown   = isRu ? 'понизить' : 'downgrade'
  const vReview = isRu ? 'пересмотреть' : 'review'

  return `You are a personal finance assistant reviewing a user's active subscriptions.

Subscriptions:${list}
${dupeNote}

Task: for each subscription write ONE paragraph with a clear verdict and specific reasoning.

Format: start every paragraph with the service name, a space, an em dash "—", a space, exactly ONE verdict word, then a colon, then the reasoning.
Verdict words (use the ${lang} form below):
  • Keep             → ${vKeep}
  • Cancel at renewal → ${vCancel}
  • Switch to annual → ${vAnnual}
  • Downgrade        → ${vDown}
  • Review usage     → ${vReview}
The verdict before the colon is the recommendation for THIS subscription only. Mentions of other services later in the same paragraph do NOT change this subscription's verdict.
Example: "Spotify — ${vKeep}: ..."

Analysis priorities (in order):
1. Overlapping types — when multiple services cover the same need (music, video, ai…), use the feature data above to explain which is stronger and why. Be specific: mention actual differentiators like exclusive content, audio quality, or bundle value.
2. Unique value — if a service has a distinct strength (exclusive podcasts, Lossless audio, E2E encryption, a bundled service), name it explicitly and factor it into the verdict.
3. Bundle overlap — if a service already includes another (e.g. Яндекс Плюс includes Кинопоиск), flag the double payment.
4. Billing optimisation — if an annual plan is listed above and the user pays monthly, recommend the switch with actual savings amount.
5. Usage signal — "last used: unknown" means the user did not track it, NOT that they don't use it. Flag unused only when combined with a duplicate or high price.

Rules:
- When two or more services cover the SAME need, KEEP the single strongest option (verdict "${vKeep}") and recommend "${vCancel}" or "${vReview}" only for the weaker ones. NEVER give the "${vCancel}" verdict to every overlapping service — at least one must be kept.
- Every sentence must reference this user's specific data (names, amounts, features listed above).
- For subscriptions already on an annual plan, do not suggest cancellation as an immediate action — recommend reconsidering at next renewal if applicable.
- Do not repeat reasoning across subscriptions.
- No markdown, no bullet points inside paragraphs, no confidence percentages.

Respond in ${lang}. One blank line between subscriptions.`
}

export function sanitizeDashboardPath(path: string | null | undefined): string {
  const raw = (path ?? '/dashboard/savings').trim() || '/dashboard/savings'
  if (!raw.startsWith('/dashboard') || raw.includes('..') || raw.includes('//')) {
    return '/dashboard/savings'
  }
  return raw
}

function buildDailyTipPrompt(subs: Subscription[], lang: string, avoidSummary?: string): string {
  const forAi = subs.map(subscriptionToAiPayload)
  const entries = subs.map((s) => findServiceEntry(s.name) ?? null)
  const list = subs
    .map((sub, i) => {
      const block = formatSubscriptionBlock(forAi[i], i, { includeNextCharge: true, entry: entries[i] })
      return `[id=${sub.id}]${block}`
    })
    .join('')

  const typeCount = new Map<string, string[]>()
  for (let i = 0; i < forAi.length; i++) {
    const s = forAi[i]
    const entry = entries[i]
    const types = entry ? [entry.type, ...(entry.additionalTypes ?? [])] : [s.category]
    for (const t of types) {
      const arr = typeCount.get(t) ?? []
      arr.push(s.name)
      typeCount.set(t, arr)
    }
  }
  const dupes = [...typeCount.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([type, names]) => `${type}: ${names.join(', ')}`)
  const dupeNote =
    dupes.length > 0
      ? `\nOverlapping service types:\n${dupes.map((d) => `  - ${d}`).join('\n')}`
      : ''

  const avoid = avoidSummary?.trim()
    ? `\nThe user disliked the previous tip (summary): "${avoidSummary.trim().slice(0, 400)}". Offer a DIFFERENT angle or different subscriptions — do not repeat the same recommendation.`
    : ''

  return `You output exactly ONE JSON object and nothing else. All string values in the JSON must be in ${lang}.

Subscriptions (each block starts with [id=UUID] — when relevant, copy those UUIDs exactly into related_subscription_ids):${list}
${dupeNote}
${avoid}

Pick exactly ONE highest-value tip. Priority:
1. Overlapping / duplicate services (same need: video, music, cloud…).
2. Clear savings from monthly → annual using ONLY numbers implied by the data above (do not invent prices).
3. High cost or duplicate plus usageState rarely_used or last used 30+ days ago.
4. Bundle overlap if bundle notes in data support it.
5. Family plan vs several individuals only if family plan data exists in the blocks.
6. Urgent renewal in 0–2 days only if facts in the data support urgency.

If there is no actionable issue, set kind to "optimal", savings_rub to 0, text to a short positive message that finances look fine, action_path "/dashboard/savings".

Required JSON keys:
{"text":"…","savings_rub": <integer >= 0 or null>,"action_path":"/dashboard/...","kind":"duplicate|annual|unused|bundle|family|urgent|optimal|other","related_subscription_ids":["uuid",...]}

Rules:
- "text": one or two short sentences; name real services and amounts from the data.
- savings_rub: integer monthly savings in the user's main currency if quantifiable, else null.
- action_path: internal path only, must start with /dashboard (e.g. /dashboard/savings or /dashboard/subscriptions/<one-uuid>).
- related_subscription_ids: subset of UUIDs from [id=…] prefixes. If the user should open ONE subscription card first (e.g. cancel or review that one), include ONLY that single UUID — the app will deep-link there. If the tip is purely about comparing several services with no single primary row, include all involved UUIDs (2+) and use action_path "/dashboard/savings". Empty array only when no specific rows apply.`
}

function parseDailyTipResponse(raw: string): DailyTipResult {
  let s = raw.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(s)
  } catch {
    throw new Error('Некорректный JSON от модели')
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Пустой ответ модели')
  const o = parsed as Record<string, unknown>
  const text = typeof o.text === 'string' ? o.text.trim() : ''
  if (!text) throw new Error('Пустой текст совета')
  const savings = o.savings_rub
  let savings_rub: number | null = null
  if (savings === null) savings_rub = null
  else if (typeof savings === 'number' && Number.isFinite(savings)) savings_rub = Math.max(0, Math.round(savings))
  const action_path = sanitizeDashboardPath(typeof o.action_path === 'string' ? o.action_path : undefined)
  const kind = typeof o.kind === 'string' && o.kind.trim() ? o.kind.trim() : 'other'
  const rel = o.related_subscription_ids
  const related_subscription_ids = Array.isArray(rel)
    ? rel.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))
    : []
  return { text, savings_rub, action_path, kind, related_subscription_ids }
}

export async function analyzeDailyTip(
  subs: Subscription[],
  locale: AiLocale = 'ru',
  opts?: { avoidSummary?: string },
): Promise<DailyTipResult> {
  if (subs.length === 0) {
    return {
      text:
        locale === 'en'
          ? 'Add active subscriptions to get a personalized AI tip.'
          : 'Добавьте активные подписки — появится персональный AI‑совет.',
      savings_rub: null,
      action_path: '/dashboard?tab=payments',
      kind: 'optimal',
      related_subscription_ids: [],
    }
  }
  const key = getKey()
  const lang = locale === 'en' ? 'English' : 'Russian'
  const userPrompt = buildDailyTipPrompt(subs, lang, opts?.avoidSummary)
  const raw = await completion(
    key,
    [
      {
        role: 'system',
        content:
          'You reply with a single JSON object only. No markdown fences, no commentary before or after JSON.',
      },
      { role: 'user', content: userPrompt },
    ],
    550,
    { responseFormat: 'json_object' },
  )
  return parseDailyTipResponse(raw)
}

export async function analyzeSubscriptions(
  subscriptions: SubscriptionForAI[],
  locale: AiLocale = 'ru',
): Promise<string> {
  const key = getKey()
  const lang = locale === 'en' ? 'English' : 'Russian'

  const prompt = buildAnalyzePrompt(subscriptions, lang)
  return completion(key, [
    { role: 'system', content: 'You are a helpful personal finance assistant.' },
    { role: 'user', content: prompt },
  ], 3000)
}

export async function* analyzeSubscriptionsStream(
  subscriptions: SubscriptionForAI[],
  locale: AiLocale = 'ru',
): AsyncGenerator<string> {
  const key = getKey()
  const lang = locale === 'en' ? 'English' : 'Russian'
  yield* completionStream(key, [
    { role: 'system', content: 'You are a helpful personal finance assistant.' },
    { role: 'user', content: buildAnalyzePrompt(subscriptions, lang) },
  ], 3000)
}

function buildWhatIfPrompt(
  subscriptions: SubscriptionForAI[],
  budgetLimit: number,
  currency: string,
  totalMonthly: number,
  lang: string,
): string {
  const subsBlock = subscriptions
    .map((s, i) => formatSubscriptionBlock(s, i, { includeNextCharge: false, entry: findServiceEntry(s.name) ?? null }))
    .join('')

  const alreadyUnder = totalMonthly <= budgetLimit

  if (alreadyUnder) {
    return `You are a personal finance assistant.

The user's current monthly total is ${totalMonthly} ${currency}/month, which is already within their budget of ${budgetLimit} ${currency}/month.

Their subscriptions:
${subsBlock}

Tell the user their current total is already under the limit. Briefly note 1-2 subscriptions they could cut if they want to save even more, but emphasize no action is required.

Rules:
- Be direct, reference actual amounts
- Keep response under 120 words
- Respond in ${lang}
- YOU MUST respond ONLY in ${lang}. Do not use English if lang is Russian.
- No markdown, plain text
- End with: "Итого: ${totalMonthly} ${currency}/мес" (or "Total: ${totalMonthly} ${currency}/mo" in English)`
  }

  const overage = totalMonthly - budgetLimit

  return `You are a personal finance assistant helping the user trim their subscriptions.

GOAL: Cancel the MINIMUM number of subscriptions so the remaining total is as close to ${budgetLimit} ${currency}/month as possible. Do NOT cancel more than necessary.

Current total: ${totalMonthly} ${currency}/month.
Budget limit: ${budgetLimit} ${currency}/month.
Need to cut: ~${overage} ${currency}/month.

Their subscriptions:
${subsBlock}

IMPORTANT — do the arithmetic step by step BEFORE writing your response:
1. Pick subscriptions to cancel (start with unused/low-value ones).
2. Add up ONLY the amounts of the subscriptions you chose to cancel. Call this CANCEL_SUM.
3. Remaining = ${totalMonthly} − CANCEL_SUM. Check: is Remaining ≤ ${budgetLimit}? If not, pick more to cancel and repeat.
4. Verify: the sum of every subscription in your "К сохранению" list must equal Remaining.
5. NEVER put a subscription in "К сохранению" if its individual amount alone exceeds ${budgetLimit}.

Output format (plain text, ${lang}, no markdown):
К отмене — отменить:
[numbered list: Name — Amount ${currency}/мес, one per line]

Общая сумма к отмене: CANCEL_SUM ${currency}/мес
Остаток: ${totalMonthly} − CANCEL_SUM = Remaining ${currency}/мес

К сохранению — оставить:
[numbered list: Name — Amount ${currency}/мес, one per line]

Итого: Remaining ${currency}/мес`
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

  const prompt = buildWhatIfPrompt(subscriptions, budgetLimit, currency, totalMonthly, lang)

  return completion(key, [
    { role: 'system', content: 'You are a helpful personal finance assistant.' },
    { role: 'user', content: prompt },
  ], 1200)
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
  const prompt = buildWhatIfPrompt(subscriptions, budgetLimit, currency, totalMonthly, lang)
  yield* completionStream(key, [
    { role: 'system', content: 'You are a helpful personal finance assistant.' },
    { role: 'user', content: prompt },
  ], 1200)
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
  opts?: { responseFormat?: 'json_object' },
): Promise<string> {
  if (!key) {
    throw new Error('OpenRouter is not configured')
  }

  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: maxTokens,
    messages,
  }
  if (opts?.responseFormat === 'json_object') {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://subcuro.app',
      'X-Title': 'Subcuro',
    },
    body: JSON.stringify(body),
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
