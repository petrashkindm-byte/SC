import { createAdminClient } from '@/lib/supabase/admin'
import { validateUnsubscribeToken } from '@/lib/reminders/unsubscribe-token'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams

  let status: 'success' | 'invalid' | 'error' = 'invalid'

  if (token) {
    const userId = validateUnsubscribeToken(token)
    if (userId) {
      try {
        const supabase = createAdminClient()
        const { error } = await supabase
          .from('user_settings')
          .update({ email_reminders_enabled: false })
          .eq('user_id', userId)
        status = error ? 'error' : 'success'
      } catch {
        status = 'error'
      }
    }
  }

  return (
    <main style={{ fontFamily: 'sans-serif', background: '#f8f6f2', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
      <div style={{ maxWidth: 480, width: '100%', background: '#fff', borderRadius: 16, padding: 40, border: '1px solid #e7e3dc', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#6b6b80', margin: '0 0 16px' }}>SubCuro</p>

        {status === 'success' && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: '0 0 12px' }}>Вы отписались</h1>
            <p style={{ fontSize: 15, color: '#3a3a50', margin: '0 0 24px' }}>
              Напоминания по email отключены. Вы можете включить их снова в настройках.
            </p>
          </>
        )}

        {status === 'invalid' && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: '0 0 12px' }}>Недействительная ссылка</h1>
            <p style={{ fontSize: 15, color: '#3a3a50', margin: '0 0 24px' }}>
              Ссылка для отписки недействительна. Вы можете управлять уведомлениями в настройках.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: '0 0 12px' }}>Что-то пошло не так</h1>
            <p style={{ fontSize: 15, color: '#3a3a50', margin: '0 0 24px' }}>
              Не удалось обновить настройки. Попробуйте ещё раз или отключите напоминания в настройках.
            </p>
          </>
        )}

        <Link href="/dashboard/settings" style={{ fontSize: 14, color: '#6b6b80', textDecoration: 'underline' }}>
          Перейти в настройки
        </Link>
      </div>
    </main>
  )
}
