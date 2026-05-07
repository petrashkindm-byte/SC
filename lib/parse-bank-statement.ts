/**
 * Парсер банковских выписок: Тинькофф и Сбербанк.
 * Находит повторяющиеся списания и определяет тип подписки.
 */

export interface BankTransaction {
  date: Date
  amount: number
  currency: string
  description: string
  /** Нормализованное имя продавца для группировки */
  merchant: string
}

export interface DetectedSubscription {
  merchant: string
  amount: number
  currency: string
  billingCycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  intervalDays: number
  confidence: 'high' | 'medium' | 'low'
  transactionCount: number
  lastDate: Date
  nextEstimated: Date
  sampleDescriptions: string[]
}

// ─── Форматы банков ───────────────────────────────────────────────────────────

function parseTinkoff(text: string): BankTransaction[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const header = lines[0].split(';').map((h) => h.replace(/^"|"$/g, '').trim())

  const idxDate = header.findIndex((h) => h.includes('Дата операции'))
  const idxAmt = header.findIndex((h) => h === 'Сумма операции' || h === 'Сумма платежа')
  const idxCur = header.findIndex((h) => h === 'Валюта операции' || h === 'Валюта платежа')
  const idxDesc = header.findIndex((h) => h === 'Описание')
  const idxStatus = header.findIndex((h) => h === 'Статус')

  if (idxDate === -1 || idxAmt === -1 || idxDesc === -1) return []

  const txns: BankTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';').map((c) => c.replace(/^"|"$/g, '').trim())
    if (cols.length < 4) continue

    const status = idxStatus >= 0 ? cols[idxStatus] : ''
    if (status && status !== 'OK' && status !== 'Завершён' && status !== 'Completed') continue

    const rawDate = cols[idxDate] ?? ''
    const rawAmt = cols[idxAmt] ?? ''
    const rawCur = idxCur >= 0 ? cols[idxCur] : 'RUB'
    const desc = cols[idxDesc] ?? ''

    const amount = parseFloat(rawAmt.replace(',', '.').replace(/\s/g, ''))
    if (!isFinite(amount) || amount >= 0) continue // берём только списания (отрицательные)

    // Дата: DD.MM.YYYY HH:mm:ss или DD.MM.YYYY
    const dateParts = rawDate.split(' ')[0].split('.')
    if (dateParts.length !== 3) continue
    const date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`)
    if (isNaN(date.getTime())) continue

    txns.push({
      date,
      amount: Math.abs(amount),
      currency: rawCur || 'RUB',
      description: desc,
      merchant: normalizeMerchant(desc),
    })
  }

  return txns
}

function parseSberbank(text: string): BankTransaction[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  // Сбер использует ; или , как разделитель
  const sep = lines[0].includes(';') ? ';' : ','
  const header = lines[0].split(sep).map((h) => h.replace(/^"|"$/g, '').trim())

  const idxDate = header.findIndex((h) => /дата|date/i.test(h) && !/проведения|value/i.test(h))
  const idxAmt = header.findIndex((h) => /сумма|amount/i.test(h))
  const idxDesc = header.findIndex((h) => /описание|description|наименование|категория/i.test(h))

  if (idxDate === -1 || idxAmt === -1 || idxDesc === -1) return []

  const txns: BankTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.replace(/^"|"$/g, '').trim())
    if (cols.length < 3) continue

    const rawDate = cols[idxDate] ?? ''
    const rawAmt = cols[idxAmt] ?? ''
    const desc = cols[idxDesc] ?? ''

    const amount = parseFloat(rawAmt.replace(',', '.').replace(/\s/g, ''))
    if (!isFinite(amount) || amount >= 0) continue

    const dateParts = rawDate.split('.').length === 3
      ? rawDate.split('.')
      : rawDate.split('-').length === 3 ? rawDate.split('-').reverse() : null
    if (!dateParts) continue

    const date = new Date(
      dateParts[2].length === 4
        ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
        : `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`
    )
    if (isNaN(date.getTime())) continue

    txns.push({
      date,
      amount: Math.abs(amount),
      currency: 'RUB',
      description: desc,
      merchant: normalizeMerchant(desc),
    })
  }

  return txns
}

// ─── Нормализация имени продавца ─────────────────────────────────────────────

const NOISE = [
  /\*+\d+/g,           // маскированные номера карт
  /\d{4,}/g,           // длинные числа
  /[#№]/g,
  /\bru\b/gi,
  /москва|spb|msk/gi,
  /оплата|oplata|payment/gi,
]

function normalizeMerchant(desc: string): string {
  let s = desc.toLowerCase()
  for (const r of NOISE) s = s.replace(r, ' ')
  // Берём первые 2–3 слова
  return s.replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ').trim()
}

// ─── Определение цикла ────────────────────────────────────────────────────────

function inferCycle(avgDays: number): { cycle: DetectedSubscription['billingCycle']; label: string } {
  if (avgDays >= 340 && avgDays <= 390) return { cycle: 'yearly', label: 'ежегодно' }
  if (avgDays >= 85 && avgDays <= 100) return { cycle: 'quarterly', label: 'раз в квартал' }
  if (avgDays >= 25 && avgDays <= 35) return { cycle: 'monthly', label: 'ежемесячно' }
  if (avgDays >= 5 && avgDays <= 9) return { cycle: 'weekly', label: 'еженедельно' }
  // Ближайший стандартный цикл
  const targets = [7, 30, 90, 365]
  const closest = targets.reduce((a, b) => Math.abs(a - avgDays) < Math.abs(b - avgDays) ? a : b)
  if (closest === 365) return { cycle: 'yearly', label: 'ежегодно' }
  if (closest === 90) return { cycle: 'quarterly', label: 'раз в квартал' }
  if (closest === 30) return { cycle: 'monthly', label: 'ежемесячно' }
  return { cycle: 'weekly', label: 'еженедельно' }
}

// ─── Основная логика обнаружения ─────────────────────────────────────────────

export function detectSubscriptions(txns: BankTransaction[]): DetectedSubscription[] {
  // Группируем по merchant + примерной сумме (±15%)
  const groups = new Map<string, BankTransaction[]>()

  for (const t of txns) {
    let placed = false
    for (const [key, group] of groups) {
      const [kMerchant] = key.split('|')
      const kAmt = group[0].amount
      if (kMerchant === t.merchant && Math.abs(t.amount - kAmt) / kAmt < 0.15) {
        group.push(t)
        placed = true
        break
      }
    }
    if (!placed) {
      groups.set(`${t.merchant}|${t.amount}`, [t])
    }
  }

  const results: DetectedSubscription[] = []

  for (const [, group] of groups) {
    if (group.length < 2) continue

    // Сортируем по дате
    const sorted = [...group].sort((a, b) => a.date.getTime() - b.date.getTime())

    // Вычисляем интервалы между транзакциями
    const intervals: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const days = Math.round((sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / 86400000)
      intervals.push(days)
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const stdDev = Math.sqrt(intervals.reduce((sum, d) => sum + Math.pow(d - avgInterval, 2), 0) / intervals.length)

    // Фильтруем: слишком нерегулярные (CV > 0.3) — не подписки
    const cv = avgInterval > 0 ? stdDev / avgInterval : 1
    if (cv > 0.35) continue

    // Только разумные интервалы (5 дней — 400 дней)
    if (avgInterval < 5 || avgInterval > 400) continue

    const { cycle } = inferCycle(avgInterval)

    // Уверенность
    const confidence: DetectedSubscription['confidence'] =
      group.length >= 4 && cv < 0.1 ? 'high'
      : group.length >= 3 && cv < 0.2 ? 'medium'
      : 'low'

    const last = sorted[sorted.length - 1]
    const nextEstimated = new Date(last.date.getTime() + avgInterval * 86400000)

    // Средняя сумма
    const avgAmount = group.reduce((s, t) => s + t.amount, 0) / group.length
    const roundedAmount = Math.round(avgAmount)

    results.push({
      merchant: group[0].description, // оригинальное описание
      amount: roundedAmount,
      currency: group[0].currency,
      billingCycle: cycle,
      intervalDays: Math.round(avgInterval),
      confidence,
      transactionCount: group.length,
      lastDate: last.date,
      nextEstimated,
      sampleDescriptions: [...new Set(sorted.map((t) => t.description))].slice(0, 3),
    })
  }

  // Сортируем: сначала уверенные, потом по сумме
  const order = { high: 0, medium: 1, low: 2 }
  return results.sort((a, b) =>
    order[a.confidence] - order[b.confidence] || b.amount - a.amount
  )
}

// ─── Автоопределение формата ──────────────────────────────────────────────────

export type BankFormat = 'tinkoff' | 'sberbank' | 'unknown'

export function detectBankFormat(text: string): BankFormat {
  const firstLine = text.split('\n')[0].toLowerCase()
  if (firstLine.includes('дата операции') || firstLine.includes('мcc') || firstLine.includes('кэшбэк')) return 'tinkoff'
  if (firstLine.includes('сбер') || firstLine.includes('sber') || firstLine.includes('наименование')) return 'sberbank'
  if (firstLine.includes('описание') && firstLine.includes('сумма')) return 'tinkoff' // попробуем как тинькофф
  return 'unknown'
}

export function parseBankStatement(text: string, format?: BankFormat): BankTransaction[] {
  const fmt = format ?? detectBankFormat(text)
  if (fmt === 'tinkoff') return parseTinkoff(text)
  if (fmt === 'sberbank') return parseSberbank(text)
  // Попробуем оба
  const t = parseTinkoff(text)
  if (t.length > 0) return t
  return parseSberbank(text)
}
