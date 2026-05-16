'use client'

import { useEffect, useState } from 'react'

export type PushStatus = 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported' | 'error'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer
}

function detectInitialStatus(): PushStatus {
  if (typeof window === 'undefined') return 'idle'
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return 'idle'
}

export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>(detectInitialStatus)

  // On mount — check if already subscribed
  useEffect(() => {
    if (status === 'unsupported' || status === 'denied') return
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => { if (sub) setStatus('subscribed') })
        .catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const subscribe = async (): Promise<boolean> => {
    if (status === 'unsupported') return false
    setStatus('loading')
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const res = await fetch('/api/push/vapid-key')
      if (!res.ok) throw new Error('VAPID key unavailable')
      const { publicKey } = await res.json() as { publicKey: string }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      if (!saveRes.ok) throw new Error('Failed to save subscription')

      setStatus('subscribed')
      return true
    } catch {
      setStatus(Notification.permission === 'denied' ? 'denied' : 'error')
      return false
    }
  }

  const unsubscribe = async (): Promise<boolean> => {
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
      return true
    } catch {
      setStatus('error')
      return false
    }
  }

  return { status, subscribe, unsubscribe }
}
