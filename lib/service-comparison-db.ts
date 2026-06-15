import { fmtCurrency } from '@/lib/currency'

export type FeatureLevel = 'good' | 'ok' | 'muted'

export interface Feature {
  key: string
  label: string
  value: string
  level: FeatureLevel
}

export type ServiceType =
  | 'music'
  | 'video'
  | 'ai'
  | 'dev'
  | 'cloud'
  | 'creative'
  | 'productivity'
  | 'education'

export interface FamilyPlan {
  slots: number       // максимум аккаунтов
  monthlyApprox: number  // примерная цена семейного плана в месяц
  currency: string    // валюта
}

export interface ServiceEntry {
  id: string
  names: string[] // lowercase normalized variants for matching
  /** Красивое отображаемое имя (если автокапитализация names[0] неверна, напр. ChatGPT, GitHub) */
  displayName?: string
  type: ServiceType
  /** Дополнительные типы — для пакетных сервисов (Яндекс Плюс: music + video) */
  additionalTypes?: ServiceType[]
  tagline: string
  taglineEn?: string
  features: Feature[]
  /** Семейный / групповой план, если есть */
  familyPlan?: FamilyPlan
  /**
   * Стоимость годового плана в рублях (разовый платёж).
   * Отсутствие поля = у сервиса нет известного годового тарифа.
   * Используется для сценария «Перейти на годовой тариф» — только для честных расчётов.
   */
  annualPrice?: number
  /**
   * IDs сервисов из SERVICE_DB, которые входят в данный пакет.
   * Если у пользователя есть пакет + один из included-сервисов отдельно,
   * пользователь переплачивает — он уже оплачен в пакете.
   * Пример: Яндекс Плюс includedServiceIds: ['kinopoisk'] → Кинопоиск уже внутри.
   */
  includedServiceIds?: string[]
  /**
   * Примерная стоимость стандартного платного плана в месяц.
   * Валюта — priceCurrency (по умолчанию 'RUB').
   * Используется для сценария «Дешевле на рынке» — сравниваем с рыночными аналогами.
   * Цены ориентировочные (апрель 2025).
   */
  monthlyPrice?: number
  /** Валюта monthlyPrice. По умолчанию 'RUB'. */
  priceCurrency?: string
  /**
   * Пояснение для пакетных сервисов: что именно перекрывает бандл,
   * а что НЕ перекрывает (для честных сравнений в дубликатах).
   * Отображается в DuplicatesPanel как контекстная плашка.
   */
  bundleNote?: string

  // ─── Сравнение и рекомендации ───────────────────────────────────────────
  /**
   * Группы сравнения — более тонкая классификация, чем `type`/`additionalTypes`.
   * Отвечает на вопрос «честно ли вообще сравнивать A и Б и в какой роли»,
   * а не «какие фичи показывать в таблице» (это по-прежнему делает `type`).
   * Заполняется автоматически в `SERVICE_DB` через `applyComparisonDefaults`.
   */
  comparisonGroups?: ComparisonGroup[]
  /** Основная группа сравнения — определяет, кто «прямой конкурент». */
  primaryComparisonGroup?: ComparisonGroup
  /** Честная информация о цене с уровнем доверия — источник истины для отображения. */
  price?: ServicePriceInfo
  /**
   * Обратная связь к `includedServiceIds`: в какие пакеты входит этот сервис.
   * Пример: youtube-music.includedInServiceIds = ['youtube-premium'].
   */
  includedInServiceIds?: string[]
  /** Является ли сервис пакетом, объединяющим несколько направлений. */
  isBundle?: boolean
  /** IDs сервисов, сравнение с которыми вводит в заблуждение (разные категории). */
  notComparableWith?: string[]
  /** Контекстное пояснение для честного сравнения (показывается в панели сравнения). */
  comparisonNotes?: string
}

/**
 * Группа сравнения — более узкая классификация «зачем вообще сравнивать A и Б»,
 * ортогональная `ServiceType` (тот отвечает за то, какие фичи показывать).
 */
export type ComparisonGroup =
  | 'music_streaming'
  | 'video_streaming'
  | 'ecosystem_bundle'
  | 'ai_assistant'
  | 'ai_image_generation'
  | 'dev_tools'
  | 'cloud_storage'
  | 'creative_design'
  | 'creative_video'
  | 'education_language'
  | 'education_courses'
  | 'productivity_notes'
  | 'office_suite'
  | 'fitness'
  | 'health_wellness'

/** Роль сервиса-кандидата в сравнении с базовым сервисом пользователя. */
export type ServiceRoleInComparison =
  | 'direct_competitor'
  | 'bundle'
  | 'included_service'
  | 'alternative'
  | 'not_comparable'

/** Насколько мы уверены в цене сервиса. */
export type PriceConfidence = 'verified' | 'high' | 'medium' | 'low' | 'unknown'

/** Как честно отображать цену пользователю. */
export type PriceDisplayType = 'fixed' | 'approximate' | 'from' | 'region_dependent' | 'unknown' | 'promo'

export interface ServicePriceInfo {
  amount?: number
  currency?: string
  confidence: PriceConfidence
  displayType: PriceDisplayType
  /** Контекстная пометка — например, «Цена ориентировочная — подтвердите перед сравнением». */
  note?: string
}

/** Сервис-кандидат для сравнения с базовым, с присвоенной ролью и кратким объяснением. */
export interface ComparisonCandidate {
  entry: ServiceEntry
  role: ServiceRoleInComparison
  reason: string
}

export type RecommendationAction = 'keep' | 'cancel' | 'replace' | 'check' | 'not_enough_data'
export type RecommendationConfidence = 'high' | 'medium' | 'low'

/** Рекомендация по конкретной подписке пользователя — решение, а не просто факт сравнения. */
export interface ServiceRecommendation {
  subscriptionId: string
  entry?: ServiceEntry
  action: RecommendationAction
  confidence: RecommendationConfidence
  title: string
  /** Положительные основания для рекомендации. */
  reasons: string[]
  /** Что пользователь потеряет, если последует рекомендации. */
  tradeoffs: string[]
  /** Заполняется только когда оба сервиса имеют надёжную цену в одной валюте. */
  estimatedMonthlySaving?: { amount: number; currency: string }
  /** Предупреждение вместо точной экономии — когда цена ненадёжна. */
  warning?: string
  /** Сервис-кандидат, на который можно переключиться (для action === 'replace'). */
  candidate?: ServiceEntry
}

/** Результат поиска сервиса по имени — с оценкой уверенности и типом совпадения. */
export interface ServiceMatch {
  entry: ServiceEntry
  score: number
  matchType: 'exact' | 'alias_contains' | 'token' | 'keyword'
}

export const TYPE_FEATURE_KEYS: Record<ServiceType, { key: string; label: string }[]> = {
  music: [
    { key: 'library',   label: 'Библиотека' },
    { key: 'quality',   label: 'Качество звука' },
    { key: 'lossless',  label: 'Lossless / Hi-Fi' },
    { key: 'offline',   label: 'Офлайн' },
    { key: 'podcast',   label: 'Подкасты' },
    { key: 'exclusive', label: 'Эксклюзивы' },
    { key: 'family',    label: 'Семейный план' },
    { key: 'extras',    label: 'Входит в пакет' },
  ],
  video: [
    { key: 'quality',   label: 'Качество' },
    { key: 'screens',   label: 'Экранов одновременно' },
    { key: 'offline',   label: 'Офлайн' },
    { key: 'originals', label: 'Оригинальный контент' },
    { key: 'exclusive', label: 'Только здесь' },
    { key: 'ads',       label: 'Реклама' },
    { key: 'extras',    label: 'Дополнительно' },
  ],
  ai: [
    { key: 'model',      label: 'Модель' },
    { key: 'context',    label: 'Контекст' },
    { key: 'image_gen',  label: 'Генерация изображений' },
    { key: 'code',       label: 'Работа с кодом' },
    { key: 'web_search', label: 'Поиск в интернете' },
    { key: 'voice',      label: 'Голосовой режим' },
    { key: 'exclusive',  label: 'Уникально' },
  ],
  dev: [
    { key: 'focus',       label: 'Специализация' },
    { key: 'ide',         label: 'Интеграция с IDE' },
    { key: 'completions', label: 'Автодополнение' },
    { key: 'chat',        label: 'Чат-ассистент' },
    { key: 'review',      label: 'Проверка кода' },
    { key: 'model',       label: 'Модель' },
    { key: 'exclusive',   label: 'Уникально' },
  ],
  cloud: [
    { key: 'storage',     label: 'Хранилище' },
    { key: 'sharing',     label: 'Совместный доступ' },
    { key: 'platforms',   label: 'Платформы' },
    { key: 'office',      label: 'Работа с документами' },
    { key: 'photos',      label: 'Фотографии' },
    { key: 'encryption',  label: 'Шифрование' },
  ],
  creative: [
    { key: 'apps',      label: 'Приложения' },
    { key: 'collab',    label: 'Совместная работа' },
    { key: 'cloud',     label: 'Облако' },
    { key: 'export',    label: 'Форматы экспорта' },
    { key: 'web',       label: 'Веб-версия' },
    { key: 'ai_tools',  label: 'ИИ-инструменты' },
    { key: 'templates', label: 'Шаблоны' },
  ],
  productivity: [
    { key: 'type',         label: 'Тип инструмента' },
    { key: 'collab',       label: 'Совместная работа' },
    { key: 'offline',      label: 'Офлайн' },
    { key: 'ai',          label: 'ИИ-функции' },
    { key: 'platforms',    label: 'Платформы' },
    { key: 'database',     label: 'Базы данных' },
    { key: 'integrations', label: 'Интеграции' },
  ],
  education: [
    { key: 'languages',  label: 'Языков / курсов' },
    { key: 'ads',        label: 'Реклама' },
    { key: 'offline',    label: 'Офлайн' },
    { key: 'progress',   label: 'Прогресс и аналитика' },
    { key: 'speech',     label: 'Распознавание речи' },
    { key: 'community',  label: 'Сообщество' },
    { key: 'family',     label: 'Семейный план' },
    { key: 'cert',       label: 'Сертификат' },
  ],
}

