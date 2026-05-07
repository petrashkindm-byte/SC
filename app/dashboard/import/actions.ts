'use server'

import { createClient } from '@/lib/supabase/server'
import { loadCategoryIdBySlug } from '@/lib/category-id'
import { parseCsvToRecords } from '@/lib/parse-csv'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { mapCsvRowToSubscription } from './csv-map'

export async function importSubscriptionsCsv(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('file')
  if (!file || typeof (file as Blob).text !== 'function') {
    redirect('/dashboard/import?error=no_file')
  }

  const text = await (file as File).text()
  const records = parseCsvToRecords(text)
  if (records.length === 0) {
    redirect('/dashboard/import?error=empty')
  }

  let imported = 0
  let skipped = 0
  const reasons: string[] = []
  const slugToCategoryId = await loadCategoryIdBySlug(
    supabase,
    user.id,
    records.map((r) => (r.category_slug ?? 'other').toString().toLowerCase()),
  )

  for (let i = 0; i < records.length; i++) {
    const mapped = mapCsvRowToSubscription(records[i], i + 2)
    if (!mapped.ok) {
      skipped++
      if (reasons.length < 8) reasons.push(mapped.reason)
      continue
    }

    const { id, payload } = mapped

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('subscriptions')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) {
        skipped++
        if (reasons.length < 8) reasons.push(`Строка ${i + 2}: ${error.message}`)
      } else {
        imported++
      }
    } else {
      const { error } = await supabase.from('subscriptions').insert({
        id,
        user_id: user.id,
        category_id: slugToCategoryId.get(payload.category_slug) ?? null,
        ...payload,
      })
      if (error) {
        skipped++
        if (reasons.length < 8) {
          const hint =
            error.message.toLowerCase().includes('duplicate key')
              ? `Строка ${i + 2}: id уже занят (возможно, это запись другого пользователя)`
              : `Строка ${i + 2}: ${error.message}`
          reasons.push(hint)
        }
      } else {
        imported++
      }
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/import')

  const q = new URLSearchParams()
  q.set('imported', String(imported))
  q.set('skipped', String(skipped))
  if (reasons.length > 0) {
    q.set('hints', reasons.join('|').slice(0, 1800))
  }
  q.set('mode', 'csv')
  redirect(`/dashboard/import?${q.toString()}`)
}
