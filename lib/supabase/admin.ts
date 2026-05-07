import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Service-role client — bypasses RLS, only for server-side background jobs.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin credentials')
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}