/** Сырые данные — без вычисляемых полей сравнения (см. `applyComparisonDefaults` ниже). */
const RAW_SERVICE_DB: ServiceEntry[] = [
  // ─── MUSIC ───────────────────────────────────────────────────────────────
  {
    id: 'spotify',
    names: ['spotify'],
    type: 'music',
    tagline: 'Крупнейшая библиотека подкастов и персональные рекомендации',
    taglineEn: 'Largest podcast library and personalized recommendations',
    monthlyPrice: 299,
    annualPrice: 2990,   // ≈249 ₽/мес vs 299 ₽ — экономия ~600 ₽/год
    familyPlan: { slots: 6, monthlyApprox: 449, currency: 'RUB' },
    features: [
      { key: 'library',   label: 'Библиотека',    value: '100 млн+ треков',               level: 'good' },
      { key: 'quality',   label: 'Качество',       value: 'до 320 kbps',                   level: 'ok'   },
      { key: 'lossless',  label: 'Lossless',       value: '— нет',                         level: 'muted'},
      { key: 'offline',   label: 'Офлайн',         value: '✓',                             level: 'good' },
      { key: 'podcast',   label: 'Подкасты',       value: '✓ крупнейшая база',             level: 'good' },
      { key: 'exclusive', label: 'Эксклюзивы',    value: '★ Подкасты-эксклюзивы (Rogan)', level: 'good' },
      { key: 'family',    label: 'Семейный план',  value: '✓ до 6 человек',                level: 'good' },
      { key: 'extras',    label: 'Пакет',          value: '— только музыка',               level: 'muted'},
    ],
  },
  {
    id: 'yandex-plus',
    names: ['яндекс плюс', 'яндекс+', 'yandex plus', 'яндекс музыка'],
    displayName: 'Яндекс Плюс',
    type: 'music',
    additionalTypes: ['video'], // входит Кинопоиск
    tagline: 'Музыка + Кинопоиск + Такси + кешбэк в одной подписке',
    taglineEn: 'Music + Kinopoisk + Taxi + cashback in one subscription',
    bundleNote: 'Включает Кинопоиск — он не заменяет Netflix, Disney+ и другие западные библиотеки',
    monthlyPrice: 399,
    annualPrice: 3990,   // ≈332 ₽/мес vs 399 ₽ — экономия ~798 ₽/год
    includedServiceIds: ['kinopoisk'],  // Кинопоиск входит в Плюс
    familyPlan: { slots: 4, monthlyApprox: 449, currency: 'RUB' },
    features: [
      { key: 'library',   label: 'Библиотека',    value: '90 млн+ треков',                level: 'good' },
      { key: 'quality',   label: 'Качество',       value: 'до 320 kbps, HiFi в пакете',   level: 'good' },
      { key: 'lossless',  label: 'Lossless',       value: 'HiFi-тариф отдельно',          level: 'ok'   },
      { key: 'offline',   label: 'Офлайн',         value: '✓',                             level: 'good' },
      { key: 'podcast',   label: 'Подкасты',       value: '✓',                             level: 'ok'   },
      { key: 'exclusive', label: 'Эксклюзивы',    value: 'Яндекс-эксклюзивные релизы',   level: 'ok'   },
      { key: 'family',    label: 'Семейный план',  value: '✓ Яндекс Семья',               level: 'good' },
      { key: 'extras',    label: 'Пакет',          value: 'Кинопоиск, Такси, Маркет, кешбэк', level: 'good'},
    ],
  },
  {
    id: 'apple-music',
    names: ['apple music'],
    displayName: 'Apple Music',
    type: 'music',
    tagline: 'Lossless и Dolby Atmos — лучшее качество среди стримингов',
    taglineEn: 'Lossless and Dolby Atmos — best audio quality among streamers',
    monthlyPrice: 549,
    annualPrice: 5490,   // ≈457 ₽/мес vs 549 ₽ — экономия ~1188 ₽/год
    familyPlan: { slots: 6, monthlyApprox: 449, currency: 'RUB' },
    features: [
      { key: 'library',   label: 'Библиотека',    value: '100 млн+ треков',               level: 'good' },
      { key: 'quality',   label: 'Качество',       value: 'Lossless + Dolby Atmos',        level: 'good' },
      { key: 'lossless',  label: 'Lossless',       value: '★ Lossless + Dolby Atmos бесп.', level: 'good'},
      { key: 'offline',   label: 'Офлайн',         value: '✓',                             level: 'good' },
      { key: 'podcast',   label: 'Подкасты',       value: '— отдельное приложение',        level: 'muted'},
      { key: 'exclusive', label: 'Эксклюзивы',    value: 'Beats 1 Radio, Apple Sessions', level: 'ok'   },
      { key: 'family',    label: 'Семейный план',  value: '✓ Family Sharing',             level: 'good' },
      { key: 'extras',    label: 'Пакет',          value: 'iTunes Match, синхронизация',   level: 'ok'   },
    ],
  },
  {
    id: 'youtube-music',
    names: ['youtube music', 'ютуб музыка'],
    displayName: 'YouTube Music',
    type: 'music',
    tagline: 'Музыка + видеоклипы, входит в YouTube Premium',
    taglineEn: 'Music + video clips, included in YouTube Premium',
    monthlyPrice: 299,
    familyPlan: { slots: 6, monthlyApprox: 699, currency: 'RUB' },
    features: [
      { key: 'library',   label: 'Библиотека',    value: '100 млн+ + клипы',              level: 'good' },
      { key: 'quality',   label: 'Качество',       value: 'до 256 kbps',                   level: 'ok'   },
      { key: 'lossless',  label: 'Lossless',       value: '— нет',                         level: 'muted'},
      { key: 'offline',   label: 'Офлайн',         value: '✓',                             level: 'good' },
      { key: 'podcast',   label: 'Подкасты',       value: '✓',                             level: 'ok'   },
      { key: 'exclusive', label: 'Эксклюзивы',    value: 'Клипы и концерты YouTube',      level: 'ok'   },
      { key: 'family',    label: 'Семейный план',  value: '✓ Family Premium',             level: 'good' },
      { key: 'extras',    label: 'Пакет',          value: 'Входит в YouTube Premium',      level: 'good' },
    ],
  },
  {
    id: 'deezer',
    names: ['deezer', 'дизер'],
    type: 'music',
    tagline: 'Стриминг с форматом FLAC и Flow-рекомендациями',
    taglineEn: 'Streaming with FLAC format and Flow recommendations',
    monthlyPrice: 299,
    features: [
      { key: 'library',   label: 'Библиотека',    value: '90 млн+ треков',                level: 'good' },
      { key: 'quality',   label: 'Качество',       value: 'до FLAC (HiFi тариф)',          level: 'good' },
      { key: 'lossless',  label: 'Lossless',       value: '✓ FLAC на HiFi-тарифе',        level: 'good' },
      { key: 'offline',   label: 'Офлайн',         value: '✓',                             level: 'good' },
      { key: 'podcast',   label: 'Подкасты',       value: '✓',                             level: 'ok'   },
      { key: 'exclusive', label: 'Эксклюзивы',    value: '— нет',                         level: 'muted'},
      { key: 'family',    label: 'Семейный план',  value: '✓ до 6 человек',               level: 'good' },
      { key: 'extras',    label: 'Пакет',          value: '— только музыка',               level: 'muted'},
    ],
  },
  {
    id: 'tidal',
    names: ['tidal', 'тайдал'],
    type: 'music',
    tagline: 'Audiophile-качество: MQA и Dolby Atmos',
    taglineEn: 'Audiophile quality: MQA and Dolby Atmos',
    monthlyPrice: 499,
    features: [
      { key: 'library',   label: 'Библиотека',    value: '100 млн+ треков',               level: 'good' },
      { key: 'quality',   label: 'Качество',       value: 'MQA Master + Dolby Atmos',      level: 'good' },
      { key: 'lossless',  label: 'Lossless',       value: '★ MQA Master — audiophile',     level: 'good' },
      { key: 'offline',   label: 'Офлайн',         value: '✓',                             level: 'good' },
      { key: 'podcast',   label: 'Подкасты',       value: '— нет',                         level: 'muted'},
      { key: 'exclusive', label: 'Эксклюзивы',    value: 'Artist Connect — ранний доступ', level: 'ok'  },
      { key: 'family',    label: 'Семейный план',  value: '✓ до 6 человек',               level: 'good' },
      { key: 'extras',    label: 'Пакет',          value: 'Видеоклипы в HQ',              level: 'ok'   },
    ],
  },

  // ─── VIDEO ───────────────────────────────────────────────────────────────
  {
    id: 'netflix',
    names: ['netflix', 'нетфликс'],
    type: 'video',
    tagline: 'Мировой лидер стриминга с сильными оригиналами',
    taglineEn: 'World leader in streaming with strong originals',
    monthlyPrice: 799,
    features: [
      { key: 'quality',   label: 'Качество',      value: '4K + HDR',                        level: 'good' },
      { key: 'screens',   label: 'Экранов',       value: '1–4 (по тарифу)',                 level: 'ok'   },
      { key: 'offline',   label: 'Офлайн',        value: '✓',                               level: 'good' },
      { key: 'originals', label: 'Оригиналы',     value: '✓ огромная библиотека',           level: 'good' },
      { key: 'exclusive', label: 'Только здесь',  value: '★ Stranger Things, Squid Game…', level: 'good' },
      { key: 'ads',       label: 'Реклама',       value: '— на базовом тарифе',             level: 'ok'   },
      { key: 'extras',    label: 'Доп.',           value: 'Игры на мобильных',              level: 'ok'   },
    ],
  },
  {
    id: 'youtube-premium',
    names: ['youtube premium', 'ютуб премиум'],
    displayName: 'YouTube Premium',
    type: 'video',
    additionalTypes: ['music'], // входит YouTube Music
    tagline: 'YouTube без рекламы + фоновый режим + YouTube Music',
    taglineEn: 'YouTube without ads + background mode + YouTube Music',
    bundleNote: 'Включает YouTube Music — но не заменяет Netflix, Disney+ и другие сервисы с лицензионным контентом',
    monthlyPrice: 459,
    annualPrice: 4990,   // ≈416 ₽/мес vs 459 ₽ — экономия ~812 ₽/год
    includedServiceIds: ['youtube-music'],  // YouTube Music входит в Premium
    familyPlan: { slots: 6, monthlyApprox: 699, currency: 'RUB' },
    features: [
      { key: 'quality',   label: 'Качество',      value: '4K / 8K (авторский контент)',     level: 'good' },
      { key: 'screens',   label: 'Экранов',       value: 'без ограничений',                 level: 'good' },
      { key: 'offline',   label: 'Офлайн',        value: '✓',                               level: 'good' },
      { key: 'originals', label: 'Оригиналы',     value: 'ограниченно',                     level: 'muted'},
      { key: 'exclusive', label: 'Только здесь',  value: 'Создатели YouTube (не фильмы)',   level: 'ok'   },
      { key: 'ads',       label: 'Реклама',       value: '✓ полностью отключена',           level: 'good' },
      { key: 'extras',    label: 'Доп.',           value: 'YouTube Music входит',            level: 'good' },
    ],
  },
  {
    id: 'kinopoisk',
    names: ['кинопоиск', 'kinopoisk', 'кинопоиск hd'],
    displayName: 'Кинопоиск HD',
    type: 'video',
    tagline: 'Крупнейшая русскоязычная библиотека фильмов и сериалов',
    taglineEn: 'Largest Russian-language movie and series library',
    monthlyPrice: 399,
    features: [
      { key: 'quality',   label: 'Качество',      value: '4K + HDR',                        level: 'good' },
      { key: 'screens',   label: 'Экранов',       value: '2 одновременно',                  level: 'ok'   },
      { key: 'offline',   label: 'Офлайн',        value: '✓',                               level: 'good' },
      { key: 'originals', label: 'Оригиналы',     value: '✓ российский контент',            level: 'good' },
      { key: 'exclusive', label: 'Только здесь',  value: '★ Российские сериалы КП',        level: 'good' },
      { key: 'ads',       label: 'Реклама',       value: '— нет',                           level: 'good' },
      { key: 'extras',    label: 'Доп.',           value: 'Входит в Яндекс Плюс',           level: 'ok'   },
    ],
  },
  {
    id: 'disney-plus',
    names: ['disney+', 'disney plus', 'дисней плюс'],
    displayName: 'Disney+',
    type: 'video',
    tagline: 'Disney, Marvel, Star Wars, Pixar — всё в одном',
    taglineEn: 'Disney, Marvel, Star Wars, Pixar — all in one',
    monthlyPrice: 599,
    features: [
      { key: 'quality',   label: 'Качество',      value: '4K + HDR + Dolby Vision',         level: 'good' },
      { key: 'screens',   label: 'Экранов',       value: '4 одновременно',                  level: 'good' },
      { key: 'offline',   label: 'Офлайн',        value: '✓',                               level: 'good' },
      { key: 'originals', label: 'Оригиналы',     value: '✓ Marvel, Star Wars, Pixar',     level: 'good' },
      { key: 'exclusive', label: 'Только здесь',  value: '★ Весь Marvel, Star Wars',       level: 'good' },
      { key: 'ads',       label: 'Реклама',       value: '— на базовом тарифе',             level: 'ok'   },
      { key: 'extras',    label: 'Доп.',           value: 'Star (взрослый контент)',         level: 'ok'   },
    ],
  },

  // ─── AI ──────────────────────────────────────────────────────────────────
  {
    id: 'chatgpt-plus',
    names: ['chatgpt plus', 'chatgpt', 'chat gpt plus'],
    displayName: 'ChatGPT Plus',
    type: 'ai',
    tagline: 'Универсальный ИИ: текст, код, изображения, голос',
    taglineEn: 'Universal AI: text, code, images, voice',
    monthlyPrice: 1700,
    annualPrice: 18000,  // $180/год → ≈16–19k ₽ (курс ~100 ₽/$) — ~17% скидка vs месяц
    features: [
      { key: 'model',      label: 'Модель',          value: 'GPT-4o + o1',                level: 'good' },
      { key: 'context',    label: 'Контекст',        value: '128k токенов',               level: 'good' },
      { key: 'image_gen',  label: 'Генерация изобр.', value: '✓ DALL·E 3',               level: 'good' },
      { key: 'code',       label: 'Код',             value: '✓ интерпретатор, отладка',   level: 'good' },
      { key: 'web_search', label: 'Поиск',           value: '✓',                          level: 'good' },
      { key: 'voice',      label: 'Голос',           value: '✓ Advanced Voice Mode',      level: 'good' },
      { key: 'exclusive',  label: 'Уникально',       value: '★ Голос + DALL·E + Code в связке', level: 'good' },
    ],
  },
  {
    id: 'claude-pro',
    names: ['claude pro', 'claude'],
    displayName: 'Claude Pro',
    type: 'ai',
    tagline: 'Сильный в анализе и длинных документах, 200k контекст',
    taglineEn: 'Strong in analysis and long documents, 200k context',
    monthlyPrice: 1700,
    features: [
      { key: 'model',      label: 'Модель',          value: 'Claude 3.5 Sonnet / Opus',   level: 'good' },
      { key: 'context',    label: 'Контекст',        value: '200k токенов',               level: 'good' },
      { key: 'image_gen',  label: 'Генерация изобр.', value: '— нет',                    level: 'muted'},
      { key: 'code',       label: 'Код',             value: '✓ сильный в анализе',        level: 'good' },
      { key: 'web_search', label: 'Поиск',           value: 'ограниченно',                level: 'ok'   },
      { key: 'voice',      label: 'Голос',           value: '— нет',                      level: 'muted'},
      { key: 'exclusive',  label: 'Уникально',       value: '★ 200k контекст — лучший для длинных задач', level: 'good' },
    ],
  },
  {
    id: 'gemini-advanced',
    names: ['gemini advanced', 'gemini', 'google one ai'],
    displayName: 'Gemini Advanced',
    type: 'ai',
    tagline: 'ИИ Google с интеграцией в Workspace и огромным контекстом',
    taglineEn: 'Google AI with Workspace integration and massive context',
    monthlyPrice: 1900,
    features: [
      { key: 'model',      label: 'Модель',          value: 'Gemini 1.5 Pro / Ultra',     level: 'good' },
      { key: 'context',    label: 'Контекст',        value: '1M токенов',                 level: 'good' },
      { key: 'image_gen',  label: 'Генерация изобр.', value: '✓ Imagen 3',               level: 'good' },
      { key: 'code',       label: 'Код',             value: '✓ Colab интеграция',         level: 'good' },
      { key: 'web_search', label: 'Поиск',           value: '✓ в реальном времени',       level: 'good' },
      { key: 'voice',      label: 'Голос',           value: '✓',                          level: 'good' },
      { key: 'exclusive',  label: 'Уникально',       value: '★ 1M контекст + Google Workspace', level: 'good' },
    ],
  },
  {
    id: 'midjourney',
    names: ['midjourney', 'мидджорни'],
    type: 'ai',
    tagline: 'Лучшее качество генерации изображений',
    taglineEn: 'Best quality AI image generation',
    monthlyPrice: 1000,
    features: [
      { key: 'model',      label: 'Модель',          value: 'MJ v6',                      level: 'good' },
      { key: 'context',    label: 'Контекст',        value: '— только изображения',       level: 'muted'},
      { key: 'image_gen',  label: 'Генерация изобр.', value: '✓ лучшее качество',        level: 'good' },
      { key: 'code',       label: 'Код',             value: '— нет',                      level: 'muted'},
      { key: 'web_search', label: 'Поиск',           value: '— нет',                      level: 'muted'},
      { key: 'voice',      label: 'Голос',           value: '— нет',                      level: 'muted'},
      { key: 'exclusive',  label: 'Уникально',       value: '★ Арт-генерация — лидер по реализму', level: 'good' },
    ],
  },
  {
    id: 'perplexity',
    names: ['perplexity', 'перплексити'],
    displayName: 'Perplexity Pro',
    type: 'ai',
    tagline: 'ИИ-поиск с источниками в реальном времени',
    taglineEn: 'AI search with real-time sources',
    monthlyPrice: 1700,
    features: [
      { key: 'model',      label: 'Модель',          value: 'GPT-4o / Claude / собств.',  level: 'good' },
      { key: 'context',    label: 'Контекст',        value: 'средний',                    level: 'ok'   },
      { key: 'image_gen',  label: 'Генерация изобр.', value: '✓ DALL·E / SDXL',          level: 'ok'   },
      { key: 'code',       label: 'Код',             value: 'базово',                     level: 'ok'   },
      { key: 'web_search', label: 'Поиск',           value: '✓ основная функция',         level: 'good' },
      { key: 'voice',      label: 'Голос',           value: '— нет',                      level: 'muted'},
      { key: 'exclusive',  label: 'Уникально',       value: '★ ИИ-поиск с живыми источниками', level: 'good' },
    ],
  },

  // ─── DEV ─────────────────────────────────────────────────────────────────
  {
    id: 'github-copilot',
    names: ['github copilot', 'copilot'],
    displayName: 'GitHub Copilot',
    type: 'dev',
    tagline: 'ИИ-ассистент кода прямо в IDE без переключения контекста',
    taglineEn: 'AI code assistant directly in IDE without context switching',
    monthlyPrice: 850,
    features: [
      { key: 'focus',       label: 'Специализация',  value: 'Инлайн-дополнение + чат',   level: 'good' },
      { key: 'ide',         label: 'IDE',            value: 'VS Code, JetBrains, Vim, Xcode', level: 'good' },
      { key: 'completions', label: 'Автодополнение', value: '✓ в реальном времени',       level: 'good' },
      { key: 'chat',        label: 'Чат',            value: '✓ в IDE',                    level: 'good' },
      { key: 'review',      label: 'Код-ревью',      value: '✓ PR-ревью',                 level: 'good' },
      { key: 'model',       label: 'Модель',         value: 'GPT-4o / Claude 3.5',        level: 'good' },
      { key: 'exclusive',   label: 'Уникально',      value: '★ PR-ревью + GitHub Actions', level: 'good' },
    ],
  },
  {
    id: 'cursor',
    names: ['cursor'],
    displayName: 'Cursor Pro',
    type: 'dev',
    tagline: 'Полноценная ИИ-IDE с мультифайловым редактированием',
    taglineEn: 'Full-featured AI IDE with multi-file editing',
    monthlyPrice: 1700,
    features: [
      { key: 'focus',       label: 'Специализация',  value: 'ИИ-IDE (форк VS Code)',      level: 'good' },
      { key: 'ide',         label: 'IDE',            value: 'Cursor (всё в одном)',        level: 'ok'   },
      { key: 'completions', label: 'Автодополнение', value: '✓',                          level: 'good' },
      { key: 'chat',        label: 'Чат',            value: '✓ Composer — мультифайловый',level: 'good' },
      { key: 'review',      label: 'Код-ревью',      value: 'через чат',                  level: 'ok'   },
      { key: 'model',       label: 'Модель',         value: 'Claude / GPT-4o / Gemini',   level: 'good' },
      { key: 'exclusive',   label: 'Уникально',      value: '★ Composer — мультифайловое редактирование', level: 'good' },
    ],
  },
  {
    id: 'jetbrains',
    names: ['jetbrains', 'intellij', 'pycharm', 'webstorm', 'goland', 'rider', 'datagrip'],
    displayName: 'JetBrains All Products',
    type: 'dev',
    tagline: 'Профессиональные IDE для каждого языка',
    taglineEn: 'Professional IDEs for every language',
    monthlyPrice: 2500,
    features: [
      { key: 'focus',       label: 'Специализация',  value: '13 IDE под разные языки',    level: 'good' },
      { key: 'ide',         label: 'IDE',            value: 'IntelliJ, PyCharm, WebStorm и др.', level: 'good' },
      { key: 'completions', label: 'Автодополнение', value: '✓ AI Assistant (доп.)',       level: 'ok'   },
      { key: 'chat',        label: 'Чат',            value: '✓ AI Assistant (доп.)',       level: 'ok'   },
      { key: 'review',      label: 'Код-ревью',      value: 'встроенные инструменты',      level: 'good' },
      { key: 'model',       label: 'Модель',         value: 'Собств. + OpenAI',            level: 'ok'   },
      { key: 'exclusive',   label: 'Уникально',      value: '★ 13 специализированных IDE', level: 'good' },
    ],
  },

  // ─── CLOUD ───────────────────────────────────────────────────────────────
  {
    id: 'icloud',
    names: ['icloud', 'icloud+'],
    displayName: 'iCloud+',
    type: 'cloud',
    tagline: 'Облако Apple — глубокая интеграция в iOS и macOS',
    taglineEn: 'Apple cloud — deep integration with iOS and macOS',
    monthlyPrice: 269,
    annualPrice: 2339,   // 200GB план: ≈195 ₽/мес vs 269 ₽ — экономия ~889 ₽/год
    familyPlan: { slots: 5, monthlyApprox: 229, currency: 'RUB' },
    features: [
      { key: 'storage',    label: 'Хранилище',        value: '50 GB – 2 TB',               level: 'ok'   },
      { key: 'sharing',    label: 'Совместный доступ', value: 'Family Sharing',           level: 'good' },
      { key: 'platforms',  label: 'Платформы',        value: 'Apple + Windows (частично)',level: 'muted'},
      { key: 'office',     label: 'Документы',        value: 'Pages, Numbers, Keynote',   level: 'ok'   },
      { key: 'photos',     label: 'Фото',             value: '✓ iCloud Photos',           level: 'good' },
      { key: 'encryption', label: 'Шифрование',       value: '★ Advanced Data Protection (E2E)', level: 'good' },
    ],
  },
  {
    id: 'google-one',
    names: ['google one', 'google drive', 'гугл диск'],
    displayName: 'Google One',
    type: 'cloud',
    tagline: 'Облако Google: Drive + Gmail + Photos',
    taglineEn: 'Google cloud: Drive + Gmail + Photos',
    monthlyPrice: 279,
    annualPrice: 2990,   // 100GB: ≈249 ₽/мес vs 279 ₽ — экономия ~358 ₽/год
    familyPlan: { slots: 5, monthlyApprox: 279, currency: 'RUB' },
    features: [
      { key: 'storage',    label: 'Хранилище',        value: '100 GB – 30 TB',             level: 'good' },
      { key: 'sharing',    label: 'Совместный доступ', value: '✓ до 5 пользователей',    level: 'good' },
      { key: 'platforms',  label: 'Платформы',        value: 'iOS, Android, Windows, Web',level: 'good' },
      { key: 'office',     label: 'Документы',        value: 'Docs, Sheets, Slides',      level: 'good' },
      { key: 'photos',     label: 'Фото',             value: '✓ Google Photos',           level: 'good' },
      { key: 'encryption', label: 'Шифрование',       value: '— стандартное серверное',   level: 'muted'},
    ],
  },
  {
    id: 'dropbox',
    names: ['dropbox', 'дропбокс'],
    type: 'cloud',
    tagline: 'Надёжная синхронизация и совместный доступ к файлам',
    taglineEn: 'Reliable sync and collaborative file access',
    monthlyPrice: 1300,
    features: [
      { key: 'storage',    label: 'Хранилище',        value: '2 TB+',                      level: 'good' },
      { key: 'sharing',    label: 'Совместный доступ', value: '✓ ссылки и папки',        level: 'good' },
      { key: 'platforms',  label: 'Платформы',        value: 'iOS, Android, Win, Mac, Linux, Web', level: 'good' },
      { key: 'office',     label: 'Документы',        value: 'Paper (ограниченно)',        level: 'muted'},
      { key: 'photos',     label: 'Фото',             value: 'базовый просмотр',           level: 'muted'},
      { key: 'encryption', label: 'Шифрование',       value: '— нет сквозного',           level: 'muted'},
    ],
  },

  // ─── CREATIVE ────────────────────────────────────────────────────────────
  {
    id: 'adobe-cc',
    names: ['adobe', 'adobe cc', 'adobe creative cloud', 'adobe creative'],
    displayName: 'Adobe Creative Cloud',
    type: 'creative',
    tagline: 'Полный набор профессиональных инструментов: фото, видео, дизайн',
    taglineEn: 'Full suite of professional tools: photo, video, design',
    monthlyPrice: 5500,
    features: [
      { key: 'apps',      label: 'Приложения',       value: 'Photoshop, Illustrator, Premiere, After Effects + 20 приложений', level: 'good' },
      { key: 'collab',   label: 'Совместная работа', value: 'Frame.io, Creative Cloud Libraries', level: 'good' },
      { key: 'cloud',    label: 'Облако',           value: '100 GB',                       level: 'ok'   },
      { key: 'export',   label: 'Форматы',          value: 'все профессиональные форматы', level: 'good' },
      { key: 'web',      label: 'Веб-версия',       value: '✓ Express, Firefly',           level: 'ok'   },
      { key: 'ai_tools', label: 'ИИ-инструменты',  value: '★ Firefly AI — генерация и ретушь', level: 'good' },
      { key: 'templates',label: 'Шаблоны',          value: 'библиотека Adobe Stock',       level: 'ok'   },
    ],
  },
  {
    id: 'figma',
    names: ['figma'],
    type: 'creative',
    tagline: 'Дизайн-инструмент №1 с real-time совместной работой',
    taglineEn: 'Design tool #1 with real-time collaboration',
    monthlyPrice: 1200,
    features: [
      { key: 'apps',      label: 'Приложения',       value: 'Figma Design, FigJam, Slides', level: 'ok'   },
      { key: 'collab',   label: 'Совместная работа', value: '✓ real-time мультиплеер',   level: 'good' },
      { key: 'cloud',    label: 'Облако',           value: '✓ всё в облаке',              level: 'good' },
      { key: 'export',   label: 'Форматы',          value: 'PNG, SVG, PDF, CSS',          level: 'ok'   },
      { key: 'web',      label: 'Веб-версия',       value: '✓ полноценная',               level: 'good' },
      { key: 'ai_tools', label: 'ИИ-инструменты',  value: 'ИИ-черновики (базово)',        level: 'ok'   },
      { key: 'templates',label: 'Шаблоны',          value: '★ Real-time совместный дизайн', level: 'good' },
    ],
  },
  {
    id: 'canva',
    names: ['canva', 'канва'],
    type: 'creative',
    tagline: 'Дизайн по шаблонам для соцсетей и маркетинга',
    taglineEn: 'Template-based design for social media and marketing',
    monthlyPrice: 1200,
    features: [
      { key: 'apps',      label: 'Приложения',       value: 'Дизайн, Видео, Презентации, Вебсайты', level: 'ok' },
      { key: 'collab',   label: 'Совместная работа', value: '✓ командная работа',        level: 'good' },
      { key: 'cloud',    label: 'Облако',           value: '1 TB (Pro)',                  level: 'good' },
      { key: 'export',   label: 'Форматы',          value: 'PNG, PDF, MP4, GIF',          level: 'ok'   },
      { key: 'web',      label: 'Веб-версия',       value: '✓ полноценная',               level: 'good' },
      { key: 'ai_tools', label: 'ИИ-инструменты',  value: 'Magic Resize, фон, текст',    level: 'ok'   },
      { key: 'templates',label: 'Шаблоны',          value: '★ 1M+ шаблонов для любых задач', level: 'good' },
    ],
  },

  // ─── EDUCATION ───────────────────────────────────────────────
  {
    id: 'duolingo',
    names: ['duolingo', 'duolingo plus', 'duolingo super'],
    displayName: 'Duolingo Plus',
    type: 'education',
    tagline: 'Изучение 40+ языков в игровом формате без рекламы',
    taglineEn: '40+ languages in gamified format without ads',
    monthlyPrice: 379,
    familyPlan: { slots: 6, monthlyApprox: 399, currency: 'RUB' },
    features: [
      { key: 'languages',  label: 'Языков / курсов', value: '40+ языков',            level: 'good' },
      { key: 'ads',        label: 'Реклама',          value: 'Без рекламы (Plus)',    level: 'good' },
      { key: 'offline',    label: 'Офлайн',           value: '✓ офлайн-уроки',       level: 'good' },
      { key: 'progress',   label: 'Аналитика',        value: 'Прогресс + статистика', level: 'ok'   },
      { key: 'speech',     label: 'Распознавание речи', value: '★ голосовые задания', level: 'good' },
      { key: 'community',  label: 'Сообщество',       value: 'Лиги, друзья, стрики',  level: 'ok'   },
      { key: 'family',     label: 'Семейный план',    value: '✓ до 6 человек',        level: 'good' },
      { key: 'cert',       label: 'Сертификат',       value: '— нет',                 level: 'muted'},
    ],
  },
  {
    id: 'lingualeo',
    names: ['lingualeo', 'лингвалео'],
    displayName: 'Lingualeo',
    type: 'education',
    tagline: 'Изучение английского через фильмы и интерактивные тексты',
    taglineEn: 'Learn English through movies and interactive texts',
    monthlyPrice: 299,
    features: [
      { key: 'languages',  label: 'Языков / курсов', value: '1 язык (английский)',    level: 'muted'},
      { key: 'ads',        label: 'Реклама',          value: 'Без рекламы (Premium)', level: 'good' },
      { key: 'offline',    label: 'Офлайн',           value: '— нет',                 level: 'muted'},
      { key: 'progress',   label: 'Аналитика',        value: 'Базовая статистика',    level: 'ok'   },
      { key: 'speech',     label: 'Распознавание речи', value: '— нет',               level: 'muted'},
      { key: 'community',  label: 'Сообщество',       value: '— нет',                 level: 'muted'},
      { key: 'family',     label: 'Семейный план',    value: '— нет',                 level: 'muted'},
      { key: 'cert',       label: 'Сертификат',       value: '— нет',                 level: 'muted'},
    ],
  },
  {
    id: 'busuu',
    names: ['busuu', 'бусу'],
    type: 'education',
    tagline: 'Курсы языков с живой обратной связью от носителей',
    taglineEn: 'Language courses with live feedback from native speakers',
    monthlyPrice: 799,
    features: [
      { key: 'languages',  label: 'Языков / курсов', value: '12 языков',              level: 'ok'   },
      { key: 'ads',        label: 'Реклама',          value: 'Без рекламы (Premium)', level: 'good' },
      { key: 'offline',    label: 'Офлайн',           value: '✓',                     level: 'good' },
      { key: 'progress',   label: 'Аналитика',        value: 'Детальная аналитика',   level: 'good' },
      { key: 'speech',     label: 'Распознавание речи', value: '✓ отзывы носителей',  level: 'ok'   },
      { key: 'community',  label: 'Сообщество',       value: '★ Носители языка дают обратную связь', level: 'good' },
      { key: 'family',     label: 'Семейный план',    value: '✓ до 4 человек',        level: 'good' },
      { key: 'cert',       label: 'Сертификат',       value: '✓ сертификат McGraw-Hill', level: 'good'},
    ],
  },
  {
    id: 'skillbox',
    names: ['skillbox', 'скилбокс'],
    type: 'education',
    tagline: 'Онлайн-курсы по профессиям: дизайн, программирование, маркетинг',
    taglineEn: 'Online courses for professions: design, programming, marketing',
    features: [
      { key: 'languages',  label: 'Языков / курсов', value: '400+ курсов',            level: 'good' },
      { key: 'ads',        label: 'Реклама',          value: 'Без рекламы',           level: 'good' },
      { key: 'offline',    label: 'Офлайн',           value: '✓ (мобильное прилож.)', level: 'ok'   },
      { key: 'progress',   label: 'Аналитика',        value: 'Куратор + проверка ДЗ', level: 'good' },
      { key: 'speech',     label: 'Распознавание речи', value: '— нет',               level: 'muted'},
      { key: 'community',  label: 'Сообщество',       value: '★ Куратор + студенческое сообщество', level: 'good' },
      { key: 'family',     label: 'Семейный план',    value: '— нет',                 level: 'muted'},
      { key: 'cert',       label: 'Сертификат',       value: '✓ диплом Skillbox',     level: 'good' },
    ],
  },

  // ─── PRODUCTIVITY ─────────────────────────────────────────────────────────
  {
    id: 'notion',
    names: ['notion'],
    type: 'productivity',
    tagline: 'Заметки + базы данных + Wiki + Kanban в одном',
    taglineEn: 'Notes + databases + Wiki + Kanban in one',
    monthlyPrice: 550,
    annualPrice: 4800,   // Plus план: ≈400 ₽/мес vs ~550 ₽ — экономия ~1800 ₽/год
    features: [
      { key: 'type',         label: 'Тип',              value: 'Заметки, БД, Wiki, Kanban',   level: 'good' },
      { key: 'collab',       label: 'Совместная работа', value: '✓ в реальном времени',    level: 'good' },
      { key: 'offline',      label: 'Офлайн',           value: 'ограниченно',              level: 'muted'},
      { key: 'ai',           label: 'ИИ',               value: '✓ Notion AI (доп.)',        level: 'ok'   },
      { key: 'platforms',    label: 'Платформы',        value: 'Web, iOS, Android, macOS, Windows', level: 'good'},
      { key: 'database',     label: 'Базы данных',      value: '★ Реляционные БД, формулы, фильтры', level: 'good' },
      { key: 'integrations', label: 'Интеграции',       value: 'GitHub, Jira, Slack и др.', level: 'ok'   },
    ],
  },
  {
    id: 'microsoft-365',
    names: ['microsoft 365', 'office 365', 'microsoft office', 'm365', 'ms office'],
    displayName: 'Microsoft 365',
    type: 'productivity',
    tagline: 'Офисный пакет с Word, Excel, PowerPoint и 1 TB OneDrive',
    taglineEn: 'Office suite with Word, Excel, PowerPoint and 1 TB OneDrive',
    monthlyPrice: 549,
    annualPrice: 4199,   // Personal: ≈350 ₽/мес vs 549 ₽ — экономия ~2389 ₽/год
    familyPlan: { slots: 6, monthlyApprox: 699, currency: 'RUB' },
    features: [
      { key: 'type',         label: 'Тип',              value: 'Word, Excel, PowerPoint, Teams', level: 'good' },
      { key: 'collab',       label: 'Совместная работа', value: '✓ SharePoint, Teams',     level: 'good' },
      { key: 'offline',      label: 'Офлайн',           value: '✓ полноценный',            level: 'good' },
      { key: 'ai',           label: 'ИИ',               value: '✓ Copilot (в Business)',   level: 'ok'   },
      { key: 'platforms',    label: 'Платформы',        value: 'Windows, macOS, iOS, Android, Web', level: 'good'},
      { key: 'database',     label: 'Базы данных',      value: 'Excel (таблицы)',           level: 'ok'   },
      { key: 'integrations', label: 'Интеграции',       value: '★ Teams, Outlook, SharePoint, Azure', level: 'good' },
    ],
  },
  {
    id: 'obsidian',
    names: ['obsidian', 'обсидиан'],
    type: 'productivity',
    tagline: 'Локальные заметки с графом связей и плагинами',
    taglineEn: 'Local notes with knowledge graph and plugins',
    features: [
      { key: 'type',         label: 'Тип',              value: 'Markdown-заметки + граф',     level: 'ok'   },
      { key: 'collab',       label: 'Совместная работа', value: 'ограниченно',            level: 'muted'},
      { key: 'offline',      label: 'Офлайн',           value: '✓ всё локально',          level: 'good' },
      { key: 'ai',           label: 'ИИ',               value: 'плагины сообщества',       level: 'ok'   },
      { key: 'platforms',    label: 'Платформы',        value: 'Win, macOS, Linux, iOS, Android', level: 'good'},
      { key: 'database',     label: 'Базы данных',      value: 'Граф связей',             level: 'ok'   },
      { key: 'integrations', label: 'Интеграции',       value: '★ 1000+ плагинов сообщества', level: 'good' },
    ],
  },
]

