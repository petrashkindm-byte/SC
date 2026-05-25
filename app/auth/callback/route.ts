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
  const { searchParams, origin: requestOrigin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const flow = searchParams.get('flow')

  // When running behind a reverse proxy (e.g. VPS nginx) that rewrites the Host
  // header to subcuro.vercel.app, Next.js constructs request.url with that host.
  // NEXT_PUBLIC_SITE_URL overrides it so redirects always land on the real domain.
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin).replace(/\/$/, '')

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

  const isRecovery = type === 'recovery' || flow === 'recovery'

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[auth/callback] exchangeCodeForSession:', error.message, error.status)
    // For recovery flow: redirect to a dedicated expired state so the auth page
    // can show a helpful "request a new reset link" UI instead of a generic error.
    if (isRecovery) {
      return NextResponse.redirect(`${origin}/auth?recovery_expired=1`)
    }
    return NextResponse.redirect(
      `${origin}/auth?error=auth&reason=${encodeURIComponent(error.message)}`,
    )
  }

  if (isRecovery) {
    return NextResponse.redirect(`${origin}/auth?reset=1`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
