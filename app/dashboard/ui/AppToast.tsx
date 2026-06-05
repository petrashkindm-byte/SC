'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { _registerSetter, type ToastItem } from './toast'

const ICON_COLORS: Record<ToastItem['type'], { bg: string; stroke: string }> = {
  success: { bg: '#e6f7f1', stroke: '#0d9f6e' },
  error:   { bg: '#fff0f0', stroke: '#e5484d' },
  warning: { bg: '#fff4eb', stroke: '#b35a00' },
  info:    { bg: '#ede9fe', stroke: '#5b43d4' },
}

function ToastIcon({ type }: { type: ToastItem['type'] }) {
  const { bg, stroke } = ICON_COLORS[type]
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
      style={{ background: bg }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        {type === 'success' && <path d="M20 6L9 17l-5-5" />}
        {type === 'error'   && <><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>}
        {type === 'warning' && <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>}
        {type === 'info'    && <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
      </svg>
    </div>
  )
}

export default function AppToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    _registerSetter(setToasts)
    return () => _registerSetter(() => {})
  }, [])

  if (typeof document === 'undefined' || toasts.length === 0) return null

  return createPortal(
    <div
      className="fixed z-[200] flex flex-col-reverse items-center gap-2"
      style={{
        bottom: 'max(24px, 88px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(440px, calc(100vw - 32px))',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="w-full motion-safe:animate-[edit-toast_0.35s_cubic-bezier(0.22,1,0.36,1)_both]"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="flex items-center gap-3.5 rounded-[18px] border border-[#e7e3dc] bg-white px-[18px] py-4 shadow-[0_4px_24px_rgba(26,26,61,0.12),0_16px_40px_rgba(0,0,0,0.10)]">
            <ToastIcon type={t.type} />
            <div className="min-w-0 flex-1">
              <strong className="block text-[15px] font-semibold text-[#1a1a2e]">{t.title}</strong>
              {t.sub && (
                <span className="mt-0.5 block text-[13px] leading-snug text-[#6b6b80]">{t.sub}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-[10px] text-[#9b9bab] transition-colors hover:bg-[#f4f4f6]"
              aria-label="Закрыть"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  )
}
