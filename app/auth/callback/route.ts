import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export const maxDuration = 30

/** Vercel → supabase.co directly; self-hosted VPS can set INTERNAL_APP_URL. */
function createCallbackFetch(): typeof fetch {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const proxyTarget =
    process.env.SUPABASE_CALLBACK_PROXY_BASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL

  const proxyBase = process.env.VERCEL
    ? undefined
    : process.env.INTERNAL_APP_URL ?? proxyTarget

  if (!proxyBase) {
    return fetch
  }

  const base = proxyBase.replace(/\/$/, '')
  const useAppRewrite = !proxyTarget && !base.includes('sb.')
  const proxyRoot = useAppRewrite ? `${base}/api/sb` : base

  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input)
    if (url.startsWith(supabaseUrl) || (proxyTarget && url.startsWith(proxyTarget))) {
      const from = url.startsWith(supabaseUrl) ? supabaseUrl : proxyTarget!
      const proxied = url.replace(from, proxyRoot)
      if (input instanceof Request) {
        return fetch(new Request(proxied, input), init)
      }
      return fetch(proxied, init)
    }
    return fetch(input, init)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const flow = searchParams.get('flow')

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=auth`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: createCallbackFetch() },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[auth/callback] exchangeCodeForSession:', error.message, error.status)
    return NextResponse.redirect(
      `${origin}/auth?error=auth&reason=${encodeURIComponent(error.message)}`,
    )
  }

  if (type === 'recovery' || flow === 'recovery') {
    return NextResponse.redirect(`${origin}/auth?reset=1`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
