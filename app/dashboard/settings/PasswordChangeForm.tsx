import { updatePassword } from './actions'

type Props = {
  pwdOk?: boolean
  pwdError?: string | null
  /** Без отдельной карточки (модалка профиля) */
  embedded?: boolean
  /** Куда редирект после смены пароля */
  redirectAfter?: string
}

const ERR: Record<string, string> = {
  short: 'Пароль не короче 6 символов.',
  mismatch: 'Пароли не совпадают.',
  auth: 'Не удалось сменить пароль. Попробуйте выйти и войти снова.',
}

export default function PasswordChangeForm({ pwdOk, pwdError, embedded, redirectAfter = '/dashboard/profile' }: Props) {
  const formClass = embedded
    ? 'space-y-4 max-w-lg'
    : 'space-y-4 max-w-lg rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]'
  return (
    <form action={updatePassword} className={formClass}>
      <input type="hidden" name="next" value={redirectAfter} />
      <h2 className="text-sm font-medium text-[#6b6b80] uppercase tracking-wide">Пароль</h2>
      {pwdOk && (
        <p className="text-sm text-[#0d9f6e] border border-[#bfe7d1] rounded-lg px-3 py-2 bg-[#e8faf0]">
          Пароль обновлён
        </p>
      )}
      {pwdError && ERR[pwdError] && (
        <p className="text-sm text-[#e5484d] border border-[#f3c5c7] rounded-lg px-3 py-2 bg-[#fdecec]">
          {ERR[pwdError]}
        </p>
      )}
      <div>
        <label className="block text-sm text-[#6b6b80] mb-1">Новый пароль</label>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-[#6b6b80] mb-1">Повторите пароль</label>
        <input
          name="password_confirm"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          className="w-full rounded-lg border border-[#dcd6ce] bg-white px-3 py-2 text-[#1a1a2e] text-sm"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-[#1a1a2e] hover:bg-[#10101f] px-4 py-2 text-sm font-medium text-white"
      >
        Сменить пароль
      </button>
    </form>
  )
}
