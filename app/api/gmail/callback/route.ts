import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // user_id
  const error = searchParams.get('error')

  if (error || !code || !state) {
    console.error('[gmail/callback] error:', error)
    return NextResponse.redirect(`${origin}/dashboard/import/gmail?error=access_denied`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${origin}/api/gmail/callback`

  // Обменять code на токены
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    console.error('[gmail/callback] token exchange failed:', tokenRes.status, body)
    return NextResponse.redirect(`${origin}/dashboard/import/gmail?error=token_exchange`)
  }

  const tokenData = await tokenRes.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
    error?: string
  }

  if (tokenData.error) {
    console.error('[gmail/callback] token error:', tokenData.error)
    return NextResponse.redirect(`${origin}/dashboard/import/gmail?error=token_error`)
  }

  // Получаем email пользователя
  let gmailEmail: string | null = null
  try {
    const meRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (meRes.ok) {
      const me = await meRes.json() as { email?: string }
      gmailEmail = me.email ?? null
    }
  } catch {
    // не критично
  }

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

  // Сохраняем в Supabase (upsert — один пользователь = одна запись)
  const supabase = await createClient()

  // Проверяем что state соответствует залогиненному пользователю
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== state) {
    console.error('[gmail/callback] user mismatch')
    return NextResponse.redirect(`${origin}/auth`)
  }

  const { error: dbError } = await supabase
    .from('gmail_connections')
    .upsert({
      user_id: user.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      expires_at: expiresAt,
      email: gmailEmail,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (dbError) {
    console.error('[gmail/callback] db error:', dbError)
    return NextResponse.redirect(`${origin}/dashboard/import/gmail?error=db_error`)
  }

  return NextResponse.redirect(`${origin}/dashboard/import/gmail?connected=1`)
}
