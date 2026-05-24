'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/** С Site URL subcuro.app ошибки сброса попадают на главную — переносим на /auth */
export default function SupabaseAuthHashRedirect() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (pathname === '/auth') return
    const hash = window.location.hash
    if (!hash.includes('error')) return
    router.replace(`/auth${hash}`)
  }, [pathname, router])

  return null
}
