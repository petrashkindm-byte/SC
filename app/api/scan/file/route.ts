import { createClient } from '@/lib/supabase/server'
import { checkScanLimit } from '@/lib/ratelimit'
import { NextResponse, type NextRequest } from 'next/server'
import {
  parseBankStatement,
  detectSubscriptions,
  detectBankFormat,
} from '@/lib/parse-bank-statement'
import {
  detectSubscriptionsWithAI,
  type RawTransaction,
  type AiDetectedSubscription,
} from '@/lib/ai/scan-subscriptions'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

/** Пробуем распарсить как CSV банка и вернуть RawTransaction[] */
function parseCsvTransactions(text: string): RawTransaction[] {
  const format = detectBankFormat(text)
  const txns = parseBankStatement(text, format)
  return txns.map((t) => ({
    date: t.date.toISOString().slice(0, 10),
    amount: t.amount,
    currency: t.currency,
    description: t.description,
  }))
}

/** Извлекаем транзакции из plain text (PDF → text) эвристически */
function extractTransactionsFromText(text: string): RawTransaction[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const txns: RawTransaction[] = []

  // Паттерн: дата + сумма + описание в разных форматах
  const dateAmountRe = /(\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}-\d{2}-\d{2})\s.*?(-?\d[\d\s,.']*)\s*(RUB|USD|EUR|₽|\$|€)?/i

  for (const line of lines) {
    const m = line.match(dateAmountRe)
    if (!m) continue

    const rawAmt = m[2].replace(/[\s']/g, '').replace(',', '.')
    const amount = parseFloat(rawAmt)
    if (!isFinite(amount) || amount === 0) continue

    // Пробуем нормализовать дату
    let dateStr = m[1]
    if (dateStr.includes('.') || dateStr.includes('/')) {
      const parts = dateStr.split(/[./]/)
      if (parts.length === 3) {
        const [d, mo, y] = parts
        const year = y.length === 2 ? `20${y}` : y
        dateStr = `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
      }
    }

    const description = line
      .replace(m[0], '')
      .replace(/[|;,]/g, ' ')
      .trim()
      .slice(0, 120)

    txns.push({
      date: dateStr,
      amount: Math.abs(amount),
      currency: (m[3] ?? 'RUB').replace('₽', 'RUB').replace('$', 'USD').replace('€', 'EUR'),
      description: description || line.slice(0, 80),
    })
  }

  return txns
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  const { limited, retryAfter } = await checkScanLimit(user.id)
  if (limited) {
    return NextResponse.json(
      { error: 'Too many requests — please wait before sending another request.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  // Парсим multipart/form-data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'Файл не прикреплён' }, { status: 400 })
  }

  // Размер файла
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Файл слишком большой (максимум 20 МБ)' }, { status: 400 })
  }

  const fileName = file.name.toLowerCase()
  let rawTransactions: RawTransaction[] = []
  let csvText: string | null = null

  try {
    if (fileName.endsWith('.pdf')) {
      // PDF → текст → транзакции
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const { parsePdfToText } = await import('@/lib/parse-pdf')
      const text = await parsePdfToText(buffer)
      rawTransactions = extractTransactionsFromText(text)
    } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      // CSV
      csvText = await file.text()
      rawTransactions = parseCsvTransactions(csvText)
    } else {
      return NextResponse.json(
        { error: 'Поддерживаются форматы: PDF, CSV, TXT' },
        { status: 400 },
      )
    }
  } catch (err) {
    console.error('[scan/file] parse error:', err)
    return NextResponse.json(
      { error: 'Не удалось прочитать файл. Проверьте формат.' },
      { status: 422 },
    )
  }

  if (rawTransactions.length === 0) {
    return NextResponse.json(
      { error: 'Не нашли транзакций в файле. Попробуйте выписку в формате CSV из Тинькофф или Сбера.' },
      { status: 422 },
    )
  }

  // Сначала пробуем алгоритмический детектор (быстро, без AI)
  let detected: AiDetectedSubscription[] = []

  // Для CSV — используем существующий быстрый алгоритм как базу
  if (!fileName.endsWith('.pdf')) {
    const text = csvText ?? ''
    const format = detectBankFormat(text)
    const txns = parseBankStatement(text, format)
    const algResult = detectSubscriptions(txns)

    // Конвертируем в AiDetectedSubscription формат
    detected = algResult.map((s) => ({
      merchant: s.merchant,
      amount: s.amount,
      currency: s.currency,
      billingCycle: s.billingCycle,
      confidence: s.confidence,
      transactionCount: s.transactionCount,
      lastDate: s.lastDate.toISOString().slice(0, 10),
      nextEstimated: s.nextEstimated.toISOString().slice(0, 10),
      sampleDescriptions: s.sampleDescriptions,
    }))
  }

  // AI обогащение — запускаем всегда (для PDF обязательно, для CSV как дополнение)
  try {
    const aiResult = await detectSubscriptionsWithAI(rawTransactions)

    if (fileName.endsWith('.pdf')) {
      detected = aiResult
    } else {
      // Мёржим: добавляем AI-находки которых нет в алгоритмическом результате
      const existingMerchants = new Set(detected.map((s) => s.merchant.toLowerCase()))
      for (const aiSub of aiResult) {
        if (!existingMerchants.has(aiSub.merchant.toLowerCase())) {
          detected.push({ ...aiSub, confidence: 'medium' as const })
        }
      }
    }
  } catch (err) {
    console.error('[scan/file] AI error:', err)
    // Если AI недоступен — возвращаем что нашли алгоритмом
    if (detected.length === 0) {
      return NextResponse.json(
        { error: 'AI-анализ недоступен и алгоритм ничего не нашёл. Попробуйте CSV из Тинькофф или Сбера.' },
        { status: 503 },
      )
    }
  }

  return NextResponse.json({
    subscriptions: detected,
    transactionCount: rawTransactions.length,
  })
}
