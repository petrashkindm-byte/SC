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
      <Link href="/dashboard/import" className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white px-4 text-[14px] font-semibold text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.08)] no-underline hover:bg-[#f8f6f2] mb-6 transition-colors">
        <span aria-hidden>←</span> К импорту
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
