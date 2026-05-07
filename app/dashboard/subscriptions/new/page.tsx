import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import SubscriptionForm from './SubscriptionForm'

const ERROR_TEXT: Record<string, string> = {
  name: 'Укажите название не короче 2 символов.',
  amount: 'Некорректная сумма.',
  dates: 'Заполните даты списаний.',
  custom: 'Для своего интервала укажите количество дней.',
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
      <Link href="/dashboard" className="text-sm text-[#6b6b80] hover:text-[#1a1a2e] mb-6 inline-block">
        ← К обзору
      </Link>
      <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e] mb-2">Новая подписка</h1>
      <p className="text-[#6b6b80] text-sm mb-8">
        Минимальный набор полей — как в базе Supabase. Редактор из приложения появится позже.
      </p>
      <SubscriptionForm defaultCurrency={defaultCurrency} error={error} />
    </main>
  )
}
