import type { BillingCycle, CategorySlug, RenewalType, SubscriptionStatus } from '@/lib/supabase/types'

const CATEGORIES: CategorySlug[] = [
  'entertainment',
  'productivity',
  'utilities',
  'finance',
  'health',
  'shopping',
  'education',
  'other',
]

const CYCLES: BillingCycle[] = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom']

const STATUSES: SubscriptionStatus[] = ['active', 'paused', 'cancelled', 'archived']

const RENEWAL: RenewalType[] = ['auto_renew', 'manual']

export type MappedRow =
  | {
      ok: true
      id: string
      payload: {
        category_slug: CategorySlug
        name: string
        amount: number
        currency: string
        billing_cycle: BillingCycle
        billing_interval: number
        custom_interval_days: number | null
        first_charge_date: string
        next_charge_date: string
        free_trial_end_date: string | null
        renewal_type: RenewalType
        cancellation_url: string | null
        management_url: string | null
        notes: string | null
        icon: string | null
        status: SubscriptionStatus
        archived_at?: string | null
        last_used_at?: string | null
        price_increase_flag?: boolean
        paused_at?: string | null
        cancelled_at?: string | null
        annual_renewal_at_risk?: boolean
      }
    }
  | { ok: false; reason: string }

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k]
  }
  return ''
}

function parseOptionalTimestamptz(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function mapCsvRowToSubscription(row: Record<string, string>, lineIndex: number): MappedRow {
  const name = pick(row, 'name').trim()
  if (name.length < 2) {
    return { ok: false, reason: `Строка ${lineIndex}: короткое или пустое название` }
  }

  const amount = Number(String(pick(row, 'amount')).replace(',', '.'))
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: `Строка ${lineIndex}: некорректная сумма` }
  }

  let category_slug = pick(row, 'category_slug').trim().toLowerCase() as CategorySlug
  if (!CATEGORIES.includes(category_slug)) category_slug = 'other'

  let billing_cycle = pick(row, 'billing_cycle').trim().toLowerCase() as BillingCycle
  if (!CYCLES.includes(billing_cycle)) billing_cycle = 'monthly'

  const billing_interval = Math.max(1, Math.floor(Number(pick(row, 'billing_interval')) || 1))

  let custom_interval_days: number | null = null
  if (billing_cycle === 'custom') {
    const c = Number(pick(row, 'custom_interval_days'))
    if (!Number.isFinite(c) || c <= 0) {
      return { ok: false, reason: `Строка ${lineIndex}: для custom нужен custom_interval_days` }
    }
    custom_interval_days = c
  }

  const first = pick(row, 'first_charge_date').trim().slice(0, 10)
  const next = pick(row, 'next_charge_date').trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(first) || !/^\d{4}-\d{2}-\d{2}$/.test(next)) {
    return { ok: false, reason: `Строка ${lineIndex}: даты в формате YYYY-MM-DD` }
  }

  const trial = pick(row, 'free_trial_end_date').trim().slice(0, 10)
  const free_trial_end_date =
    trial && /^\d{4}-\d{2}-\d{2}$/.test(trial) ? trial : null

  let renewal_type = pick(row, 'renewal_type').trim() as RenewalType
  if (!RENEWAL.includes(renewal_type)) renewal_type = 'auto_renew'

  let status = pick(row, 'status').trim().toLowerCase() as SubscriptionStatus
  if (!STATUSES.includes(status)) status = 'active'

  const currencyRaw = pick(row, 'currency').toUpperCase().replace(/\s/g, '')
  const currency = currencyRaw.length === 3 ? currencyRaw : 'USD'

  const cancel = pick(row, 'cancellation_url').trim() || null
  const manage = pick(row, 'management_url').trim() || null
  const notes = pick(row, 'notes').trim() || null
  const iconRaw = pick(row, 'icon').trim()
  const icon = iconRaw ? iconRaw.slice(0, 8) : null

  const idRaw = pick(row, 'id').trim()
  const id = idRaw || crypto.randomUUID()

  const payload: Extract<MappedRow, { ok: true }>['payload'] = {
    category_slug,
    name,
    amount,
    currency,
    billing_cycle,
    billing_interval,
    custom_interval_days,
    first_charge_date: first,
    next_charge_date: next,
    free_trial_end_date,
    renewal_type,
    cancellation_url: cancel,
    management_url: manage,
    notes,
    icon,
    status,
  }

  const archivedRaw = pick(row, 'archived_at').trim()
  if (archivedRaw) {
    const iso = parseOptionalTimestamptz(archivedRaw)
    if (!iso) {
      return { ok: false, reason: `Строка ${lineIndex}: некорректный archived_at` }
    }
    payload.archived_at = iso
  }

  const lastUsedRaw = pick(row, 'last_used_at').trim()
  if (lastUsedRaw) {
    const iso = parseOptionalTimestamptz(lastUsedRaw)
    if (!iso) {
      return { ok: false, reason: `Строка ${lineIndex}: некорректный last_used_at` }
    }
    payload.last_used_at = iso
  }

  const pirRaw = pick(row, 'price_increase_flag').trim().toLowerCase()
  if (pirRaw !== '') {
    if (!['0', '1', 'true', 'false', 'yes', 'no'].includes(pirRaw)) {
      return { ok: false, reason: `Строка ${lineIndex}: price_increase_flag — 0/1 или true/false` }
    }
    payload.price_increase_flag = pirRaw === '1' || pirRaw === 'true' || pirRaw === 'yes'
  }

  const pausedRaw = pick(row, 'paused_at').trim()
  if (pausedRaw) {
    const iso = parseOptionalTimestamptz(pausedRaw)
    if (!iso) {
      return { ok: false, reason: `Строка ${lineIndex}: некорректный paused_at` }
    }
    payload.paused_at = iso
  }

  const cancelledRaw = pick(row, 'cancelled_at').trim()
  if (cancelledRaw) {
    const iso = parseOptionalTimestamptz(cancelledRaw)
    if (!iso) {
      return { ok: false, reason: `Строка ${lineIndex}: некорректный cancelled_at` }
    }
    payload.cancelled_at = iso
  }

  const arrRaw = pick(row, 'annual_renewal_at_risk').trim().toLowerCase()
  if (arrRaw !== '') {
    if (!['0', '1', 'true', 'false', 'yes', 'no'].includes(arrRaw)) {
      return { ok: false, reason: `Строка ${lineIndex}: annual_renewal_at_risk — 0/1 или true/false` }
    }
    payload.annual_renewal_at_risk = arrRaw === '1' || arrRaw === 'true' || arrRaw === 'yes'
  }

  return {
    ok: true,
    id,
    payload,
  }
}
