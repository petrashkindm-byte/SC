import { createClient } from '@/lib/supabase/server'
import type { Subscription } from '@/lib/supabase/types'

export async function requireUserSubscriptions(): Promise<
  | { ok: true; subs: Subscription[] }
  | { ok: false; status: 401 }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401 }

  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')

  return { ok: true, subs: data ?? [] }
}

/** Любые подписки пользователя по id (для ИИ-анализа выбранных, в т.ч. paused). */
export async function requireUserAndSubscriptionsByIds(
  ids: string[],
): Promise<
  | { ok: true; subs: Subscription[] }
  | { ok: false; status: 401 | 404 }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401 }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .in('id', ids)

  if (error || !data || data.length !== ids.length) {
    return { ok: false, status: 404 }
  }

  return { ok: true, subs: data as Subscription[] }
}
