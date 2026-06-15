'use client'

import { useEffect } from 'react'

export default function LandingInteractions() {
  useEffect(() => {
    // ── i18n translations ──
    const translations: Record<'ru' | 'en', Record<string, string>> = {
      ru: {
        'nav.how': 'Как работает',
        'nav.platforms': 'Сценарии',
        'nav.pricing': 'Тарифы',
        'nav.faq': 'FAQ',
        'nav.login': 'Войти',
        'nav.start': 'Начать бесплатно',
        'hero.badge': 'Веб-версия и мобильное приложение',
        'hero.title': 'Контролируй<br />регулярные платежи<br />на любом устройстве',
        'hero.subtitle': 'SubCuro синхронизирует подписки, связь, интернет и другие регулярные платежи между веб-версией и приложением. Все списания, напоминания и решения — в одном месте.',
        'hero.ctaStart': 'Начать бесплатно',
        'stats.copy1': 'в среднем уходит в месяц на регулярные платежи',
        'stats.copy2': 'регулярных списаний используются реже, чем кажется',
        'stats.copy3': 'активных регулярных платежей у среднего пользователя',
        'stats.copy4': 'можно сэкономить в год за счёт пересмотра лишних платежей',
        'how.eyebrow': 'КАК ЭТО РАБОТАЕТ',
        'how.title': 'Три шага до полного контроля',
        'how.desc': 'Начни прямо сейчас — регистрация занимает меньше минуты.',
        'how.step1.title': 'Зарегистрируйся',
        'how.step1.text': 'Создай аккаунт за 30 секунд. Вводи подписки вручную или загружай CSV-выписку из банка.',
        'how.step2.title': 'Получай уведомления',
        'how.step2.text': 'SubCuro предупредит о списании заранее, напомнит об окончании пробного периода и покажет, где можно сэкономить.',
        'how.step3.title': 'Принимай решения',
        'how.step3.text': 'Очередь действий сама подскажет, что отменить, поставить на паузу или заменить — и посчитает экономию.',
        'forwhom.eyebrow': 'ДЛЯ КАЖДОГО СЦЕНАРИЯ',
        'forwhom.title': 'Для кого SubCuro',
        'forwhom.t1short': 'Много платежей',
        'forwhom.t2short': 'Семейный бюджет',
        'forwhom.t3short': 'Фрилансер / бизнес',
        'forwhom.t4short': 'Без сюрпризов',
        'forwhom.sub1': '10+ сервисов',
        'forwhom.sub2': 'Совместный контроль',
        'forwhom.sub3': 'Рабочие расходы',
        'forwhom.sub4': 'Уведомления заранее',
        'forwhom.badge1': 'Самый популярный',
        'forwhom.badge2': 'Для семьи',
        'forwhom.badge3': 'Для бизнеса',
        'forwhom.badge4': 'Спокойствие',
        'forwhom.t1': 'Для тех, у кого много регулярных платежей',
        'forwhom.d1': 'Все сервисы и списания в одном месте — легко управлять и ничего не забывать.',
        'forwhom.l1a': 'Все подписки на одном экране',
        'forwhom.l1b': 'Автоматическое обнаружение дубликатов',
        'forwhom.l1c': 'Экономия до 16 000 ₽ в год',
        'forwhom.t2': 'Для семейного бюджета',
        'forwhom.d2': 'Контролируйте общие расходы и планируйте вместе с близкими без лишних споров.',
        'forwhom.l2a': 'Общий обзор всех подписок семьи',
        'forwhom.l2b': 'Напоминания до списания',
        'forwhom.l2c': 'Планирование бюджета на месяц',
        'forwhom.t3': 'Для фрилансеров и малого бизнеса',
        'forwhom.d3': 'Отслеживайте рабочие сервисы и оптимизируйте бизнес-расходы без бухгалтера.',
        'forwhom.l3a': 'Разделение личных и рабочих расходов',
        'forwhom.l3b': 'Аналитика по категориям',
        'forwhom.l3c': 'Экспорт для отчётности',
        'forwhom.t4': 'Для тех, кто не хочет сюрпризов',
        'forwhom.d4': 'Получайте уведомления о списаниях и продлениях заранее — никаких неожиданных трат.',
        'forwhom.l4a': 'Уведомление за 3 дня до списания',
        'forwhom.l4b': 'Напоминание об окончании пробного периода',
        'forwhom.l4c': 'История всех платежей',
        'pricing.eyebrow': 'ТАРИФЫ',
        'pricing.perMonth': '/мес',
        'pricing.title': 'Честные цены. Без сюрпризов.',
        'pricing.lead': 'Сейчас SubCuro в стадии раннего доступа. Платные тарифы появятся позже, а текущих пользователей мы предупредим заранее.',
        'pricing.startName': 'Старт',
        'pricing.startTag': 'Для знакомства с сервисом',
        'pricing.startCta': 'Начать бесплатно',
        'pricing.proBadge': 'РАННИЙ ДОСТУП',
        'pricing.proName': 'Pro',
        'pricing.proPrice': 'Бесплатно сейчас',
        'pricing.proLater': 'позже — 299 ₽/мес',
        'pricing.proTag': 'Для активного контроля и экономии',
        'pricing.proCta': 'Получить Pro бесплатно',
        'pricing.teamBadge': 'СКОРО',
        'pricing.teamName': 'Команда',
        'pricing.teamPrice': 'Индивидуально',
        'pricing.teamTag': 'Для семей, команд и малого бизнеса',
        'pricing.teamCta': 'Оставить заявку',
        'pricing.f1': 'До 10 подписок',
        'pricing.f2': 'Напоминания о списаниях',
        'pricing.f3': 'Ручное добавление',
        'pricing.f4': 'Загрузка банковской выписки',
        'pricing.f5': 'Веб + мобильное приложение',
        'pricing.p1': 'Безлимит подписок',
        'pricing.p2': 'Все функции Старта',
        'pricing.p3': 'ИИ-анализ подписок',
        'pricing.p4': 'Чат с ИИ',
        'pricing.p5': 'Симулятор «что если»',
        'pricing.p6': 'Экспорт CSV и HTML',
        'pricing.p7': 'Приоритетная поддержка',
        'pricing.t1': 'Общее пространство',
        'pricing.t2': 'Несколько участников',
        'pricing.t3': 'Роли и доступы',
        'pricing.t4': 'Корпоративные платежи',
        'pricing.t5': 'Отчёты для учёта',
        'pricing.trust1': 'Без карты',
        'pricing.trust2': 'Можно отменить в любой момент',
        'pricing.trust3': 'Ваши данные под защитой',
        'faq.eyebrow': 'ЧАСТЫЕ ВОПРОСЫ',
        'faq.title': 'FAQ',
        'faq.q1': 'Что такое SubCuro?',
        'faq.a1': 'SubCuro — это сервис для управления регулярными платежами: подписками, связью, интернетом и другими списаниями. Он помогает видеть все расходы в одном месте, получать напоминания и находить способы сэкономить.',
        'faq.q2': 'Нужно ли подключать банк?',
        'faq.a2': 'Нет. SubCuro не требует доступа к банку или картам. Вы добавляете платежи вручную или загружаете CSV-выписку. Ваши банковские данные нам не нужны и мы их не запрашиваем.',
        'faq.q3': 'Данные синхронизируются между устройствами?',
        'faq.a3': 'Да. Все данные хранятся в облаке и доступны на любом устройстве — в браузере и в мобильном приложении. Изменения синхронизируются в реальном времени.',
        'faq.q4': 'Сколько стоит и когда появится платный тариф?',
        'faq.a4': 'Сейчас SubCuro полностью бесплатен. Платные тарифы появятся позже — мы заранее предупредим всех текущих пользователей. Те, кто зарегистрировался в период раннего доступа, получат специальные условия.',
        'faq.q5': 'Есть ли тариф для команд и компаний?',
        'faq.a5': 'Да, тариф «Команда» находится в разработке. Он будет включать общее пространство, несколько участников, роли и корпоративные отчёты. Оставьте заявку — мы свяжемся когда он появится.',
        'faq.q6': 'Как удалить аккаунт или экспортировать данные?',
        'faq.a6': 'Вы можете экспортировать все данные в CSV или HTML-отчёт в разделе Настройки. Там же можно полностью удалить аккаунт — все данные будут безвозвратно удалены в течение 30 дней.',
        'footer.comingSoon': 'СКОРО В',
        'footer.tagline': 'Контролируй регулярные платежи на любом устройстве',
        'footer.product': 'ПРОДУКТ',
        'footer.pricing': 'ТАРИФЫ',
        'footer.company': 'КОМПАНИЯ',
        'footer.l1': 'Как работает',
        'footer.l2': 'Сценарии',
        'footer.l3': 'Тарифы',
        'footer.l4': 'FAQ',
        'footer.l5': 'Бесплатный',
        'footer.pro': 'Pro',
        'footer.l6': 'Для команд',
        'footer.l7': 'О нас',
        'footer.l8': 'Блог',
        'footer.l9': 'Контакты',
        'footer.l10': 'Политика конфиденциальности',
        'footer.l11': 'Условия использования',
        'footer.copy': '© 2025 SubCuro. Все права защищены.',
        'footer.privacy': 'Конфиденциальность',
        'footer.terms': 'Условия',
      },
      en: {
        'nav.how': 'How it works',
        'nav.platforms': 'Scenarios',
        'nav.pricing': 'Pricing',
        'nav.faq': 'FAQ',
        'nav.login': 'Sign in',
        'nav.start': 'Get started free',
        'hero.badge': 'Web version and mobile app',
        'hero.title': 'Take control of<br />recurring payments<br />on any device',
        'hero.subtitle': 'SubCuro syncs subscriptions, mobile plans, internet, and other recurring payments across web and mobile. Charges, reminders, and smart decisions — all in one place.',
        'hero.ctaStart': 'Get started free',
        'stats.copy1': 'average monthly spend on recurring payments',
        'stats.copy2': 'of recurring charges are underused',
        'stats.copy3': 'active recurring payments for an average user',
        'stats.copy4': 'can be saved each year by reviewing unnecessary payments',
        'how.eyebrow': 'HOW IT WORKS',
        'how.title': 'Three steps to full control',
        'how.desc': 'Start now — setup takes under a minute.',
        'how.step1.title': 'Sign up',
        'how.step1.text': 'Create an account in 30 seconds. Add subscriptions manually or upload a CSV bank statement.',
        'how.step2.title': 'Get notified',
        'how.step2.text': 'SubCuro alerts you before charges, reminds you when trials end, and shows you where to save.',
        'how.step3.title': 'Make smart decisions',
        'how.step3.text': 'The action queue suggests what to cancel, pause, or switch — and calculates your savings.',
        'forwhom.eyebrow': 'FOR EVERY SCENARIO',
        'forwhom.title': 'Who SubCuro is for',
        'forwhom.t1short': 'Many payments',
        'forwhom.t2short': 'Family budget',
        'forwhom.t3short': 'Freelancer / business',
        'forwhom.t4short': 'No surprises',
        'forwhom.sub1': '10+ services',
        'forwhom.sub2': 'Shared control',
        'forwhom.sub3': 'Work expenses',
        'forwhom.sub4': 'Advance alerts',
        'forwhom.badge1': 'Most popular',
        'forwhom.badge2': 'For families',
        'forwhom.badge3': 'For business',
        'forwhom.badge4': 'Peace of mind',
        'forwhom.t1': 'For people with many recurring payments',
        'forwhom.d1': 'All services and charges in one place — easy to manage and never forget.',
        'forwhom.l1a': 'All subscriptions on one screen',
        'forwhom.l1b': 'Automatic duplicate detection',
        'forwhom.l1c': 'Save up to 16,000 ₽ per year',
        'forwhom.t2': 'For family budgeting',
        'forwhom.d2': 'Track shared expenses and plan together with your family without disputes.',
        'forwhom.l2a': 'Overview of all family subscriptions',
        'forwhom.l2b': 'Reminders before charges',
        'forwhom.l2c': 'Monthly budget planning',
        'forwhom.t3': 'For freelancers and small business',
        'forwhom.d3': 'Track work services and optimize business expenses without an accountant.',
        'forwhom.l3a': 'Separate personal and business expenses',
        'forwhom.l3b': 'Analytics by category',
        'forwhom.l3c': 'Export for reporting',
        'forwhom.t4': "For those who don't want surprises",
        'forwhom.d4': 'Get notified about charges and renewals in advance — no unexpected spending.',
        'forwhom.l4a': '3-day advance charge notification',
        'forwhom.l4b': 'Trial expiry reminder',
        'forwhom.l4c': 'Complete payment history',
        'pricing.eyebrow': 'PRICING',
        'pricing.perMonth': '/mo',
        'pricing.title': 'Simple pricing. No surprises.',
        'pricing.lead': 'SubCuro is currently in early access. Paid plans will launch later, and current users will be notified in advance.',
        'pricing.startName': 'Start',
        'pricing.startTag': 'Perfect for getting started',
        'pricing.startCta': 'Start free',
        'pricing.proBadge': 'EARLY ACCESS',
        'pricing.proName': 'Pro',
        'pricing.proPrice': 'Free for now',
        'pricing.proLater': 'later — 299 ₽/mo',
        'pricing.proTag': 'For deeper control and bigger savings',
        'pricing.proCta': 'Claim Pro for free',
        'pricing.teamBadge': 'SOON',
        'pricing.teamName': 'Team',
        'pricing.teamPrice': 'Custom',
        'pricing.teamTag': 'For families, teams, and small businesses',
        'pricing.teamCta': 'Send request',
        'pricing.f1': 'Up to 10 payments',
        'pricing.f2': 'Basic reminders',
        'pricing.f3': 'Manual adding',
        'pricing.f4': 'Web + mobile version',
        'pricing.f5': 'Basic analytics',
        'pricing.p1': 'Unlimited payments',
        'pricing.p2': 'Smart notifications',
        'pricing.p3': 'Action queue',
        'pricing.p4': 'Savings simulator',
        'pricing.p5': 'Advanced analytics',
        'pricing.p6': 'CSV and HTML report export',
        'pricing.p7': 'Cross-device sync',
        'pricing.t1': 'Shared workspace',
        'pricing.t2': 'Multiple members',
        'pricing.t3': 'Roles and permissions',
        'pricing.t4': 'Corporate payments',
        'pricing.t5': 'Accounting reports',
        'pricing.trust1': 'No card required',
        'pricing.trust2': 'Cancel anytime',
        'pricing.trust3': 'Your data is protected',
        'faq.eyebrow': 'FREQUENTLY ASKED',
        'faq.title': 'FAQ',
        'faq.q1': 'What is SubCuro?',
        'faq.a1': 'SubCuro is a service for managing recurring payments: subscriptions, mobile plans, internet, and other charges. It helps you see all expenses in one place, receive reminders, and find ways to save.',
        'faq.q2': 'Do I need to connect my bank?',
        'faq.a2': 'No. SubCuro does not require access to your bank or cards. You add payments manually or upload a CSV bank statement. We do not need and do not request your banking credentials.',
        'faq.q3': 'Does data sync across devices?',
        'faq.a3': 'Yes. All data is stored in the cloud and available on any device — in your browser and in the mobile app. Changes sync in real time.',
        'faq.q4': 'How much does it cost and when will paid plans launch?',
        'faq.a4': 'SubCuro is currently completely free. Paid plans will come later — we will notify all current users in advance. Those who signed up during early access will receive special terms.',
        'faq.q5': 'Is there a plan for teams and companies?',
        'faq.a5': 'Yes, the Team plan is in development. It will include a shared workspace, multiple members, roles, and corporate reports. Leave a request — we will reach out when it launches.',
        'faq.q6': 'How do I delete my account or export data?',
        'faq.a6': 'You can export all data as CSV or an HTML report in the Settings section. You can also permanently delete your account there — all data will be irreversibly removed within 30 days.',
        'footer.comingSoon': 'COMING TO',
        'footer.tagline': 'Control recurring payments on any device',
        'footer.product': 'PRODUCT',
        'footer.pricing': 'PRICING',
        'footer.company': 'COMPANY',
        'footer.l1': 'How it works',
        'footer.l2': 'Scenarios',
        'footer.l3': 'Pricing',
        'footer.l4': 'FAQ',
        'footer.l5': 'Free',
        'footer.pro': 'Pro',
        'footer.l6': 'For teams',
        'footer.l7': 'About us',
        'footer.l8': 'Blog',
        'footer.l9': 'Contacts',
        'footer.l10': 'Privacy Policy',
        'footer.l11': 'Terms of Use',
        'footer.copy': '© 2025 SubCuro. All rights reserved.',
        'footer.privacy': 'Privacy',
        'footer.terms': 'Terms',
      },
    }

    const applyLanguage = (lang: 'ru' | 'en') => {
      const dict = translations[lang]

      document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n
        if (key && dict[key]) el.textContent = dict[key]
      })
      document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach(el => {
        const key = el.dataset.i18nHtml
        if (key && dict[key]) el.innerHTML = dict[key]
      })
    }

    // Lang switcher event listener (LangSwitcherWidget fires 'subcuro:lang')
    const applyFromStorage = () => {
      try {
        const saved = (localStorage.getItem('landingLang') as 'ru' | 'en' | null) ?? 'ru'
        applyLanguage(saved)
      } catch { /* ignore */ }
    }
    applyFromStorage()

    const onLangChange = (e: Event) => {
      applyLanguage((e as CustomEvent<'ru' | 'en'>).detail)
    }
    window.addEventListener('subcuro:lang', onLangChange)

    // ── Count-up animation ──
    function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4) }
    function formatNumber(n: number) {
      return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ')
    }
    function countUp(el: HTMLElement) {
      const target = parseFloat(el.dataset.target ?? '0')
      const suffix = el.dataset.suffix ?? ''
      const prefix = el.dataset.prefix ?? ''
      const duration = 1600
      const start = performance.now()
      function tick(now: number) {
        const t = Math.min(1, (now - start) / duration)
        const v = target * easeOutQuart(t)
        el.textContent = prefix + formatNumber(v) + suffix
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    const statsSection = document.getElementById('stats-grid')
    if (statsSection) {
      const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            document.querySelectorAll<HTMLElement>('.count-up').forEach(countUp)
            statsObserver.disconnect()
          }
        })
      }, { threshold: 0.3 })
      statsObserver.observe(statsSection)
    }

    // ── How-it-works card reveal ──
    const howSection = document.getElementById('how-it-works')
    if (howSection) {
      const cards = document.querySelectorAll<HTMLElement>('.sc-card-reveal')
      const howObserver = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            cards.forEach((c, i) => setTimeout(() => c.classList.add('is-in'), i * 150))
            howObserver.disconnect()
          }
        })
      }, { threshold: 0.2 })
      howObserver.observe(howSection)
    }

    // ── Who-for tabs ──
    ;(function () {
      const tabs   = document.querySelectorAll<HTMLElement>('.who2-tab')
      const panels = document.querySelectorAll<HTMLElement>('.who2-panel')
      if (!tabs.length || !panels.length) return

      let current = 0
      let timer: ReturnType<typeof setInterval> | null = null

      function setActive(i: number) {
        current = i
        tabs.forEach((x, j) => x.classList.toggle('is-active', j === i))
        panels.forEach((p, j) => p.classList.toggle('is-active', j === i))
      }
      function next() { setActive((current + 1) % tabs.length) }

      function start() {
        stop()
        timer = setInterval(next, 5000)
      }
      function stop() {
        if (timer) clearInterval(timer)
        timer = null
      }

      tabs.forEach((t, i) => {
        t.addEventListener('click', () => { setActive(i); start() })
      })

      const section = tabs[0].closest('section')
      if (section && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => (e.isIntersecting ? start() : stop()))
        }, { threshold: 0.15 })
        io.observe(section)
      } else {
        start()
      }
    })()

    // ── FAQ accordion ──
    ;(function () {
      const items = document.querySelectorAll<HTMLElement>('[data-faq]')
      items.forEach(item => {
        const btn = item.querySelector<HTMLButtonElement>('.faq-q')
        if (!btn) return
        btn.addEventListener('click', () => {
          const wasOpen = item.classList.contains('is-open')
          items.forEach(i => i.classList.remove('is-open'))
          if (!wasOpen) item.classList.add('is-open')
        })
      })
    })()

    // ── Sticky navbar: scrolled state + smooth scroll + active link ──
    ;(function () {
      const nav   = document.getElementById('siteNavInner')
      const links = document.querySelectorAll<HTMLAnchorElement>('.nav-link[data-nav]')
      if (!nav) return

      function onScroll() {
        nav!.classList.toggle('is-scrolled', window.scrollY > 80)
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      onScroll()

      // Smooth scroll with nav offset
      links.forEach(a => {
        a.addEventListener('click', (e) => {
          const id = a.getAttribute('data-nav')
          const target = id ? document.getElementById(id) : null
          if (target) {
            e.preventDefault()
            const navH = nav!.getBoundingClientRect().height + 24
            const y = target.getBoundingClientRect().top + window.scrollY - navH
            window.scrollTo({ top: y, behavior: 'smooth' })
          }
        })
      })

      // Active-link tracking
      const sections = Array.from(links)
        .map(a => document.getElementById(a.dataset.nav ?? ''))
        .filter(Boolean) as HTMLElement[]

      if (!sections.length) return

      function setActive(id: string) {
        links.forEach(a => a.classList.toggle('is-active', a.dataset.nav === id))
      }

      const visible = new Map<HTMLElement, number>()
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) visible.set(e.target as HTMLElement, e.intersectionRatio)
          else visible.delete(e.target as HTMLElement)
        })
        let best: HTMLElement | null = null
        let bestR = 0
        for (const [el, r] of visible) {
          if (r > bestR) { best = el; bestR = r }
        }
        if (best) setActive(best.id)
      }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] })

      sections.forEach(s => io.observe(s))
    })()

    return () => {
      window.removeEventListener('subcuro:lang', onLangChange)
    }
  }, [])

  return null
}
