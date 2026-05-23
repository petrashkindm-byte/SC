'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    // Full page navigation avoids the React error boundary catching
    // Next.js's internal redirect() thrown by the protected layout.
    window.location.href = '/auth'
  }

  return (
    <button
      onClick={handleLogout}
      aria-label="Выйти"
      title="Выйти"
      className="h-7 w-7 rounded-md text-white/45 hover:text-white/80 hover:bg-white/10 transition-colors inline-flex items-center justify-center"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  )
}
