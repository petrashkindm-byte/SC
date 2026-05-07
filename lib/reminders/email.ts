import type { ReminderType } from '@/lib/supabase/types'

const TYPE_LABEL: Record<ReminderType, string> = {
  renewal:     'Продление подписки',
  trial_end:   'Конец пробного периода',
  price_check: 'Проверь цену подписки',
}

const TYPE_BODY: Record<ReminderType, (sub: string) => string> = {
  renewal:     (sub) => `Подписка «${sub}» скоро продлится. Убедись, что всё в порядке.`,
  trial_end:   (sub) => `Пробный период «${sub}» заканчивается. Реши — оставить или отменить.`,
  price_check: (sub) => `Проверь, не изменилась ли цена у «${sub}».`,
}

function buildHtml(subName: string, type: ReminderType, remindAt: string): string {
  const subject = TYPE_LABEL[type]
  const body    = TYPE_BODY[type](subName)
  const date    = new Date(remindAt).toLocaleString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:sans-serif;background:#f8f6f2;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e7e3dc">
    <p style="font-size:13px;color:#6b6b80;margin:0 0 16px">Subcuro · напоминание</p>
    <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 12px">${subject}</h1>
    <p style="font-size:15px;color:#3a3a50;margin:0 0 24px">${body}</p>
    <p style="font-size:13px;color:#8e8e93;margin:0">Время напоминания: ${date}</p>
  </div>
</body>
</html>`
}

export async function sendReminderEmail(
  to: string,
  subName: string,
  type: ReminderType,
  remindAt: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not set')

  const from = process.env.REMINDER_EMAIL_FROM ?? 'Subcuro <reminders@subcuro.app>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject: `${TYPE_LABEL[type]}: ${subName}`,
      html: buildHtml(subName, type, remindAt),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error ${res.status}: ${err}`)
  }
}
