import type { Metadata } from 'next'
import Image from 'next/image'
import TeamRequestForm from './TeamRequestForm'
import '../team-request.css'

export const metadata: Metadata = {
  title: 'Заявка на тариф «Команда» — SubCuro',
  description: 'Оставьте заявку на корпоративный тариф SubCuro для команд и бизнеса.',
}

export default function TeamRequestPage() {
  return (
    <div className="tr-shell">
      {/* ── Sidebar ── */}
      <aside className="tr-aside">
        <div className="tr-aside-inner">
          <a href="/#pricing" className="tr-back" aria-label="Назад к тарифам">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            К тарифам
          </a>

          <div className="tr-brand">
            <Image src="/subcuro_ribbon_s_transparent.png" width={36} height={36} alt="" />
            <span>SubCuro</span>
          </div>

          <span className="tr-aside-badge">Команда</span>

          <h1 className="tr-aside-title">
            Тариф <span>«Команда»</span>
          </h1>
          <p className="tr-aside-text">
            Расскажите о компании и задачах — мы свяжемся с вами, когда появится корпоративное предложение, и подберём формат: общее пространство, роли, отчёты и интеграции под ваш сценарий.
          </p>
        </div>
      </aside>

      {/* ── Form ── */}
      <main className="tr-main">
        <div className="tr-card">
          <h1>Заявка на корпоративный доступ</h1>
          <p className="tr-card-lead">
            Заполните форму: чем подробнее опишете компанию и цели, тем точнее мы сможем ответить. Ответ обычно в течение нескольких рабочих дней.
          </p>

          <TeamRequestForm />

          <p className="tr-foot">
            Нажимая кнопку, вы соглашаетесь с обработкой данных для связи по заявке.{' '}
            Личный вход для себя —{' '}
            <a href="/auth?tab=register" className="tr-foot-link">зарегистрироваться</a>.
          </p>
        </div>
      </main>
    </div>
  )
}
