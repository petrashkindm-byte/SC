'use client'

import { useSyncExternalStore, type ReactNode } from 'react'

const emptySubscribe = () => () => {}

/**
 * Рендерит детей только на клиенте (после гидрации).
 * Нужен для интерактивных вкладок за авторизацией, где данные зависят от
 * текущего времени/локали и SSR не нужен — устраняет hydration mismatch (#418).
 */
export default function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  return <>{isClient ? children : fallback}</>
}
