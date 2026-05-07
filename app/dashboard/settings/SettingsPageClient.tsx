'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import DashboardScreenHeader from '@/app/dashboard/DashboardScreenHeader'
import type { Subscription } from '@/lib/supabase/types'
import PasswordChangeForm from '@/app/dashboard/profile/PasswordChangeForm'
import { setPushEnabled } from './actions'
import { getSettingsModalContent, type SettingsModalKey } from './settings-modal-content'

const LS_KEY = 'subcuro_settings_v1'

function readLocalEmailTrial(): { email: boolean; trial: boolean } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { email: true, trial: true }
    const s = JSON.parse(raw) as { email?: boolean; trial?: boolean; push?: boolean }
    return {
      email: s.email !== false,
      trial: s.trial !== false,
    }
  } catch {
    return { email: true, trial: true }
  }
}

function saveLocalPrefs(push: boolean, email: boolean, trial: boolean) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ push, email, trial }))
  } catch {
    /* ignore */
  }
}

const cardClass =
  'rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)] overflow-hidden'

const rowClass =
  'flex items-center gap-3.5 py-4 px-[18px] border-b border-[rgba(26,26,61,0.08)] last:border-b-0 transition-colors'

function RowToggle({
  on,
  onClick,
  ariaLabel,
}: {
  on: boolean
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full border-0 transition-colors ${
        on ? 'bg-[#5b43d4]' : 'bg-[#d8d9e8]'
      }`}
    >
      <span
        className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all ${
          on ? 'right-[3px]' : 'left-[3px]'
        }`}
      />
    </button>
  )
}

function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5b43d4" strokeWidth="1.75" aria-hidden>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5b43d4" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 8l9 5 9-5" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5b43d4" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0d9f6e" strokeWidth="1.75" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function Icon2FA() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0d9f6e" strokeWidth="1.75" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <circle cx="12" cy="11" r="2" fill="#0d9f6e" stroke="none" />
    </svg>
  )
}

type Props = {
  subs: Subscription[]
  pushEnabledInitial: boolean
  pwdOk?: boolean
  pwdError?: string | null
  error?: string | null
}

const APP_VERSION = '1.4.2'

