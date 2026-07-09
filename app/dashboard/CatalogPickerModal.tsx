'use client'

/**
 * Каталог регулярных платежей — модалка "умный чек-лист".
 * Шаг 1: выбор сервисов (поиск, категории, мультивыбор).
 * Шаг 2: уточнение деталей (сумма/дата — опционально).
 * Сохранение — bulk server action createSubscriptionsFromCatalog.
 */
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import PaymentServiceIcon from './PaymentServiceIcon'
import { useLang } from '@/lib/LangContext'
import {
  CATALOG_CATEGORY_IDS,
  matchesCatalogQuery,
  SUBSCRIPTION_CATALOG,
  type CatalogCategoryId,
} from '@/lib/subscription-catalog'
import { createSubscriptionsFromCatalog, type CatalogSaveItem } from './subscriptions/catalog-actions'

type Props = {
  open: boolean
  onClose: () => void
  defaultCurrency: string
  /** Открыть ручную форму добавления (существующий AddPaymentModal) */
  onOpenManual: () => void
}

interface DetailsRow {
  catalogId: string
  amount: string
  dateYmd: string
  dontRemember: boolean
  dateLater: boolean
  isTrial: boolean
}

function ymdInDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const catLabelKey: Record<CatalogCategoryId, string> = {
  video: 'catVideo', music: 'catMusic', mobile: 'catMobile', cloud: 'catCloud',
  shopping: 'catShopping', health: 'catHealth', education: 'catEducation',
  games: 'catGames', work: 'catWork', home: 'catHome', other: 'catOther',
}

