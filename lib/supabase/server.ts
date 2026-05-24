import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

/**
 * Server-side equivalent of `proxyFetch` in `client.ts`.
 *
 * Routes all Supabase API calls through our own Next.js rewrite endpoint
 * (`/api/sb/`) instead of hitting supabase.co directly from the VPS.
 * This is critical for the OAuth callback: `exchangeCodeForSession` runs
 * server-side, bypassing the browser proxy, and on some VPS setups a direct
 * connection to supabase.co can be blocked or slow enough to cause an
 * nginx 502 before Next.js sends a response.
 *
 * `NEXT_PUBLIC_APP_URL` must be set to the canonical app origin
 * (e.g. `https://subcuro.app` in production, `http://localhost:3000` locally).
 * When absent the function falls back to a direct fetch so dev environments
 * without the variable continue to work.
 */
export function serverProxyFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (supabaseUrl && appUrl) {
    const url = input instanceof Request ? input.url : String(input)
    if (url.startsWith(supabaseUrl)) {
      const proxied = url.replace(supabaseUrl, `${appUrl}/api/sb`)
      if (input instanceof Request) {
        return fetch(new Request(proxied, input), init)
      }
      return fetch(proxied, init)
    }
  }
  return fetch(input, init)
}

/** Cookie-based SSR client for server components and route handlers. */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: serverProxyFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

/**
 * Token-based client for mobile / API-key callers.
 * Sends the JWT as the Authorization header so Supabase RLS treats requests
 * as coming from the token's owner — no cookies needed.
 */
export function createClientFromToken(accessToken: string) {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: serverProxyFetch,
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      auth: { persistSession: false },
    },
  )
}
