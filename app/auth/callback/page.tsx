'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('Вход…')

  useEffect(() => {
    const code = searchParams.get('code')
    const type = searchParams.get('type')
    const flow = searchParams.get('flow')

    if (!code) {
      router.replace('/auth?error=auth')
      return
    }

    const supabase = createClient()
    void supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          router.replace(`/auth?error=auth&reason=${encodeURIComponent(error.message)}`)
          return
        }
        if (type === 'recovery' || flow === 'recovery') {
          router.replace('/?tab=login&reset=1')
          return
        }
        router.replace('/dashboard')
      })
      .catch(() => {
        setMessage('Ошибка входа')
        router.replace('/auth?error=auth')
      })
  }, [router, searchParams])

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
