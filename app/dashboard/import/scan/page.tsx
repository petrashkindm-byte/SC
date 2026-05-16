import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import ScanImportClient from './ScanImportClient'

export default async function ScanImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  return (
    <main className="px-6 py-6 max-w-[860px]">
      <Link
        href="/dashboard/import"
        className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white px-4 text-[14px] font-semibold text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.08)] no-underline hover:bg-[#f8f6f2] mb-6 transition-colors"
      >
        <span aria-hidden>←</span> К выбору способа
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e]">
          AI-сканирование
        </h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#ede9fc] px-2.5 py-1 text-[11px] font-semibold text-[#5b43d4]">
          ✨ AI
        </span>
      </div>
      <p className="text-[#6b6b80] text-sm mb-8">
        Загрузи выписку из любого банка — AI найдёт регулярные списания и определит подписки
      </p>

      <ScanImportClient />
    </main>
  )
}
