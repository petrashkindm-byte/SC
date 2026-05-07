/** Визуальные настройки редактора хранятся в поле notes после маркера. */

export const SUBCURO_VIZ_MARKER = '\n\n__SUBCURO_VIZ__:'
const STANDALONE_VIZ_PREFIX = '__SUBCURO_VIZ__:'

export type SubcuroEditViz = {
  iconBg: string | null
  shape: 'rounded' | 'circle' | 'square'
  cardFill: 'none' | 'lavender' | 'mint' | 'peach'
}

export const DEFAULT_SUBCURO_VIZ: SubcuroEditViz = {
  iconBg: null,
  shape: 'rounded',
  cardFill: 'none',
}

function parseVizJson(raw: string): SubcuroEditViz {
  try {
    const parsed = JSON.parse(raw) as Partial<SubcuroEditViz>
    return {
      iconBg: typeof parsed.iconBg === 'string' || parsed.iconBg === null ? parsed.iconBg ?? null : null,
      shape:
        parsed.shape === 'circle' || parsed.shape === 'square' || parsed.shape === 'rounded'
          ? parsed.shape
          : 'rounded',
      cardFill:
        parsed.cardFill === 'lavender' ||
        parsed.cardFill === 'mint' ||
        parsed.cardFill === 'peach' ||
        parsed.cardFill === 'none'
          ? parsed.cardFill
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
