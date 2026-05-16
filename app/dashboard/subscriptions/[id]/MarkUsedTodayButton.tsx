'use client'

import { useState, useTransition } from 'react'
import { markLastUsed } from '@/app/dashboard/subscriptions/actions'

export default function MarkUsedTodayButton({ subscriptionId, lastUsedAt }: {
  subscriptionId: string
  lastUsedAt: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  const isToday = lastUsedAt
    ? new Date(lastUsedAt).toDateString() === new Date().toDateString()
    : false

  const handleClick = () => {
    startTransition(async () => {
      await markLastUsed(subscriptionId)
      setDone(true)
    })
  }

  if (isToday || done) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl border border-[#bfe7d1] bg-[#e8faf0] px-4 py-2.5 text-sm font-medium text-[#0d9f6e]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Использовал сегодня
      </span>
    )
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-xl border border-[#e7e3dc] bg-white px-4 py-2.5 text-sm font-medium text-[#1a1a2e] hover:border-[#0d9f6e] hover:text-[#0d9f6e] hover:bg-[#f0faf5] disabled:opacity-50 transition-colors"
    >
      {pending ? (
        <>
          <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
          Сохраняю…
        </>
      ) : (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Использовал сегодня
        </>
      )}
    </button>
  )
}