// ─── Comparison classification (ComparisonGroup / price) ──────────────────
//
// Большинство сервисов классифицируются по умолчанию через `type` —
// этого достаточно, потому что `type` уже отражает их основную задачу.
// Только сервисы, для которых `type` не передаёт реальную роль в сравнении
// (пакеты, нишевые ИИ, офисные пакеты и т.п.), получают явный override —
// без этого, например, YouTube Premium сравнивался бы как «обычный конкурент»
// YouTube Music, а не как пакет, в который тот уже включён.

const DEFAULT_COMPARISON_GROUP: Record<ServiceType, ComparisonGroup> = {
  music: 'music_streaming',
  video: 'video_streaming',
  ai: 'ai_assistant',
  dev: 'dev_tools',
  cloud: 'cloud_storage',
  creative: 'creative_design',
  productivity: 'productivity_notes',
  education: 'education_language',
}

interface ComparisonOverride {
  primaryComparisonGroup?: ComparisonGroup
  extraComparisonGroups?: ComparisonGroup[]
  isBundle?: boolean
  includedInServiceIds?: string[]
  notComparableWith?: string[]
  comparisonNotes?: string
}

const COMPARISON_OVERRIDES: Record<string, ComparisonOverride> = {
  midjourney: { primaryComparisonGroup: 'ai_image_generation' },
  'adobe-cc': { primaryComparisonGroup: 'creative_design', extraComparisonGroups: ['creative_video'] },
  skillbox: { primaryComparisonGroup: 'education_courses' },
  'microsoft-365': { primaryComparisonGroup: 'office_suite' },
  'yandex-plus': {
    primaryComparisonGroup: 'ecosystem_bundle',
    extraComparisonGroups: ['music_streaming', 'video_streaming'],
    isBundle: true,
    comparisonNotes:
      'Это пакет с кешбэком, Такси и Маркетом, а не отдельный музыкальный или видеосервис — Кинопоиск уже включён, но не заменяет Netflix или Disney+.',
  },
  'youtube-premium': {
    primaryComparisonGroup: 'video_streaming',
    extraComparisonGroups: ['music_streaming'],
    isBundle: true,
    comparisonNotes:
      'YouTube Music уже включён в эту подписку — отдельно платить за него не нужно. При этом пакет не заменяет сервисы с лицензионным видеоконтентом вроде Netflix.',
  },
  kinopoisk: { includedInServiceIds: ['yandex-plus'] },
  'youtube-music': { includedInServiceIds: ['youtube-premium'] },
}

