'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SubscriptionStatus } from '@/lib/supabase/types'
import { archiveSubscription, deleteSubscription } from '../actions'
import { toast } from '@/app/dashboard/ui/toast'

type Props = {
  subscriptionId: string
  status: SubscriptionStatus
}

export default function SubscriptionDangerZone({ subscriptionId, status }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleArchive() {
    if (!confirm('Убрать подписку в архив? Её можно будет вернуть или удалить позже.')) return
    setError(null)
    startTransition(async () => {
      try {
        await archiveSubscription(subscriptionId)
        toast('info', 'Подписка в архиве', 'Её можно восстановить в любой момент')
        router.refresh()
      } catch {
        setError('Не удалось отправить в архив')
        toast('error', 'Не удалось архивировать')
      }
    })
  }

  function handleDelete() {
    if (
      !confirm(
        'Удалить подписку безвозвратно? Связанные напоминания тоже исчезнут. Это действие нельзя отменить.',
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await deleteSubscription(subscriptionId)
        toast('info', 'Подписка удалена', 'Запись безвозвратно удалена')
        router.push('/dashboard')
        router.refresh()
      } catch {
        setError('Не удалось удалить')
        toast('error', 'Не удалось удалить')
      }
    })
  }

  return (
    <div className="rounded-2xl border border-[#f3c5c7] bg-[#fff6f6] p-4">
      <h3 className="text-sm font-medium text-[#e5484d] mb-2">Опасная зона</h3>
      <p className="text-xs text-[#be5b60] mb-4">
        Как в мобильном приложении: архив можно развернуть; удаление — навсегда.
      </p>
      {error && <p className="text-sm text-[#e5484d] mb-3">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {status !== 'archived' && (
          <button
            type="button"
            disabled={pending}
            onClick={handleArchive}
            className="rounded-lg border border-[#f3d6b6] bg-[#fff4e0] hover:bg-[#fde9ca] disabled:opacity-50 px-4 py-2 text-sm font-medium text-[#b35a00]"
          >
            В архив
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          className="rounded-lg bg-[#e5484d] hover:bg-[#cf3b41] disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
        >
          Удалить навсегда
        </button>
      </div>
    </div>
  )
}
