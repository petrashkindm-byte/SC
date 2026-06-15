import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Reminder, Subscription } from '@/lib/supabase/types'
import CreateReminderForm from './CreateReminderForm'
import DeleteReminderButton from './DeleteReminderButton'
import ReminderToggle from './ReminderToggle'
import PushPermissionButton from './PushPermissionButton'

const TYPE_LABEL: Record<string, string> = {
  trial_end: 'Конец пробного периода',
  renewal: 'Продление',
  price_check: 'Проверка цены',
}

const CHANNEL_LABEL: Record<string, string> = {
  local_push: 'Push на устройстве',
  email: 'Почта',
  in_app: 'В приложении',
}

const ERR_TEXT: Record<string, string> = {
  form: 'Заполните подписку и время.',
  date: 'Некорректная дата.',
  sub: 'Подписка не найдена.',
  save: 'Не удалось сохранить напоминание.',
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ sub?: string; created?: string; error?: string; from?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams

  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user.id)
    .order('remind_at', { ascending: true })

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('next_charge_date', { ascending: true })

  const allSubs = (subs ?? []) as Subscription[]
  const subOptions = allSubs
    .filter((s) => s.status !== 'archived')
    .map((s) => ({ id: s.id, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  const nameById = new Map(allSubs.map((s) => [s.id, s.name]))
  const list = (reminders ?? []) as Reminder[]

  const defaultSub =
    sp.sub && subOptions.some((o) => o.id === sp.sub) ? sp.sub : undefined

  const backHref = sp.sub
    ? `/dashboard/subscriptions/${sp.sub}`
    : '/dashboard?tab=payments'
  const backLabel = sp.sub ? '← К подписке' : '← К платежам'

  return (
    <main className="px-4 sm:px-6 py-6 max-w-[720px]">
      <Link
        href={backHref}
        className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white px-4 text-[14px] font-semibold text-[#1a1a2e] shadow-[0_1px_3px_rgba(26,26,61,0.08)] no-underline hover:bg-[#f8f6f2] mb-6 transition-colors"
      >
        {backLabel}
      </Link>

      <header className="mb-6">
        <h1 className="text-[32px] leading-tight font-bold tracking-[-0.03em] text-[#1a1a2e]">Напоминания</h1>
        <p className="text-sm text-[#6b6b80] mt-1">Push и email-уведомления по подпискам</p>
      </header>

      {sp.created === '1' && (
        <p className="mb-5 rounded-xl border border-[#bfe7d1] bg-[#e8faf0] text-[#0d9f6e] text-sm px-4 py-3">
          Напоминание создано
        </p>
      )}
      {sp.error && ERR_TEXT[sp.error] && (
        <p className="mb-5 rounded-xl border border-[#f3c5c7] bg-[#fdecec] text-[#e5484d] text-sm px-4 py-3">
          {ERR_TEXT[sp.error]}
        </p>
      )}

      {/* Create form */}
      <section className="rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06)] mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-[#1a1a2e] tracking-[-0.02em]">Новое напоминание</h2>
          <PushPermissionButton />
        </div>
        <CreateReminderForm subscriptions={subOptions} defaultSubscriptionId={defaultSub} />
      </section>

      {/* List */}
      <section>
        <h2 className="text-[15px] font-semibold text-[#1a1a2e] mb-3">
          {list.length > 0 ? `Активные напоминания · ${list.length}` : 'Активные напоминания'}
        </h2>
        {list.length === 0 ? (
          <p className="text-[#8e8e93] text-sm py-8 text-center border border-dashed border-[#d8d2cb] rounded-xl bg-white">
            Пока нет напоминаний — создайте первое выше.
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-[#e7e3dc] bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-[0_1px_3px_rgba(26,26,61,0.06)]"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[#1a1a2e] text-sm truncate">
                    {nameById.get(r.subscription_id) ?? 'Подписка удалена'}
                  </p>
                  <p className="text-xs text-[#6b6b80] mt-0.5">
                    {TYPE_LABEL[r.type] ?? r.type} · {CHANNEL_LABEL[r.channel] ?? r.channel}
                  </p>
                  <p className="text-sm font-medium text-[#5b43d4] mt-1.5">{formatWhen(r.remind_at)}</p>
                  {r.delivered_at && (
                    <p className="text-xs text-[#8e8e93] mt-0.5">
                      Отправлено: {formatWhen(r.delivered_at)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ReminderToggle reminderId={r.id} enabled={r.enabled} />
                  <DeleteReminderButton reminderId={r.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
