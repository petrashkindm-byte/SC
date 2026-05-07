'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setReminderEnabled } from './actions'

type Props = {
  reminderId: string
  enabled: boolean
}

export default function ReminderToggle({ reminderId, enabled }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await setReminderEnabled(reminderId, !enabled)
            router.refresh()
          } catch {
            /* ignore */
          }
        })
      }}
      className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
        enabled
          ? 'bg-[#e8faf0] text-[#0d9f6e] hover:bg-[#d9f3e5]'
          : 'bg-[#f4f5f8] text-[#6b6b80] hover:bg-[#ececf0]'
      } disabled:opacity-50`}
    >
      {enabled ? 'Вкл' : 'Выкл'}
    </button>
  )
}
