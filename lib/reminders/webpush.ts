import webpush from 'web-push'
import type { ReminderType } from '@/lib/supabase/types'

let _configured = false

function configure() {
  if (_configured) return
  const pub  = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const sub  = process.env.VAPID_SUBJECT ?? 'mailto:admin@subcuro.app'
  if (!pub || !priv) throw new Error('VAPID keys not set')
  webpush.setVapidDetails(sub, pub, priv)
  _configured = true
}

const TYPE_TITLE: Record<ReminderType, string> = {
  renewal:     'Продление подписки',
  trial_end:   'Конец пробного периода',
  price_check: 'Проверь цену',
}

const TYPE_BODY: Record<ReminderType, (sub: string) => string> = {
  renewal:     (sub) => `«${sub}» скоро продлится`,
  trial_end:   (sub) => `Пробный период «${sub}» заканчивается`,
  price_check: (sub) => `Проверь, не изменилась ли цена у «${sub}»`,
}

export interface PushEndpoint {
  endpoint: string
  p256dh:   string
  auth:     string
}

export async function sendPushNotification(
  endpoint: PushEndpoint,
  subName:  string,
  type:     ReminderType,
): Promise<void> {
  configure()

  const payload = JSON.stringify({
    title: TYPE_TITLE[type],
    body:  TYPE_BODY[type](subName),
    url:   '/dashboard/reminders',
    icon:  '/icon-192.png',
  })

  await webpush.sendNotification(
    {
      endpoint:  endpoint.endpoint,
      keys: { p256dh: endpoint.p256dh, auth: endpoint.auth },
    },
    payload,
    { TTL: 86400 },
  )
}
