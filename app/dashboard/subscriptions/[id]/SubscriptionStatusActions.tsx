'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SubscriptionStatus } from '@/lib/supabase/types'
import { updateSubscriptionStatus } from '../actions'

type Props = {
  subscriptionId: string
  status: SubscriptionStatus
}

export default function SubscriptionStatusActions({ subscriptionId, status }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(next: 'active' | 'paused' | 'cancelled') {
    setError(null)
    startTransition(async () => {
      try {
        await updateSubscriptionStatus(subscriptionId, next)
        router.refresh()
      } catch {
        setError('Не удалось обновить статус')
      }
    })
  }

  if (status === 'archived') {
    return (
      <div className="rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06)]">
        <p className="text-sm text-[#6b6b80] mb-3">
          Подписка в архиве — не участвует в расчётах трат. Можно вернуть в активные.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => run('active')}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0d9f6e] hover:bg-[#0a875d] disabled:opacity-50 px-4 py-2.5 text-sm font-medium text-white transition-colors"
        >
          {pending ? 'Обновляю…' : 'Вернуть в активные'}
        </button>
        {error && <p className="mt-2 text-sm text-[#e5484d]">{error}</p>}
      </div>
    )
  }

  const actions: { label: string; desc: string; next: 'active' | 'paused' | 'cancelled'; style: string; show: boolean; confirm?: string }[] = [
    {
      label: 'Снова активна',
      desc: 'Вернуть в отслеживание',
      next: 'active',
      style: 'border-[#bfe7d1] bg-[#e8faf0] text-[#0d9f6e] hover:bg-[#d4f0e3]',
      show: status !== 'active',
    },
    {
      label: 'Поставить на паузу',
      desc: 'Временно приостановить',
      next: 'paused',
      style: 'border-[#fdd] bg-[#fff4eb] text-[#b35a00] hover:bg-[#ffe8d1]',
      show: status === 'active',
    },
    {
      label: 'Отметить как отменённую',
      desc: 'Подписка больше не списывается',
      next: 'cancelled',
      style: 'border-[rgba(26,26,61,0.12)] bg-[#f4f5f8] text-[#6b6b80] hover:bg-[#ececf0]',
      show: status !== 'cancelled',
      confirm: 'Пометить подписку как отменённую?',
    },
  ]

  const visible = actions.filter((a) => a.show)

  return (
    <div className="rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06)]">
      <div className="flex flex-wrap gap-2">
        {visible.map((a) => (
          <button
            key={a.next}
            type="button"
            disabled={pending}
            onClick={() => {
              if (a.confirm && !confirm(a.confirm)) return
              run(a.next)
            }}
            className={`inline-flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-50 ${a.style}`}
          >
            <span className="text-sm font-semibold leading-tight">{pending ? 'Обновляю…' : a.label}</span>
            <span className="text-xs opacity-70 mt-0.5">{a.desc}</span>
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-[#e5484d]">{error}</p>}
    </div>
  )
}
