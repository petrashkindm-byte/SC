'use client'

import { useState } from 'react'

export default function LangSwitcherWidget() {
  const [lang, setLang] = useState<'ru' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('landingLang')
      return saved === 'en' ? 'en' : 'ru'
    } catch {
      return 'ru'
    }
  })

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
