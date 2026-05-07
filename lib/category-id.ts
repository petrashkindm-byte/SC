import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export async function loadCategoryIdBySlug(
  supabase: SupabaseClient<Database>,
  userId: string,
  slugs: string[],
): Promise<Map<string, string>> {
  const uniq = Array.from(new Set(slugs.filter(Boolean)))
  if (uniq.length === 0) return new Map()

  const { data, error } = await supabase
    .from('categories')
    .select('id,slug,owner_id')
    .in('slug', uniq)
    .or(`owner_id.eq.${userId},owner_id.is.null`)

  if (error || !data) return new Map()

  // Приоритет у пользовательских категорий над системными.
  const map = new Map<string, string>()
  for (const row of data.sort((a, b) => (a.owner_id === userId ? -1 : 1) - (b.owner_id === userId ? -1 : 1))) {
    if (!map.has(row.slug)) map.set(row.slug, row.id)
  }
  return map
}
