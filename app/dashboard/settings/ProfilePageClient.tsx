'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import DashboardScreenHeader from '@/app/dashboard/DashboardScreenHeader'
import {
  buildSubscriptionsCsv,
  buildSubscriptionsHtmlReport,
  downloadTextFile,
} from '@/lib/profile-export'
import type { Subscription } from '@/lib/supabase/types'
import {
  deleteMyDataAction,
  setBaseCurrency,
  signOutAction,
  updateFullName,
} from './actions'
import PasswordChangeForm from '@/app/dashboard/profile/PasswordChangeForm'

const PREF_KEY = 'subcuro-profile-prefs-v1'

type ThemePref = 'system' | 'light' | 'dark'

function loadTheme(): ThemePref {
  if (typeof window === 'undefined') return 'system'
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (!raw) return 'system'
    const v = JSON.parse(raw) as { theme?: string }
    if (v?.theme === 'light' || v?.theme === 'dark' || v?.theme === 'system') return v.theme
  } catch {
    /* ignore */
  }
  return 'system'
}

function saveThemePref(theme: ThemePref) {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    let o: Record<string, unknown> = {}
    if (raw) {
      try {
        o = JSON.parse(raw) as Record<string, unknown>
      } catch {
        o = {}
      }
    }
    o.theme = theme
    localStorage.setItem(PREF_KEY, JSON.stringify(o))
  } catch {
    /* ignore */
  }
}

function applyTheme(t: ThemePref) {
  const html = document.documentElement
  if (t === 'dark') {
    html.classList.add('dark')
  } else if (t === 'light') {
    html.classList.remove('dark')
  } else {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }
}

function themeToastLabel(t: ThemePref): string {
  if (t === 'light') return 'Светлая'
  if (t === 'dark') return 'Тёмная'
  return 'Системная'
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  )
}

function IconFileCsv() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h6" />
    </svg>
  )
}

function IconChartExport() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  )
}

function IconReport() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden>
      <path d="M3 3v18h18" />
      <path d="m18 9-5 5-4-4-3 3" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

const cardClass =
  'rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] overflow-hidden'

const rowClass =
  'flex items-center gap-3.5 py-3 px-4 border-b border-[rgba(26,26,61,0.08)] last:border-b-0 transition-colors'

const rowIconBase = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]'

type Props = {
  displayName: string
  email: string | null
  fullName: string | null
  baseCurrency: string
  subs: Subscription[]
  saved?: boolean
  error?: string | null
  pwdOk?: boolean
  pwdError?: string | null
}

