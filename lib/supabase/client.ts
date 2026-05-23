import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Route all Supabase API requests through our proxy so the browser never
// connects to supabase.co directly (blocked in Russia and some regions).
// IMPORTANT: we still pass the REAL supabase URL to createBrowserClient so
// that the PKCE code-verifier cookie gets the same name the server expects.
// Only the actual fetch calls are rewritten to go via /api/sb.
function proxyFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof window !== 'undefined') {
    const url = input instanceof Request ? input.url : input.toString()
    const proxied = url.replace(SUPABASE_URL, `${window.location.origin}/api/sb`)
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
