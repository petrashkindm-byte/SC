'use client'

import { toast } from '@/app/dashboard/ui/toast'

const ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)

export default function ManagementButton({ url, editHref }: { url: string | null; editHref: string }) {
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e7eb] bg-[#f8f9fa] px-4 py-2.5 text-sm font-medium text-[#1b2a4a] hover:bg-[#eef0f2] transition-colors"
      >
        {ICON}
        Управление подпиской
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={() =>
        toast(
          'info',
          'Ссылка на управление не указана',
          'Нажмите «Редактировать» и добавьте ссылку на личный кабинет сервиса',
        )
      }
      className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2.5 text-sm font-medium text-[#9ca3af] transition-colors hover:bg-[#f3f4f6]"
    >
      {ICON}
      Управление подпиской
    </button>
  )
}