export default function SettingsPageClient({
  subs,
  pushEnabledInitial,
  pwdOk,
  pwdError,
  error,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pushOn, setPushOn] = useState(() => pushEnabledInitial)
  const [emailOn, setEmailOn] = useState(() => readLocalEmailTrial().email)
  const [trialOn, setTrialOn] = useState(() => readLocalEmailTrial().trial)
  const [modal, setModal] = useState<SettingsModalKey | null>(null)
  const [pwdOpen, setPwdOpen] = useState(() => Boolean(pwdOk || pwdError))
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const toastMsg = (text: string) => setToast(text)

  const syncPush = (next: boolean) => {
    const prev = pushOn
    setPushOn(next)
    saveLocalPrefs(next, emailOn, trialOn)
    startTransition(async () => {
      try {
        await setPushEnabled(next)
        router.refresh()
        toastMsg(next ? 'Включено' : 'Выключено')
      } catch {
        // Если сервер не применил изменение, откатываем UI к прошлому состоянию.
        setPushOn(prev)
        saveLocalPrefs(prev, emailOn, trialOn)
        toastMsg('Не удалось сохранить настройку')
      }
    })
  }

  const setEmail = (next: boolean) => {
    setEmailOn(next)
    saveLocalPrefs(pushOn, next, trialOn)
    toastMsg(next ? 'Включено' : 'Выключено')
  }

  const setTrial = (next: boolean) => {
    setTrialOn(next)
    saveLocalPrefs(pushOn, emailOn, next)
    toastMsg(next ? 'Включено' : 'Выключено')
  }

  const mc = modal ? getSettingsModalContent(modal) : null

  return (
    <>
      <DashboardScreenHeader title="Настройки" subs={subs} addButtonVariant="plus-text" />

      {error === 'push' ? (
        <p className="mb-4 rounded-xl border border-[#f3c5c7] bg-[#fdecec] px-4 py-3 text-sm text-[#e5484d]">
          Не удалось сохранить настройку push. Попробуйте снова.
        </p>
      ) : null}

      <section className="mb-5">
        <p className="mb-2.5 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">УВЕДОМЛЕНИЯ</p>
        <div className={cardClass}>
          <div className={rowClass}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#ede9fc]" aria-hidden>
              <IconBell />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Push-уведомления</strong>
              <span className="text-xs text-[#6b6b80]">О списаниях и действиях по платежам</span>
            </div>
            <RowToggle
              on={pushOn}
              ariaLabel="Push-уведомления"
              onClick={() => !pending && syncPush(!pushOn)}
            />
          </div>
          <div className={rowClass}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#ede9fc]" aria-hidden>
              <IconMail />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Email-уведомления</strong>
              <span className="text-xs text-[#6b6b80]">Еженедельный отчёт и важные обновления</span>
            </div>
            <RowToggle on={emailOn} ariaLabel="Email-уведомления" onClick={() => setEmail(!emailOn)} />
          </div>
          <div className={rowClass}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#ede9fc]" aria-hidden>
              <IconCalendar />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Напоминание о пробном периоде</strong>
              <span className="text-xs text-[#6b6b80]">За 3 дня до окончания пробного периода</span>
            </div>
            <RowToggle on={trialOn} ariaLabel="Напоминание о пробном периоде" onClick={() => setTrial(!trialOn)} />
          </div>
        </div>
      </section>

      <section className="mb-5">
        <p className="mb-2.5 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">БЕЗОПАСНОСТЬ</p>
        <div className={cardClass}>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => setPwdOpen(true)}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#f2fcfc]" aria-hidden>
              <IconLock />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Изменить пароль</strong>
              <span className="text-xs text-[#6b6b80]">Обновите пароль для защиты аккаунта</span>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => setModal('2fa')}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#f2fcfc]" aria-hidden>
              <Icon2FA />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Двухфакторная аутентификация</strong>
              <span className="text-xs text-[#6b6b80]">Дополнительный уровень защиты для входа</span>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
        </div>
      </section>

      <section className="mb-5">
        <p className="mb-2.5 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">ПОДДЕРЖКА</p>
        <div className={cardClass}>
          <a
            href="mailto:hello@subcuro.app?subject=SubCuro%20Support"
            className={`${rowClass} text-inherit no-underline hover:bg-[rgba(91,67,212,0.04)]`}
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Написать в поддержку</strong>
              <span className="text-xs text-[#6b6b80]">hello@subcuro.app</span>
            </div>
            <span className="text-lg opacity-35">›</span>
          </a>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => setModal('faq')}
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Частые вопросы</strong>
              <span className="text-xs text-[#6b6b80]">Ответы на основные вопросы</span>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => setModal('report')}
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Сообщить о проблеме</strong>
              <span className="text-xs text-[#6b6b80]">Отправить отчёт разработчикам</span>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
        </div>
      </section>

      <section className="mb-5">
        <p className="mb-2.5 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">ПРАВОВАЯ ИНФОРМАЦИЯ</p>
        <div className={cardClass}>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => setModal('privacy')}
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Политика конфиденциальности</strong>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => setModal('terms')}
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Условия использования</strong>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => setModal('license')}
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Лицензионное соглашение</strong>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
        </div>
      </section>

      <section className="mb-5">
        <p className="mb-2.5 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">О ПРИЛОЖЕНИИ</p>
        <div className={cardClass}>
          <div className={rowClass}>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Версия приложения</strong>
            </div>
            <span className="inline-flex shrink-0 rounded-full bg-[#ede9fc] px-2.5 py-1 text-xs font-semibold text-[#5b43d4]">
              {APP_VERSION}
            </span>
          </div>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => setModal('whats-new')}
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Что нового</strong>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => toastMsg('Спасибо! Оценка будет доступна в релизной версии.')}
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">Оценить приложение</strong>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
        </div>
      </section>

      {modal && mc ? (
        <div className="fixed inset-0 z-[1200]" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0 bg-[rgba(15,15,35,0.5)]"
            aria-label="Закрыть"
            onClick={() => setModal(null)}
          />
          <div className="relative z-[1] mx-auto mt-[8vh] max-w-[560px] rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white px-[18px] pb-4 pt-[18px] shadow-[0_20px_50px_rgba(20,20,50,0.2)]">
            <button
              type="button"
              className="absolute right-2 top-2 flex h-[34px] w-[34px] items-center justify-center rounded-full border-0 bg-transparent text-2xl text-[#8b8ba2] hover:bg-[#f3f3fa]"
              onClick={() => setModal(null)}
              aria-label="Закрыть"
            >
              ×
            </button>
            <h2 id="settings-modal-title" className="mb-3 mt-0.5 pr-10 text-xl font-bold text-[#1a1a2e]">
              {mc.title}
            </h2>
            <div className="text-[14px]">{mc.body}</div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded-xl border border-[rgba(26,26,61,0.08)] bg-white px-4 py-2 text-sm font-medium text-[#1a1a2e] hover:bg-[#f8f8fb]"
                onClick={() => setModal(null)}
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pwdOpen ? (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-[rgba(15,15,35,0.5)] p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwd-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0 bg-transparent"
            aria-label="Закрыть"
            onClick={() => setPwdOpen(false)}
          />
          <div className="relative z-[1] w-[min(480px,100%)] max-h-[min(88vh,640px)] overflow-y-auto rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white p-5 shadow-[0_20px_50px_rgba(20,20,50,0.2)]">
            <button
              type="button"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border-0 bg-[#f3f3fa] text-[22px] leading-none text-[#8b8ba2] hover:bg-[#e8e8f0]"
              onClick={() => setPwdOpen(false)}
              aria-label="Закрыть"
            >
              ×
            </button>
            <h2 id="pwd-modal-title" className="m-0 mb-4 pr-10 text-xl font-bold text-[#1a1a2e]">
              Изменить пароль
            </h2>
            <PasswordChangeForm pwdOk={pwdOk} pwdError={pwdError} embedded redirectAfter="/dashboard/settings" />
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className="fixed bottom-5 right-5 z-[1100] max-w-[360px] rounded-xl bg-[#1a1a2e] px-3.5 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(26,26,46,0.25)]"
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </>
  )
}