const APPROXIMATE_PRICE_NOTE = 'Цена ориентировочная — подтвердите перед сравнением.'
const UNKNOWN_PRICE_NOTE = 'Стоимость неизвестна — проверьте перед сравнением.'

function derivePrice(entry: ServiceEntry): ServicePriceInfo {
  if (entry.monthlyPrice != null) {
    return {
      amount: entry.monthlyPrice,
      currency: entry.priceCurrency ?? 'RUB',
      // Цены в базе — кураторские оценки (апрель 2025), не верифицированные напрямую,
      // поэтому по умолчанию честно показываем их как приблизительные.
      confidence: 'medium',
      displayType: 'approximate',
      note: APPROXIMATE_PRICE_NOTE,
    }
  }
  return { confidence: 'unknown', displayType: 'unknown', note: UNKNOWN_PRICE_NOTE }
}

function applyComparisonDefaults(entry: ServiceEntry): ServiceEntry {
  const override = COMPARISON_OVERRIDES[entry.id]
  const primaryComparisonGroup = override?.primaryComparisonGroup ?? DEFAULT_COMPARISON_GROUP[entry.type]
  const comparisonGroups = Array.from(
    new Set<ComparisonGroup>([primaryComparisonGroup, ...(override?.extraComparisonGroups ?? [])]),
  )

  return {
    ...entry,
    primaryComparisonGroup,
    comparisonGroups,
    price: derivePrice(entry),
    isBundle: override?.isBundle,
    includedInServiceIds: override?.includedInServiceIds,
    notComparableWith: override?.notComparableWith,
    comparisonNotes: override?.comparisonNotes,
  }
}

