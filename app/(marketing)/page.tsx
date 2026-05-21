import LandingInteractions from './LandingInteractions'
import LangSwitcherWidget from './LangSwitcherWidget'

/* ── Inline SVG helpers (no external CDN) ── */
const IconSparkles = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="nav-icon">
    <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
  </svg>
)

const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="nav-icon">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IconClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="nav-icon">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

const IconHelpCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="nav-icon">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

const IconArrowRight = () => (
  <svg style={{width:16,height:16}} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
)

const IconDownload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="#6c5ce7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{width:20,height:20}}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

const IconBell = ({color}: {color:string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{width:20,height:20}}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

const IconZap = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{width:20,height:20}}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

const IconCreditCard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="#6c5ce7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{width:20,height:20}}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)

const IconBriefcase = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="#6c5ce7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{width:20,height:20}}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
)

const IconUsersGreen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="#00b894" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{width:20,height:20}}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IconBellGreen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="#00b894" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{width:20,height:20}}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

const IconRocket = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="#00b894" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{width:32,height:32}}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
)

const IconUsers2 = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="#00b894" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{width:32,height:32}}>
    <path d="M14 19a6 6 0 0 0-12 0"/>
    <circle cx="8" cy="9" r="4"/>
    <path d="M22 19a6 6 0 0 0-6-6 4 4 0 0 0 0-8"/>
  </svg>
)

const IconCheckCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="#00b894" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{width:20,height:20,flexShrink:0}}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

const IconLock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{width:16,height:16}}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{width:16,height:16}}>
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const IconShield = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{width:16,height:16}}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const IconChevronDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="faq-chev">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const IconHelpCircleFaq = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{color:'#1a1a2e',width:20,height:20}}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

const IconApple = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{color:'white',width:20,height:20}}>
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
  </svg>
)

const IconPlay = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{color:'white',width:20,height:20}}>
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)

