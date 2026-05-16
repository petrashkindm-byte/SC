'use client'

import { useEffect, useState } from 'react'
import { actionButtonClass } from '@/app/dashboard/ui/action-button'

type Status = 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported' | 'error'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array([...raw].map((c) => c.charCodeAt(0)))
  return arr.buffer as ArrayBuffer
}

export default function PushPermissionButton() {
  const [status, setStatus] = useState<Status>(() => {
    if (typeof window === 'undefined') return 'idle'
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
    if (Notification.permission === 'denied') return 'denied'
    return 'idle'
  })

  useEffect(() => {
    if (status === 'unsupported' || status === 'denied') return
    if (Notification.permission === 'granted') {
      // Check if we already have a subscription
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setStatus('subscribed')
        })
      ).catch(() => {})
    }
  }, [status])

  const subscribe = async () => {
    setStatus('loading')
    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Get VAPID public key
      const res = await fetch('/api/push/vapid-key')
      if (!res.ok) throw new Error('VAPID key unavailable')
      const { publicKey } = await res.json() as { publicKey: string }

      // Request permission + subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const json = sub.toJSON() as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }

      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      if (!saveRes.ok) throw new Error('Failed to save subscription')

      setStatus('subscribed')
    } catch (err) {
      if (Notification.permission === 'denied') setStatus('denied')
      else { console.error(err); setStatus('error') }
    }
  }

  const unsubscribe = async () => {
    setStatus('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus('idle')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  if (status === 'unsupported') return null

  if (status === 'subscribed') {
    return (
      <button
        type="button"
        onClick={() => void unsubscribe()}
        className={`${actionButtonClass('secondary')} gap-2 text-[#6b6b80]`}
      >
        <span className="h-2 w-2 rounded-full bg-[#12b76a]" />
        Push включён · отключить
      </button>
    )
  }

  if (status === 'denied') {
    return (
      <p className="text-sm text-[#e5484d]">
        Push-уведомления заблокированы браузером. Разреши в настройках сайта.
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void subscribe()}
      disabled={status === 'loading'}
      className={`${actionButtonClass('primary')} gap-2 disabled:opacity-50 transition-all`}
    >
      {status === 'loading' ? (
        <>
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round"/>
          </svg>
          Подключение…
        </>
      ) : (
        <>🔔 Включить push-уведомления</>
      )}
    </button>
  )
}
