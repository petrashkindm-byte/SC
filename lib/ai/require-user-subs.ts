import { headers } from 'next/headers'
import { createClient, createClientFromToken } from '@/lib/supabase/server'
import type { Subscription } from '@/lib/supabase/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type ResolvedAuth =
  | { supabase: SupabaseClient<Database>; userId: string }
  | null

/** Resolves the caller's identity from a cookie session or Bearer token. */
async function resolveAuth(): Promise<ResolvedAuth> {
  const cookieClient = await createClient()
  const { data: { user: cookieUser } } = await cookieClient.auth.getUser()
  if (cookieUser) return { supabase: cookieClient, userId: cookieUser.id }

  const headersList = await headers()
  const authHeader = headersList.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const tokenClient = createClientFromToken(token)
  const { data: { user: tokenUser } } = await tokenClient.auth.getUser(token)
  if (!tokenUser) return null

  return { supabase: tokenClient, userId: tokenUser.id }
}

export async function requireUserSubscriptions(): Promise<
  | { ok: true; userId: string; subs: Subscription[] }
  | { ok: false; status: 401 }
> {
  const auth = await resolveAuth()
  if (!auth) return { ok: false, status: 401 }

  const { data } = await auth.supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', auth.userId)
    .eq('status', 'active')

  return { ok: true, userId: auth.userId, subs: data ?? [] }
}

/** Любые подписки пользователя по id (для ИИ-анализа выбранных, в т.ч. paused). */
export async function requireUserAndSubscriptionsByIds(
  ids: string[],
): Promise<
  | { ok: true; userId: string; subs: Subscription[] }
  | { ok: false; status: 401 | 404 }
> {
  const auth = await resolveAuth()
  if (!auth) return { ok: false, status: 401 }

  const { data, error } = await auth.supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', auth.userId)
    .in('id', ids)

  if (error || !data || data.length !== ids.length) {
    return { ok: false, status: 404 }
  }

  return { ok: true, userId: auth.userId, subs: data as Subscription[] }
}
