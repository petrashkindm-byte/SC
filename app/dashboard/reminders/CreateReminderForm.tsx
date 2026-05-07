'use client'

import { useState } from 'react'
import { createReminder } from './actions'

type SubOption = { id: string; name: string }

type Props = {
  subscriptions: SubOption[]
  defaultSubscriptionId?: string
}

export default function CreateReminderForm({ subscriptions, defaultSubscriptionId }: Props) {
  const [pending, setPending] = useState(false)

  if (subscriptions.length === 0) {
    return (
      <p className="text-sm text-[#8e8e93] rounded-xl border border-[#d8d2cb] bg-white px-4 py-3">
        Добавьте подписку, чтобы создавать напоминания.
      </p>
    )
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const local = String(fd.get('remind_at_local') ?? '')
    if (!local) return
    fd.set('remind_at_iso', new Date(local).toISOString())
    setPending(true)
    try {
      await createReminder(fd)
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[#e7e3dc] bg-white p-5 space-y-4 max-w-lg shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]">
      <h2 className="text-sm font-medium text-[#1a1a2e]">Новое напоминание</h2>

      <div>
        <label className="block text-xs text-[#6b6b80] mb-1">Подписка</label>
        <select
          name="subscription_id"
          required
          defaultValue={defaultSubscriptionId ?? subscriptions[0]?.id}
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-sm text-[#1a1a2e]"
        >
          {subscriptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-[#6b6b80] mb-1">Когда напомнить (ваше локальное время)</label>
        <input
          name="remind_at_local"
          type="datetime-local"
          required
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-sm text-[#1a1a2e]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#6b6b80] mb-1">Тип</label>
          <select
            name="type"
            className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-sm text-[#1a1a2e]"
          >
            <option value="renewal">Продление</option>
            <option value="trial_end">Конец триала</option>
            <option value="price_check">Проверка цены</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#6b6b80] mb-1">Канал</label>
          <select
            name="channel"
            className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-sm text-[#1a1a2e]"
          >
            <option value="in_app">В приложении</option>
            <option value="email">Email</option>
            <option value="local_push">Push (телефон)</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#5b43d4] hover:bg-[#4b36b6] disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
      >
        {pending ? 'Сохранение…' : 'Создать'}
      </button>
    </form>
  )
}
