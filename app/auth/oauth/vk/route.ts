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

const DISCOVERY_URL = 'https://id.vk.com/.well-known/openid-configuration'

type VkDiscovery = {
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
}

type VkUserInfo = {
  email?: string
  given_name?: string
  family_name?: string
  name?: string
}

/**
 * Один эндпоинт обслуживает обе стороны Authorization Code + PKCE флоу:
 * без `code` — старт (редирект на VK ID), с `code` — обработка callback'а.
 * Endpoints берём через OIDC discovery (id.vk.com/.well-known/openid-configuration),
 * т.к. VK ID не входит во встроенные провайдеры Supabase.
 *
 * ВНИМАНИЕ: проверьте актуальные параметры VK ID OAuth2 перед использованием —
 * API менялся, отдельные версии требуют передавать `device_id` (приходит в
 * query callback'а от VK) обратно в token endpoint. Этот код это поддерживает,
 * но если VK вернёт другой набор полей в userinfo — потребуется правка маппинга.
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

  let discovery: VkDiscovery
  try {
    const discoveryRes = await fetch(DISCOVERY_URL)
    if (!discoveryRes.ok) {
      throw new Error(`VK discovery failed: ${discoveryRes.status}`)
    }
    discovery = (await discoveryRes.json()) as VkDiscovery
  } catch (err) {
    console.error('[auth/oauth/vk] discovery', err)
    return NextResponse.redirect(`${origin}/auth?error=auth&reason=oauth_failed`)
  }

  if (!code) {
    const verifier = generateCodeVerifier()
    const challenge = generateCodeChallenge(verifier)
    const state = generateState()

    const authorizeUrl = new URL(discovery.authorization_endpoint)
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

  const clientSecret = process.env.VK_CLIENT_SECRET

  try {
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    })
    if (clientSecret) tokenBody.set('client_secret', clientSecret)
    if (deviceId) tokenBody.set('device_id', deviceId)

    const tokenRes = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    })
    if (!tokenRes.ok) {
      throw new Error(`VK token exchange failed: ${tokenRes.status}`)
    }
    const tokenData = (await tokenRes.json()) as { access_token: string }

    const userRes = await fetch(discovery.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (!userRes.ok) {
      throw new Error(`VK userinfo failed: ${userRes.status}`)
    }
    const user = (await userRes.json()) as VkUserInfo

    if (!user.email) {
      const response = NextResponse.redirect(`${origin}/auth?error=auth&reason=oauth_no_email`)
      clearPkceCookies(response, STATE_COOKIE, VERIFIER_COOKIE)
      return response
    }

    const fullName = user.name || [user.given_name, user.family_name].filter(Boolean).join(' ') || undefined

    const result = await buildSocialLoginRedirect({ email: user.email, fullName, provider: 'vk' })
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