export default function ProfilePageClient({
  displayName,
  email,
  fullName,
  baseCurrency,
  subs,
  saved,
  error,
  pwdOk,
  pwdError,
}: Props) {
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(saved ? 'Имя и данные аккаунта сохранены' : null)
  const [toastWarn, setToastWarn] = useState(false)
  const [accountOpen, setAccountOpen] = useState(Boolean(pwdOk))
  const [theme, setTheme] = useState<ThemePref>(() => loadTheme())
  const [pending, startTransition] = useTransition()
  const [cur, setCur] = useState(() =>
    ['RUB', 'USD', 'EUR'].includes(baseCurrency.toUpperCase()) ? baseCurrency.toUpperCase() : 'RUB',
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = (text: string, isWarn = false) => {
    setToast(text)
    setToastWarn(isWarn)
  }

  const onTheme = (t: ThemePref) => {
    setTheme(t)
    saveThemePref(t)
    applyTheme(t)
    showToast(`Тема: ${themeToastLabel(t)}`)
  }

  const onCurrency = (c: string) => {
    setCur(c)
    startTransition(async () => {
      await setBaseCurrency(c)
      router.refresh()
      showToast(`Базовая валюта: ${c}`)
    })
  }

  const exportCsv = () => {
    const csv = buildSubscriptionsCsv(subs)
    downloadTextFile(`subcuro-payments-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8')
    showToast('CSV сохранён')
  }

  const exportReport = () => {
    const html = buildSubscriptionsHtmlReport(subs)
    downloadTextFile(`subcuro-report-${new Date().toISOString().slice(0, 10)}.html`, html, 'text/html;charset=utf-8')
    showToast('Отчёт сохранён')
  }

  const openPrivacy = () => {
    window.alert(
      'Политика приватности данных (кратко):\n\n' +
        '1) Данные подписок хранятся в вашем аккаунте Supabase и доступны только вам (RLS).\n' +
        '2) Экспорт CSV/HTML выполняется локально в браузере по вашему действию.\n' +
        '3) «Удалить данные» вызывает очистку данных в базе и выход из аккаунта — действие необратимо.',
    )
  }

  const onDeleteData = () => {
    if (
      !window.confirm(
        'Удалить все данные и настройки в облаке? Подписки, напоминания и профиль будут удалены. Выйдем из аккаунта. Действие необратимо.',
      )
    )
      return
    startTransition(async () => {
      await deleteMyDataAction()
    })
  }

  const onLogout = () => {
    if (!window.confirm('Выйти из аккаунта?')) return
    startTransition(async () => {
      await signOutAction()
    })
  }

  const emailLine = email ?? '—'
  const activeLabel = '● Активный'

  return (
    <>
      <DashboardScreenHeader title="Профиль" subs={subs} className="mb-3.5" />

      {error === 'delete' ? (
        <p className="mb-3.5 rounded-xl border border-[#f3c5c7] bg-[#fdecec] px-4 py-3 text-sm text-[#e5484d]">
          Не удалось удалить данные. Попробуйте позже или обратитесь в поддержку.
        </p>
      ) : null}
      {error === 'save' || error === 'profile' ? (
        <p className="mb-3.5 rounded-xl border border-[#f3c5c7] bg-[#fdecec] px-4 py-3 text-sm text-[#e5484d]">
          {error === 'profile' ? 'Не удалось обновить профиль.' : 'Не удалось сохранить настройки.'}
        </p>
      ) : null}

      {/* Аккаунт */}
      <section className="mb-3.5">
        <p className="mb-2 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">АККАУНТ</p>
        <div className={cardClass}>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => setAccountOpen(true)}
          >
            <div className={`${rowIconBase} bg-[#ede9fc] text-[#5b43d4]`} aria-hidden>
              <IconUser />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">{displayName}</strong>
              <span className="text-xs text-[#6b6b80]">
                {emailLine} · <span className="text-[#12b76a]">{activeLabel}</span>
              </span>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
        </div>
      </section>

      {/* Внешний вид + валюта */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-2 lg:items-stretch">
        <section className="flex flex-col">
          <p className="mb-2 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">ВНЕШНИЙ ВИД</p>
          <div className={`${cardClass} flex-1`}>
            <div className={`${rowClass} flex-wrap`}>
              <div className="min-w-0 flex-[1_1_100%]">
                <strong className="block text-sm text-[#1a1a2e]">Тема приложения</strong>
                <div className="mt-2.5 flex gap-1.5 rounded-xl bg-[#f0f0f3] p-1">
                  {(['system', 'light', 'dark'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`flex-1 rounded-[10px] py-2.5 text-[13px] font-medium transition-all ${
                        theme === t
                          ? 'bg-white text-[#1a1a2e] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                          : 'text-[#6b6b80] hover:text-[#1a1a2e]'
                      }`}
                      onClick={() => onTheme(t)}
                    >
                      {t === 'system' ? 'Системная' : t === 'light' ? 'Светлая' : 'Тёмная'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col">
          <p className="mb-2 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">ВАЛЮТА И ЯЗЫК</p>
          <div className={`${cardClass} flex-1`}>
            <div className={`${rowClass} flex-wrap`}>
              <div className="min-w-0 flex-[1_1_100%]">
                <strong className="block text-sm text-[#1a1a2e]">Базовая валюта</strong>
                <span className="text-xs text-[#6b6b80]">Все итоги пересчитываются сразу</span>
                <div className="mt-2.5 flex gap-1.5 rounded-xl bg-[#f0f0f3] p-1">
                  {(['RUB', 'USD', 'EUR'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      disabled={pending}
                      className={`flex-1 rounded-[10px] py-2.5 text-[13px] font-medium transition-all disabled:opacity-60 ${
                        cur === c
                          ? 'bg-[#0d9f6e] text-white shadow-none'
                          : 'text-[#6b6b80] hover:text-[#1a1a2e]'
                      }`}
                      onClick={() => onCurrency(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Источники данных */}
      <section className="mb-3.5">
        <p className="mb-2 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">ИСТОЧНИКИ ДАННЫХ</p>
        <div className={cardClass}>
          <Link
            href="/dashboard/import"
            className={`${rowClass} text-inherit no-underline hover:bg-[rgba(91,67,212,0.04)]`}
          >
            <div className={`${rowIconBase} bg-[#f0f0f3] text-[#5c5c6e]`} aria-hidden>
              <IconFileCsv />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Импорт CSV</strong>
              <span className="text-xs text-[#6b6b80]">Загрузить выписку из банка</span>
            </div>
            <span className="text-lg opacity-35">›</span>
          </Link>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => showToast('Скоро: подключение банка через Open Banking', true)}
          >
            <div className={`${rowIconBase} bg-[#ede9fc] text-[#5b43d4]`} aria-hidden>
              <Image src="/profile-bank.svg" width={22} height={22} alt="" className="h-[22px] w-[22px]" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <strong className="block text-sm text-[#1a1a2e]">Подключить банк</strong>
              <span className="text-xs text-[#6b6b80]">Скоро · Open Banking</span>
            </div>
            <span className="mr-2 shrink-0 rounded-full bg-[#e6f7f1] px-2 py-0.5 text-[11px] font-semibold text-[#0d9f6e]">
              Скоро
            </span>
            <span className="text-lg opacity-35">›</span>
          </button>
        </div>
      </section>

      {/* Данные и приватность */}
      <section className="mb-3.5">
        <p className="mb-2 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">ДАННЫЕ И ПРИВАТНОСТЬ</p>
        <div className={cardClass}>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={exportCsv}
          >
            <div className={`${rowIconBase} bg-[#e8faf0] text-[#12b76a]`} aria-hidden>
              <IconChartExport />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Экспорт CSV</strong>
              <span className="text-xs text-[#6b6b80]">Таблица платежей для Excel</span>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={exportReport}
          >
            <div className={`${rowIconBase} bg-[#e8f4ff] text-[#2563eb]`} aria-hidden>
              <IconReport />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Экспорт отчёта</strong>
              <span className="text-xs text-[#6b6b80]">HTML-отчёт с аналитикой</span>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={openPrivacy}
          >
            <div className={`${rowIconBase} bg-[#ede9fc] text-[#5b43d4]`} aria-hidden>
              <IconShield />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Политика приватности данных</strong>
              <span className="text-xs text-[#6b6b80]">Как мы защищаем ваши данные</span>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={onDeleteData}
            disabled={pending}
          >
            <div className={`${rowIconBase} bg-[#fdecec] text-[#e5484d]`} aria-hidden>
              <IconTrash />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Удалить данные</strong>
              <span className="text-xs text-[#6b6b80]">Удаление всех данных и настроек</span>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
        </div>
      </section>

      <button
        type="button"
        className="mt-4 w-full rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white py-3.5 text-center text-sm font-semibold text-[#e5484d] shadow-[0_1px_3px_rgba(26,26,61,0.06)] hover:bg-[#fdecec]"
        onClick={onLogout}
        disabled={pending}
      >
        Выйти из аккаунта
      </button>

      {/* Аккаунт: модальное окно */}
      {accountOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(15,15,35,0.5)] p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-account-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0 bg-transparent"
            aria-label="Закрыть"
            onClick={() => setAccountOpen(false)}
          />
          <div className="relative z-[1] w-[min(480px,100%)] max-h-[min(88vh,640px)] overflow-y-auto rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white p-5 shadow-[0_20px_50px_rgba(20,20,50,0.2)]">
            <button
              type="button"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border-0 bg-[#f3f3fa] text-[22px] leading-none text-[#8b8ba2] hover:bg-[#e8e8f0]"
              onClick={() => setAccountOpen(false)}
              aria-label="Закрыть"
            >
              ×
            </button>
            <h2 id="profile-account-title" className="m-0 mb-4 pr-10 text-xl font-bold text-[#1a1a2e]">
              Аккаунт
            </h2>
            {email ? (
              <p className="mb-4 text-sm text-[#6b6b80]">
                Email: <span className="text-[#1a1a2e]">{email}</span>
              </p>
            ) : null}
            <form action={updateFullName} className="mb-6 space-y-3">
              <div>
                <label className="mb-1 block text-sm text-[#6b6b80]">Имя в профиле</label>
                <input
                  name="full_name"
                  type="text"
                  defaultValue={fullName ?? ''}
                  className="w-full rounded-[10px] border border-[rgba(26,26,61,0.08)] px-3 py-2.5 text-sm text-[#1a1a2e]"
                  placeholder="Как к вам обращаться"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-[#0d9f6e] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-105"
              >
                Сохранить имя
              </button>
            </form>
            <div className="border-t border-[#ececee] pt-5">
              <PasswordChangeForm pwdOk={pwdOk} pwdError={pwdError} embedded />
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className={`fixed bottom-[18px] right-[18px] z-[60] max-w-[360px] rounded-xl px-3.5 py-3 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(26,26,61,0.25)] transition-all ${
            toastWarn ? 'bg-[#7a1f2c]' : 'bg-[#1f1f43]'
          }`}
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </>
  )
}
