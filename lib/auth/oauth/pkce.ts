import { randomBytes, createHash } from 'crypto'
import type { NextResponse } from 'next/server'

const PKCE_COOKIE_MAX_AGE = 60 * 10 // 10 минут — достаточно для прохождения OAuth-флоу

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateCodeVerifier(): string {
  return base64url(randomBytes(32))
}

export function generateCodeChallenge(verifier: string): string {
  return base64url(createHash('sha256').update(verifier).digest())
}

export function generateState(): string {
  return base64url(randomBytes(16))
}

export function setPkceCookies(
  response: NextResponse,
  stateCookie: string,
  verifierCookie: string,
  state: string,
  verifier: string,
): void {
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: PKCE_COOKIE_MAX_AGE,
  }
  response.cookies.set(stateCookie, state, opts)
  response.cookies.set(verifierCookie, verifier, opts)
}

export function clearPkceCookies(response: NextResponse, stateCookie: string, verifierCookie: string): void {
  response.cookies.set(stateCookie, '', { path: '/', maxAge: 0 })
  response.cookies.set(verifierCookie, '', { path: '/', maxAge: 0 })
}
