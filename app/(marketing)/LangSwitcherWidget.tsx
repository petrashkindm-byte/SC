'use client'

import { useEffect, useState } from 'react'

export default function LangSwitcherWidget() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru')

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('landingLang') as 'ru' | 'en' | null) ?? 'ru'
      setLang(saved)
    } catch { /* ignore */ }
  }, [])

  const toggle = (next: 'ru' | 'en') => {
    setLang(next)
    try { localStorage.setItem('landingLang', next) } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('subcuro:lang', { detail: next }))
  }

  return (
    <div className="lang-switcher" role="group" aria-label="Язык">
      <button
        className={`lang-btn${lang === 'ru' ? ' active' : ''}`}
        aria-pressed={lang === 'ru'}
        onClick={() => toggle('ru')}
      >
        RU
      </button>
      <button
        className={`lang-btn${lang === 'en' ? ' active' : ''}`}
        aria-pressed={lang === 'en'}
        onClick={() => toggle('en')}
      >
        EN
      </button>
    </div>
  )
}
