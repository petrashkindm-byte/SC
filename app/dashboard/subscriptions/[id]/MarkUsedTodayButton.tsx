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
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#bfe7d1] bg-[#e8faf0] px-4 py-2.5 text-sm font-medium text-[#0d9f6e]">
        ✓ Использовал сегодня
      </span>
    )
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-xl border border-[#e7e3dc] bg-white px-4 py-2.5 text-sm font-medium text-[#1a1a2e] hover:bg-[#f8f6f2] disabled:opacity-50 transition-colors"
    >
      {pending ? 'Сохраняю…' : '📅 Использовал сегодня'}
    </button>
  )
}
