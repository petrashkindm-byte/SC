'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Lang = 'ru' | 'en'
type Loc = Record<Lang, string>

/* ── Data (service names & promo codes are NOT localized) ── */
type PromoItem = {
  id: string
  serviceName: string
  category: 'eco' | 'movies'
  offer: Loc
  promoCode: string
  audience: Loc
  validUntil: Loc
  dealUrl: string
}

const PROMOS: PromoItem[] = [
  {
    id: 'yp-1',
    serviceName: 'Яндекс Плюс',
    category: 'eco',
    offer: { ru: '45 дней бесплатно', en: '45 days free' },
    promoCode: 'PLUS45',
    audience: { ru: 'Для новых пользователей', en: 'For new users' },
    validUntil: { ru: 'До 30 июня', en: 'Until June 30' },
    dealUrl: 'https://plus.yandex.ru/action/promokody/',
  },
  {
    id: 'yp-2',
    serviceName: 'Яндекс Плюс',
    category: 'eco',
    offer: { ru: '30 дней за 1 ₽', en: '30 days for ₽1' },
    promoCode: 'PLUS30',
    audience: { ru: 'Без активной подписки', en: 'No active subscription' },
    validUntil: { ru: 'До 30 июня', en: 'Until June 30' },
    dealUrl: 'https://plus.yandex.ru/action/promokody/',
  },
  {
    id: 'kp-1',
    serviceName: 'Кинопоиск',
    category: 'movies',
    offer: { ru: 'До 45 дней подписки', en: 'Up to 45 days' },
    promoCode: '22GNQSLUUV',
    audience: { ru: 'Для новых пользователей', en: 'For new users' },
    validUntil: { ru: 'До 30 июня', en: 'Until June 30' },
    dealUrl: 'https://hd.kinopoisk.ru',
  },
  {
    id: 'ivi-1',
    serviceName: 'Иви',
    category: 'movies',
    offer: { ru: '40 дней подписки', en: '40 days of subscription' },
    promoCode: 'Promokodi40',
    audience: { ru: 'Условия при активации', en: 'Terms apply at activation' },
    validUntil: { ru: 'До 31 июля', en: 'Until July 31' },
    dealUrl: 'https://www.ivi.ru',
  },
  {
    id: 'ivi-2',
    serviceName: 'Иви',
    category: 'movies',
    offer: { ru: '+1 месяц подписки', en: '+1 month of subscription' },
    promoCode: 'firstfilm',
    audience: { ru: 'Условия при активации', en: 'Terms apply at activation' },
    validUntil: { ru: 'До 1 июля', en: 'Until July 1' },
    dealUrl: 'https://www.ivi.ru',
  },
]

/* ── UI strings (shared wording matches the landing) ── */
const STR = {
  ru: {
    breadcrumb: 'Промокоды',
    login: 'Войти',
    start: 'Начать бесплатно',
    h1: 'Промокоды на подписки',
    sub: 'Актуальные коды и предложения на популярные сервисы. Получили промокод — добавьте подписку в SubCuro, чтобы не забыть о списании.',
    meta: (n: number) => `Обновлено 16 июня · ${n} актуальных предложений`,
    codeLabel: 'ПРОМОКОД',
    copy: 'Скопировать',
    copied: 'Скопировано',
    get: 'Получить',
    add: 'Добавить в SubCuro',
    trust1: 'Проверяем условия и указываем срок действия',
    trust2: 'Добавьте подписку в SubCuro — напомним до первого списания',
    trust3: 'Только предложения с понятными условиями',
    ctaH2: 'Получили промокод?',
    ctaDesc: 'Добавьте подписку в SubCuro и получите напоминание до первого списания.',
    ctaBtn: 'Добавить подписку',
    cat: { eco: 'Экосистема', movies: 'Кино' } as Record<PromoItem['category'], string>,
    footer: {
      tagline: 'Контролируй регулярные платежи на любом устройстве',
      product: 'ПРОДУКТ', pricing: 'ТАРИФЫ', company: 'КОМПАНИЯ',
      how: 'Как работает', scenarios: 'Сценарии', pricingLink: 'Тарифы', faq: 'FAQ', promo: 'Промокоды',
      free: 'Бесплатный', pro: 'Pro', teams: 'Для команд',
      contacts: 'Контакты', privacyPolicy: 'Политика конфиденциальности', termsOfUse: 'Условия использования',
      copy: '© 2025 SubCuro. Все права защищены.', privacy: 'Конфиденциальность', terms: 'Условия',
    },
  },
  en: {
    breadcrumb: 'Promo codes',
    login: 'Sign in',
    start: 'Get started free',
    h1: 'Subscription promo codes',
    sub: 'Up-to-date codes and deals for popular services. Got a promo code? Add the subscription to SubCuro so you don’t forget about the charge.',
    meta: (n: number) => `Updated June 16 · ${n} active deals`,
    codeLabel: 'PROMO CODE',
    copy: 'Copy',
    copied: 'Copied',
    get: 'Get deal',
    add: 'Add to SubCuro',
    trust1: 'We verify terms and show expiry dates',
    trust2: 'Add a subscription to SubCuro — we’ll remind you before the first charge',
    trust3: 'Only deals with clear terms',
    ctaH2: 'Got a promo code?',
    ctaDesc: 'Add the subscription to SubCuro and get a reminder before the first charge.',
    ctaBtn: 'Add subscription',
    cat: { eco: 'Ecosystem', movies: 'Movies' } as Record<PromoItem['category'], string>,
    footer: {
      tagline: 'Control recurring payments on any device',
      product: 'PRODUCT', pricing: 'PRICING', company: 'COMPANY',
      how: 'How it works', scenarios: 'Scenarios', pricingLink: 'Pricing', faq: 'FAQ', promo: 'Promo codes',
      free: 'Free', pro: 'Pro', teams: 'For teams',
      contacts: 'Contacts', privacyPolicy: 'Privacy Policy', termsOfUse: 'Terms of Use',
      copy: '© 2025 SubCuro. All rights reserved.', privacy: 'Privacy', terms: 'Terms',
    },
  },
} as const