/** Полная база сервисов с заполненными полями для честного сравнения (`comparisonGroups`, `price`, …). */
export const SERVICE_DB: ServiceEntry[] = RAW_SERVICE_DB.map(applyComparisonDefaults)

// ─── Matching ─────────────────────────────────────────────────────────────

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-zа-я0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

// Слова, которые встречаются во многих сервисах и не несут смысловой нагрузки для матчинга.
// Без этого «Duolingo Plus» матчится на «yandex plus» по слову «plus», а «AI Chat»
// матчится на любой ИИ-сервис по слову «chat»/«ai».
const MATCH_STOPWORDS = new Set([
  'plus', 'pro', 'premium', 'one', 'max', 'ultra', 'super', 'free',
  'plan', 'base', 'lite', 'mini', 'team', 'solo', 'duo', 'basic',
  'standard', 'advanced', 'family', 'personal', 'individual',
  'chat', 'music', 'video', 'cloud', 'assistant',
])

const MIN_CONFIDENT_MATCH_SCORE = 60

function pickBetterMatch(current: ServiceMatch | undefined, next: ServiceMatch): ServiceMatch {
  return !current || next.score > current.score ? next : current
}

/**
 * Ищет сервисы из базы по имени и возвращает ранжированный список совпадений
 * с оценкой уверенности — вместо «угадывания» первого попавшегося.
 *
 * Правила скоринга (от самого надёжного к самому слабому):
 * - `exact` (100): нормализованное имя совпадает с одним из алиасов целиком
 * - `alias_contains` (80): запрос содержит алиас или наоборот — но только если
 *   обе строки достаточно длинные (≥4 симв.) и не являются «общими» словами
 *   (иначе «Plus» матчился бы на «Яндекс Плюс»)
 * - `token` (50): есть общее значимое слово (≥5 симв., не stopword)
 * - `keyword` (25): более слабое пересечение по словам алиаса (≥4 симв., не stopword)
 */
