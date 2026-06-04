import type { Dispatch, SetStateAction } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'
export type ToastItem = { id: string; type: ToastType; title: string; sub?: string }

type Setter = Dispatch<SetStateAction<ToastItem[]>>

let _set: Setter | null = null
const _queue: Array<() => void> = []

export function _registerSetter(fn: Setter) {
  _set = fn
  _queue.forEach((f) => f())
  _queue.length = 0
}

function _emit(type: ToastType, title: string, sub?: string) {
  if (!_set) return
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
  _set((prev) => [...prev, { id, type, title, sub }])
  setTimeout(() => _set?.((prev) => prev.filter((t) => t.id !== id)), 3400)
}

/** Показать toast-уведомление из любого клиентского компонента. */
export function toast(type: ToastType, title: string, sub?: string) {
  if (typeof window === 'undefined') return
  if (_set) {
    _emit(type, title, sub)
  } else {
    // AppToast ещё не смонтирован — ставим в очередь
    _queue.push(() => _emit(type, title, sub))
    setTimeout(() => {
      if (_queue.length > 0) _queue.length = 0 // cleanup if never mounted
    }, 5000)
  }
}
