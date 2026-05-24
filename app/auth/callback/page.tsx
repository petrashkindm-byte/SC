'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackInner() {
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('Вход…')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const code = searchParams.get('code')
    const type = searchParams.get('type')
    const flow = searchParams.get('flow')

    if (!code) {
      window.location.replace('/auth?error=auth')
      return
    }

    const supabase = createClient()
    void supabase.auth
      .exchangeCodeForSession(code)
      .then(async ({ data, error }) => {
        if (error) {
          window.location.replace(
            `/auth?error=auth&reason=${encodeURIComponent(error.message)}`,
          )
          return
        }
        if (!data.session) {
          window.location.replace('/auth?error=auth&reason=no_session')
          return
        }
        // Full navigation so dashboard SSR receives auth cookies
        if (type === 'recovery' || flow === 'recovery') {
          window.location.replace('/auth?reset=1')
          return
        }
        window.location.replace('/dashboard')
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'exchange_failed'
        window.location.replace(`/auth?error=auth&reason=${encodeURIComponent(msg)}`)
      })
  }, [searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-white">
      <p className="text-sm text-[#a0a0b0]">{message}</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-white">
          <p className="text-sm text-[#a0a0b0]">Вход…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}
