'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteReminder } from './actions'

type Props = {
  reminderId: string
}

export default function DeleteReminderButton({ reminderId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm('Удалить это напоминание?')) return
        startTransition(async () => {
          try {
            await deleteReminder(reminderId)
            router.refresh()
          } catch {
            /* ignore */
          }
        })
      }}
      className="rounded-lg border border-[#f3c5c7] text-[#e5484d] hover:bg-[#fdecec] px-3 py-1 text-xs font-medium disabled:opacity-50"
    >
      Удалить
    </button>
  )
}
