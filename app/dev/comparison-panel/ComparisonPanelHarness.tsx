'use client'

import { useState } from 'react'
import { LangProvider } from '@/lib/LangContext'
import { TYPE_FEATURE_KEYS, type ServiceEntry } from '@/lib/service-comparison-db'
import type { Subscription } from '@/lib/supabase/types'
import { ComparisonPanel, type ServiceGroup } from '../../dashboard/SavingsSimulatorView'

// ─── Deterministic mock data ───────────────────────────────────────────────
// Real ServiceRecommendation/role outcomes depend on price confidence, usage
// signals and feature levels — so the mock entries below are tuned (not
// arbitrary) to exercise every branch of buildServiceRecommendation /
// getComparisonCandidates that the real ComparisonPanel renders:
//   Apple Music      → role: direct_competitor, price: region_dependent/low → action: check
//   YouTube Premium  → role: bundle (relative to YT Music), isBundle        → action: not_enough_data
//   Яндекс Плюс      → role: alternative (ecosystem_bundle, not music)      → action: keep (exclusive)
//   Spotify          → role: direct_competitor, has unique feature          → action: keep (exclusive)
//   YouTube Music    → role: included_service, unused 45 days               → action: cancel

const REFERENCE_NOW = Date.now()

function daysAgo(days: number): string {
  return new Date(REFERENCE_NOW - days * 86_400_000).toISOString()
}

function musicFeature(key: string, label: string, value: string, level: 'good' | 'ok' | 'muted') {
  return { key, label, value, level }
}

const appleMusicEntry: ServiceEntry = {
  id: 'mock-apple-music',
  names: ['apple music'],
  displayName: 'Apple Music',
  type: 'music',
  tagline: 'Lossless и Dolby Atmos из коробки',
  features: [
    musicFeature('library', 'Библиотека', '100 млн+ треков', 'good'),
    musicFeature('quality', 'Качество звука', 'Lossless + Dolby Atmos', 'good'),
    musicFeature('lossless', 'Lossless / Hi-Fi', '★ бесплатно для всех', 'good'),
    musicFeature('offline', 'Офлайн', '✓', 'good'),
    musicFeature('podcast', 'Подкасты', '✓', 'good'),
    musicFeature('exclusive', 'Эксклюзивы', 'Beats 1 Radio', 'ok'),
    musicFeature('family', 'Семейный план', '✓ Family Sharing', 'good'),
    musicFeature('extras', 'Входит в пакет', 'iTunes Match', 'good'),
  ],
  monthlyPrice: 549,
  primaryComparisonGroup: 'music_streaming',
  comparisonGroups: ['music_streaming'],
  price: {
    amount: 549,
    currency: 'RUB',
    confidence: 'low',
    displayType: 'region_dependent',
    note: 'Цена зависит от региона App Store и способа оплаты — уточните перед сравнением.',
  },
}

const youtubePremiumEntry: ServiceEntry = {
  id: 'mock-youtube-premium',
  names: ['youtube premium'],
  displayName: 'YouTube Premium',
  type: 'music',
  tagline: 'YouTube без рекламы + YouTube Music внутри',
  bundleNote: 'Включает YouTube Music — отдельно платить за него не нужно.',
  features: [
    musicFeature('library', 'Библиотека', 'Видео + музыка YouTube', 'good'),
    musicFeature('quality', 'Качество звука', 'до 256 kbps', 'ok'),
    musicFeature('lossless', 'Lossless / Hi-Fi', '— нет', 'muted'),
    musicFeature('offline', 'Офлайн', '✓', 'good'),
    musicFeature('podcast', 'Подкасты', '✓', 'ok'),
    musicFeature('exclusive', 'Эксклюзивы', 'Контент создателей YouTube', 'ok'),
    musicFeature('family', 'Семейный план', '✓ Family Premium', 'good'),
    musicFeature('extras', 'Входит в пакет', 'YouTube Music уже внутри', 'good'),
  ],
  monthlyPrice: 459,
  isBundle: true,
  includedServiceIds: ['mock-youtube-music'],
  primaryComparisonGroup: 'video_streaming',
  comparisonGroups: ['video_streaming', 'music_streaming'],
  price: { amount: 459, currency: 'RUB', confidence: 'medium', displayType: 'approximate', note: 'Цена ориентировочная — подтвердите перед сравнением.' },
}

