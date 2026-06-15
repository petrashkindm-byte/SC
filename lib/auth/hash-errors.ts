export function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) {
    return 'Неверный email или пароль. Если забыли пароль — нажмите «Забыли пароль?».'
  }
  if (m.includes('email not confirmed')) {
    return 'Почта не подтверждена. Подтвердите email по ссылке из письма.'
  }
  if (m.includes('too many requests')) {
    return 'Слишком много попыток. Подождите минуту и попробуйте снова.'
  }
  if (m.includes('otp_expired') || m.includes('invalid or has expired')) {
    return 'Ссылка из письма устарела или уже использована. Нажмите «Забыли пароль?» и запросите новое письмо.'
  }
  if (m.includes('pkce') && m.includes('code verifier')) {
    return 'Сессия входа истекла. Попробуйте войти снова.'
  }
  if (m === 'oauth_state_mismatch' || m === 'access_denied') {
    return 'Вход через соцсеть отменён или сессия истекла. Попробуйте снова.'
  }
  if (m === 'oauth_no_email') {
    return 'Провайдер не передал email. Зарегистрируйтесь по email и паролю.'
  }
  if (m === 'yandex_not_configured' || m === 'vk_not_configured') {
    return 'Вход через эту соцсеть временно недоступен. Попробуйте email и пароль.'
  }
  if (m === 'oauth_failed') {
    return 'Не удалось войти через соцсеть. Попробуйте снова или используйте email и пароль.'
  }
  return message
}

/** Ошибки Supabase в #hash (истёкшая ссылка сброса пароля и т.д.) */
export function readHashAuthError(): string | null {
  if (typeof window === 'undefined') return null
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw) return null
  const params = new URLSearchParams(raw)
  const code = params.get('error_code') ?? ''
  const desc = params.get('error_description') ?? ''
  if (code === 'otp_expired' || desc.toLowerCase().includes('expired')) {
    return mapAuthError('otp_expired')
  }
  if (desc) {
    return mapAuthError(decodeURIComponent(desc.replace(/\+/g, ' ')))
  }
  if (params.get('error') === 'access_denied') {
    return 'Ссылка недействительна. Запросите новое письмо для сброса пароля.'
  }
  return null
}

export const AUTH_ERROR_STORAGE_KEY = 'subcuro_auth_error'

/** Синхронно при загрузке /auth — до React */
export function flushHashAuthErrorToStorage(): void {
  if (typeof window === 'undefined') return
  const msg = readHashAuthError()
  if (msg) {
    sessionStorage.setItem(AUTH_ERROR_STORAGE_KEY, msg)
    window.history.replaceState(null, '', '/auth')
  }
}

export function consumeStoredAuthError(): string | null {
  if (typeof window === 'undefined') return null
  const msg = sessionStorage.getItem(AUTH_ERROR_STORAGE_KEY)
  if (msg) sessionStorage.removeItem(AUTH_ERROR_STORAGE_KEY)
  return msg
}