export function findServiceMatches(name: string, limit = 5): ServiceMatch[] {
  const norm = normalise(name)
  if (!norm) return []

  const normIsMeaningful = norm.length >= 4 && !MATCH_STOPWORDS.has(norm)
  const normTokens = norm.split(' ').filter(w => w.length >= 5 && !MATCH_STOPWORDS.has(w))

  const matches: ServiceMatch[] = []

  for (const entry of SERVICE_DB) {
    let best: ServiceMatch | undefined

    for (const alias of entry.names) {
      if (norm === alias) {
        best = pickBetterMatch(best, { entry, score: 100, matchType: 'exact' })
        continue
      }

      const aliasIsMeaningful = alias.length >= 4 && !MATCH_STOPWORDS.has(alias)
      if (normIsMeaningful && aliasIsMeaningful && (norm.includes(alias) || alias.includes(norm))) {
        best = pickBetterMatch(best, { entry, score: 80, matchType: 'alias_contains' })
        continue
      }

      if (normTokens.length > 0) {
        const aliasTokens = alias.split(' ').filter(w => w.length >= 5 && !MATCH_STOPWORDS.has(w))
        if (aliasTokens.some(w => normTokens.includes(w))) {
          best = pickBetterMatch(best, { entry, score: 50, matchType: 'token' })
          continue
        }
      }

      const aliasKeywords = alias.split(' ').filter(w => w.length >= 4 && !MATCH_STOPWORDS.has(w))
      if (normIsMeaningful && aliasKeywords.some(w => norm.includes(w) || w.includes(norm))) {
        best = pickBetterMatch(best, { entry, score: 25, matchType: 'keyword' })
      }
    }

    if (best) matches.push(best)
  }

  matches.sort((a, b) => b.score - a.score)
  return matches.slice(0, limit)
}

