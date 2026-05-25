import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * GET /logout — clears the Supabase session and redirects to /auth.
 *
 * Using a route handler instead of a server action avoids the
 * "NEXT_REDIRECT caught by dashboard error boundary" problem:
 * the browser navigates away cleanly before any RSC re-render happens.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
  return NextResponse.redirect(new URL('/auth', base))
}
