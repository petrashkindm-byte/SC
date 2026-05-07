import { createClient } from '@/lib/supabase/server'
import { parseNotesAndViz } from '@/lib/subscription-viz-notes'
import type { Subscription } from '@/lib/supabase/types'
import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import EditSubscriptionView from '../../EditSubscriptionView'

const ERROR_TEXT: Record<string, string> = {
  name: 'Укажите название не короче 2 символов.',
  amount: 'Некорректная сумма.',
  dates: 'Заполните даты списаний.',
  custom: 'Для своего интервала укажите количество дней.',
  save: 'Не удалось сохранить. Проверьте данные и попробуйте снова.',
}

export default async function EditSubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; saved?: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: row, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !row) notFound()

  const sub = row as Subscription
  const sp = await searchParams
  const errorKey = sp.error
  const errorMsg = errorKey && ERROR_TEXT[errorKey] ? ERROR_TEXT[errorKey] : null

  const { userNotes, viz } = parseNotesAndViz(sub.notes)

  const { data: rems } = await supabase
    .from('reminders')
    .select('type')
    .eq('user_id', user.id)
    .eq('subscription_id', id)
    .eq('enabled', true)

  const reminderFlags = {
    renewal: rems?.some((r) => r.type === 'renewal') ?? false,
    trial: rems?.some((r) => r.type === 'trial_end') ?? false,
    price: rems?.some((r) => r.type === 'price_check') ?? false,
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const profileRow = profile as { full_name?: string | null } | null
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const metadataNameParts = [metadata.first_name, metadata.last_name]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim())
    .join(' ')
  const displayName =
    profileRow?.full_name?.trim() ||
    (typeof metadata.full_name === 'string' ? metadata.full_name.trim() : null) ||
    (typeof metadata.name === 'string' ? metadata.name.trim() : null) ||
    metadataNameParts ||
    (typeof metadata.given_name === 'string' ? metadata.given_name.trim() : null) ||
    user.email?.split('@')[0] ||
    'Пользователь'

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f0e8]" />}>
      <EditSubscriptionView
        subscription={sub}
        initialViz={viz}
        userNotes={userNotes}
        displayName={displayName}
        reminderFlags={reminderFlags}
        error={errorMsg}
      />
    </Suspense>
  )
}
