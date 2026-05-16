import Link from 'next/link'
import LogoutButton from './LogoutButton'

export default function DashboardHeader() {
  return (
    <header className="border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-5 min-w-0">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-white shrink-0">
          Subcuro
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
          <Link href="/dashboard" className="hover:text-white transition-colors">
            Обзор
          </Link>
          <Link href="/dashboard/reminders" className="hover:text-white transition-colors">
            Напоминания
          </Link>
          <Link href="/dashboard/settings" className="hover:text-white transition-colors">
            Настройки
          </Link>
          <Link href="/dashboard/import" className="hover:text-white transition-colors">
            Импорт
          </Link>
          <Link
            href="/dashboard/subscriptions/new"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            + Подписка
          </Link>
        </nav>
      </div>
      <LogoutButton />
    </header>
  )
}
