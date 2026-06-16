'use client'

import { useEffect, useState } from 'react'

export default function LangSwitcherWidget() {
  // First render must match the server ('ru') to avoid a hydration mismatch
  // that can break hydration of the whole page in this forked Next.
  const [lang, setLang] = useState<'ru' | 'en'>('ru')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('landingLang')
      if (saved === 'en') setLang('en')
    } catch { /* ignore */ }
    // keep the toggle in sync if the language changes elsewhere
    const onLang = (e: Event) => {
      const next = (e as CustomEvent).detail
      if (next === 'ru' || next === 'en') setLang(next)
    }
    window.addEventListener('subcuro:lang', onLang)
    return () => window.removeEventListener('subcuro:lang', onLang)
  }, [])

  const toggle = (next: 'ru' | 'en') => {
    setLang(next)
    try { localStorage.setItem('landingLang', next) } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('subcuro:lang', { detail: next }))
  }

  return (
    <div className="nav-lang-toggle" role="group" aria-label="Язык">
      <button
        className={lang === 'ru' ? 'nav-lang-btn-active' : 'nav-lang-btn-inactive'}
        aria-pressed={lang === 'ru'}
        onClick={() => toggle('ru')}
      >
        RU
      </button>
      <button
        className={lang === 'en' ? 'nav-lang-btn-active' : 'nav-lang-btn-inactive'}
        aria-pressed={lang === 'en'}
        onClick={() => toggle('en')}
      >
        EN
      </button>
    </div>
  )
}
