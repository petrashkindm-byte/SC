import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { serverProxyFetch } from '@/lib/supabase/server'

/** Base URL for all server-side redirects.
 *  Set NEXT_PUBLIC_SITE_URL=https://subcuro.app in Vercel env vars so that
 *  redirects land on the real domain even when the proxy rewrites the Host header. */
function redirect(path: string, request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? request.url
  return NextResponse.redirect(new URL(path, base))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/auth/callback')) {
    return NextResponse.next({ request })
  }

  // Fast-path: no Supabase session cookie → user is definitely not logged in.
  // Skip the getUser() network call entirely to avoid an extra round-trip on
  // every page load for unauthenticated visitors (e.g. the /auth page).
  const hasSessionCookie = request.cookies.getAll().some(
    (c) => c.name.endsWith('-auth-token') && !c.name.endsWith('-code-verifier'),
  )
  if (!hasSessionCookie) {
    if (pathname.startsWith('/dashboard')) {
      return redirect('/login', request)
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: serverProxyFetch },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isResetFlow = pathname === '/' && request.nextUrl.searchParams.get('reset') === '1'

  if (!user && pathname.startsWith('/dashboard')) {
    return redirect('/login', request)
  }

  const isPasswordReset = pathname === '/auth' && request.nextUrl.searchParams.get('reset') === '1'

  if (user && (pathname === '/login' || pathname === '/signup')) {
    return redirect('/dashboard', request)
  }

  if (user && pathname === '/auth' && !isPasswordReset) {
    return redirect('/dashboard', request)
  }

  if (user && pathname === '/' && !isResetFlow) {
    return redirect('/dashboard', request)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
