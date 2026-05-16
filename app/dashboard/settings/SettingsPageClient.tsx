'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import type { Reminder, Subscription } from '@/lib/supabase/types'
import PasswordChangeForm from '@/app/dashboard/profile/PasswordChangeForm'
import { setPriceAlertPreferences, setPushEnabled } from './actions'
import { usePushSubscription } from '@/lib/usePushSubscription'
import { getSettingsModalContent, type SettingsModalKey } from './settings-modal-content'
import { actionButtonClass } from '@/app/dashboard/ui/action-button'
import { useLang } from '@/lib/LangContext'

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
  priceAlertsEnabledInitial: boolean
  priceAlertMinChangePctInitial: number
  priceAlertDigestInitial: 'instant' | 'daily' | 'weekly'
  reminderHistory: Reminder[]
  pwdOk?: boolean
  pwdError?: string | null
  error?: string | null
}

const APP_VERSION = '1.4.2'

export default function SettingsPageClient({
  subs,
  pushEnabledInitial,
  priceAlertsEnabledInitial,
  priceAlertMinChangePctInitial,
  priceAlertDigestInitial,
  reminderHistory,
  pwdOk,
  pwdError,
  error,
}: Props) {
  const { lang, strings } = useLang()
  const s = strings.settings
  const formatDateTime = (iso: string) => {
    try {
      const locale = lang === 'en' ? 'en-US' : 'ru-RU'
      return new Date(iso).toLocaleString(locale, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const { status: pushBrowserStatus, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushSubscription()
  const [pushOn, setPushOn] = useState(() => pushEnabledInitial)
  const [emailOn, setEmailOn] = useState(() => readLocalEmailTrial().email)
  const [trialOn, setTrialOn] = useState(() => readLocalEmailTrial().trial)
  const [priceAlertsOn, setPriceAlertsOn] = useState(() => priceAlertsEnabledInitial)
  const [priceAlertMinChangePct, setPriceAlertMinChangePct] = useState(() => priceAlertMinChangePctInitial)
  const [priceAlertDigest, setPriceAlertDigest] = useState<'instant' | 'daily' | 'weekly'>(() => priceAlertDigestInitial)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'queued' | 'sent'>('all')
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
    if (pushBrowserStatus === 'unsupported') {
      toastMsg(s.pushUnsupportedBrowser)
      return
    }
    if (pushBrowserStatus === 'denied') {
      toastMsg(s.pushBrowserBlocked)
      return
    }
    const prev = pushOn
    setPushOn(next)
    saveLocalPrefs(next, emailOn, trialOn)
    startTransition(async () => {
      // 1. Browser-level subscribe / unsubscribe
      const browserOk = next ? await pushSubscribe() : await pushUnsubscribe()
      if (!browserOk) {
        setPushOn(prev)
        saveLocalPrefs(prev, emailOn, trialOn)
        toastMsg(next ? s.pushPermissionDenied : s.pushDisableFailed)
        return
      }
      // 2. Save flag to DB
      const result = await setPushEnabled(next)
      if (!result.ok) {
        setPushOn(prev)
        saveLocalPrefs(prev, emailOn, trialOn)
        toastMsg(s.saveFailed)
      } else {
        toastMsg(next ? s.pushOn : s.pushOff)
      }
    })
  }

  const setEmail = (next: boolean) => {
    setEmailOn(next)
    saveLocalPrefs(pushOn, next, trialOn)
    toastMsg(next ? s.on : s.off)
  }

  const setTrial = (next: boolean) => {
    setTrialOn(next)
    saveLocalPrefs(pushOn, emailOn, next)
    toastMsg(next ? s.on : s.off)
  }

  const syncPriceAlerts = (next: {
    enabled?: boolean
    minChangePct?: number
    digest?: 'instant' | 'daily' | 'weekly'
  }) => {
    const prev = {
      enabled: priceAlertsOn,
      minChangePct: priceAlertMinChangePct,
      digest: priceAlertDigest,
    }
    const merged = {
      enabled: next.enabled ?? prev.enabled,
      minChangePct: next.minChangePct ?? prev.minChangePct,
      digest: next.digest ?? prev.digest,
    }
    setPriceAlertsOn(merged.enabled)
    setPriceAlertMinChangePct(merged.minChangePct)
    setPriceAlertDigest(merged.digest)
    startTransition(async () => {
      try {
        await setPriceAlertPreferences({
          enabled: merged.enabled,
          minChangePct: merged.minChangePct,
          digest: merged.digest,
        })
        router.refresh()
        toastMsg(s.alertsUpdated)
      } catch {
        setPriceAlertsOn(prev.enabled)
        setPriceAlertMinChangePct(prev.minChangePct)
        setPriceAlertDigest(prev.digest)
        toastMsg(s.alertsSaveFailed)
      }
    })
  }

  const mc = modal ? getSettingsModalContent(modal) : null
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'queued') return reminderHistory.filter((r) => !r.delivered_at)
    if (historyFilter === 'sent') return reminderHistory.filter((r) => Boolean(r.delivered_at))
    return reminderHistory
  }, [historyFilter, reminderHistory])
  const subscriptionNameById = useMemo(
    () => new Map(subs.map((s) => [s.id, s.name])),
    [subs],
  )

  return (
    <>
      <header className="mb-6">
        <h1 className="text-[1.75rem] font-bold tracking-[-0.03em] text-[#1a1a2e]">{s.title}</h1>
      </header>

      {error === 'push' ? (
        <p className="mb-4 rounded-xl border border-[#f3c5c7] bg-[#fdecec] px-4 py-3 text-sm text-[#e5484d]">
          {s.errorPush}
        </p>
      ) : null}
      {error === 'price_alerts' ? (
        <p className="mb-4 rounded-xl border border-[#f3c5c7] bg-[#fdecec] px-4 py-3 text-sm text-[#e5484d]">
          {s.errorPriceAlerts}
        </p>
      ) : null}

      <section className="mb-5">
        <p className="mb-2.5 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">{s.notifications}</p>
        <div className={cardClass}>
          <div className={rowClass}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#ede9fc]" aria-hidden>
              <IconBell />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">{s.push}</strong>
              <span className="text-xs text-[#6b6b80]">{s.pushSub}</span>
            </div>
            {pushBrowserStatus === 'denied' ? (
              <span className="text-[11px] text-[#e5484d] font-medium">{s.pushBlocked}</span>
            ) : pushBrowserStatus === 'unsupported' ? (
              <span className="text-[11px] text-[#8e8e93]">{s.pushUnsupported}</span>
            ) : (
              <RowToggle
                on={pushBrowserStatus === 'subscribed' || pushOn}
                ariaLabel={s.push}
                onClick={() => !pending && pushBrowserStatus !== 'loading' && syncPush(!(pushBrowserStatus === 'subscribed' || pushOn))}
              />
            )}
          </div>
          <div className={rowClass}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#ede9fc]" aria-hidden>
              <IconMail />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">{s.email}</strong>
              <span className="text-xs text-[#6b6b80]">{s.emailSub}</span>
            </div>
            <RowToggle on={emailOn} ariaLabel={s.email} onClick={() => setEmail(!emailOn)} />
          </div>
          <div className={rowClass}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#ede9fc]" aria-hidden>
              <IconCalendar />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">{s.trial}</strong>
              <span className="text-xs text-[#6b6b80]">{s.trialSub}</span>
            </div>
            <RowToggle on={trialOn} ariaLabel={s.trial} onClick={() => setTrial(!trialOn)} />
          </div>
        </div>
      </section>

      <section className="mb-5">
        <p className="mb-2.5 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">{s.priceNotifications}</p>
        <div className={cardClass}>
          <div className={rowClass}>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">{s.priceTracking}</strong>
              <span className="text-xs text-[#6b6b80]">{s.priceTrackingSub}</span>
            </div>
            <RowToggle
              on={priceAlertsOn}
              ariaLabel={s.priceTracking}
              onClick={() => !pending && syncPriceAlerts({ enabled: !priceAlertsOn })}
            />
          </div>
          <div className={rowClass}>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">{s.priceThreshold}</strong>
              <span className="text-xs text-[#6b6b80]">{s.priceThresholdSub}</span>
            </div>
            <input
              type="number"
              min={1}
              max={50}
              value={priceAlertMinChangePct}
              disabled={!priceAlertsOn || pending}
              onChange={(e) => setPriceAlertMinChangePct(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              onBlur={() => syncPriceAlerts({ minChangePct: priceAlertMinChangePct })}
              className="w-20 rounded-lg border border-[rgba(26,26,61,0.12)] bg-white px-2 py-1.5 text-right text-sm text-[#1a1a2e] disabled:opacity-50"
            />
          </div>
          <div className={rowClass}>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">{s.priceFrequency}</strong>
              <span className="text-xs text-[#6b6b80]">{s.priceFrequencySub}</span>
            </div>
            <select
              value={priceAlertDigest}
              disabled={!priceAlertsOn || pending}
              onChange={(e) => syncPriceAlerts({ digest: e.target.value as 'instant' | 'daily' | 'weekly' })}
              className={`${actionButtonClass('ghost', 'sm')} disabled:opacity-50`}
            >
              <option value="instant">{s.instant}</option>
              <option value="daily">{s.daily}</option>
              <option value="weekly">{s.weekly}</option>
            </select>
          </div>
        </div>
      </section>

      <section className="mb-5">
        <p className="mb-2.5 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">{s.priceHistory}</p>
        <div className={cardClass}>
          <div className="flex items-center justify-between gap-3 border-b border-[rgba(26,26,61,0.08)] px-[18px] py-3">
            <div className="flex items-center gap-2">
              {([
                ['all', s.filterAll],
                ['queued', s.filterQueued],
                ['sent', s.filterSent],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setHistoryFilter(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    historyFilter === key ? 'bg-[#ede9fc] text-[#5b43d4]' : 'bg-[#f3f3f7] text-[#6b6b80]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Link href="/dashboard/reminders?type=price_check" className="text-xs font-medium text-[#5b43d4] hover:text-[#4b36b6]">
              {s.viewAll}
            </Link>
          </div>
          {filteredHistory.length === 0 ? (
            <div className="px-[18px] py-4 text-sm text-[#6b6b80]">{s.noHistory}</div>
          ) : (
            filteredHistory.map((r) => (
              <div key={r.id} className={rowClass}>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-[#1a1a2e]">
                    {subscriptionNameById.get(r.subscription_id) ?? s.subscription}
                  </strong>
                  <span className="block text-sm text-[#1a1a2e]">
                    {r.delivered_at ? s.delivered : s.queued}
                  </span>
                  <span className="text-xs text-[#6b6b80]">
                    {s.channel} {r.channel} · {r.delivered_at ? formatDateTime(r.delivered_at) : formatDateTime(r.remind_at)}
                  </span>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${r.delivered_at ? 'bg-[#e4f6ec] text-[#0f8f54]' : 'bg-[#ede9fc] text-[#5b43d4]'}`}>
                  {r.delivered_at ? s.filterSent : s.filterQueued}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mb-5">
        <p className="mb-2.5 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">{s.security}</p>
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
              <strong className="block text-sm text-[#1a1a2e]">{s.changePassword}</strong>
              <span className="text-xs text-[#6b6b80]">{s.changePasswordSub}</span>
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
              <strong className="block text-sm text-[#1a1a2e]">{s.twoFA}</strong>
              <span className="text-xs text-[#6b6b80]">{s.twoFASub}</span>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
        </div>
      </section>

      <section className="mb-5">
        <p className="mb-2.5 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">{s.support}</p>
        <div className={cardClass}>
          <a
            href="mailto:hello@subcuro.app?subject=SubCuro%20Support"
            className={`${rowClass} text-inherit no-underline hover:bg-[rgba(91,67,212,0.04)]`}
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">{s.contactSupport}</strong>
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
              <strong className="block text-sm text-[#1a1a2e]">{s.faq}</strong>
              <span className="text-xs text-[#6b6b80]">{s.faqSub}</span>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => setModal('report')}
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">{s.reportIssue}</strong>
              <span className="text-xs text-[#6b6b80]">{s.reportIssueSub}</span>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
        </div>
      </section>

      <section className="mb-5">
        <p className="mb-2.5 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">{s.legal}</p>
        <div className={cardClass}>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => setModal('privacy')}
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">{s.privacy}</strong>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => setModal('terms')}
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">{s.terms}</strong>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
        </div>
      </section>

      <section className="mb-5">
        <p className="mb-2.5 ml-1 text-[11px] font-semibold tracking-[0.06em] text-[#6b6b80]">{s.about}</p>
        <div className={cardClass}>
          <div className={rowClass}>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">{s.appVersion}</strong>
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
              <strong className="block text-sm text-[#1a1a2e]">{s.whatsNew}</strong>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
          <button
            type="button"
            className={`${rowClass} w-full cursor-pointer border-0 bg-transparent text-left hover:bg-[rgba(91,67,212,0.04)]`}
            onClick={() => toastMsg(s.rateToast)}
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1a1a2e]">{s.rate}</strong>
            </div>
            <span className="text-lg opacity-35">›</span>
          </button>
        </div>
      </section>

      {modal && mc ? (
        <div className="fixed inset-0 z-[1200] flex items-start justify-center p-5 pt-[8vh]" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
          <button
            type="button"
            className="absolute inset-0 cursor-default border-0 bg-[rgba(15,15,35,0.5)]"
            aria-label={s.modalClose}
            onClick={() => setModal(null)}
          />
          <div className="relative z-[1] flex w-full max-w-[560px] max-h-[min(84vh,720px)] flex-col rounded-2xl border border-[rgba(26,26,61,0.08)] bg-white shadow-[0_20px_50px_rgba(20,20,50,0.2)]">
            {/* Sticky header */}
            <div className="shrink-0 px-[18px] pt-[18px] pb-3">
              <button
                type="button"
                className="absolute right-2 top-2 flex h-[34px] w-[34px] items-center justify-center rounded-full border-0 bg-transparent text-2xl text-[#8b8ba2] hover:bg-[#f3f3fa]"
                onClick={() => setModal(null)}
                aria-label="Закрыть"
              >
                ×
              </button>
              <h2 id="settings-modal-title" className="mb-0 mt-0.5 pr-10 text-xl font-bold text-[#1a1a2e]">
                {mc.title}
              </h2>
            </div>
            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-2 text-[14px]">
              {mc.body}
            </div>
            {/* Sticky footer */}
            <div className="shrink-0 flex justify-end border-t border-[rgba(26,26,61,0.07)] px-[18px] py-3">
              <button
                type="button"
                className={actionButtonClass('secondary')}
                onClick={() => setModal(null)}
              >
                {s.modalOk}
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
            aria-label={s.modalClose}
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
              {s.changePasswordTitle}
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
