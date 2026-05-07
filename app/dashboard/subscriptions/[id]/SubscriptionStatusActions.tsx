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
      <div className="space-y-3 rounded-2xl border border-[#e7e3dc] bg-white p-4 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
        <p className="text-sm text-[#6b6b80]">
          Подписка в архиве — не участвует в активных тратах. Ниже можно вернуть в активные или удалить.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => run('active')}
          className="rounded-lg bg-[#0d9f6e] hover:bg-[#0a875d] disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
        >
          Вернуть в активные
        </button>
        {error && <p className="text-sm text-[#e5484d]">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[#e7e3dc] bg-white p-4 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
      <div className="flex flex-wrap gap-2">
        {status !== 'active' && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run('active')}
            className="rounded-lg bg-[#0d9f6e] hover:bg-[#0a875d] disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
          >
            Снова активна
          </button>
        )}
        {status !== 'paused' && status !== 'cancelled' && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run('paused')}
            className="rounded-lg bg-[#b35a00] hover:bg-[#9d4f00] disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
          >
            Пауза
          </button>
        )}
        {status !== 'cancelled' && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm('Пометить подписку как отменённую?')) run('cancelled')
            }}
            className="rounded-lg bg-[#1a1a2e] hover:bg-[#10101f] disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
          >
            Как отменённая
          </button>
        )}
      </div>
      {error && <p className="text-sm text-[#e5484d]">{error}</p>}
    </div>
  )
}
