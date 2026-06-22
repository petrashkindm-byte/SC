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
  billing_type: 'Для пробного периода укажите цену после окончания.',
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
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f0e8]" />}>
      <EditSubscriptionView
        subscription={sub}
        initialViz={viz}
        userNotes={userNotes}
        reminderFlags={reminderFlags}
        error={errorMsg}
      />
    </Suspense>
  )
}
