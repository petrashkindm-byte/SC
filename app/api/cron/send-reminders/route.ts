import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendReminderEmail } from '@/lib/reminders/email'
import { sendPushNotification } from '@/lib/reminders/webpush'
import type { ReminderChannel, ReminderType } from '@/lib/supabase/types'

// Called by Vercel Cron (vercel.json) or any external scheduler every 15 min.
// Authenticate with Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()

  // Fetch due, undelivered reminders with related profile + subscription data
  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('enabled', true)
    .is('delivered_at', null)
    .lte('remind_at', new Date().toISOString())
    .limit(100)

  if (error) {
    console.error('[cron/send-reminders] query error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // Batch-fetch profiles and subscriptions
  const userIds = [...new Set(reminders.map((r) => r.user_id))]
  const subIds  = [...new Set(reminders.map((r) => r.subscription_id))]

  const [{ data: profiles }, { data: subs }, { data: pushSubs }] = await Promise.all([
    supabase.from('profiles').select('id, email').in('id', userIds),
    supabase.from('subscriptions').select('id, name').in('id', subIds),
    supabase.from('push_subscriptions').select('user_id, endpoint, p256dh, auth').in('user_id', userIds),
  ])

  const emailByUser = new Map((profiles ?? []).map((p) => [p.id, p.email ?? '']))
  const nameBySubId = new Map((subs ?? []).map((s) => [s.id, s.name]))
  const pushByUser  = new Map<string, { endpoint: string; p256dh: string; auth: string }[]>()
  for (const ps of pushSubs ?? []) {
    if (!ps.endpoint || !ps.p256dh || !ps.auth) continue
    if (!pushByUser.has(ps.user_id)) pushByUser.set(ps.user_id, [])
    pushByUser.get(ps.user_id)!.push({ endpoint: ps.endpoint, p256dh: ps.p256dh, auth: ps.auth })
  }

  const results = await Promise.allSettled(
    reminders.map(async (r) => {
      const subName = nameBySubId.get(r.subscription_id) ?? 'Подписка'
      const type    = r.type as ReminderType
      const channel = r.channel as ReminderChannel

      // Mark delivered first — prevents duplicate sends if DB update fails after delivery
      await supabase
        .from('reminders')
        .update({ delivered_at: new Date().toISOString() })
        .eq('id', r.id)

      try {
        if (channel === 'email') {
          const email = emailByUser.get(r.user_id)
          if (!email) throw new Error(`No email for user ${r.user_id}`)
          await sendReminderEmail(email, subName, type, r.remind_at)

        } else if (channel === 'local_push') {
          const endpoints = pushByUser.get(r.user_id) ?? []
          if (endpoints.length === 0) throw new Error(`No push subscription for user ${r.user_id}`)
          await Promise.all(endpoints.map((ep) => sendPushNotification(ep, subName, type)))
        }
        // in_app: no external delivery needed

        return { id: r.id, ok: true }
      } catch (err) {
        console.error(`[cron/send-reminders] reminder ${r.id} failed:`, err)
        return { id: r.id, ok: false, err: String(err) }
      }
    }),
  )

  const sent   = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length
  const failed = results.length - sent
  console.log(`[cron/send-reminders] sent=${sent} failed=${failed}`)

  return NextResponse.json({ sent, failed })
}
