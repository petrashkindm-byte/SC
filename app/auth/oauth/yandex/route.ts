import { NextResponse, type NextRequest } from 'next/server'
import { buildSocialLoginRedirect } from '@/lib/auth/oauth/social-login'
import {
  clearPkceCookies,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  setPkceCookies,
} from '@/lib/auth/oauth/pkce'

export const maxDuration = 30

const STATE_COOKIE = 'oauth_yandex_state'
const VERIFIER_COOKIE = 'oauth_yandex_verifier'

const AUTHORIZE_URL = 'https://oauth.yandex.ru/authorize'
const TOKEN_URL = 'https://oauth.yandex.ru/token'
const USERINFO_URL = 'https://login.yandex.ru/info'

type YandexUserInfo = {
  default_email?: string
  emails?: string[]
  real_name?: string
  first_name?: string
  last_name?: string
}

/**
 * Один эндпоинт обслуживает обе стороны Authorization Code + PKCE флоу:
 * без `code` — старт (редирект на Яндекс), с `code` — обработка callback'а.
 * Поэтому в качестве redirect_uri у Яндекса нужно указывать именно этот URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = new URL(request.url)
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin).replace(/\/$/, '')
  const redirectUri = `${origin}/auth/oauth/yandex`

  const oauthError = searchParams.get('error')
  if (oauthError) {
    return NextResponse.redirect(`${origin}/auth?error=auth&reason=${encodeURIComponent(oauthError)}`)
  }

  const code = searchParams.get('code')
  const clientId = process.env.YANDEX_CLIENT_ID

  if (!clientId) {
    return NextResponse.redirect(`${origin}/auth?error=auth&reason=yandex_not_configured`)
  }

  if (!code) {
    const verifier = generateCodeVerifier()
    const challenge = generateCodeChallenge(verifier)
    const state = generateState()

    const authorizeUrl = new URL(AUTHORIZE_URL)
    authorizeUrl.searchParams.set('response_type', 'code')
    authorizeUrl.searchParams.set('client_id', clientId)
    authorizeUrl.searchParams.set('redirect_uri', redirectUri)
    authorizeUrl.searchParams.set('state', state)
    authorizeUrl.searchParams.set('code_challenge', challenge)
    authorizeUrl.searchParams.set('code_challenge_method', 'S256')

    const response = NextResponse.redirect(authorizeUrl.toString())
    setPkceCookies(response, STATE_COOKIE, VERIFIER_COOKIE, state, verifier)
    return response
  }

  const state = searchParams.get('state')
  const cookieState = request.cookies.get(STATE_COOKIE)?.value
  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value

  if (!state || !cookieState || state !== cookieState || !verifier) {
    const response = NextResponse.redirect(`${origin}/auth?error=auth&reason=oauth_state_mismatch`)
    clearPkceCookies(response, STATE_COOKIE, VERIFIER_COOKIE)
    return response
  }

  const clientSecret = process.env.YANDEX_CLIENT_SECRET
  if (!clientSecret) {
    return NextResponse.redirect(`${origin}/auth?error=auth&reason=yandex_not_configured`)
  }

  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    })
    if (!tokenRes.ok) {
      throw new Error(`Yandex token exchange failed: ${tokenRes.status}`)
    }
    const tokenData = (await tokenRes.json()) as { access_token: string }

    const userRes = await fetch(`${USERINFO_URL}?format=json`, {
      headers: { Authorization: `OAuth ${tokenData.access_token}` },
    })
    if (!userRes.ok) {
      throw new Error(`Yandex userinfo failed: ${userRes.status}`)
    }
    const user = (await userRes.json()) as YandexUserInfo

    const email = user.default_email ?? user.emails?.[0]
    if (!email) {
      const response = NextResponse.redirect(`${origin}/auth?error=auth&reason=oauth_no_email`)
      clearPkceCookies(response, STATE_COOKIE, VERIFIER_COOKIE)
      return response
    }

    const fullName = user.real_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined

    const result = await buildSocialLoginRedirect({ email, fullName, provider: 'yandex' })
    if ('error' in result) {
      const response = NextResponse.redirect(`${origin}/auth?error=auth&reason=${encodeURIComponent(result.error)}`)
      clearPkceCookies(response, STATE_COOKIE, VERIFIER_COOKIE)
      return response
    }

    const response = NextResponse.redirect(`${origin}${result.path}`)
    clearPkceCookies(response, STATE_COOKIE, VERIFIER_COOKIE)
    return response
  } catch (err) {
    console.error('[auth/oauth/yandex]', err)
    const response = NextResponse.redirect(`${origin}/auth?error=auth&reason=oauth_failed`)
    clearPkceCookies(response, STATE_COOKIE, VERIFIER_COOKIE)
    return response
  }
}