const yandexPlusEntry: ServiceEntry = {
  id: 'mock-yandex-plus',
  names: ['яндекс плюс'],
  displayName: 'Яндекс Плюс',
  type: 'music',
  tagline: 'Музыка + Кинопоиск + Такси + кешбэк в одной подписке',
  bundleNote: 'Это экосистемный пакет — не заменяет отдельный музыкальный сервис целиком.',
  features: [
    musicFeature('library', 'Библиотека', '90 млн+ треков', 'good'),
    musicFeature('quality', 'Качество звука', 'до 320 kbps', 'ok'),
    musicFeature('lossless', 'Lossless / Hi-Fi', 'HiFi-тариф отдельно', 'ok'),
    musicFeature('offline', 'Офлайн', '✓', 'good'),
    musicFeature('podcast', 'Подкасты', '✓', 'ok'),
    musicFeature('exclusive', 'Эксклюзивы', 'Кешбэк, Такси, Маркет — экосистема', 'good'),
    musicFeature('family', 'Семейный план', '✓ Яндекс Семья', 'good'),
    musicFeature('extras', 'Входит в пакет', 'Кинопоиск, Такси, Маркет', 'good'),
  ],
  monthlyPrice: 399,
  isBundle: true,
  primaryComparisonGroup: 'ecosystem_bundle',
  comparisonGroups: ['ecosystem_bundle', 'music_streaming', 'video_streaming'],
  price: { amount: 399, currency: 'RUB', confidence: 'medium', displayType: 'approximate', note: 'Цена ориентировочная — подтвердите перед сравнением.' },
}

const spotifyEntry: ServiceEntry = {
  id: 'mock-spotify',
  names: ['spotify'],
  displayName: 'Spotify',
  type: 'music',
  tagline: 'Крупнейшая библиотека подкастов и персональные рекомендации',
  features: [
    musicFeature('library', 'Библиотека', '100 млн+ треков', 'ok'),
    musicFeature('quality', 'Качество звука', 'до 320 kbps', 'ok'),
    musicFeature('lossless', 'Lossless / Hi-Fi', '— нет', 'muted'),
    musicFeature('offline', 'Офлайн', '✓', 'ok'),
    musicFeature('podcast', 'Подкасты', '✓ крупнейшая база', 'muted'),
    musicFeature('exclusive', 'Эксклюзивы', '★ Подкасты-эксклюзивы (Rogan)', 'good'),
    musicFeature('family', 'Семейный план', '✓ до 6 человек', 'muted'),
    musicFeature('extras', 'Входит в пакет', '— только музыка', 'muted'),
  ],
  monthlyPrice: 299,
  primaryComparisonGroup: 'music_streaming',
  comparisonGroups: ['music_streaming'],
  price: { amount: 299, currency: 'RUB', confidence: 'medium', displayType: 'approximate', note: 'Цена ориентировочная — подтвердите перед сравнением.' },
}

const youtubeMusicEntry: ServiceEntry = {
  id: 'mock-youtube-music',
  names: ['youtube music'],
  displayName: 'YouTube Music',
  type: 'music',
  tagline: 'Музыка + видеоклипы, входит в YouTube Premium',
  features: [
    musicFeature('library', 'Библиотека', '100 млн+ + клипы', 'good'),
    musicFeature('quality', 'Качество звука', 'до 256 kbps', 'ok'),
    musicFeature('lossless', 'Lossless / Hi-Fi', '— нет', 'muted'),
    musicFeature('offline', 'Офлайн', '✓', 'good'),
    musicFeature('podcast', 'Подкасты', '✓', 'ok'),
    musicFeature('exclusive', 'Эксклюзивы', 'Клипы и концерты YouTube', 'ok'),
    musicFeature('family', 'Семейный план', '✓ Family Premium', 'good'),
    musicFeature('extras', 'Входит в пакет', 'Входит в YouTube Premium', 'good'),
  ],
  monthlyPrice: 199,
  includedInServiceIds: ['mock-youtube-premium'],
  primaryComparisonGroup: 'music_streaming',
  comparisonGroups: ['music_streaming'],
  price: {
    amount: 199,
    currency: 'RUB',
    confidence: 'low',
    displayType: 'approximate',
    note: 'Цена ориентировочная и не подтверждена напрямую — подтвердите перед сравнением.',
  },
}

