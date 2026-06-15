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

const STATE_COOKIE = 'oauth_vk_state'
const VERIFIER_COOKIE = 'oauth_vk_verifier'

const AUTHORIZE_URL = 'https://id.vk.ru/authorize'
const TOKEN_URL = 'https://id.vk.ru/oauth2/auth'
const USERINFO_URL = 'https://id.vk.ru/oauth2/user_info'

type VkUserInfo = {
  user?: {
    user_id?: string
    email?: string
    first_name?: string
    last_name?: string
    phone?: string
  }
}

/**
 * Один эндпоинт обслуживает обе стороны Authorization Code + PKCE флоу:
 * без `code` — старт (редирект на VK ID), с `code` — обработка callback'а.
 * Эндпоинты VK ID фиксированные (id.vk.ru) — OIDC discovery
 * (id.vk.com/.well-known/openid-configuration) у VK не существует (404).
 * `device_id` приходит в query callback'а от VK и должен быть передан
 * обратно в token endpoint.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = new URL(request.url)
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin).replace(/\/$/, '')
  const redirectUri = `${origin}/auth/oauth/vk`

  const oauthError = searchParams.get('error')
  if (oauthError) {
    return NextResponse.redirect(`${origin}/auth?error=auth&reason=${encodeURIComponent(oauthError)}`)
  }

  const code = searchParams.get('code')
  const clientId = process.env.VK_CLIENT_ID

  if (!clientId) {
    return NextResponse.redirect(`${origin}/auth?error=auth&reason=vk_not_configured`)
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
    authorizeUrl.searchParams.set('scope', 'email')

    const response = NextResponse.redirect(authorizeUrl.toString())
    setPkceCookies(response, STATE_COOKIE, VERIFIER_COOKIE, state, verifier)
    return response
  }

  const state = searchParams.get('state')
  const deviceId = searchParams.get('device_id')
  const cookieState = request.cookies.get(STATE_COOKIE)?.value
  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value

  if (!state || !cookieState || state !== cookieState || !verifier) {
    const response = NextResponse.redirect(`${origin}/auth?error=auth&reason=oauth_state_mismatch`)
    clearPkceCookies(response, STATE_COOKIE, VERIFIER_COOKIE)
    return response
  }

  try {
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    })
    if (deviceId) tokenBody.set('device_id', deviceId)

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    })
    if (!tokenRes.ok) {
      throw new Error(`VK token exchange failed: ${tokenRes.status}`)
    }
    const tokenData = (await tokenRes.json()) as { access_token: string; email?: string }

    const userRes = await fetch(USERINFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        access_token: tokenData.access_token,
      }),
    })
    if (!userRes.ok) {
      throw new Error(`VK userinfo failed: ${userRes.status}`)
    }
    const { user } = (await userRes.json()) as VkUserInfo

    // VK ID отдаёт email в ответе token endpoint, а не в user_info.
    const email = tokenData.email ?? user?.email

    if (!email) {
      const response = NextResponse.redirect(`${origin}/auth?error=auth&reason=oauth_no_email`)
      clearPkceCookies(response, STATE_COOKIE, VERIFIER_COOKIE)
      return response
    }

    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || undefined

    const result = await buildSocialLoginRedirect({ email, fullName, provider: 'vk' })
    if ('error' in result) {
      const response = NextResponse.redirect(`${origin}/auth?error=auth&reason=${encodeURIComponent(result.error)}`)
      clearPkceCookies(response, STATE_COOKIE, VERIFIER_COOKIE)
      return response
    }

    const response = NextResponse.redirect(`${origin}${result.path}`)
    clearPkceCookies(response, STATE_COOKIE, VERIFIER_COOKIE)
    return response
  } catch (err) {
    console.error('[auth/oauth/vk]', err)
    const response = NextResponse.redirect(`${origin}/auth?error=auth&reason=oauth_failed`)
    clearPkceCookies(response, STATE_COOKIE, VERIFIER_COOKIE)
    return response
  }
}