export default function LandingPage() {
  return (
    <>
      {/* ═══ NAVBAR ═══ */}
      <nav id="siteNav" role="navigation" aria-label="Главная навигация">
        <div id="siteNavInner">

          {/* Logo */}
          <a href="/" className="nav-logo" aria-label="SubCuro — главная">
            <img src="/subcuro_ribbon_s_transparent.png" alt="SubCuro" className="nav-logo-img" />
            <span className="nav-logo-text">SubCuro</span>
          </a>

          {/* Center nav links */}
          <div className="nav-center">
            <a href="#how-it-works" data-nav="how-it-works" className="nav-link">
              <IconSparkles />
              <span data-i18n="nav.how">Как работает</span>
            </a>
            <a href="#for-whom" data-nav="for-whom" className="nav-link">
              <IconUsers />
              <span data-i18n="nav.platforms">Сценарии</span>
            </a>
            <a href="#pricing" data-nav="pricing" className="nav-link">
              <IconClock />
              <span data-i18n="nav.pricing">Тарифы</span>
            </a>
            <a href="#faq" data-nav="faq" className="nav-link">
              <IconHelpCircle />
              <span data-i18n="nav.faq">FAQ</span>
            </a>
          </div>

          {/* Right cluster */}
          <div className="nav-right">
            <LangSwitcherWidget />
            <a href="/auth?tab=login" className="nav-login" data-i18n="nav.login">Войти</a>
            <a href="/auth?tab=register" className="nav-cta" data-i18n="nav.start">Начать бесплатно</a>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="hero-section" aria-labelledby="hero-heading">
        <div className="hero-card-wrap">
          <div className="hero-card">

            {/* Background image */}
            <img
              src="/web-concept/assets/hero/hero-devices.png"
              alt="SubCuro devices"
              loading="eager"
              className="hero-img"
            />

            {/* Left gradient overlay */}
            <div className="hero-overlay" />

            {/* Content */}
            <div className="hero-content">
              <div className="hero-badge">
                <span className="hero-badge-dot sc-pulse" />
                <span data-i18n="hero.badge">Веб-версия и мобильное приложение</span>
              </div>

              <h1 id="hero-heading" className="hero-h1" data-i18n-html="hero.title">
                Контролируй<br />регулярные платежи<br />на любом устройстве
              </h1>

              <p className="hero-sub" data-i18n="hero.subtitle">
                SubCuro синхронизирует подписки, связь, интернет и другие регулярные платежи между веб-версией и приложением. Все списания, напоминания и решения — в одном месте.
              </p>

              <div className="hero-buttons">
                <a href="/auth?tab=register" className="btn-hero-primary" data-i18n="hero.ctaStart">
                  Начать бесплатно
                  <IconArrowRight />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BANNER ═══ */}
      <section className="stats-section" aria-labelledby="stats-heading">
        <div className="stats-glow-left" aria-hidden="true" />
        <div className="stats-glow-right" aria-hidden="true" />
        <h2 id="stats-heading" className="sr-only">Ключевые показатели</h2>

        <div id="stats-grid" role="list">
          <article className="stat-col" role="listitem">
            <div className="stat-num count-up" data-target="4700" data-suffix=" ₽" data-prefix="~">~0 ₽</div>
            <div className="stat-label" data-i18n-html="stats.copy1">в среднем уходит в месяц на регулярные платежи</div>
          </article>
          <article className="stat-col" role="listitem">
            <div className="stat-num count-up" data-target="37" data-suffix="%">0%</div>
            <div className="stat-label" data-i18n-html="stats.copy2">регулярных списаний используются реже, чем кажется</div>
          </article>
          <article className="stat-col" role="listitem">
            <div className="stat-num">12+</div>
            <div className="stat-label" data-i18n-html="stats.copy3">активных регулярных платежей у среднего пользователя</div>
          </article>
          <article className="stat-col" role="listitem">
            <div className="stat-num count-up" data-target="16000" data-suffix=" ₽">0 ₽</div>
            <div className="stat-label" data-i18n-html="stats.copy4">можно сэкономить в год за счёт пересмотра лишних платежей</div>
          </article>
        </div>
      </section>

      {/* ═══ HOW IT WORKS HEADER ═══ */}
      <div className="how-header">
        <div className="how-header-eyebrow">
          <span className="how-eyebrow-dot sc-pulse-fast" aria-hidden="true" />
          <span className="how-eyebrow-text">КАК ЭТО РАБОТАЕТ</span>
        </div>
        <h2 className="how-title" data-i18n="how.title">Три шага до полного контроля</h2>
        <p className="how-desc" data-i18n="how.desc">Начни прямо сейчас — регистрация занимает меньше минуты.</p>
      </div>

      {/* ═══ HOW IT WORKS CARDS ═══ */}
      <section id="how-it-works" className="how-grid" aria-labelledby="how-heading">
        <h2 id="how-heading" className="sr-only">Как работает</h2>

        {/* Card 1 — wider, with bg image */}
        <div className="how-card sc-card-reveal">
          <img
            src="/web-concept/images/hiw-step1.png"
            alt=""
            loading="lazy"
            className="how-card-bg-img"
          />
          <div className="how-card-bg-gradient" aria-hidden="true" />

          <div className="how-card-top">
            <div className="how-card-icon how-card-icon--purple">
              <IconDownload />
            </div>
            <span className="how-card-step">01</span>
          </div>

          <div className="how-card-body">
            <h3 className="how-card-title">Зарегистрируйся</h3>
            <p className="how-card-text">
              Создай аккаунт за 30 секунд. Вводи подписки вручную или загружай CSV-выписку из банка.
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="how-card sc-card-reveal">
          <div className="how-card-top-plain">
            <div className="how-card-icon how-card-icon--yellow">
              <IconBell color="#f9ca24" />
            </div>
            <span className="how-card-step">02</span>
          </div>
          <div className="how-card-body-plain">
            <h3 className="how-card-title">Получай уведомления</h3>
            <p className="how-card-text">
              SubCuro предупредит о списании заранее, напомнит об окончании триала и покажет, где можно сэкономить.
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="how-card sc-card-reveal">
          <div className="how-card-top-plain">
            <div className="how-card-icon how-card-icon--green">
              <IconZap />
            </div>
            <span className="how-card-step">03</span>
          </div>
          <div className="how-card-body-plain">
            <h3 className="how-card-title">Принимай решения</h3>
            <p className="how-card-text">
              Очередь действий сама подскажет, что отменить, поставить на паузу или заменить — и посчитает экономию.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ WHO IS SUBCURO FOR ═══ */}
      <section id="for-whom" className="who-section" aria-labelledby="who-heading">
        <div className="who-header">
          <div className="who-eyebrow">ДЛЯ КАЖДОГО СЦЕНАРИЯ</div>
          <h2 id="who-heading" className="who-title" data-i18n="forwhom.title">Для кого SubCuro</h2>
        </div>

        <div className="who2-grid">
          {/* Tab list */}
          <div className="who2-tabs" role="tablist">
            <button className="who2-tab is-active" type="button" data-tab="0" role="tab">
              <span className="who2-tab-icon who2-tab-icon--purple">
                <IconCreditCard />
              </span>
              <span className="who2-tab-texts">
                <span className="who2-tab-label" data-i18n="forwhom.t1short">Много платежей</span>
                <span className="who2-tab-sublabel">10+ сервисов</span>
              </span>
            </button>

            <button className="who2-tab" type="button" data-tab="1" role="tab">
              <span className="who2-tab-icon who2-tab-icon--green">
                <IconUsersGreen />
              </span>
              <span className="who2-tab-texts">
                <span className="who2-tab-label" data-i18n="forwhom.t2short">Семейный бюджет</span>
                <span className="who2-tab-sublabel">Совместный контроль</span>
              </span>
            </button>

            <button className="who2-tab" type="button" data-tab="2" role="tab">
              <span className="who2-tab-icon who2-tab-icon--purple">
                <IconBriefcase />
              </span>
              <span className="who2-tab-texts">
                <span className="who2-tab-label" data-i18n="forwhom.t3short">Фрилансер / бизнес</span>
                <span className="who2-tab-sublabel">Рабочие расходы</span>
              </span>
            </button>

            <button className="who2-tab" type="button" data-tab="3" role="tab">
              <span className="who2-tab-icon who2-tab-icon--green">
                <IconBellGreen />
              </span>
              <span className="who2-tab-texts">
                <span className="who2-tab-label" data-i18n="forwhom.t4short">Без сюрпризов</span>
                <span className="who2-tab-sublabel">Уведомления заранее</span>
              </span>
            </button>
          </div>

          {/* Panels */}
          <div>
            {/* Panel 1 */}
            <div className="who2-panel is-active" data-panel="0" style={{background:'#eee9ff'}}>
              <img src="/web-concept/images/who-tab-1.jpg"
                alt="" loading="lazy" className="who2-panel-img" />
              <div className="who2-panel-body">
                <span className="who2-panel-badge who2-panel-badge--purple">Самый популярный</span>
                <h3 className="who2-panel-title who2-panel-title--purple" data-i18n="forwhom.t1">
                  Для тех, у кого много регулярных платежей
                </h3>
                <p className="who2-panel-desc who2-panel-desc--purple" data-i18n="forwhom.d1">
                  Все сервисы и списания в одном месте — легко управлять и ничего не забывать.
                </p>
                <ul className="who2-panel-list">
                  <li className="who2-panel-list-item who2-panel-list-item--purple">
                    <span className="who2-panel-list-dot who2-panel-list-dot--purple" />
                    Все подписки на одном экране
                  </li>
                  <li className="who2-panel-list-item who2-panel-list-item--purple">
                    <span className="who2-panel-list-dot who2-panel-list-dot--purple" />
                    Автоматическое обнаружение дубликатов
                  </li>
                  <li className="who2-panel-list-item who2-panel-list-item--purple">
                    <span className="who2-panel-list-dot who2-panel-list-dot--purple" />
                    Экономия до 16 000 ₽ в год
                  </li>
                </ul>
              </div>
            </div>

            {/* Panel 2 */}
            <div className="who2-panel" data-panel="1" style={{background:'#e1f5ee'}}>
              <img src="/web-concept/images/who-tab-2.jpg"
                alt="" loading="lazy" className="who2-panel-img" />
              <div className="who2-panel-body">
                <span className="who2-panel-badge who2-panel-badge--green">Для семьи</span>
                <h3 className="who2-panel-title who2-panel-title--green" data-i18n="forwhom.t2">
                  Для семейного бюджета
                </h3>
                <p className="who2-panel-desc who2-panel-desc--green" data-i18n="forwhom.d2">
                  Контролируйте общие расходы и планируйте вместе с близкими без лишних споров.
                </p>
                <ul className="who2-panel-list">
                  <li className="who2-panel-list-item who2-panel-list-item--green">
                    <span className="who2-panel-list-dot who2-panel-list-dot--green" />
                    Общий обзор всех подписок семьи
                  </li>
                  <li className="who2-panel-list-item who2-panel-list-item--green">
                    <span className="who2-panel-list-dot who2-panel-list-dot--green" />
                    Напоминания до списания
                  </li>
                  <li className="who2-panel-list-item who2-panel-list-item--green">
                    <span className="who2-panel-list-dot who2-panel-list-dot--green" />
                    Планирование бюджета на месяц
                  </li>
                </ul>
              </div>
            </div>

            {/* Panel 3 */}
            <div className="who2-panel" data-panel="2" style={{background:'#1a1a2e'}}>
              <div className="who2-panel-img-wrap">
                <img src="/web-concept/images/who-tab-3.jpg"
                  alt="" loading="lazy" className="who2-panel-img" />
                <div className="who2-panel-img-fade" aria-hidden="true" />
              </div>
              <div className="who2-panel-body">
                <span className="who2-panel-badge who2-panel-badge--dark">Для бизнеса</span>
                <h3 className="who2-panel-title who2-panel-title--white" data-i18n="forwhom.t3">
                  Для фрилансеров и small business
                </h3>
                <p className="who2-panel-desc who2-panel-desc--muted" data-i18n="forwhom.d3">
                  Отслеживайте рабочие сервисы и оптимизируйте бизнес-расходы без бухгалтера.
                </p>
                <ul className="who2-panel-list">
                  <li className="who2-panel-list-item who2-panel-list-item--white">
                    <span className="who2-panel-list-dot who2-panel-list-dot--lavender" />
                    Разделение личных и рабочих расходов
                  </li>
                  <li className="who2-panel-list-item who2-panel-list-item--white">
                    <span className="who2-panel-list-dot who2-panel-list-dot--lavender" />
                    Аналитика по категориям
                  </li>
                  <li className="who2-panel-list-item who2-panel-list-item--white">
                    <span className="who2-panel-list-dot who2-panel-list-dot--lavender" />
                    Экспорт для отчётности
                  </li>
                </ul>
              </div>
            </div>

            {/* Panel 4 */}
            <div className="who2-panel" data-panel="3" style={{background:'#e1f5ee'}}>
              <img src="/web-concept/images/who-tab-4.jpg"
                alt="" loading="lazy" className="who2-panel-img" />
              <div className="who2-panel-body">
                <span className="who2-panel-badge who2-panel-badge--green">Спокойствие</span>
                <h3 className="who2-panel-title who2-panel-title--green" data-i18n="forwhom.t4">
                  Для тех, кто не хочет сюрпризов
                </h3>
                <p className="who2-panel-desc who2-panel-desc--green" data-i18n="forwhom.d4">
                  Получайте уведомления о списаниях и продлениях заранее — никаких неожиданных трат.
                </p>
                <ul className="who2-panel-list">
                  <li className="who2-panel-list-item who2-panel-list-item--green">
                    <span className="who2-panel-list-dot who2-panel-list-dot--green" />
                    Уведомление за 3 дня до списания
                  </li>
                  <li className="who2-panel-list-item who2-panel-list-item--green">
                    <span className="who2-panel-list-dot who2-panel-list-dot--green" />
                    Напоминание об окончании триала
                  </li>
                  <li className="who2-panel-list-item who2-panel-list-item--green">
                    <span className="who2-panel-list-dot who2-panel-list-dot--green" />
                    История всех платежей
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="price-section" aria-labelledby="pricing-heading">
        <div className="price-header">
          <div className="price-eyebrow">ТАРИФЫ</div>
          <h2 id="pricing-heading" className="price-title" data-i18n="pricing.title">
            Честные цены. Без сюрпризов.
          </h2>
          <p className="price-lead" data-i18n="pricing.lead">
            Сейчас SubCuro в стадии раннего доступа. Платные тарифы появятся позже, а текущих пользователей мы предупредим заранее.
          </p>
        </div>

        <div className="price-grid" role="list">
          {/* Card 1 — Старт */}
          <div className="price-card-dark" role="listitem">
            <IconRocket />
            <div className="price-card-name price-card-name--light" data-i18n="pricing.startName">Старт</div>
            <div className="price-card-price price-card-price--light">
              0 ₽<span className="price-card-price-sub">/мес</span>
            </div>
            <div className="price-card-tag price-card-tag--light" data-i18n="pricing.startTag">Для знакомства с сервисом</div>
            <div className="price-divider price-divider--dark" />
            <ul className="price-features">
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--light" data-i18n="pricing.f1">До 10 платежей</span></li>
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--light" data-i18n="pricing.f2">Базовые напоминания</span></li>
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--light" data-i18n="pricing.f3">Ручное добавление</span></li>
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--light" data-i18n="pricing.f4">Веб + мобильная версия</span></li>
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--light" data-i18n="pricing.f5">Базовая аналитика</span></li>
            </ul>
            <a href="/auth?tab=register" className="price-btn-ghost" data-i18n="pricing.startCta">
              Начать бесплатно
            </a>
          </div>

          {/* Card 2 — Pro */}
          <div className="price-card-pro" role="listitem">
            <span className="price-badge-early" data-i18n="pricing.proBadge">РАННИЙ ДОСТУП</span>
            <div className="price-card-name price-card-name--dark" data-i18n="pricing.proName">Pro</div>
            <div className="price-card-price price-card-price--dark" data-i18n="pricing.proPrice">Бесплатно сейчас</div>
            <div className="price-later" data-i18n="pricing.proLater">позже — 299 ₽/мес</div>
            <div className="price-card-tag price-card-tag--muted" data-i18n="pricing.proTag">Для активного контроля и экономии</div>
            <div className="price-divider price-divider--light" />
            <ul className="price-features">
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--dark" data-i18n="pricing.p1">Безлимит платежей</span></li>
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--dark" data-i18n="pricing.p2">Умные уведомления</span></li>
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--dark" data-i18n="pricing.p3">Очередь действий</span></li>
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--dark" data-i18n="pricing.p4">Симулятор экономии</span></li>
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--dark" data-i18n="pricing.p5">Расширенная аналитика</span></li>
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--dark" data-i18n="pricing.p6">Экспорт CSV и HTML-отчёт</span></li>
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--dark" data-i18n="pricing.p7">Синхронизация между устройствами</span></li>
            </ul>
            <a href="/auth?tab=register" className="price-btn-solid" data-i18n="pricing.proCta">
              Получить Pro бесплатно
            </a>
          </div>

          {/* Card 3 — Команда */}
          <div className="price-card-dark" role="listitem">
            <IconUsers2 />
            <span className="price-badge-soon" data-i18n="pricing.teamBadge">СКОРО</span>
            <div className="price-card-name price-card-name--light" data-i18n="pricing.teamName">Команда</div>
            <div className="price-card-price price-card-price--light" data-i18n="pricing.teamPrice">Индивидуально</div>
            <div className="price-card-tag price-card-tag--light" data-i18n="pricing.teamTag">Для семей, команд и малого бизнеса</div>
            <div className="price-divider price-divider--dark" />
            <ul className="price-features">
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--light" data-i18n="pricing.t1">Общее пространство</span></li>
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--light" data-i18n="pricing.t2">Несколько участников</span></li>
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--light" data-i18n="pricing.t3">Роли и доступы</span></li>
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--light" data-i18n="pricing.t4">Корпоративные платежи</span></li>
              <li className="price-feature-item"><IconCheckCircle /><span className="price-feature-text--light" data-i18n="pricing.t5">Отчёты для учёта</span></li>
            </ul>
            <a href="/team-request" className="price-btn-ghost" data-i18n="pricing.teamCta">
              Оставить заявку
            </a>
          </div>
        </div>

        {/* Trust row */}
        <div className="price-trust">
          <div className="price-trust-item">
            <IconLock />
            <span data-i18n="pricing.trust1">Без карты</span>
          </div>
          <div className="price-trust-item">
            <IconX />
            <span data-i18n="pricing.trust2">Можно отменить в любой момент</span>
          </div>
          <div className="price-trust-item">
            <IconShield />
            <span data-i18n="pricing.trust3">Ваши данные под защитой</span>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="faq-section" aria-labelledby="faq-heading">
        <div className="faq-heading-row">
          <span className="faq-heading-icon" aria-hidden="true">
            <IconHelpCircleFaq />
          </span>
          <h2 id="faq-heading" className="faq-heading" data-i18n="faq.title">FAQ</h2>
        </div>

        <div className="faq-list">
          {[
            {
              q: 'Что такое SubCuro?',
              a: 'SubCuro — это сервис для управления регулярными платежами: подписками, связью, интернетом и другими списаниями. Он помогает видеть все расходы в одном месте, получать напоминания и находить способы сэкономить.',
              open: true,
            },
            {
              q: 'Нужно ли подключать банк?',
              a: 'Нет. SubCuro не требует доступа к банку или картам. Вы добавляете платежи вручную или загружаете CSV-выписку. Ваши банковские данные нам не нужны и мы их не запрашиваем.',
              open: false,
            },
            {
              q: 'Данные синхронизируются между устройствами?',
              a: 'Да. Все данные хранятся в облаке и доступны на любом устройстве — в браузере и в мобильном приложении. Изменения синхронизируются в реальном времени.',
              open: false,
            },
            {
              q: 'Сколько стоит и когда появится платный тариф?',
              a: 'Сейчас SubCuro полностью бесплатен. Платные тарифы появятся позже — мы заранее предупредим всех текущих пользователей. Те, кто зарегистрировался в период раннего доступа, получат специальные условия.',
              open: false,
            },
            {
              q: 'Есть ли тариф для команд и компаний?',
              a: 'Да, тариф «Команда» находится в разработке. Он будет включать общее пространство, несколько участников, роли и корпоративные отчёты. Оставьте заявку — мы свяжемся когда он появится.',
              open: false,
            },
            {
              q: 'Как удалить аккаунт или экспортировать данные?',
              a: 'Вы можете экспортировать все данные в CSV или HTML-отчёт в разделе Настройки. Там же можно полностью удалить аккаунт — все данные будут безвозвратно удалены в течение 30 дней.',
              open: false,
            },
          ].map(({ q, a, open }, idx) => (
            <div className={`faq-item${open ? ' is-open' : ''}`} key={idx} data-faq>
              <button className="faq-q" type="button">
                <span className="faq-q-text">{q}</span>
                <IconChevronDown />
              </button>
              <div className="faq-a"><p>{a}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="footer-section" role="contentinfo">
        <div className="footer-grid">

          {/* Col 1 — Brand */}
          <div className="footer-brand">
            <div className="footer-logo-row">
              <img src="/subcuro_ribbon_s_transparent.png" width={32} height={32} alt="SubCuro" className="footer-logo-img" />
              <span className="footer-logo-text">SubCuro</span>
            </div>
            <p className="footer-tagline" data-i18n="footer.tagline">
              Контролируй регулярные платежи на любом устройстве
            </p>
            <div className="footer-apps">
              <a href="#" className="footer-app-btn" aria-label="App Store — скоро">
                <IconApple />
                <span className="footer-app-label">
                  <span className="footer-app-sub">СКОРО В</span>
                  <span className="footer-app-name">App Store</span>
                </span>
              </a>
              <a href="#" className="footer-app-btn" aria-label="Google Play — скоро">
                <IconPlay />
                <span className="footer-app-label">
                  <span className="footer-app-sub">СКОРО В</span>
                  <span className="footer-app-name">Google Play</span>
                </span>
              </a>
            </div>
          </div>

          {/* Col 2 — Продукт */}
          <div>
            <div className="footer-col-title" data-i18n="footer.product">ПРОДУКТ</div>
            <ul className="footer-links">
              <li><a href="#how-it-works" className="footer-link" data-i18n="footer.l1">Как работает</a></li>
              <li><a href="#for-whom" className="footer-link" data-i18n="footer.l2">Сценарии</a></li>
              <li><a href="#pricing" className="footer-link" data-i18n="footer.l3">Тарифы</a></li>
              <li><a href="#faq" className="footer-link" data-i18n="footer.l4">FAQ</a></li>
            </ul>
          </div>

          {/* Col 3 — Тарифы */}
          <div>
            <div className="footer-col-title" data-i18n="footer.pricing">ТАРИФЫ</div>
            <ul className="footer-links">
              <li><a href="#pricing" className="footer-link" data-i18n="footer.l5">Бесплатный</a></li>
              <li><a href="#pricing" className="footer-link" data-i18n="footer.pro">Pro</a></li>
              <li><a href="/team-request" className="footer-link" data-i18n="footer.l6">Для команд</a></li>
            </ul>
          </div>

          {/* Col 4 — Компания */}
          <div>
            <div className="footer-col-title" data-i18n="footer.company">КОМПАНИЯ</div>
            <ul className="footer-links">
              <li><a href="#" className="footer-link" data-i18n="footer.l7">О нас</a></li>
              <li><a href="#" className="footer-link" data-i18n="footer.l8">Блог</a></li>
              <li><a href="mailto:hello@subcuro.app" className="footer-link" data-i18n="footer.l9">Контакты</a></li>
              <li><a href="/privacy" className="footer-link" data-i18n="footer.l10">Политика конфиденциальности</a></li>
              <li><a href="/terms" className="footer-link" data-i18n="footer.l11">Условия использования</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copy" data-i18n="footer.copy">© 2025 SubCuro. Все права защищены.</span>
          <div className="footer-legal">
            <a href="/privacy" className="footer-legal-link" data-i18n="footer.privacy">Конфиденциальность</a>
            <a href="/terms" className="footer-legal-link" data-i18n="footer.terms">Условия</a>
          </div>
        </div>
      </footer>

      <LandingInteractions />
    </>
  )
}