function mockSubscription(overrides: {
  id: string
  name: string
  amount: number
  lastUsedAt: string | null
}): Subscription {
  return {
    id: overrides.id,
    user_id: 'mock-user',
    category_id: null,
    category_slug: 'entertainment',
    name: overrides.name,
    amount: overrides.amount,
    currency: 'RUB',
    billing_cycle: 'monthly',
    billing_interval: 1,
    custom_interval_days: null,
    first_charge_date: daysAgo(180),
    next_charge_date: daysAgo(-10),
    free_trial_end_date: null,
    renewal_type: 'auto_renew',
    cancellation_url: null,
    management_url: null,
    pricing_url: null,
    notes: null,
    card_color_preset: null,
    status: 'active',
    icon: null,
    price_increase_flag: false,
    annual_renewal_at_risk: false,
    last_used_at: overrides.lastUsedAt,
    cancelled_at: null,
    paused_at: null,
    archived_at: null,
    created_at: daysAgo(180),
    updated_at: daysAgo(1),
  }
}

function buildMockGroup(): ServiceGroup {
  // Sorted by monthly cost descending — mirrors getCategoryComparisons' real ordering.
  const members: { entry: ServiceEntry; amount: number; lastUsedDays: number | null }[] = [
    { entry: appleMusicEntry, amount: 549, lastUsedDays: 1 },
    { entry: youtubePremiumEntry, amount: 459, lastUsedDays: 2 },
    { entry: yandexPlusEntry, amount: 399, lastUsedDays: 3 },
    { entry: spotifyEntry, amount: 299, lastUsedDays: 0 },
    { entry: youtubeMusicEntry, amount: 199, lastUsedDays: 45 }, // unused ≥30 days → triggers "cancel"
  ]

  const subs = members.map(({ entry, amount, lastUsedDays }) =>
    mockSubscription({
      id: `${entry.id}-sub`,
      name: entry.displayName ?? entry.names[0],
      amount,
      lastUsedAt: lastUsedDays === null ? null : daysAgo(lastUsedDays),
    }),
  )

  return {
    groupKey: 'music_streaming',
    label: 'Музыкальные стриминги',
    subs,
    entries: members.map(m => m.entry),
    featureKeys: TYPE_FEATURE_KEYS.music,
  }
}

export default function ComparisonPanelHarness() {
  const [group] = useState<ServiceGroup>(() => buildMockGroup())
  const [cutIds, setCutIds] = useState<Set<string>>(() => new Set())

  const handleCut = (id: string) => {
    setCutIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const handleKeepOnly = (keepId: string, groupIds: string[]) => {
    setCutIds(prev => {
      const next = new Set(prev)
      for (const id of groupIds) if (id !== keepId) next.add(id)
      return next
    })
  }

  return (
    <LangProvider>
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-[#d8d4cb] bg-[#fcfbf8] p-4 text-xs text-[#6b6b80]">
          <p className="font-semibold text-[#1a1a2e]">Dev-only превью ComparisonPanel</p>
          <p className="mt-1">
            Детерминированные мок-данные: Apple Music (цена зависит от региона → «проверить»),
            YouTube Premium (бандл с YouTube Music → «недостаточно данных»), Яндекс Плюс
            (экосистемный пакет, не прямой конкурент → «оставить»), Spotify (прямой конкурент с
            уникальной функцией → «оставить»), YouTube Music (включён в Premium, не использовался
            45 дней → «можно отключить»).
          </p>
        </div>
        <ComparisonPanel
          groups={[group]}
          cutIds={cutIds}
          onCut={handleCut}
          onKeepOnly={handleKeepOnly}
        />
      </div>
    </LangProvider>
  )
}
