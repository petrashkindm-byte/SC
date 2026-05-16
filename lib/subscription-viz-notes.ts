/** Визуальные настройки редактора хранятся в поле notes после маркера. */

export const SUBCURO_VIZ_MARKER = '\n\n__SUBCURO_VIZ__:'
const STANDALONE_VIZ_PREFIX = '__SUBCURO_VIZ__:'

/** Полный список цветов — совпадает с CardColorPreset мобильного приложения */
export type CardColorPreset =
  | 'lavender'
  | 'blush'
  | 'peach'
  | 'butter'
  | 'mint'
  | 'sky'
  | 'sage'
  | 'sand'

export const CARD_COLOR_PRESETS: { key: CardColorPreset; label: string; swatch: string; tint: string; darkTint: string; border: string }[] = [
  { key: 'lavender', label: 'Лаванда', swatch: '#EAE2FF', tint: '#F1EAFF', darkTint: '#1e1a3a', border: '#E2D2FF' },
  { key: 'blush',   label: 'Румяный', swatch: '#FBE0E8', tint: '#FCECEF', darkTint: '#2a1520', border: '#F2C9D5' },
  { key: 'peach',   label: 'Персик',  swatch: '#FFE4D2', tint: '#FFF0E7', darkTint: '#281a0e', border: '#F8CBB2' },
  { key: 'butter',  label: 'Масло',   swatch: '#FFF1B8', tint: '#FFF7D9', darkTint: '#1f1a08', border: '#F4E19C' },
  { key: 'mint',    label: 'Мята',    swatch: '#D7F3EB', tint: '#E7F7F2', darkTint: '#0d2018', border: '#B9E3D7' },
  { key: 'sky',     label: 'Небо',    swatch: '#DCEEFF', tint: '#EBF5FF', darkTint: '#0c1829', border: '#BFD8F5' },
  { key: 'sage',    label: 'Шалфей',  swatch: '#E3ECD7', tint: '#EEF3E7', darkTint: '#131f0d', border: '#CDD9B8' },
  { key: 'sand',    label: 'Песок',   swatch: '#EFE0D0', tint: '#F4ECE4', darkTint: '#1a1510', border: '#DBC8B6' },
]

export type SubcuroEditViz = {
  iconBg: string | null
  shape: 'rounded' | 'circle' | 'square'
  cardFill: CardColorPreset | 'none'
}

export const DEFAULT_SUBCURO_VIZ: SubcuroEditViz = {
  iconBg: null,
  shape: 'rounded',
  cardFill: 'none',
}

const VALID_FILLS = new Set<string>([
  'none', 'lavender', 'blush', 'peach', 'butter', 'mint', 'sky', 'sage', 'sand',
])

function parseVizJson(raw: string): SubcuroEditViz {
  try {
    const parsed = JSON.parse(raw) as Partial<SubcuroEditViz>
    return {
      iconBg: typeof parsed.iconBg === 'string' || parsed.iconBg === null ? parsed.iconBg ?? null : null,
      shape:
        parsed.shape === 'circle' || parsed.shape === 'square' || parsed.shape === 'rounded'
          ? parsed.shape
          : 'rounded',
      cardFill: typeof parsed.cardFill === 'string' && VALID_FILLS.has(parsed.cardFill)
        ? (parsed.cardFill as SubcuroEditViz['cardFill'])
        : 'none',
    }
  } catch {
    return { ...DEFAULT_SUBCURO_VIZ }
  }
}

export function parseNotesAndViz(notes: string | null): { userNotes: string; viz: SubcuroEditViz } {
  if (!notes) return { userNotes: '', viz: { ...DEFAULT_SUBCURO_VIZ } }
  const trimmed = notes.trim()
  if (trimmed.startsWith(STANDALONE_VIZ_PREFIX)) {
    const raw = trimmed.slice(STANDALONE_VIZ_PREFIX.length).trim()
    return { userNotes: '', viz: parseVizJson(raw) }
  }
  const i = notes.indexOf(SUBCURO_VIZ_MARKER)
  const userPart = (i === -1 ? notes : notes.slice(0, i)).trim()
  if (i === -1) return { userNotes: userPart, viz: { ...DEFAULT_SUBCURO_VIZ } }
  const raw = notes.slice(i + SUBCURO_VIZ_MARKER.length).trim()
  return { userNotes: userPart, viz: parseVizJson(raw) }
}

function vizEqualsDefault(v: SubcuroEditViz): boolean {
  return (
    v.iconBg === DEFAULT_SUBCURO_VIZ.iconBg &&
    v.shape === DEFAULT_SUBCURO_VIZ.shape &&
    v.cardFill === DEFAULT_SUBCURO_VIZ.cardFill
  )
}

export function mergeUserNotesWithViz(userNotes: string | null, viz: SubcuroEditViz | null): string | null {
  const base = (userNotes ?? '').trim()
  if (!viz || vizEqualsDefault(viz)) {
    return base || null
  }
  const json = JSON.stringify(viz)
  if (!base) return `${STANDALONE_VIZ_PREFIX}${json}`
  return `${base}${SUBCURO_VIZ_MARKER}${json}`
}

/** Получить cardColorPreset для записи в колонку card_color_preset (совместимость с мобильным) */
export function vizFillToColorPreset(fill: SubcuroEditViz['cardFill']): CardColorPreset | null {
  if (fill === 'none') return null
  return fill
}