export default function CatalogPickerModal({ open, onClose, defaultCurrency, onOpenManual }: Props) {
  const router = useRouter()
  const { strings } = useLang()
  const c = strings.catalog

  const [step, setStep] = useState<'pick' | 'details'>('pick')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CatalogCategoryId | 'all'>('all')
  const [selected, setSelected] = useState<string[]>([])
  const [rows, setRows] = useState<DetailsRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const catLabels = useMemo(() => {
    const map = {} as Record<CatalogCategoryId, string>
    for (const id of CATALOG_CATEGORY_IDS) {
      map[id] = (c as unknown as Record<string, string>)[catLabelKey[id]]
    }
    return map
  }, [c])

  const filtered = useMemo(
    () =>
      SUBSCRIPTION_CATALOG.filter((entry) => {
        if (category !== 'all' && entry.category !== category) return false
        return matchesCatalogQuery(entry, query, catLabels[entry.category])
      }),
    [query, category, catLabels],
  )
  const showPopular = query.trim() === '' && category === 'all'
  const popular = filtered.filter((entry) => entry.popular)
  const rest = showPopular ? filtered.filter((entry) => !entry.popular) : filtered

  if (!open) return null

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function goDetails() {
    if (selected.length === 0) return
    setRows(
      selected.map((catalogId) => ({
        catalogId,
        amount: '',
        dateYmd: ymdInDays(30),
        dontRemember: false,
        dateLater: false,
        isTrial: false,
      })),
    )
    setStep('details')
  }

  function updateRow(catalogId: string, next: Partial<DetailsRow>) {
    setRows((prev) => prev.map((row) => (row.catalogId === catalogId ? { ...row, ...next } : row)))
  }

  async function save() {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const items: CatalogSaveItem[] = rows.map((row) => ({
        catalogId: row.catalogId,
        amount: row.dontRemember ? 0 : Number(row.amount.replace(',', '.')) || 0,
        currency: defaultCurrency,
        nextChargeDate: row.dateLater ? null : row.dateYmd,
        isTrial: row.isTrial,
      }))
      const result = await createSubscriptionsFromCatalog(items)
      if (!result.ok) {
        setError(c.saveError)
        return
      }
      onClose()
      setStep('pick')
      setSelected([])
      router.replace('/dashboard?tab=payments&subscriptionCreated=1')
      router.refresh()
    } catch {
      setError(c.saveError)
    } finally {
      setSaving(false)
    }
  }

  const chipCls = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
      active
        ? 'border-[#1a1a2e] bg-[#1a1a2e] text-white'
        : 'border-[rgba(26,26,61,0.10)] bg-white text-[#6b6b80] hover:bg-[#f6f4ef]'
    }`

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-picker-title"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="absolute inset-0 bg-[rgba(26,26,46,0.45)]" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[86vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_18px_60px_rgba(26,26,61,0.22)]">
        {/* Header */}
        <div className="border-b border-[rgba(26,26,61,0.07)] px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="catalog-picker-title" className="m-0 text-[1.1rem] font-bold text-[#1a1a2e]">
                {step === 'pick' ? c.title : c.detailsTitle}
              </h2>
              <p className="m-0 mt-1 text-[0.8rem] text-[#6b6b80]">
                {step === 'pick' ? c.subtitle : c.detailsSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-[#6b6b80] hover:bg-[#f6f4ef]"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {step === 'pick' ? (
          <>
            {/* Search + chips */}
            <div className="px-6 pt-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={c.searchPlaceholder}
                className="block w-full rounded-[10px] border border-[rgba(26,26,61,0.10)] px-3 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#5b43d4]/30"
              />
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                <button type="button" className={chipCls(category === 'all')} onClick={() => setCategory('all')}>
                  {c.catAll}
                </button>
                {CATALOG_CATEGORY_IDS.map((id) => (
                  <button key={id} type="button" className={chipCls(category === id)} onClick={() => setCategory(id)}>
                    {catLabels[id]}
                  </button>
                ))}
              </div>
            </div>

            {/* Services */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <p className="m-0 text-sm font-semibold text-[#1a1a2e]">{c.emptyTitle}</p>
                  <button
                    type="button"
                    onClick={() => { onClose(); onOpenManual() }}
                    className="rounded-[10px] bg-[#5b43d4] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    {c.emptyCta}
                  </button>
                </div>
              ) : (
                <>
                  {showPopular && popular.length > 0 && (
                    <>
                      <p className="mb-2 mt-0 text-[0.68rem] font-bold uppercase tracking-wider text-[#9a93a8]">{c.popular}</p>
                      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {popular.map((entry) => (
                          <ServiceCard key={entry.id} entry={entry} label={catLabels[entry.category]} selected={selected.includes(entry.id)} onToggle={() => toggle(entry.id)} />
                        ))}
                      </div>
                      <p className="mb-2 mt-0 text-[0.68rem] font-bold uppercase tracking-wider text-[#9a93a8]">{c.all}</p>
                    </>
                  )}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {rest.map((entry) => (
                      <ServiceCard key={entry.id} entry={entry} label={catLabels[entry.category]} selected={selected.includes(entry.id)} onToggle={() => toggle(entry.id)} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-[rgba(26,26,61,0.07)] px-6 py-4">
              <span className="text-sm font-semibold text-[#1a1a2e]">{c.selectedCount(selected.length)}</span>
              <button
                type="button"
                disabled={selected.length === 0}
                onClick={goDetails}
                className="rounded-[10px] bg-[#5b43d4] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {c.continueButton}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Details */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-3">
                {rows.map((row) => {
                  const entry = SUBSCRIPTION_CATALOG.find((s) => s.id === row.catalogId)
                  if (!entry) return null
                  return (
                    <div key={row.catalogId} className="rounded-[14px] border border-[rgba(26,26,61,0.08)] p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <PaymentServiceIcon icon={entry.icon} categorySlug={entry.categorySlug} size={38} />
                        <div>
                          <p className="m-0 text-sm font-bold text-[#1a1a2e]">{entry.name}</p>
                          <p className="m-0 text-xs text-[#9a93a8]">{catLabels[entry.category]}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {!row.dontRemember && (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={row.amount}
                            onChange={(e) => updateRow(row.catalogId, { amount: e.target.value.replace(/[^\d.,]/g, '') })}
                            placeholder={`${c.amountPlaceholder}, ${defaultCurrency}${entry.typicalPriceRange ? ` (~${entry.typicalPriceRange[0]}–${entry.typicalPriceRange[1]})` : ''}`}
                            className="block w-full rounded-[10px] border border-[rgba(26,26,61,0.10)] px-3 py-2 text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#5b43d4]/30"
                          />
                        )}
                        {!row.dateLater && (
                          <input
                            type="date"
                            value={row.dateYmd}
                            onChange={(e) => updateRow(row.catalogId, { dateYmd: e.target.value })}
                            className="block w-full rounded-[10px] border border-[rgba(26,26,61,0.10)] px-3 py-2 text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#5b43d4]/30"
                          />
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#6b6b80]">
                        <label className="flex cursor-pointer items-center gap-1.5">
                          <input type="checkbox" checked={row.dontRemember} onChange={(e) => updateRow(row.catalogId, { dontRemember: e.target.checked })} />
                          {c.dontRemember}
                        </label>
                        <label className="flex cursor-pointer items-center gap-1.5">
                          <input type="checkbox" checked={row.dateLater} onChange={(e) => updateRow(row.catalogId, { dateLater: e.target.checked })} />
                          {c.dateLater}
                        </label>
                        {entry.canBeTrial && (
                          <label className="flex cursor-pointer items-center gap-1.5">
                            <input type="checkbox" checked={row.isTrial} onChange={(e) => updateRow(row.catalogId, { isTrial: e.target.checked })} />
                            {c.trial}
                          </label>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {error && <p className="mt-3 text-sm font-semibold text-[#e5484d]">{error}</p>}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[rgba(26,26,61,0.07)] px-6 py-4">
              <button
                type="button"
                onClick={() => setStep('pick')}
                className="rounded-[10px] border border-[rgba(26,26,61,0.12)] px-4 py-2.5 text-sm font-semibold text-[#1a1a2e] hover:bg-[#f6f4ef]"
              >
                {c.backButton}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="rounded-[10px] bg-[#5b43d4] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? c.savingButton : c.saveButton}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ServiceCard({ entry, label, selected, onToggle }: {
  entry: (typeof SUBSCRIPTION_CATALOG)[number]
  label: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-colors cursor-pointer ${
        selected
          ? 'border-[#7BAE7F] bg-[rgba(123,174,127,0.10)]'
          : 'border-[rgba(26,26,61,0.08)] bg-white hover:bg-[#faf8f4]'
      }`}
    >
      <PaymentServiceIcon icon={entry.icon} categorySlug={entry.categorySlug} size={34} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#1a1a2e]">{entry.name}</span>
        <span className="block truncate text-[0.7rem] text-[#9a93a8]">{label}</span>
      </span>
      <span
        aria-hidden
        className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border ${
          selected ? 'border-[#7BAE7F] bg-[#7BAE7F]' : 'border-[rgba(26,26,61,0.15)] bg-white'
        }`}
      >
        {selected && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4.2 7.2L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  )
}
