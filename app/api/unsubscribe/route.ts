import { createAdminClient } from '@/lib/supabase/admin'
import { validateUnsubscribeToken } from '@/lib/reminders/unsubscribe-token'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const userId = validateUnsubscribeToken(token)
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('user_settings')
    .update({ email_reminders_enabled: false })
    .eq('user_id', userId)

  if (error) {
    console.error('[unsubscribe] DB error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
