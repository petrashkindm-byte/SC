import LandingInteractions from './LandingInteractions'
import LangSwitcherWidget from './LangSwitcherWidget'

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="9" fill="#4ADE80" />
    <path d="M5 9l2.5 3L13 6" stroke="#12143D" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function LandingPage() {
  return (
    <>
      {/* ═══ NAVIGATION ═══ */}
      <nav className="nav" role="navigation" aria-label="Главная навигация">
        <div className="nav-pill">
          <a href="/" className="nav-logo" aria-label="SubCuro — главная">
            <img src="/subcuro_ribbon_s_transparent.png" className="logo-icon" alt="SubCuro логотип" />
            <span className="nav-logo-text">SubCuro</span>
          </a>

          <ul className="nav-links" role="list">
            <li><a href="#how">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2l.8 4.8L13 8l-4.2 1.2L8 14l-.8-4.8L3 8l4.2-1.2L8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              <span data-i18n="nav.how">Как работает</span>
            </a></li>
            <li><a href="#platforms">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M5 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              <span data-i18n="nav.platforms">Платформы</span>
            </a></li>
            <li><a href="#pricing">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span data-i18n="nav.pricing">Тарифы</span>
            </a></li>
            <li><a href="#faq">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M6.5 6C6.5 5.17 7.17 4.5 8 4.5s1.5.67 1.5 1.5c0 1-1.5 1.5-1.5 2.5m0 2v.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              <span data-i18n="nav.faq">FAQ</span>
            </a></li>
          </ul>

          <div className="nav-right">
            <LangSwitcherWidget />
            <a href="/auth?tab=login" className="btn-ghost" data-i18n="nav.login">Войти</a>
            <a href="/auth?tab=register" className="btn-primary" data-i18n="nav.start">Начать бесплатно</a>
            <button className="nav-hamburger" id="hamburger" aria-label="Открыть меню" aria-expanded="false">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </nav>

      <div className="nav-mobile-overlay" id="mobileNav" role="dialog" aria-label="Мобильное меню">
        <a href="#how" className="nav-mobile-link" data-i18n="nav.how">Как работает</a>
        <a href="#platforms" className="nav-mobile-link" data-i18n="nav.platforms">Платформы</a>
        <a href="#pricing" className="nav-mobile-link" data-i18n="nav.pricing">Тарифы</a>
        <a href="#faq" className="nav-mobile-link">FAQ</a>
        <a href="/auth?tab=register" className="nav-mobile-link" data-i18n="nav.start" style={{ color: '#7C4DFF' }}>Начать бесплатно</a>
      </div>

      {/* ═══ СЛАЙД 1 ═══ */}
      <section id="slide-1" className="slide1" aria-labelledby="slide1-heading">
        <div className="slide1__bg" aria-hidden="true">
          <img
            src="/web-concept/assets/hero/slide-1.png"
            alt=""
            className="slide1__bg-image"
            width={1024}
            height={576}
            decoding="async"
            fetchPriority="high"
            draggable={false}
          />
        </div>

        <div className="slide1__inner">
          <div className="slide1__content">
            <div className="slide1__badge" data-i18n-html="hero.badge">
              <span className="slide1__badge-dot" aria-hidden="true"></span>
              Веб-версия и мобильное приложение
            </div>

            <h1 id="slide1-heading" className="slide1__title" data-i18n-html="hero.title">
              <span style={{display:'block'}}>Контролируй</span>
              <span style={{display:'block'}}>регулярные платежи</span>
              <span style={{display:'block'}}>на любом устройстве</span>
            </h1>

            <p className="slide1__subtitle" data-i18n="hero.subtitle">
              SubCuro синхронизирует подписки, связь, интернет и другие регулярные платежи между веб-версией и приложением. Все списания, напоминания и решения — в одном месте.
            </p>

            <div className="slide1__ctas">
              <a href="/auth?tab=register" className="btn-primary btn-primary-lg" data-i18n="hero.ctaStart">
                Начать бесплатно
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10m-4-4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a href="/auth?tab=login" className="btn-outline btn-outline-lg" data-i18n="hero.ctaLogin">Войти в аккаунт</a>
            </div>

            <div className="slide1__features" role="list">
              <div className="slide1__feature" role="listitem">
                <div className="slide1__feature-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2L4 4.5v5c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5v-5L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                </div>
                <div className="slide1__feature-text">
                  <h3 data-i18n="hero.safeTitle">Безопасно</h3>
                  <p data-i18n="hero.safeText">Данные под защитой и не передаются третьим лицам</p>
                </div>
              </div>
              <div className="slide1__feature" role="listitem">
                <div className="slide1__feature-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 10a7 7 0 0 1 7-7m7 7a7 7 0 0 1-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M17 6l-3 1 1-3M3 14l3-1-1 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div className="slide1__feature-text">
                  <h3 data-i18n="hero.syncTitle">Синхронно</h3>
                  <p data-i18n="hero.syncText">Все устройства всегда в актуальном состоянии</p>
                </div>
              </div>
              <div className="slide1__feature" role="listitem">
                <div className="slide1__feature-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2a5 5 0 0 1 5 5v3l1.5 2.5H3.5L5 10V7a5 5 0 0 1 5-5zm0 16a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                </div>
                <div className="slide1__feature-text">
                  <h3 data-i18n="hero.remindTitle">Напоминания</h3>
                  <p data-i18n="hero.remindText">Ничего не забудете — мы напомним вовремя</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="stats-stage-section" id="stats" aria-labelledby="stats-heading">
        <div className="stats-stage-wrap">
          <div className="stats-stage-board">
            <img className="stats-stage-bg" src="/web-concept/images/79d643df-74bd-449c-ae0c-71cc4c36e6a1.png" alt="" draggable={false} />
            <h2 id="stats-heading" className="sr-only">Ключевые показатели регулярных платежей</h2>
            <div className="stats-stage-grid" role="list">
              <article className="stats-stage-item" role="listitem">
                <div className="stats-stage-value">~4 700 ₽</div>
                <p className="stats-stage-copy">в среднем уходит в месяц<br />на регулярные платежи</p>
              </article>
              <article className="stats-stage-item" role="listitem">
                <div className="stats-stage-value">37%</div>
                <p className="stats-stage-copy">регулярных списаний<br />используются реже, чем кажется</p>
              </article>
              <article className="stats-stage-item" role="listitem">
                <div className="stats-stage-value">12+</div>
                <p className="stats-stage-copy">активных регулярных платежей<br />у среднего пользователя</p>
              </article>
              <article className="stats-stage-item" role="listitem">
                <div className="stats-stage-value">16 000 ₽</div>
                <p className="stats-stage-copy">можно сэкономить в год<br />за счёт пересмотра лишних платежей</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ПЛАТФОРМЫ ═══ */}
      <section className="workstage-section" id="platforms" aria-labelledby="workstage-heading">
        <div className="workstage-bg" aria-hidden="true" />
        <div className="workstage-inner">
          <div className="workstage-left">
            <div className="workstage-badge">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1l.9 3.1L10 5l-3.1.9L6 9l-.9-3.1L2 5l3.1-.9L6 1z" fill="#53D98D" />
              </svg>
              Платформы
            </div>
            <h2 id="workstage-heading" className="workstage-title">Работай в браузере и в телефоне без разрыва</h2>
            <p className="workstage-desc">SubCuro синхронизирует данные между всеми устройствами. Регулярные платежи, напоминания и очередь действий — всегда под рукой, где бы вы ни были.</p>

            <div className="ws-cards" role="list">
              <article className="ws-card" role="listitem">
                <div className="ws-card-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2L4 4.5v5c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5v-5L10 2z" stroke="#7C4DFF" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                </div>
                <div className="ws-card-body">
                  <h3 className="ws-card-title">Безопасно</h3>
                  <p className="ws-card-text">Данные под защитой и не передаются третьим лицам</p>
                </div>
              </article>
              <article className="ws-card" role="listitem">
                <div className="ws-card-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 10a7 7 0 0 1 7-7m7 7a7 7 0 0 1-7 7" stroke="#7C4DFF" strokeWidth="1.5" strokeLinecap="round" /><path d="M17 6l-3 1 1-3M3 14l3-1-1 3" stroke="#7C4DFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div className="ws-card-body">
                  <h3 className="ws-card-title">Синхронно</h3>
                  <p className="ws-card-text">Все устройства в актуальном состоянии</p>
                </div>
              </article>
              <article className="ws-card" role="listitem">
                <div className="ws-card-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2a5 5 0 0 1 5 5v3l1.5 2.5H3.5L5 10V7a5 5 0 0 1 5-5zm0 16a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2z" stroke="#7C4DFF" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                </div>
                <div className="ws-card-body">
                  <h3 className="ws-card-title">Напоминания</h3>
                  <p className="ws-card-text">Ничего не забудете — напомним вовремя</p>
                </div>
              </article>
            </div>

            <div className="ws-proof">
              <div className="ws-proof-star" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z" fill="#42D392" /></svg>
              </div>
              <div className="ws-proof-body">
                <p className="ws-proof-value">12 847</p>
                <p className="ws-proof-copy">пользователей уже доверяют<br />управлению платежами в SubCuro</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ═══ КАК РАБОТАЕТ ═══ */}
      <section className="how-slide-section" id="how" aria-labelledby="how-slide-heading">
        <div className="how-slide-board">
          <img
            className="how-slide-bg"
            src="/web-concept/images/how-slide-3-steps.png"
            alt=""
            width={1024}
            height={576}
            decoding="async"
            draggable={false}
          />
          <div className="how-slide-overlay">
            <div className="how-slide-copy">
              <div className="how-slide-badge">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M6 1l.9 3.1L10 5l-3.1.9L6 9l-.9-3.1L2 5l3.1-.9L6 1z" fill="currentColor" />
                </svg>
                Как это работает
              </div>
              <h2 id="how-slide-heading" className="how-slide-title">Три шага до полного контроля</h2>
              <p className="how-slide-desc">Начни прямо сейчас — настройка занимает меньше минуты.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ВОЗМОЖНОСТИ ═══ */}
      <section className="features-slide-section" id="features" aria-labelledby="features-slide-heading">
        <div className="features-slide-bg" aria-hidden="true" />
        <div className="features-split-inner">
          <div className="features-split-left">
            <div className="features-slide-badge">
              <span className="features-slide-badge-plus" aria-hidden="true">+</span>
              Возможности
            </div>
            <h2 id="features-slide-heading" className="features-slide-title">Всё необходимое под одной крышей</h2>
            <p className="features-slide-lead">
              SubCuro объединяет аналитику, календарь и умные инструменты, чтобы вы контролировали регулярные платежи и расходы без лишней рутины.
            </p>
            <ul className="features-slide-grid" role="list">
              <li className="features-slide-item" role="listitem">
                <div className="features-slide-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 1010 942.8476" fill="#7C4DFF" xmlns="http://www.w3.org/2000/svg">
                    <rect y="389.271" width="158.2031" height="553.5766"/><rect x="567.8984" y="389.271" width="158.1416" height="553.5766"/><rect x="851.8174" y="264.9936" width="158.1826" height="677.854"/><rect x="283.96" y="566.2754" width="158.1411" height="376.5722"/>
                    <path d="M79.0708,231.2529c13.644,0,24.7197-11.0552,24.7197-24.6992c0-13.603-11.0757-24.6582-24.7197-24.6582c-13.624,0-24.6582,11.0552-24.6582,24.6582C54.4126,220.1977,65.4468,231.2529,79.0708,231.2529z"/>
                    <path d="M79.0708,285.6245c43.6245,0,79.1323-35.4258,79.1323-79.0708c0-43.604-35.5078-79.0708-79.1323-79.0708C35.4873,127.4829,0,162.9497,0,206.5537C0,250.1987,35.4873,285.6245,79.0708,285.6245z M79.0708,160.4018c25.4595,0,46.1929,20.7129,46.1929,46.1519c0,25.48-20.7334,46.1929-46.1929,46.1929c-25.46,0-46.1313-20.7129-46.1313-46.1929C32.9395,181.1147,53.6108,160.4018,79.0708,160.4018z"/>
                    <path d="M363.0303,398.8051c-13.6031,0-24.6582,11.0552-24.6582,24.6583c0,13.6445,11.0551,24.6997,24.6582,24.6997c13.603,0,24.6992-11.0552,24.6992-24.6997C387.7295,409.8603,376.6333,398.8051,363.0303,398.8051z"/>
                    <path d="M363.0303,344.352c-43.6245,0-79.0703,35.4663-79.0703,79.1114c0,43.604,35.4458,79.0708,79.0703,79.0708c43.604,0,79.0708-35.4668,79.0708-79.0708C442.1011,379.8183,406.6343,344.352,363.0303,344.352z M363.0303,469.6152c-25.439,0-46.1519-20.6719-46.1519-46.1518c0-25.439,20.7129-46.1519,46.1519-46.1519c25.4184,0,46.1518,20.7129,46.1518,46.1519C409.1821,448.9433,388.4487,469.6152,363.0303,469.6152z"/>
                    <path d="M646.9697,123.291c-13.624,0-24.6992,11.0552-24.6992,24.6992c0,13.6445,11.0752,24.6997,24.6992,24.6997c13.6436,0,24.6787-11.0552,24.6787-24.6997C671.6484,134.3462,660.6133,123.291,646.9697,123.291z"/>
                    <path d="M646.9697,68.9199c-43.624,0-79.0713,35.4668-79.0713,79.0293c0,43.645,35.4473,79.1118,79.0713,79.1118c43.583,0,79.0703-35.4668,79.0703-79.1118C726.04,104.3867,690.5527,68.9199,646.9697,68.9199z M646.9697,194.1425c-25.4599,0-46.1728-20.7128-46.1728-46.1933c0-25.439,20.7129-46.1108,46.1728-46.1108c25.4385,0,46.1924,20.6718,46.1924,46.1108C693.1621,173.4297,672.4082,194.1425,646.9697,194.1425z"/>
                    <path d="M160.2783,246.0068c-6.7397,13.8086-16.8291,25.6445-29.2817,34.4395L277.1787,395.312c4.8906-14.7539,13.4595-27.8228,24.6377-38.1377L160.2783,246.0068z"/>
                    <path d="M572.0293,198.4165L414.8125,349.4887c12.4937,8.795,22.624,20.6309,29.3638,34.4395l161.7993-155.5107C592.29,221.4306,580.5566,211.0742,572.0293,198.4165z"/>
                    <path d="M903.8047,94.77l15.0625,48.0835L1008.623,36.33L874.1543,0l16.1299,51.6181l-163.792,53.4668c6.9453,12.7813,10.8906,27.3706,10.8906,42.8643c0,0.4111-0.0615,0.8223-0.0615,1.1919L903.8047,94.77z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="features-slide-item-title">Аналитика регулярных трат</h3>
                  <p className="features-slide-item-text">Наглядно видно, куда уходят деньги. Тренды и сравнение периодов. Экспорт в CSV.</p>
                </div>
              </li>
              <li className="features-slide-item" role="listitem">
                <div className="features-slide-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 485.213 485.212" fill="#7C4DFF" xmlns="http://www.w3.org/2000/svg">
                    <path d="M60.652,75.816V15.163C60.652,6.781,67.433,0,75.817,0c8.38,0,15.161,6.781,15.161,15.163v60.653c0,8.38-6.781,15.161-15.161,15.161C67.433,90.978,60.652,84.196,60.652,75.816z M318.424,90.978c8.378,0,15.163-6.781,15.163-15.161V15.163C333.587,6.781,326.802,0,318.424,0c-8.382,0-15.168,6.781-15.168,15.163v60.653C303.256,84.196,310.042,90.978,318.424,90.978z M485.212,363.906c0,66.996-54.312,121.307-121.303,121.307c-66.986,0-121.302-54.311-121.302-121.307c0-66.986,54.315-121.3,121.302-121.3C430.9,242.606,485.212,296.919,485.212,363.906z M454.89,363.906c0-50.161-40.81-90.976-90.98-90.976c-50.166,0-90.976,40.814-90.976,90.976c0,50.171,40.81,90.98,90.976,90.98C414.08,454.886,454.89,414.077,454.89,363.906z M121.305,181.955H60.652v60.651h60.653V181.955z M60.652,333.584h60.653V272.93H60.652V333.584z M151.629,242.606h60.654v-60.651h-60.654V242.606z M151.629,333.584h60.654V272.93h-60.654V333.584z M30.328,360.891V151.628h333.582v60.653h30.327V94c0-18.421-14.692-33.349-32.843-33.349h-12.647v15.166c0,16.701-13.596,30.325-30.322,30.325c-16.731,0-30.326-13.624-30.326-30.325V60.651H106.14v15.166c0,16.701-13.593,30.325-30.322,30.325c-16.733,0-30.327-13.624-30.327-30.325V60.651H32.859C14.707,60.651,0.001,75.579,0.001,94v266.892c0,18.36,14.706,33.346,32.858,33.346h179.424v-30.331H32.859C31.485,363.906,30.328,362.487,30.328,360.891z M303.256,242.606v-60.651h-60.648v60.651H303.256z M409.399,363.906h-45.49v-45.49c0-8.377-6.781-15.158-15.163-15.158s-15.159,6.781-15.159,15.158v60.658c0,8.378,6.777,15.163,15.159,15.163h60.653c8.382,0,15.163-6.785,15.163-15.163C424.562,370.692,417.781,363.906,409.399,363.906z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="features-slide-item-title">Календарь платежей</h3>
                  <p className="features-slide-item-text">Все списания и продления — на одной шкале времени.</p>
                </div>
              </li>
              <li className="features-slide-item" role="listitem">
                <div className="features-slide-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 32 32" fill="#7C4DFF" xmlns="http://www.w3.org/2000/svg">
                    <path d="M28,28H4a2.0021,2.0021,0,0,1-2-2V21H4v5H28V21h2v5A2.0021,2.0021,0,0,1,28,28Z"/>
                    <rect height="2" width="18" x="7" y="21"/><rect height="2" width="18" x="7" y="16"/><rect height="2" width="18" x="7" y="11"/><rect height="2" width="18" x="7" y="6"/>
                  </svg>
                </div>
                <div>
                  <h3 className="features-slide-item-title">Очередь действий</h3>
                  <p className="features-slide-item-text">Подсказки: что отключить, пересмотреть или оставить — с оценкой экономии.</p>
                </div>
              </li>
              <li className="features-slide-item" role="listitem">
                <div className="features-slide-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 32 32" fill="#7C4DFF" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.876 21.464l8.732-8.732-1.532-1.532-7.2 7.149-2.809-2.809-1.532 1.532 4.341 4.392zM16.071 4l9.804 4.392v6.536c0 6.026-4.187 11.694-9.804 13.072-5.617-1.379-9.804-7.047-9.804-13.072v-6.536l9.804-4.391z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="features-slide-item-title">Приватность</h3>
                  <p className="features-slide-item-text">Данные под защитой; доступ к банкам не храним. Данные только те, что вы ввели сами.</p>
                </div>
              </li>
              <li className="features-slide-item" role="listitem">
                <div className="features-slide-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 401.987 401.987" fill="#7C4DFF" xmlns="http://www.w3.org/2000/svg">
                    <path d="M345.176,382.016l-9.996-45.392c-0.567-2.669-1.995-4.668-4.284-5.995c-2.475-1.335-4.948-1.52-7.42-0.568l-1.43,0.568l-3.43,0.855c-1.525,0.376-3.285,0.808-5.283,1.283c-1.999,0.476-4.326,0.948-6.995,1.427c-2.655,0.476-5.476,0.907-8.419,1.287c-2.949,0.373-6.132,0.712-9.561,0.999c-3.43,0.281-6.852,0.425-10.281,0.425c-24.174,0-45.922-6.517-65.239-19.555c-19.32-13.042-33.548-30.696-42.683-52.961h110.486c2.098,0,4.001-0.712,5.708-2.143c1.719-1.424,2.766-3.183,3.139-5.284l6.852-31.977c0.574-2.847,0-5.42-1.708-7.706c-1.903-2.286-4.288-3.43-7.139-3.43h-131.04c-0.571-12.942-0.571-22.934,0-29.978h139.325c5.144,0,8.186-2.472,9.137-7.421l6.852-32.548c0.567-2.664-0.089-5.136-1.999-7.422c-1.707-2.284-4.086-3.431-7.132-3.431h-133.62c9.517-21.317,23.791-38.066,42.827-50.248c19.034-12.185,40.542-18.274,64.524-18.274c0.764-0.38,3.569-0.284,8.419,0.286c4.853,0.568,7.618,0.808,8.281,0.712c0.657-0.094,3.142,0.193,7.42,0.855c4.284,0.666,6.427,1,6.427,1l4.996,0.998c1.431,0.288,2.525,0.522,3.285,0.715l1.143,0.284c2.472,0.765,4.75,0.525,6.852-0.711c2.095-1.241,3.429-3.094,4.001-5.568l12.278-45.395c0.568-2.475,0.28-4.759-0.855-6.852c-1.715-2.288-3.621-3.715-5.715-4.284C315.39,2.19,296.92,0,277.51,0c-42.641,0-80.751,12.185-114.347,36.545c-33.595,24.362-56.77,56.532-69.523,96.501H65.663c-2.666,0-4.853,0.855-6.567,2.568c-1.709,1.711-2.568,3.901-2.568,6.567v32.548c0,2.664,0.856,4.854,2.568,6.563c1.715,1.715,3.905,2.568,6.567,2.568h19.13c-0.575,9.139-0.666,19.126-0.288,29.981H65.663c-2.474,0-4.615,0.903-6.423,2.711c-1.807,1.807-2.712,3.949-2.712,6.42v32.264c0,2.478,0.905,4.613,2.712,6.427c1.809,1.808,3.949,2.704,6.423,2.704h27.124c11.991,42.064,34.643,75.52,67.952,100.357c33.311,24.846,72.235,37.261,116.771,37.261c3.62,0,7.282-0.089,10.995-0.287c3.72-0.191,7.187-0.479,10.424-0.855c3.234-0.377,6.424-0.801,9.565-1.28c3.138-0.479,5.995-0.947,8.562-1.431c2.57-0.472,4.997-0.947,7.279-1.42c2.286-0.482,4.332-0.999,6.143-1.574c1.807-0.564,3.323-0.996,4.565-1.276c1.239-0.287,2.238-0.626,2.994-0.999l1.431-0.288c2.095-0.76,3.713-2.142,4.853-4.144C345.464,386.444,345.744,384.299,345.176,382.016z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="features-slide-item-title">Мультивалюта</h3>
                  <p className="features-slide-item-text">₽, $, € — в одном окне с актуальными курсами.</p>
                </div>
              </li>
              <li className="features-slide-item" role="listitem">
                <div className="features-slide-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#7C4DFF" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.3,22h-.1a10.31,10.31,0,0,1-7.34-3.15,10.46,10.46,0,0,1-.26-14,10.13,10.13,0,0,1,4-2.74,1,1,0,0,1,1.06.22,1,1,0,0,1,.24,1,8.4,8.4,0,0,0,1.94,8.81,8.47,8.47,0,0,0,8.83,1.94,1,1,0,0,1,1.27,1.29A10.16,10.16,0,0,1,19.6,19,10.28,10.28,0,0,1,12.3,22Z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="features-slide-item-title">Тёмная тема</h3>
                  <p className="features-slide-item-text">Светлая, системная или тёмная — как вам удобно.</p>
                </div>
              </li>
            </ul>
            <div className="features-slide-cta">
              <a href="/auth?tab=register" className="features-slide-btn">
                <span className="features-slide-btn-plus" aria-hidden="true">+</span>
                Начать бесплатно
              </a>
              <p className="features-slide-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="#42D392" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Без карты. Без риска.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ДЛЯ КОГО ═══ */}
      <section className="forwhom-section" id="forwhom" aria-label="Для кого SubCuro">
        <div className="forwhom-inner">
          <header className="forwhom-header">
            <div className="forwhom-header-lead">
              <div className="forwhom-badge" data-i18n="forwhom.badge">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M6 1l.9 3.1L10 5l-3.1.9L6 9l-.9-3.1L2 5l3.1-.9L6 1z" fill="#53D98D" />
                </svg>
                Для каждого сценария
              </div>
              <h2 className="forwhom-title" data-i18n="forwhom.title">Для кого SubCuro</h2>
              <p className="forwhom-desc" data-i18n="forwhom.desc">SubCuro помогает навести порядок в регулярных платежах, экономить и контролировать расходы без лишних усилий.</p>
            </div>
          </header>

          <div className="forwhom-board">
            <div className="forwhom-bg" aria-hidden="true" />
            <div className="forwhom-hz forwhom-hz--1" role="listitem" />
            <div className="forwhom-hz forwhom-hz--2" role="listitem" />
            <div className="forwhom-hz forwhom-hz--3" role="listitem" />
            <div className="forwhom-hz forwhom-hz--4" role="listitem" />
          </div>
        </div>
      </section>

      {/* ═══ ТАРИФЫ ═══ */}
      <section className="pricing-section" id="pricing" aria-labelledby="pricing-heading">
        <div className="pricing-inner">
          <header className="pricing-header">
            <p className="pricing-eyebrow">Тарифы</p>
            <h2 id="pricing-heading" className="pricing-title">Честные цены. Без сюрпризов.</h2>
            <p className="pricing-lead">
              Сейчас SubCuro в стадии раннего доступа. Платные тарифы появятся позже, а текущих пользователей мы предупредим заранее.
            </p>
          </header>

          <div className="pricing-grid" role="list">
            {/* Старт */}
            <article className="pricing-card pricing-card--dark" role="listitem">
              <div className="pricing-card-deco pricing-card-deco--waves" aria-hidden="true">
                <svg viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 40c30-20 50 20 80 0s50-20 80 0 40-15 40-15v55H0V40z" fill="rgba(255,255,255,0.04)" /><path d="M0 52c25-12 45 12 70 0s55-18 90-2 40 8 40 8v22H0V52z" fill="rgba(255,255,255,0.03)" /></svg>
              </div>
              <div className="pricing-card-top">
                <span className="pricing-card-icon" aria-hidden="true">
                  <img className="pricing-card-icon-img" src="/web-concept/assets/pricing/rocket-start.png?v=76d504a2" width={28} height={28} alt="" decoding="async" />
                </span>
                <h3 className="pricing-card-name">Старт</h3>
                <p className="pricing-card-price">0 ₽/мес</p>
                <p className="pricing-card-tagline">Для знакомства с сервисом</p>
              </div>
              <hr className="pricing-card-rule" />
              <ul className="pricing-features">
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> До 10 платежей</li>
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Базовые напоминания</li>
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Ручное добавление</li>
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Веб + мобильная версия</li>
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Базовая аналитика</li>
              </ul>
              <a href="/auth?tab=register" className="pricing-btn pricing-btn--outline-light">Начать бесплатно</a>
            </article>

            {/* Pro */}
            <article className="pricing-card pricing-card--pro" role="listitem">
              <span className="pricing-badge pricing-badge--early">Ранний доступ</span>
              <div className="pricing-card-top">
                <h3 className="pricing-card-name pricing-card-name--dark">Pro</h3>
                <p className="pricing-card-price pricing-card-price--dark">Бесплатно сейчас</p>
                <p className="pricing-card-later">позже — 299 ₽/мес</p>
                <p className="pricing-card-tagline pricing-card-tagline--muted">Для активного контроля и экономии</p>
              </div>
              <hr className="pricing-card-rule pricing-card-rule--light" />
              <ul className="pricing-features pricing-features--dark">
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Безлимит платежей</li>
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Умные уведомления</li>
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Очередь действий</li>
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Симулятор экономии</li>
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Расширенная аналитика</li>
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Экспорт CSV и HTML-отчёт</li>
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Синхронизация между устройствами</li>
              </ul>
              <a href="/auth?tab=register" className="pricing-btn pricing-btn--solid">Получить Pro бесплатно</a>
            </article>

            {/* Команда */}
            <article className="pricing-card pricing-card--dark" role="listitem">
              <div className="pricing-card-deco pricing-card-deco--people" aria-hidden="true">
                <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="38" r="22" fill="rgba(255,255,255,0.04)" /><circle cx="28" cy="52" r="14" fill="rgba(255,255,255,0.03)" /><circle cx="92" cy="52" r="14" fill="rgba(255,255,255,0.03)" /></svg>
              </div>
              <div className="pricing-card-top">
                <span className="pricing-card-icon" aria-hidden="true">
                  <img className="pricing-card-icon-img pricing-card-icon-img--team" src="/web-concept/assets/pricing/users-group.png?v=4aae616f" width={28} height={22} alt="" decoding="async" />
                </span>
                <span className="pricing-badge pricing-badge--soon">Скоро</span>
                <h3 className="pricing-card-name">Команда</h3>
                <p className="pricing-card-price">Индивидуально</p>
                <p className="pricing-card-tagline">Для семей, команд и малого бизнеса</p>
              </div>
              <hr className="pricing-card-rule" />
              <ul className="pricing-features">
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Общее пространство</li>
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Несколько участников</li>
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Роли и доступы</li>
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Корпоративные платежи</li>
                <li><span className="pricing-check" aria-hidden="true"><CheckIcon /></span> Отчёты для учёта</li>
              </ul>
              <a href="/team-request" className="pricing-btn pricing-btn--outline-light">Оставить заявку</a>
            </article>
          </div>

          <div className="pricing-trust" role="list">
            <div className="pricing-trust-item" role="listitem">
              <span className="pricing-trust-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M9 11V9a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><rect x="8" y="11" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" /></svg>
              </span>
              <span>Без карты</span>
            </div>
            <span className="pricing-trust-div" aria-hidden="true"></span>
            <div className="pricing-trust-item" role="listitem">
              <span className="pricing-trust-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" /><path d="M8 8l8 8m0-8L8 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </span>
              <span>Можно отменить в любой момент</span>
            </div>
            <span className="pricing-trust-div" aria-hidden="true"></span>
            <div className="pricing-trust-item" role="listitem">
              <span className="pricing-trust-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 4v5c0 4-2.5 7.5-7 9-4.5-1.5-7-5-7-9V7l7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span>Ваши данные под защитой</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="faq-section" id="faq" aria-labelledby="faq-heading">
        <div className="faq-inner">
          <header className="faq-header">
            <div className="faq-title-row">
              <span className="faq-title-icon" aria-hidden="true">?</span>
              <h2 id="faq-heading" className="faq-title">FAQ</h2>
            </div>
          </header>
          <div className="faq-list">
            {[
              { q: 'Что такое SubCuro?', a: 'SubCuro помогает видеть все регулярные платежи и подписки в одном месте: веб и приложение синхронизированы, есть напоминания, аналитика и подсказки по экономии — без хаоса в таблицах и заметках.' },
              { q: 'Нужно ли подключать банк?', a: 'Нет. Достаточно ввести или импортировать данные вручную или из выписки (CSV). Мы не храним доступ к вашим банкам и не списываем деньги — только то, что вы сами добавили для учёта.' },
              { q: 'Данные синхронизируются между устройствами?', a: 'Да. Подписки, напоминания и очередь действий доступны в веб-версии и в мобильном приложении: изменения на одном устройстве отображаются на остальных после синхронизации.' },
              { q: 'Сколько стоит и когда появится платный тариф?', a: 'Сейчас действует ранний доступ: Pro доступен бесплатно. Платные тарифы появятся позже — мы заранее предупредим и ничего не спишем без вашего согласия.' },
              { q: 'Есть ли тариф для команд и компаний?', a: 'Тариф «Команда» в разработке. Можно оставить заявку — опишите компанию и задачи, мы свяжемся, когда появится корпоративное предложение.' },
              { q: 'Как удалить аккаунт или экспортировать данные?', a: 'Экспорт доступен в продукте (в том числе CSV). Удаление аккаунта и вопросы по данным можно оформить через настройки профиля или обратившись в поддержку — ссылки появятся в приложении и в веб-версии.' },
            ].map(({ q, a }) => (
              <div className="faq-item" key={q}>
                <button type="button" className="faq-question">
                  {q}
                  <span className="faq-chevron" aria-hidden="true">▼</span>
                </button>
                <div className="faq-answer">
                  <div className="faq-answer-inner">{a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="/" className="footer-logo">
                <img src="/subcuro_ribbon_s_transparent.png" width={30} height={30} alt="SubCuro" />
                <span className="footer-logo-text">SubCuro</span>
              </a>
              <p className="footer-tagline">Контролируй регулярные платежи на любом устройстве</p>
              <div className="footer-apps">
                <a href="#" className="app-store-btn" aria-label="Скачать в App Store">
                  <span className="app-store-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg"><path fill="#ffffff" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" /></svg>
                  </span>
                  <div className="app-store-text">
                    <small>Скачать в</small>
                    <strong>App Store</strong>
                  </div>
                </a>
                <a href="#" className="app-store-btn" aria-label="Доступно в Google Play">
                  <span className="app-store-icon" aria-hidden="true">
                    <img src="/web-concept/assets/branding/google-play.png" width={22} height={22} alt="" />
                  </span>
                  <div className="app-store-text">
                    <small>Доступно в</small>
                    <strong>Google Play</strong>
                  </div>
                </a>
              </div>
            </div>
            <div>
              <div className="footer-col-title">Продукт</div>
              <ul className="footer-links">
                <li><a href="#how">Как работает</a></li>
                <li><a href="#platforms">Платформы</a></li>
                <li><a href="#pricing">Тарифы</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Тарифы</div>
              <ul className="footer-links">
                <li><a href="#pricing">Бесплатный</a></li>
                <li><a href="#pricing">Pro</a></li>
                <li><a href="/team-request">Для команд</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Компания</div>
              <ul className="footer-links">
                <li><a href="#">О нас</a></li>
                <li><a href="#">Блог</a></li>
                <li><a href="#">Контакты</a></li>
                <li><a href="/privacy">Политика конфиденциальности</a></li>
                <li><a href="/terms">Условия использования</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2025 SubCuro. Все права защищены.</div>
            <div className="footer-legal">
              <a href="/privacy">Конфиденциальность</a>
              <a href="/terms">Условия</a>
            </div>
          </div>
        </div>
      </footer>

      <LandingInteractions />
    </>
  )
}
