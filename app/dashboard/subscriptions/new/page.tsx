import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import SubscriptionForm from './SubscriptionForm'

const ERROR_TEXT: Record<string, string> = {
  name: 'Укажите название не короче 2 символов.',
  amount: 'Некорректная сумма.',
  dates: 'Заполните даты списаний.',
  custom: 'Для своего интервала укажите количество дней.',
  billing_type: 'Для пробного периода укажите цену после окончания.',
  save: 'Не удалось сохранить. Проверьте данные и попробуйте снова.',
}

export default async function NewSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const errorKey = sp.error
  const error = errorKey && ERROR_TEXT[errorKey] ? ERROR_TEXT[errorKey] : null

  const { data: settings } = await supabase
    .from('user_settings')
    .select('base_currency')
    .eq('user_id', user.id)
    .maybeSingle()

  const row = settings as { base_currency?: string } | null
  const defaultCurrency = (row?.base_currency ?? 'RUB').slice(0, 3).toUpperCase()

  return (
    <main className="px-6 py-6 max-w-[1180px]">
      <Link href="/dashboard" className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white px-4 text-[14px] font-semibold text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.08)] no-underline hover:bg-[#f8f6f2] mb-6 transition-colors">
        <span aria-hidden>←</span> К обзору
      </Link>
      <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e] mb-2">Новая подписка</h1>

      <SubscriptionForm defaultCurrency={defaultCurrency} error={error} />
    </main>
  )
}
