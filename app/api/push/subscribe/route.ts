import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const userAgent = req.headers.get('user-agent') ?? null

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id:    user.id,
      endpoint:   body.endpoint,
      p256dh:     body.keys.p256dh,
      auth:       body.keys.auth,
      user_agent: userAgent,
    },
    { onConflict: 'user_id,endpoint', ignoreDuplicates: false },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
