import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BankImportClient from './BankImportClient'

export default async function BankImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="px-6 py-6 max-w-[860px]">
      <Link href="/dashboard/import" className="text-sm text-[#6b6b80] hover:text-[#1a1a2e] mb-6 inline-block">
        ← Назад к импорту
      </Link>
      <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e] mb-2">
        Импорт из банковской выписки
      </h1>
      <p className="text-[#6b6b80] text-sm mb-8">
        Загрузи CSV-выписку — мы найдём повторяющиеся списания и предложим добавить их как подписки
      </p>
      <BankImportClient />
    </main>
  )
}
