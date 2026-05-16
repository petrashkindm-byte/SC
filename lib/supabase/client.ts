import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

// Use a proxy route so the browser never connects to supabase.co directly.
// This allows access from Russia and other regions where supabase.co is blocked.
const supabaseProxyUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}/api/sb`
    : process.env.NEXT_PUBLIC_SUPABASE_URL!

export function createClient() {
  return createBrowserClient<Database>(
    supabaseProxyUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
