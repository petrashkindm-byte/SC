import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a2e] flex flex-col items-center justify-center px-6">
      <p className="text-sm text-[#8e8e93] mb-2 tabular-nums">404</p>
      <h1 className="text-2xl font-bold tracking-[-0.02em] mb-3 text-center">Страница не найдена</h1>
      <p className="text-[#6b6b80] text-sm text-center max-w-md mb-8">
        Ссылка устарела или страница удалена. Вернитесь в обзор или на главную.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          href="/dashboard"
          className="rounded-xl bg-[#5b43d4] hover:bg-[#4b36b6] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(91,67,212,0.35)] transition-colors"
        >
          Обзор
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-[#e7e3dc] bg-white px-5 py-2.5 text-sm font-medium text-[#1a1a2e] hover:bg-[#f8f6f2] transition-colors shadow-[0_1px_3px_rgba(26,26,61,0.06)]"
        >
          Главная
        </Link>
      </div>
    </div>
  )
}
