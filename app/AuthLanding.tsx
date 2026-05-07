'use client'

import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type AuthTab = 'login' | 'register'

function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) {
    return 'Неверный email или пароль. Если забыли пароль — нажмите "Забыли пароль?".'
  }
  if (m.includes('email not confirmed')) {
    return 'Почта не подтверждена. Подтвердите email по ссылке из письма.'
  }
  if (m.includes('too many requests')) {
    return 'Слишком много попыток. Подождите минуту и попробуйте снова.'
  }
  return message
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export default function AuthLanding() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authError = searchParams.get('error') === 'auth'
  const resetMode = searchParams.get('reset') === '1'
  const requestedTab: AuthTab = searchParams.get('tab') === 'register' ? 'register' : 'login'

  const [tab, setTab] = useState<AuthTab>(requestedTab)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [resetDone, setResetDone] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  // true когда Supabase обнаруживает PASSWORD_RECOVERY из хэш-токена в URL
  const [hashRecoveryMode, setHashRecoveryMode] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHashRecoveryMode(true)
        setError(null)
        setResetDone(null)
      }
    })
    return () => { subscription.unsubscribe() }
  }, [])

  const fullName = useMemo(() => {
    const parts = [firstName.trim(), lastName.trim()].filter(Boolean)
    return parts.join(' ')
  }, [firstName, lastName])

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResetDone(null)

    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) {
      setError('Введите email.')
      setLoading(false)
      return
    }
    if (!password) {
      setError('Введите пароль.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })
    if (error) {
      setError(mapAuthError(error.message))
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResetDone(null)

    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) {
      setError('Введите email.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        data: fullName ? { full_name: fullName } : undefined,
      },
    })

    if (error) {
      setError(mapAuthError(error.message))
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  async function handleResetPassword() {
    const targetEmail = normalizeEmail(email)
    setError(null)
    setResetDone(null)
    if (!targetEmail) {
      setError('Введите email, и затем нажмите "Забыли пароль?"')
      return
    }
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${location.origin}/auth/callback?flow=recovery`,
    })
    if (error) {
      setError(mapAuthError(error.message))
      return
    }
    setResetDone('Отправили письмо для сброса пароля. Проверьте почту и спам.')
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setOauthLoading(provider)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(mapAuthError(error.message))
      setOauthLoading(null)
    }
    // При успехе Supabase сам делает redirect — spinner остаётся до ухода со страницы
  }

  async function handleSetNewPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResetDone(null)
    if (newPassword.length < 8) {
      setError('Новый пароль должен быть не короче 8 символов.')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setError('Пароли не совпадают.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setError(mapAuthError(error.message))
      setLoading(false)
      return
    }
    setLoading(false)
    setResetDone('Пароль обновлён. Теперь можно войти с новым паролем.')
    setNewPassword('')
    setNewPasswordConfirm('')
    router.replace('/dashboard')
  }

  return (
    <>
      <div className="auth-page">
        <div className="auth-shell">
          <aside className="auth-aside" aria-label="О продукте">
            <div className="auth-aside-inner">
              <Link href="/" className="auth-brand">
                <Image src="/subcuro_ribbon_s_transparent.png?v=20260505b" width={36} height={36} alt="Subcuro logo" />
                <span className="auth-brand-text">Subcuro</span>
              </Link>
              <p className="auth-eyebrow">Умный трекер подписок</p>
              <h1 className="auth-aside-title">
                Умный трекер <span className="auth-highlight">регулярных платежей</span> и подписок
              </h1>
              <p className="auth-aside-lead">
                Отслеживайте подписки и регулярные списания, получайте напоминания вовремя и находите
                возможности сэкономить — в одном спокойном интерфейсе.
              </p>
              <ul className="auth-features">
                <li className="auth-feature">
                  <div className="auth-feature-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="auth-feature-title">Никаких лишних списаний</p>
                    <p className="auth-feature-desc">Напоминания до продления и окончания пробного периода.</p>
                  </div>
                </li>
                <li className="auth-feature">
                  <div className="auth-feature-icon auth-feature-icon--chart" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M21 21H4V6" strokeLinecap="round" />
                      <path d="M8 17V10M12 17V14M16 17v-7" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="auth-feature-title">Экономия без усилий</p>
                    <p className="auth-feature-desc">Аналитика и подсказки, что пересмотреть или отключить.</p>
                  </div>
                </li>
                <li className="auth-feature">
                  <div className="auth-feature-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M12 3l8 4v5c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V7l8-4z" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="auth-feature-title">Безопасно и конфиденциально</p>
                    <p className="auth-feature-desc">Ваши данные под защитой, доступ к банкам не храним.</p>
                  </div>
                </li>
              </ul>
              <div className="auth-stats">
                <div className="auth-stat">
                  <div className="auth-stat-value auth-stat-value--mint">16K+</div>
                  <div className="auth-stat-label">₽ в год средняя экономия</div>
                </div>
                <div className="auth-stat">
                  <div className="auth-stat-value auth-stat-value--purple">37%</div>
                  <div className="auth-stat-label">подписок не используются</div>
                </div>
                <div className="auth-stat">
                  <div className="auth-stat-value auth-stat-value--mint">12+</div>
                  <div className="auth-stat-label">регулярных платежей в среднем на пользователя</div>
                </div>
              </div>
            </div>
          </aside>

          <main className="auth-main">
            <div className="auth-card">
              <div className="auth-tabs" role="tablist" aria-label="Режим">
                <button
                  type="button"
                  className={`auth-tab ${tab === 'login' ? 'auth-tab--active' : ''}`}
                  role="tab"
                  onClick={() => setTab('login')}
                >
                  Войти
                </button>
                <button
                  type="button"
                  className={`auth-tab ${tab === 'register' ? 'auth-tab--active' : ''}`}
                  role="tab"
                  onClick={() => setTab('register')}
                >
                  Зарегистрироваться
                </button>
              </div>

              {(resetMode || hashRecoveryMode) ? (
                <div className="auth-panel auth-panel-fixed">
                  <h2 className="auth-panel-title">Создать новый пароль</h2>
                  <p className="auth-panel-sub">Введите новый пароль для аккаунта Subcuro</p>
                  <form onSubmit={handleSetNewPassword}>
                    <div className="auth-field">
                      <label className="auth-label">Новый пароль</label>
                      <div className="auth-input-wrap">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M9 11V8a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <input
                          className="auth-input"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          autoComplete="new-password"
                          placeholder="Минимум 8 символов"
                          minLength={8}
                          required
                        />
                      </div>
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">Повторите пароль</label>
                      <div className="auth-input-wrap">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M9 11V8a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <input
                          className="auth-input"
                          type="password"
                          value={newPasswordConfirm}
                          onChange={(e) => setNewPasswordConfirm(e.target.value)}
                          autoComplete="new-password"
                          placeholder="Повторите пароль"
                          minLength={8}
                          required
                        />
                      </div>
                    </div>
                    {resetDone && (
                      <p style={{ color: '#166534', fontSize: 13, marginBottom: 10 }}>
                        {resetDone}
                      </p>
                    )}
                    {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</p>}
                    <button type="submit" className="auth-submit" disabled={loading}>
                      {loading ? 'Сохраняю…' : 'Сохранить новый пароль'}
                    </button>
                  </form>
                </div>
              ) : tab === 'login' ? (
                <div className="auth-panel auth-panel-fixed">
                  <h2 className="auth-panel-title">С возвращением!</h2>
                  <p className="auth-panel-sub">Войдите в свой аккаунт Subcuro</p>
                  <form onSubmit={handleLoginSubmit}>
                    <div className="auth-field">
                      <label className="auth-label">Email</label>
                      <div className="auth-input-wrap">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M4 6h16v12H4V6zm0 0l8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <input
                          className="auth-input"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="email"
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">Пароль</label>
                      <div className="auth-input-wrap">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M9 11V8a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <input
                          className="auth-input auth-input--toggle"
                          type={showLoginPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          className="auth-toggle-pw"
                          onClick={() => setShowLoginPassword((v) => !v)}
                          aria-label={showLoginPassword ? 'Скрыть пароль' : 'Показать пароль'}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="auth-forgot">
                      <button type="button" onClick={() => void handleResetPassword()}>
                        Забыли пароль?
                      </button>
                    </div>
                    {authError && (
                      <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>
                        Ссылка из письма устарела или недействительна.
                      </p>
                    )}
                    {resetDone && (
                      <p style={{ color: '#166534', fontSize: 13, marginBottom: 10 }}>
                        {resetDone}
                      </p>
                    )}
                    {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</p>}
                    <button type="submit" className="auth-submit" disabled={loading}>
                      {loading ? 'Вход…' : 'Войти'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="auth-panel auth-panel-fixed">
                  <h2 className="auth-panel-title">Создать аккаунт</h2>
                  <p className="auth-panel-sub">Бесплатно. Без банковских данных.</p>
                  <form onSubmit={handleRegisterSubmit}>
                    <div className="auth-field auth-field-row">
                      <div>
                        <label className="auth-label">Имя</label>
                        <div className="auth-input-wrap">
                          <input
                            className="auth-input auth-input--plain"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            autoComplete="given-name"
                            placeholder="Алексей"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="auth-label">Фамилия</label>
                        <div className="auth-input-wrap">
                          <input
                            className="auth-input auth-input--plain"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            autoComplete="family-name"
                            placeholder="Петров"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">Email</label>
                      <div className="auth-input-wrap">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M4 6h16v12H4V6zm0 0l8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <input
                          className="auth-input"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="email"
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">Пароль</label>
                      <div className="auth-input-wrap">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M9 11V8a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <input
                          className="auth-input auth-input--toggle"
                          type={showRegisterPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="new-password"
                          placeholder="Минимум 8 символов"
                          minLength={8}
                          required
                        />
                        <button
                          type="button"
                          className="auth-toggle-pw"
                          onClick={() => setShowRegisterPassword((v) => !v)}
                          aria-label={showRegisterPassword ? 'Скрыть пароль' : 'Показать пароль'}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {done && (
                      <p style={{ color: '#166534', fontSize: 13, marginBottom: 10 }}>
                        Проверьте почту: мы отправили ссылку для подтверждения.
                      </p>
                    )}
                    {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</p>}
                    <button type="submit" className="auth-submit" disabled={loading}>
                      {loading ? 'Создание…' : 'Создать аккаунт'}
                    </button>
                  </form>
                </div>
              )}

              <div className="auth-divider">или</div>
              <div className="auth-social">
                <button
                  type="button"
                  className="auth-social-btn"
                  disabled={oauthLoading !== null}
                  onClick={() => void handleOAuth('google')}
                >
                  {oauthLoading === 'google' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="auth-spinner">
                      <circle cx="12" cy="12" r="9" stroke="#9ca3af" strokeWidth="2" strokeDasharray="28 56" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  {oauthLoading === 'google' ? 'Перенаправление…' : 'Продолжить с Google'}
                </button>
                <button
                  type="button"
                  className="auth-social-btn"
                  disabled={oauthLoading !== null}
                  onClick={() => void handleOAuth('apple')}
                >
                  {oauthLoading === 'apple' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="auth-spinner">
                      <circle cx="12" cy="12" r="9" stroke="#9ca3af" strokeWidth="2" strokeDasharray="28 56" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#111827" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                    </svg>
                  )}
                  {oauthLoading === 'apple' ? 'Перенаправление…' : 'Продолжить с Apple'}
                </button>
              </div>
              <p className="auth-footnote">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3l8 4v5c0 4-2.5 7.5-7 9-4.5-1.5-7-5-7-9V7l8-4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                Мы не передаём ваши данные третьим лицам
              </p>
            </div>
          </main>
        </div>
      </div>

      <style jsx global>{`
        .auth-page {
          font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
          min-height: 100vh;
          color: #140e38;
        }
        .auth-shell { display: flex; min-height: 100vh; height: 100vh; max-width: 100vw; overflow: hidden; }
        .auth-aside {
          position: relative; flex: 0 0 clamp(380px, 54vw, 720px); min-height: 100vh;
          background: linear-gradient(165deg, #0d0d2b 0%, #0f0b38 45%, #121030 100%);
          color: #fff; padding: clamp(18px, 2.5vh, 36px) clamp(28px, 4.5vw, 64px) clamp(20px, 3vh, 40px);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .auth-aside::before, .auth-aside::after { content: ''; position: absolute; border-radius: 50%; pointer-events: none; }
        .auth-aside::before { width: 420px; height: 420px; top: -120px; right: -140px; border: 1px solid rgba(124,58,237,.25); box-shadow: 0 0 80px rgba(124,58,237,.15); }
        .auth-aside::after { width: 360px; height: 360px; bottom: -100px; right: -80px; border: 1px solid rgba(74,222,128,.18); box-shadow: 0 0 60px rgba(74,222,128,.1); }
        .auth-aside-inner { position: relative; z-index: 1; display: flex; flex-direction: column; min-height: 0; }
        .auth-brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: #fff; margin-bottom: clamp(14px, 2.5vh, 28px); }
        .auth-brand-text { font-size: clamp(24px, 2.2vw, 28px); font-weight: 700; letter-spacing: -.02em; }
        .auth-eyebrow { font-size: clamp(12px, 1.1vw, 13px); font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #4ade80; margin-bottom: 10px; }
        .auth-aside-title { font-size: clamp(32px, 3.8vw, 44px); font-weight: 800; line-height: 1.12; letter-spacing: -.03em; margin-bottom: 12px; }
        .auth-highlight { color: #4ade80; }
        .auth-aside-lead { font-size: clamp(15px, 1.35vw, 17px); line-height: 1.6; color: rgba(255,255,255,.68); max-width: min(54ch,100%); margin-bottom: clamp(16px, 2.5vh, 24px); }
        .auth-features { list-style: none; display: flex; flex-direction: column; gap: clamp(14px,2vh,20px); }
        .auth-feature { display: flex; gap: 16px; align-items: flex-start; }
        .auth-feature-icon { width: 50px; height: 50px; border-radius: 50%; border: 1.5px solid rgba(124,58,237,.55); background: rgba(124,58,237,.08); display: flex; align-items: center; justify-content: center; }
        .auth-feature-icon svg { width: 22px; height: 22px; color: #b794f6; }
        .auth-feature-icon--chart { border-color: rgba(74,222,128,.45); background: rgba(74,222,128,.08); }
        .auth-feature-icon--chart svg { color: #4ade80; }
        .auth-feature-title { font-size: clamp(16px,1.45vw,18px); font-weight: 700; margin-bottom: 5px; }
        .auth-feature-desc { font-size: clamp(13px,1.15vw,15px); line-height: 1.5; color: rgba(255,255,255,.58); max-width: min(50ch,100%); }
        .auth-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-top: clamp(18px,2.5vh,28px); }
        .auth-stat { background: rgba(22,17,72,.65); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 16px 12px; text-align: center; }
        .auth-stat-value { font-size: clamp(20px,2.2vw,26px); font-weight: 800; margin-bottom: 6px; }
        .auth-stat-value--mint { color: #4ade80; } .auth-stat-value--purple { color: #a78bfa; }
        .auth-stat-label { font-size: clamp(11px,1.05vw,13px); line-height: 1.4; color: rgba(255,255,255,.6); }
        .auth-main { flex: 1; min-width: 0; min-height: 100vh; background: #f8f7f4; display: flex; align-items: flex-start; justify-content: center; padding: clamp(20px,4vh,48px) clamp(20px,3.5vw,40px); overflow-y: auto; }
        .auth-card { width: 100%; max-width: min(500px,100%); background: #fff; border-radius: 24px; box-shadow: 0 4px 6px rgba(15,11,56,.04), 0 24px 48px rgba(15,11,56,.08); padding: 20px 28px 20px; }
        .auth-panel-fixed { min-height: 390px; }
        .auth-tabs { display: flex; gap: 4px; padding: 4px; background: #f5f5f0; border-radius: 14px; margin-bottom: 22px; }
        .auth-tab { flex: 1; border: none; border-radius: 12px; padding: 12px 16px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; color: #6b7280; background: transparent; }
        .auth-tab--active { background: #161148; color: #fff; box-shadow: 0 2px 8px rgba(22,17,72,.25); }
        .auth-panel-title { font-size: 26px; font-weight: 800; letter-spacing: -.03em; color: #161148; margin-bottom: 8px; }
        .auth-panel-sub { font-size: 14px; color: #6b7280; margin-bottom: 20px; line-height: 1.5; }
        .auth-field { margin-bottom: 15px; } .auth-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .auth-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }
        .auth-input-wrap { position: relative; }
        .auth-input-wrap > svg:first-of-type { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: #9ca3af; pointer-events: none; }
        .auth-input { width: 100%; height: 50px; border: 1px solid rgba(15,11,56,.1); border-radius: 12px; padding: 0 14px 0 44px; font: inherit; font-size: 15px; color: #0d0d2b; background: #fff; }
        .auth-input:focus { outline: none; border-color: rgba(124,58,237,.45); box-shadow: 0 0 0 3px rgba(124,58,237,.12); }
        .auth-input--toggle { padding-right: 76px; }
        .auth-input--plain { padding-left: 14px !important; }
        .auth-toggle-pw { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 42px; height: 42px; border: none; background: transparent; color: #9ca3af; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .auth-toggle-pw:hover { color: #6b7280; }
        .auth-forgot { text-align: right; margin-top: -8px; margin-bottom: 18px; }
        .auth-forgot button { font-size: 13px; font-weight: 600; color: #7c3aed; text-decoration: none; border: 0; background: transparent; cursor: pointer; }
        .auth-submit { width: 100%; height: 52px; border: none; border-radius: 12px; background: #161148; color: #fff; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer; }
        .auth-divider { display: flex; align-items: center; gap: 16px; margin: 12px 0; color: #9ca3af; font-size: 13px; }
        .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: rgba(15,11,56,.1); }
        .auth-social { display: flex; flex-direction: column; gap: 8px; }
        .auth-social-btn { height: 42px; border: 1px solid rgba(15,11,56,.1); border-radius: 12px; background: #fff; font: inherit; font-size: 14px; font-weight: 600; color: #374151; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .auth-footnote { margin-top: 12px; text-align: center; font-size: 12px; color: #6b7280; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .auth-footnote svg { color: #9ca3af; flex-shrink: 0; }
        .auth-social-btn:disabled { opacity: .6; cursor: not-allowed; }
        @keyframes auth-spin { to { transform: rotate(360deg); } }
        .auth-spinner { animation: auth-spin .8s linear infinite; }
        @media (max-width: 760px) {
          .auth-shell { flex-direction: column; }
          .auth-aside { flex: none; min-height: auto; width: 100%; }
        }
        @media (max-width: 520px) {
          .auth-field-row { grid-template-columns: 1fr; }
          .auth-stats { grid-template-columns: 1fr; gap: 8px; }
        }
      `}</style>
    </>
  )
}
