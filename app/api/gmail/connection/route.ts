import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** Отключить Gmail — удалить токены */
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  const { error } = await supabase
    .from('gmail_connections')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/** Статус подключения */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  const { data } = await supabase
    .from('gmail_connections')
    .select('email, created_at')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ connected: !!data, email: data?.email ?? null })
}
