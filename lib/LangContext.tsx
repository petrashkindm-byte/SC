'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { t, type Lang } from './translations'

const PREF_KEY = 'subcuro-profile-prefs-v1'

function readLang(): Lang {
  if (typeof window === 'undefined') return 'ru'
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (!raw) return 'ru'
    const v = JSON.parse(raw) as { lang?: string }
    if (v?.lang === 'ru' || v?.lang === 'en') return v.lang
  } catch {
    /* ignore */
  }
  return 'ru'
}

function writeLang(lang: Lang) {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    let o: Record<string, unknown> = {}
    if (raw) {
      try { o = JSON.parse(raw) as Record<string, unknown> } catch { o = {} }
    }
    o.lang = lang
    localStorage.setItem(PREF_KEY, JSON.stringify(o))
  } catch {
    /* ignore */
  }
}

type LangContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  strings: typeof t['ru'] | typeof t['en']
}

const LangContext = createContext<LangContextValue>({
  lang: 'ru',
  setLang: () => {},
  strings: t.ru,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readLang())

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = (next: Lang) => {
    setLangState(next)
    writeLang(next)
    document.documentElement.lang = next
  }

  return (
    <LangContext.Provider value={{ lang, setLang, strings: t[lang] }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