/* ── Icons ── */
const IcoExternal = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)
const IcoCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)
const IcoCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IcoArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
)
const IcoShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IcoBellSm = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)
const IcoCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

/* ── PromoCard ── */
function PromoCard({ promo, lang }: { promo: PromoItem; lang: Lang }) {
  const t = STR[lang]
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    let ok = false
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(promo.promoCode)
        ok = true
      }
    } catch { /* fall through to legacy copy */ }
    if (!ok) {
      try {
        const el = document.createElement('textarea')
        el.value = promo.promoCode
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      } catch { /* clipboard unavailable; still show feedback */ }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <article className="promo-card">
      <div className="promo-card-head">
        <span className="promo-card-category">{t.cat[promo.category]}</span>
      </div>

      <div>
        <div className="promo-card-service">{promo.serviceName}</div>
        <div className="promo-card-offer">{promo.offer[lang]}</div>
      </div>

      <div
        className="promo-card-code-field"
        role="button"
        tabIndex={0}
        onClick={() => handleCopy()}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleCopy()}
        aria-label={`${t.copy}: ${promo.promoCode}`}
      >
        <span className="promo-card-code-inner">
          <span className="promo-card-code-label">{t.codeLabel}</span>
          <span className="promo-card-code-text">{promo.promoCode}</span>
        </span>
        <button
          type="button"
          className={`promo-card-copy${copied ? ' is-copied' : ''}`}
          onClick={handleCopy}
          aria-label={copied ? t.copied : t.copy}
        >
          {copied ? <IcoCheck /> : <IcoCopy />}
          <span>{copied ? t.copied : t.copy}</span>
        </button>
      </div>

      <div className="promo-card-meta-row">
        <span className="promo-meta-chip">{promo.audience[lang]}</span>
        <span className="promo-meta-chip promo-meta-chip--date">{promo.validUntil[lang]}</span>
      </div>

      <div className="promo-card-actions">
        <a href={promo.dealUrl} target="_blank" rel="noopener noreferrer" className="promo-card-btn-primary">
          {t.get} <IcoExternal />
        </a>
        <a href="/auth?tab=register" className="promo-card-btn-secondary">
          {t.add}
        </a>
      </div>
    </article>
  )
}