/**
 * Тонкая обёртка над `findServiceMatches` — сохраняет старый контракт
 * (один сервис или `undefined`) для существующих вызывающих сторон
 * ([lib/openrouter.ts](lib/openrouter.ts), [lib/savings-estimate.ts](lib/savings-estimate.ts)),
 * но возвращает `undefined` вместо угаданного совпадения с низкой уверенностью.
 */
export function findServiceEntry(name: string): ServiceEntry | undefined {
  const [top] = findServiceMatches(name, 1)
  return top && top.score >= MIN_CONFIDENT_MATCH_SCORE ? top.entry : undefined
}

/**
 * Честно форматирует цену сервиса в зависимости от уровня доверия и типа отображения —
 * вместо того чтобы представлять приблизительную оценку как точный факт.
 * Если `price` не задан, использует `legacyMonthlyPrice`/`legacyCurrency` как приблизительную оценку.
 */
export function formatPrice(
  price: ServicePriceInfo | undefined,
  legacyMonthlyPrice?: number,
  legacyCurrency?: string,
): string {
  const amount = price?.amount ?? legacyMonthlyPrice
  const currency = price?.currency ?? legacyCurrency ?? 'RUB'
  const displayType: PriceDisplayType = price?.displayType ?? (amount != null ? 'approximate' : 'unknown')
  const confidence: PriceConfidence = price?.confidence ?? (amount != null ? 'medium' : 'unknown')

  switch (displayType) {
    case 'region_dependent':
      return 'Цена зависит от региона'
    case 'unknown':
      return 'Проверьте стоимость на сайте'
    case 'from':
      return amount != null ? `от ${fmtCurrency(amount, currency)}/мес` : 'Проверьте стоимость на сайте'
    case 'promo':
      return amount != null
        ? `${fmtCurrency(amount, currency)}/мес · промо-цена, может измениться`
        : 'Проверьте стоимость на сайте'
    case 'fixed':
      if (amount == null) return 'Проверьте стоимость на сайте'
      return confidence === 'verified' || confidence === 'high'
        ? `${fmtCurrency(amount, currency)}/мес`
        : `≈${fmtCurrency(amount, currency)}/мес`
    case 'approximate':
    default:
      return amount != null ? `≈${fmtCurrency(amount, currency)}/мес` : 'Проверьте стоимость на сайте'
  }
}

// ─── Heuristic type inference for unknown services ─────────────────────────
// Ordered by priority: more specific keywords first
const TYPE_KEYWORDS: Array<[string, ServiceType]> = [
  // music
  ['музык',    'music'],
  ['music',    'music'],
  ['audio',    'music'],
  ['подкаст',  'music'],
  ['podcast',  'music'],
  ['boom',     'music'],
  ['звук',     'music'],
  // video
  ['кино',     'video'],
  ['фильм',    'video'],
  ['сериал',   'video'],
  ['видео',    'video'],
  ['video',    'video'],
  ['tv',       'video'],
  ['тв',       'video'],
  ['стрим',    'video'],
  ['stream',   'video'],
  // ai
  ['gpt',      'ai'],
  ['нейросет', 'ai'],
  ['нейро',    'ai'],
  ['ai',       'ai'],
  ['midjourney','ai'],
  ['ассистент','ai'],
  ['assistant','ai'],
  ['perplexi', 'ai'],
  ['claude',   'ai'],
  ['gemini',   'ai'],
  // dev
  ['copilot',  'dev'],
  ['github',   'dev'],
  ['gitlab',   'dev'],
  ['jetbrain', 'dev'],
  ['cursor',   'dev'],
  ['ide',      'dev'],
  ['разработ', 'dev'],
  ['develop',  'dev'],
  // cloud
  ['облак',    'cloud'],
  ['cloud',    'cloud'],
  ['диск',     'cloud'],
  ['drive',    'cloud'],
  ['storage',  'cloud'],
  ['backup',   'cloud'],
  ['хранилищ', 'cloud'],
  // creative
  ['дизайн',   'creative'],
  ['design',   'creative'],
  ['фото',     'creative'],
  ['photo',    'creative'],
  ['creative', 'creative'],
  ['figma',    'creative'],
  ['canva',    'creative'],
  ['adobe',    'creative'],
  // productivity
  ['заметк',   'productivity'],
  ['note',     'productivity'],
  ['notion',   'productivity'],
  ['task',     'productivity'],
  ['todo',     'productivity'],
  ['планер',   'productivity'],
  ['planner',  'productivity'],
  ['офис',     'productivity'],
  ['office',   'productivity'],
  // education — идёт после остальных, чтобы 'course' не перехватывал generic слова
  ['duolingo', 'education'],
  ['lingualeo','education'],
  ['busuu',    'education'],
  ['skillbox', 'education'],
  ['скилбокс', 'education'],
  ['курс',     'education'],
  ['course',   'education'],
  ['учёба',    'education'],
  ['обучен',   'education'],
  ['learn',    'education'],
  ['язык',     'education'],
  ['english',  'education'],
]

/** Угадывает тип сервиса по ключевым словам в названии — без точного совпадения в базе. */
export function inferTypeFromName(name: string): ServiceType | undefined {
  const norm = normalise(name)
  for (const [kw, type] of TYPE_KEYWORDS) {
    if (norm.includes(kw)) return type
  }
  return undefined
}

/**
 * Возвращает отображаемое имя сервиса из базы.
 * Использует явный displayName, иначе title-case из первого alias.
 */
