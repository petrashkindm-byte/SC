import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// Optional VPS mirror (sb.subcuro.app). Keep NEXT_PUBLIC_SUPABASE_URL on *.supabase.co for PKCE cookies.
const SUPABASE_PROXY_URL = process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL

// Route all Supabase API requests through our proxy so the browser never
// connects to supabase.co directly (blocked in Russia and some regions).
// createBrowserClient uses the real *.supabase.co URL so PKCE cookie names match the server.
// Only fetch URLs are rewritten to subcuro.app/api/sb → sb.subcuro.app (or supabase.co).
function proxyFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof window !== 'undefined') {
    const url = input instanceof Request ? input.url : input.toString()
    let proxied = url.replace(SUPABASE_URL, `${window.location.origin}/api/sb`)
    if (SUPABASE_PROXY_URL) {
      proxied = proxied.replace(SUPABASE_PROXY_URL, `${window.location.origin}/api/sb`)
    }
    if (input instanceof Request) {
      return fetch(new Request(proxied, input), init)
    }
    return fetch(proxied, init)
  }
  return fetch(input, init)
}

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: proxyFetch },
  })
}
