'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteReminder } from './actions'

type Props = {
  reminderId: string
}

export default function DeleteReminderButton({ reminderId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-xs text-[#6b6b80]">Удалить?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null)
            startTransition(async () => {
              try {
                await deleteReminder(reminderId)
                router.refresh()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Ошибка при удалении')
                setConfirming(false)
              }
            })
          }}
          className="rounded-lg bg-[#e5484d] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#c93b40] disabled:opacity-50"
        >
          {pending ? '…' : 'Да'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-[#e7e3dc] bg-white px-2.5 py-1 text-xs font-medium text-[#6b6b80] hover:bg-[#f8f6f2] disabled:opacity-50"
        >
          Нет
        </button>
        {error && <span className="text-xs text-[#e5484d]">{error}</span>}
      </span>
    )
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-[#f3c5c7] text-[#e5484d] hover:bg-[#fdecec] px-3 py-1 text-xs font-medium"
      >
        Удалить
      </button>
      {error && <span className="text-xs text-[#e5484d]">{error}</span>}
    </span>
  )
}