export function getServiceDisplayName(entry: ServiceEntry): string {
  if (entry.displayName) return entry.displayName
  return entry.names[0]
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Возвращает все сервисы базы заданного типа с известной ценой (monthlyPrice).
 * Используется для поиска рыночных альтернатив.
 */
export function getServicesByType(type: ServiceType): ServiceEntry[] {
  return SERVICE_DB.filter(e => e.type === type && e.monthlyPrice != null)
}

/**
 * Возвращает характеристики уровня 'good' у entry, которых нет ни у одного из
 * остальных сервисов в группе (то есть реально уникальные преимущества).
 * Используется в DuplicatesPanel для значка 👑 и умных рекомендаций.
 */
export function getUniqueAdvantages(
  entry: ServiceEntry,
  allEntriesInGroup: ServiceEntry[],
): Feature[] {
  return entry.features.filter(
    f =>
      f.level === 'good' &&
      !allEntriesInGroup.some(
        other =>
          other.id !== entry.id &&
          other.features.some(of => of.key === f.key && of.level === 'good'),
      ),
  )
}

// ─── Comparison engine ─────────────────────────────────────────────────────

/**
 * Решает, в какой роли каждый сервис из базы соотносится с базовым —
 * это и есть честный ответ на вопрос «можно ли вообще их сравнивать».
 *
 * Порядок правил важен: сначала исключаем заведомо нечестные пары, затем
 * распознаём пакетные отношения (бандл/included) — и только в последнюю
 * очередь решаем, прямой это конкурент или просто «частичная альтернатива».
 */
export function getComparisonCandidates(
  baseEntry: ServiceEntry,
  allEntries: ServiceEntry[],
): ComparisonCandidate[] {
  const baseGroups = new Set(baseEntry.comparisonGroups ?? [])
  const candidates: ComparisonCandidate[] = []

  for (const other of allEntries) {
    if (other.id === baseEntry.id) continue

    if (baseEntry.notComparableWith?.includes(other.id) || other.notComparableWith?.includes(baseEntry.id)) {
      candidates.push({ entry: other, role: 'not_comparable', reason: 'разные категории сервисов — сравнение было бы нечестным' })
      continue
    }

    const otherIncludesBase =
      other.includedServiceIds?.includes(baseEntry.id) || baseEntry.includedInServiceIds?.includes(other.id)
    if (otherIncludesBase) {
      candidates.push({
        entry: other,
        role: 'bundle',
        reason: `${getServiceDisplayName(baseEntry)} уже входит в ${getServiceDisplayName(other)} — отдельно платить не нужно`,
      })
      continue
    }

    const baseIncludesOther =
      baseEntry.includedServiceIds?.includes(other.id) || other.includedInServiceIds?.includes(baseEntry.id)
    if (baseIncludesOther) {
      candidates.push({
        entry: other,
        role: 'included_service',
        reason: `входит в ${getServiceDisplayName(baseEntry)} — пользуйтесь им бесплатно`,
      })
      continue
    }

    if (baseEntry.primaryComparisonGroup && baseEntry.primaryComparisonGroup === other.primaryComparisonGroup) {
      candidates.push({ entry: other, role: 'direct_competitor', reason: 'оба решают одну и ту же задачу' })
      continue
    }

    if (other.comparisonGroups?.some(g => baseGroups.has(g))) {
      candidates.push({ entry: other, role: 'alternative', reason: 'частично пересекаются по задачам, но не заменяют друг друга полностью' })
      continue
    }

    candidates.push({ entry: other, role: 'not_comparable', reason: 'разные категории сервисов' })
  }

  return candidates
}

const LEVEL_RANK: Record<FeatureLevel, number> = { good: 2, ok: 1, muted: 0 }

function isConfidentPrice(confidence: PriceConfidence | undefined): boolean {
  return confidence === 'medium' || confidence === 'high' || confidence === 'verified'
}

/** True, если кандидат не хуже базового сервиса минимум по половине общих характеристик. */
function scoresAtLeastAsWell(base: ServiceEntry, candidate: ServiceEntry): boolean {
  const sharedKeys = base.features.map(f => f.key).filter(key => candidate.features.some(f => f.key === key))
  if (sharedKeys.length === 0) return false

  let atLeastAsGood = 0
  for (const key of sharedKeys) {
    const baseLevel = LEVEL_RANK[base.features.find(f => f.key === key)!.level]
    const candidateLevel = LEVEL_RANK[candidate.features.find(f => f.key === key)!.level]
    if (candidateLevel >= baseLevel) atLeastAsGood++
  }
  return atLeastAsGood / sharedKeys.length >= 0.5
}

const STRONG_UNUSED_DAYS = 30

export interface ServiceRecommendationInput {
  subscriptionId: string
  subscriptionName: string
  monthlyAmount: number
  currency: string
  /** Сколько дней пользователь не отмечал использование (или null — не отмечалось). */
  usageDays: number | null
  entry?: ServiceEntry
  candidates: ComparisonCandidate[]
  /** IDs сервисов из SERVICE_DB, на которые у пользователя уже есть активные подписки. */
  ownedEntryIds: Set<string>
}

/**
 * Строит честную рекомендацию по конкретной подписке — решение (keep/cancel/replace/check),
 * а не просто факт сравнения. Намеренно консервативна: «отменить» только при сильном сигнале
 * неиспользования, «заменить» — без обещания точной экономии, если цены ненадёжны.
 */
export function buildServiceRecommendation(input: ServiceRecommendationInput): ServiceRecommendation {
  const { subscriptionId, subscriptionName, monthlyAmount, currency, usageDays, entry, candidates, ownedEntryIds } = input

  if (!entry) {
    return {
      subscriptionId,
      action: 'not_enough_data',
      confidence: 'low',
      title: `${subscriptionName}: недостаточно данных для сравнения`,
      reasons: ['Сервис не найден в базе сравнения — честное сравнение пока недоступно.'],
      tradeoffs: [],
    }
  }

  const comparable = candidates.filter(c => c.role !== 'not_comparable')
  const directCompetitors = comparable.filter(c => c.role === 'direct_competitor')
  const coveringCandidates = comparable.filter(c => c.role === 'direct_competitor' || c.role === 'bundle')
  const ownedCovering = coveringCandidates.filter(c => ownedEntryIds.has(c.entry.id))

  const uniqueAdvantages = getUniqueAdvantages(entry, directCompetitors.map(c => c.entry))
  const hasExclusive = uniqueAdvantages.some(f => f.key === 'exclusive')

  const priceConfidence = entry.price?.confidence
  const priceIsUncertain = priceConfidence == null || priceConfidence === 'low' || priceConfidence === 'unknown'
  const priceNeedsCheck = entry.price?.displayType === 'region_dependent'

  // 1. cancel — сильный сигнал неиспользования + у пользователя уже есть чем закрыть задачу
  if (usageDays !== null && usageDays >= STRONG_UNUSED_DAYS && ownedCovering.length > 0) {
    const covering = ownedCovering[0]
    return {
      subscriptionId,
      entry,
      action: 'cancel',
      // Никогда не 'high' — решение опирается на сигнал использования, а не на цену.
      confidence: 'medium',
      title: `${subscriptionName}: похоже, можно отключить`,
      reasons: [
        `Вы не отмечали использование ${subscriptionName} ${usageDays} дн.`,
        `${getServiceDisplayName(covering.entry)} закрывает ту же задачу — ${covering.reason}.`,
      ],
      tradeoffs: hasExclusive
        ? [`При отключении вы потеряете: ${uniqueAdvantages.map(f => f.label).join(', ')}.`]
        : ['Если понадобится снова — можно будет подключить в любой момент.'],
    }
  }

  // 2. replace — есть прямой конкурент не хуже минимум по половине общих характеристик
  const replaceCandidate = directCompetitors.find(
    c => !ownedEntryIds.has(c.entry.id) && scoresAtLeastAsWell(entry, c.entry),
  )
  if (replaceCandidate && !hasExclusive) {
    const candidateEntry = replaceCandidate.entry
    const bothPricesConfident =
      entry.price?.amount != null &&
      candidateEntry.price?.amount != null &&
      isConfidentPrice(entry.price.confidence) &&
      isConfidentPrice(candidateEntry.price.confidence) &&
      (entry.price.currency ?? 'RUB') === (candidateEntry.price.currency ?? 'RUB')

    const tradeoffs = uniqueAdvantages.length
      ? [`При переходе вы потеряете: ${uniqueAdvantages.map(f => f.label).join(', ')}.`]
      : ['Перед переходом сравните детали тарифа — они могут отличаться.']

    const rec: ServiceRecommendation = {
      subscriptionId,
      entry,
      candidate: candidateEntry,
      action: 'replace',
      confidence: bothPricesConfident ? 'medium' : 'low',
      title: `${subscriptionName} → ${getServiceDisplayName(candidateEntry)}: можно сравнить и перейти`,
      reasons: [`${getServiceDisplayName(candidateEntry)} закрывает ту же задачу — ${replaceCandidate.reason}.`],
      tradeoffs,
    }

    if (bothPricesConfident) {
      const diff = Math.round(monthlyAmount - (candidateEntry.price!.amount as number))
      if (diff > 0) {
        rec.estimatedMonthlySaving = { amount: diff, currency: entry.price!.currency ?? currency }
      }
    } else {
      rec.warning = 'Точная разница в цене неизвестна — сравните вручную перед переходом.'
    }

    return rec
  }

  // 3. keep — явное уникальное преимущество или сравнивать вовсе не с чем
  if (hasExclusive || comparable.length === 0) {
    return {
      subscriptionId,
      entry,
      action: 'keep',
      confidence: hasExclusive ? 'medium' : 'low',
      title: `${subscriptionName}: стоит оставить`,
      reasons: hasExclusive
        ? [`Есть то, чего нет у альтернатив: ${uniqueAdvantages.map(f => f.label).join(', ')}.`]
        : ['Среди ваших подписок нет прямых аналогов для честного сравнения.'],
      tradeoffs: [],
    }
  }

  // 4. check — цена ненадёжна или зависит от региона/способа оплаты
  if (priceIsUncertain || priceNeedsCheck) {
    return {
      subscriptionId,
      entry,
      action: 'check',
      confidence: 'low',
      title: `${subscriptionName}: стоит проверить условия`,
      reasons: [
        priceNeedsCheck
          ? 'Цена зависит от региона или способа оплаты — уточните актуальную стоимость.'
          : 'Точная стоимость неизвестна — сравнение может быть неточным.',
      ],
      tradeoffs: [],
      warning: 'Не делайте выводов об экономии, пока не проверите актуальную цену.',
    }
  }

  // 5. not_enough_data — нет ни сигнала неиспользования, ни явно лучшей альтернативы
  return {
    subscriptionId,
    entry,
    action: 'not_enough_data',
    confidence: 'low',
    title: `${subscriptionName}: пока недостаточно сигналов`,
    reasons: ['Не нашлось ни признаков неиспользования, ни явно более выгодной альтернативы.'],
    tradeoffs: [],
  }
}