/* ── Page ── */
export default function DealsPage() {
  // Language is chosen on the landing (no switcher here); read the persisted choice.
  const [lang, setLang] = useState<Lang>('ru')

  useEffect(() => {
    const read = () => {
      try {
        const saved = localStorage.getItem('landingLang')
        if (saved === 'ru' || saved === 'en') setLang(saved)
      } catch { /* ignore */ }
    }
    read()
    const onLang = (e: Event) => {
      const next = (e as CustomEvent).detail
      if (next === 'ru' || next === 'en') setLang(next)
    }
    window.addEventListener('subcuro:lang', onLang)
    return () => window.removeEventListener('subcuro:lang', onLang)
  }, [])

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const t = STR[lang]
  const f = t.footer

  return (
    <>
      {/* ═══ NAV with breadcrumb ═══ */}
      <nav id="siteNav" role="navigation" aria-label="SubCuro">
        <div id="siteNavInner">
          <div className="deals-breadcrumb">
            <Link href="/" className="nav-logo" aria-label="SubCuro">
              <img src="/subcuro_ribbon_s_transparent.png" alt="SubCuro" className="nav-logo-img" />
              <span className="nav-logo-text">SubCuro</span>
            </Link>
            <span className="deals-breadcrumb-sep" aria-hidden="true">/</span>
            <span className="deals-breadcrumb-current" aria-current="page">{t.breadcrumb}</span>
          </div>
          <div className="nav-right">
            <a href="/auth?tab=login"    className="nav-login">{t.login}</a>
            <a href="/auth?tab=register" className="nav-cta">{t.start}</a>
          </div>
        </div>
      </nav>

      {/* ═══ HERO (compact) ═══ */}
      <section className="deals-hero-v2" aria-labelledby="deals-h1">
        <h1 id="deals-h1" className="deals-hero-h1v2">{t.h1}</h1>
        <p className="deals-hero-subv2">{t.sub}</p>
      </section>

      {/* ═══ META LINE ═══ */}
      <div className="deals-meta-line">
        <span className="deals-meta-dot" aria-hidden="true" />
        {t.meta(PROMOS.length)}
      </div>

      {/* ═══ PROMOS GRID ═══ */}
      <section className="deals-section" aria-label={t.h1}>
        <div className="promos-grid">
          {PROMOS.map(p => <PromoCard key={p.id} promo={p} lang={lang} />)}
        </div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <div className="deals-trust-section" aria-hidden="true">
        <div className="deals-trust-strip">
          <div className="deals-trust-item">
            <span className="deals-trust-icon"><IcoShield /></span>
            {t.trust1}
          </div>
          <div className="deals-trust-item">
            <span className="deals-trust-icon deals-trust-icon--green"><IcoBellSm /></span>
            {t.trust2}
          </div>
          <div className="deals-trust-item">
            <span className="deals-trust-icon deals-trust-icon--muted"><IcoCalendar /></span>
            {t.trust3}
          </div>
        </div>
      </div>

      {/* ═══ CTA ═══ */}
      <div className="deals-cta-section">
        <div className="deals-cta-glow-l" aria-hidden="true" />
        <div className="deals-cta-glow-r" aria-hidden="true" />
        <h2 className="deals-cta-h2">{t.ctaH2}</h2>
        <p className="deals-cta-desc">{t.ctaDesc}</p>
        <a href="/auth?tab=register" className="deals-cta-btn">
          {t.ctaBtn}
          <IcoArrow />
        </a>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer className="footer-section" role="contentinfo">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo-row">
              <img src="/subcuro_ribbon_s_transparent.png" width={32} height={32} alt="SubCuro" className="footer-logo-img" />
              <span className="footer-logo-text">SubCuro</span>
            </div>
            <p className="footer-tagline">{f.tagline}</p>
          </div>
          <div>
            <div className="footer-col-title">{f.product}</div>
            <ul className="footer-links">
              <li><a href="/#how-it-works" className="footer-link">{f.how}</a></li>
              <li><a href="/#for-whom"     className="footer-link">{f.scenarios}</a></li>
              <li><a href="/#pricing"      className="footer-link">{f.pricingLink}</a></li>
              <li><a href="/#faq"          className="footer-link">{f.faq}</a></li>
              <li><a href="/deals"         className="footer-link" style={{color:'rgba(255,255,255,0.7)'}}>{f.promo}</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">{f.pricing}</div>
            <ul className="footer-links">
              <li><a href="/#pricing"     className="footer-link">{f.free}</a></li>
              <li><a href="/#pricing"     className="footer-link">{f.pro}</a></li>
              <li><a href="/team-request" className="footer-link">{f.teams}</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-col-title">{f.company}</div>
            <ul className="footer-links">
              <li><a href="mailto:hello@subcuro.app" className="footer-link">{f.contacts}</a></li>
              <li><a href="/privacy" className="footer-link">{f.privacyPolicy}</a></li>
              <li><a href="/terms"   className="footer-link">{f.termsOfUse}</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-copy">{f.copy}</span>
          <div className="footer-legal">
            <a href="/privacy" className="footer-legal-link">{f.privacy}</a>
            <a href="/terms"   className="footer-legal-link">{f.terms}</a>
          </div>
        </div>
      </footer>
    </>
  )
}
