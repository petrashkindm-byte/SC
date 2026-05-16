'use client'

import { useEffect } from 'react'

export default function LandingInteractions() {
  useEffect(() => {
    const translations: Record<'ru' | 'en', Record<string, string>> = {
      ru: {
        'nav.how': 'Как работает',
        'nav.platforms': 'Платформы',
        'nav.pricing': 'Тарифы',
        'nav.faq': 'FAQ',
        'nav.login': 'Войти',
        'nav.start': 'Начать бесплатно',
        'hero.badge': '<span class="slide1__badge-dot" aria-hidden="true"></span>Веб-версия и мобильное приложение',
        'hero.title': '<span style="display:block">Контролируй</span><span style="display:block">регулярные платежи</span><span style="display:block">на любом устройстве</span>',
        'hero.subtitle': 'SubCuro синхронизирует подписки, связь, интернет и другие регулярные платежи между веб-версией и приложением. Все списания, напоминания и решения — в одном месте.',
        'hero.ctaStart': 'Начать бесплатно',
        'hero.ctaLogin': 'Войти в аккаунт',
        'hero.safeTitle': 'Безопасно',
        'hero.safeText': 'Данные под защитой и не передаются третьим лицам',
        'hero.syncTitle': 'Синхронно',
        'hero.syncText': 'Все устройства всегда в актуальном состоянии',
        'hero.remindTitle': 'Напоминания',
        'hero.remindText': 'Ничего не забудете — мы напомним вовремя',
        'stats.copy1': 'в среднем уходит в месяц<br>на регулярные платежи',
        'stats.copy2': 'регулярных списаний<br>используются реже, чем кажется',
        'stats.copy3': 'активных регулярных платежей<br>у среднего пользователя',
        'stats.copy4': 'можно сэкономить в год<br>за счёт пересмотра лишних платежей',
        'platforms.badge': 'Платформы',
        'platforms.title': 'Работай в браузере и в телефоне без разрыва',
        'platforms.desc': 'SubCuro синхронизирует данные между всеми устройствами. Регулярные платежи, напоминания и очередь действий — всегда под рукой, где бы вы ни были.',
        'platforms.safeTitle': 'Безопасно',
        'platforms.safeText': 'Данные под защитой и не передаются третьим лицам',
        'platforms.syncTitle': 'Синхронно',
        'platforms.syncText': 'Все устройства в актуальном состоянии',
        'platforms.remindTitle': 'Напоминания',
        'platforms.remindText': 'Ничего не забудете — напомним вовремя',
        'platforms.proofText': 'пользователей уже доверяют<br>управлению платежами в SubCuro',
        'how.badge': 'Как это работает',
        'how.title': 'Три шага до полного контроля',
        'how.desc': 'Начни прямо сейчас — настройка занимает меньше минуты.',
        'features.badge': 'Возможности',
        'features.title': 'Всё необходимое под одной крышей',
        'features.lead': 'SubCuro объединяет аналитику, календарь и умные инструменты, чтобы вы контролировали регулярные платежи и расходы без лишней рутины.',
        'features.item1.title': 'Аналитика регулярных трат',
        'features.item1.text': 'Наглядно видно, куда уходят деньги. Тренды и сравнение периодов. Экспорт в CSV.',
        'features.item2.title': 'Календарь платежей',
        'features.item2.text': 'Все списания и продления — на одной шкале времени.',
        'features.item3.title': 'Очередь действий',
        'features.item3.text': 'Подсказки: что отключить, пересмотреть или оставить — с оценкой экономии.',
        'features.item4.title': 'Приватность',
        'features.item4.text': 'Данные под защитой; доступ к банкам не храним. Данные только те, что вы ввели сами.',
        'features.item5.title': 'Мультивалюта',
        'features.item5.text': '₽, $, € — в одном окне с актуальными курсами.',
        'features.item6.title': 'Тёмная тема',
        'features.item6.text': 'Светлая, системная или тёмная — как вам удобно.',
        'features.cta': 'Начать бесплатно',
        'features.note': 'Без карты. Без риска.',
        'forwhom.t1': 'Для тех, у кого много регулярных платежей',
        'forwhom.d1': 'Все сервисы и списания в одном месте — легко управлять и ничего не забывать.',
        'forwhom.t2': 'Для семейного бюджета',
        'forwhom.d2': 'Контролируйте общие расходы и планируйте вместе с близкими.',
        'forwhom.t3': 'Для фрилансеров и small business',
        'forwhom.d3': 'Отслеживайте рабочие сервисы и оптимизируйте бизнес-расходы.',
        'forwhom.t4': 'Для тех, кто не хочет сюрпризов',
        'forwhom.d4': 'Получайте уведомления о списаниях и продлениях заранее.',
        'forwhom.badge': 'Для каждого сценария',
        'forwhom.title': 'Для кого SubCuro',
        'forwhom.desc': 'SubCuro помогает навести порядок в регулярных платежах, экономить и контролировать расходы без лишних усилий.',
        'pricing.eyebrow': 'Тарифы',
        'pricing.title': 'Честные цены. Без сюрпризов.',
        'pricing.lead': 'Сейчас SubCuro в стадии раннего доступа. Платные тарифы появятся позже, а текущих пользователей мы предупредим заранее.',
        'pricing.startName': 'Старт',
        'pricing.startTag': 'Для знакомства с сервисом',
        'pricing.startCta': 'Начать бесплатно',
        'pricing.proBadge': 'Ранний доступ',
        'pricing.proPrice': 'Бесплатно сейчас',
        'pricing.proLater': 'позже — 299 ₽/мес',
        'pricing.proTag': 'Для активного контроля и экономии',
        'pricing.proCta': 'Получить Pro бесплатно',
        'pricing.teamBadge': 'Скоро',
        'pricing.teamName': 'Команда',
        'pricing.teamPrice': 'Индивидуально',
        'pricing.teamTag': 'Для семей, команд и малого бизнеса',
        'pricing.teamCta': 'Оставить заявку',
        'pricing.f1': 'До 10 платежей',
        'pricing.f2': 'Базовые напоминания',
        'pricing.f3': 'Ручное добавление',
        'pricing.f4': 'Веб + мобильная версия',
        'pricing.f5': 'Базовая аналитика',
        'pricing.p1': 'Безлимит платежей',
        'pricing.p2': 'Умные уведомления',
        'pricing.p3': 'Очередь действий',
        'pricing.p4': 'Симулятор экономии',
        'pricing.p5': 'Расширенная аналитика',
        'pricing.p6': 'Экспорт CSV и HTML-отчёт',
        'pricing.p7': 'Синхронизация между устройствами',
        'pricing.t1': 'Общее пространство',
        'pricing.t2': 'Несколько участников',
        'pricing.t3': 'Роли и доступы',
        'pricing.t4': 'Корпоративные платежи',
        'pricing.t5': 'Отчёты для учёта',
        'pricing.trust1': 'Без карты',
        'pricing.trust2': 'Можно отменить в любой момент',
        'pricing.trust3': 'Ваши данные под защитой',
        'faq.title': 'FAQ',
        'faq.q1': 'Что такое SubCuro?',
        'faq.a1': 'SubCuro помогает видеть все регулярные платежи и подписки в одном месте: веб и приложение синхронизированы, есть напоминания, аналитика и подсказки по экономии — без хаоса в таблицах и заметках.',
        'faq.q2': 'Нужно ли подключать банк?',
        'faq.a2': 'Нет. Достаточно ввести или импортировать данные вручную или из выписки (CSV). Мы не храним доступ к вашим банкам и не списываем деньги — только то, что вы сами добавили для учёта.',
        'faq.q3': 'Данные синхронизируются между устройствами?',
        'faq.a3': 'Да. Подписки, напоминания и очередь действий доступны в веб-версии и в мобильном приложении: изменения на одном устройстве отображаются на остальных после синхронизации.',
        'faq.q4': 'Сколько стоит и когда появится платный тариф?',
        'faq.a4': 'Сейчас действует ранний доступ: Pro доступен бесплатно. Платные тарифы появятся позже — мы заранее предупредим и ничего не спишем без вашего согласия.',
        'faq.q5': 'Есть ли тариф для команд и компаний?',
        'faq.a5': 'Тариф «Команда» в разработке. Можно оставить заявку — опишите компанию и задачи, мы свяжемся, когда появится корпоративное предложение.',
        'faq.q6': 'Как удалить аккаунт или экспортировать данные?',
        'faq.a6': 'Экспорт доступен в продукте (в том числе CSV). Удаление аккаунта и вопросы по данным можно оформить через настройки профиля или обратившись в поддержку — ссылки появятся в приложении и в веб-версии.',
        'footer.tagline': 'Контролируй регулярные платежи на любом устройстве',
        'footer.appStore': 'Скачать в',
        'footer.googlePlay': 'Доступно в',
        'footer.product': 'Продукт',
        'footer.pricing': 'Тарифы',
        'footer.company': 'Компания',
        'footer.l1': 'Как работает',
        'footer.l2': 'Платформы',
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
        'nav.platforms': 'Platforms',
        'nav.pricing': 'Pricing',
        'nav.faq': 'FAQ',
        'nav.login': 'Sign in',
        'nav.start': 'Get started free',
        'hero.badge': '<span class="slide1__badge-dot" aria-hidden="true"></span>Web version and mobile app',
        'hero.title': '<span style="display:block">Take control of</span><span style="display:block">recurring payments</span><span style="display:block">on any device</span>',
        'hero.subtitle': 'SubCuro syncs subscriptions, mobile plans, internet, and other recurring payments across web and mobile. Charges, reminders, and smart decisions — all in one place.',
        'hero.ctaStart': 'Get started free',
        'hero.ctaLogin': 'Sign in',
        'hero.safeTitle': 'Secure',
        'hero.safeText': 'Your data is protected and never shared with third parties',
        'hero.syncTitle': 'Synced',
        'hero.syncText': 'Everything stays up to date across all your devices',
        'hero.remindTitle': 'Reminders',
        'hero.remindText': "Never miss a charge — we'll remind you right on time",
        'stats.copy1': 'average monthly spend<br>on recurring payments',
        'stats.copy2': 'of recurring charges<br>are underused',
        'stats.copy3': 'active recurring payments<br>for an average user',
        'stats.copy4': 'can be saved each year<br>by reviewing unnecessary payments',
        'platforms.badge': 'Platforms',
        'platforms.title': 'Stay in sync across web and mobile',
        'platforms.desc': 'SubCuro syncs your data across every device. Recurring payments, reminders, and your action queue are always right where you need them.',
        'platforms.safeTitle': 'Secure',
        'platforms.safeText': 'Your data is protected and never shared with third parties',
        'platforms.syncTitle': 'Synced',
        'platforms.syncText': 'All your devices stay perfectly in sync',
        'platforms.remindTitle': 'Reminders',
        'platforms.remindText': "Never miss a payment — we'll remind you in advance",
        'platforms.proofText': 'users already trust<br>SubCuro to manage their payments',
        'how.badge': 'How it works',
        'how.title': 'Three steps to full control',
        'how.desc': 'Start now — setup takes under a minute.',
        'features.badge': 'Features',
        'features.title': 'Everything you need in one place',
        'features.lead': 'SubCuro combines analytics, calendar tools, and smart recommendations so you can manage recurring payments with less effort.',
        'features.item1.title': 'Recurring spend analytics',
        'features.item1.text': 'See exactly where your money goes, track trends, compare periods, and export to CSV.',
        'features.item2.title': 'Payment calendar',
        'features.item2.text': 'All charges and renewals on a single clear timeline.',
        'features.item3.title': 'Action queue',
        'features.item3.text': 'Get suggestions on what to cancel, review, or keep — with projected savings.',
        'features.item4.title': 'Privacy',
        'features.item4.text': 'Your data stays protected. No stored bank access — only what you add yourself.',
        'features.item5.title': 'Multi-currency',
        'features.item5.text': '₽, $, and € in one place with up-to-date exchange rates.',
        'features.item6.title': 'Dark theme',
        'features.item6.text': 'Choose light, dark, or system mode — whatever suits you best.',
        'features.cta': 'Get started free',
        'features.note': 'No card. No risk.',
        'forwhom.t1': 'For people with many recurring payments',
        'forwhom.d1': 'All services and charges in one place — easy to manage and never forget.',
        'forwhom.t2': 'For family budgeting',
        'forwhom.d2': 'Track shared expenses and plan together with your family.',
        'forwhom.t3': 'For freelancers and small business',
        'forwhom.d3': 'Track work services and optimize business expenses.',
        'forwhom.t4': "For those who don't want surprises",
        'forwhom.d4': 'Get notified about charges and renewals in advance.',
        'forwhom.badge': 'For every scenario',
        'forwhom.title': 'Who SubCuro is for',
        'forwhom.desc': 'SubCuro helps you organize recurring payments, save money, and stay in control of spending with less effort.',
        'pricing.eyebrow': 'Pricing',
        'pricing.title': 'Simple pricing. No surprises.',
        'pricing.lead': 'SubCuro is currently in early access. Paid plans will launch later, and current users will be notified in advance.',
        'pricing.startName': 'Start',
        'pricing.startTag': 'Perfect for getting started',
        'pricing.startCta': 'Start free',
        'pricing.proBadge': 'Early access',
        'pricing.proPrice': 'Free for now',
        'pricing.proLater': 'later — 299 ₽/mo',
        'pricing.proTag': 'For deeper control and bigger savings',
        'pricing.proCta': 'Claim Pro for free',
        'pricing.teamBadge': 'Soon',
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
        'faq.title': 'FAQ',
        'faq.q1': 'What is SubCuro?',
        'faq.a1': 'SubCuro brings all recurring payments and subscriptions into one place: web and mobile stay synced, with reminders, analytics, and savings suggestions — no more spreadsheet chaos.',
        'faq.q2': 'Do I need to connect a bank?',
        'faq.a2': 'No. You can add data manually or import statements (CSV). We do not store bank access and never make charges — only what you choose to track.',
        'faq.q3': 'Is data synced across devices?',
        'faq.a3': 'Yes. Subscriptions, reminders, and your action queue are available on web and mobile: changes on one device appear everywhere after sync.',
        'faq.q4': 'How much does it cost and when will paid plans be available?',
        'faq.a4': 'Early access is live now: Pro is free at the moment. Paid plans will come later — we will notify you in advance and never charge without your consent.',
        'faq.q5': 'Is there a plan for teams and companies?',
        'faq.a5': 'The Team plan is in development. You can submit a request with your company details and use case, and we will contact you when it becomes available.',
        'faq.q6': 'How can I delete account or export data?',
        'faq.a6': 'Data export is available in the product (including CSV). Account deletion and data-related requests are handled in profile settings or through support.',
        'footer.tagline': 'Control recurring payments on any device',
        'footer.appStore': 'Download on the',
        'footer.googlePlay': 'Get it on',
        'footer.product': 'Product',
        'footer.pricing': 'Pricing',
        'footer.company': 'Company',
        'footer.l1': 'How it works',
        'footer.l2': 'Platforms',
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

      const setText = (selector: string, key: string) => {
        const el = document.querySelector<HTMLElement>(selector)
        if (el && dict[key]) el.textContent = dict[key]
      }
      const setHtml = (selector: string, key: string) => {
        const el = document.querySelector<HTMLElement>(selector)
        if (el && dict[key]) el.innerHTML = dict[key]
      }
      const setList = (selector: string, keys: string[]) => {
        const items = Array.from(document.querySelectorAll<HTMLElement>(selector))
        items.forEach((el, idx) => {
          const key = keys[idx]
          if (key && dict[key]) el.textContent = dict[key]
        })
      }
      const setTextKeepIcons = (selector: string, key: string) => {
        const el = document.querySelector<HTMLElement>(selector)
        if (!el || !dict[key]) return
        const textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE)
        if (textNode) {
          textNode.textContent = ` ${dict[key]}`
        } else {
          el.append(` ${dict[key]}`)
        }
      }
      const setListKeepIcons = (selector: string, keys: string[]) => {
        const items = Array.from(document.querySelectorAll<HTMLElement>(selector))
        items.forEach((el, idx) => {
          const key = keys[idx]
          if (!key || !dict[key]) return
          const textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE)
          if (textNode) textNode.textContent = ` ${dict[key]}`
          else el.append(` ${dict[key]}`)
        })
      }

      // Stats
      setHtml('.stats-stage-item:nth-child(1) .stats-stage-copy', 'stats.copy1')
      setHtml('.stats-stage-item:nth-child(2) .stats-stage-copy', 'stats.copy2')
      setHtml('.stats-stage-item:nth-child(3) .stats-stage-copy', 'stats.copy3')
      setHtml('.stats-stage-item:nth-child(4) .stats-stage-copy', 'stats.copy4')

      // Platforms slide
      setTextKeepIcons('.workstage-badge', 'platforms.badge')
      setText('.workstage-title', 'platforms.title')
      setText('.workstage-desc', 'platforms.desc')
      setText('.ws-cards .ws-card:nth-child(1) .ws-card-title', 'platforms.safeTitle')
      setText('.ws-cards .ws-card:nth-child(1) .ws-card-text', 'platforms.safeText')
      setText('.ws-cards .ws-card:nth-child(2) .ws-card-title', 'platforms.syncTitle')
      setText('.ws-cards .ws-card:nth-child(2) .ws-card-text', 'platforms.syncText')
      setText('.ws-cards .ws-card:nth-child(3) .ws-card-title', 'platforms.remindTitle')
      setText('.ws-cards .ws-card:nth-child(3) .ws-card-text', 'platforms.remindText')
      setHtml('.ws-proof-copy', 'platforms.proofText')

      // How slide
      setTextKeepIcons('.how-slide-badge', 'how.badge')
      setText('.how-slide-title', 'how.title')
      setText('.how-slide-desc', 'how.desc')

      // Features slide
      setTextKeepIcons('.features-slide-badge', 'features.badge')
      setText('.features-slide-title', 'features.title')
      setText('.features-slide-lead', 'features.lead')
      setText('.features-slide-grid li:nth-child(1) .features-slide-item-title', 'features.item1.title')
      setText('.features-slide-grid li:nth-child(1) .features-slide-item-text', 'features.item1.text')
      setText('.features-slide-grid li:nth-child(2) .features-slide-item-title', 'features.item2.title')
      setText('.features-slide-grid li:nth-child(2) .features-slide-item-text', 'features.item2.text')
      setText('.features-slide-grid li:nth-child(3) .features-slide-item-title', 'features.item3.title')
      setText('.features-slide-grid li:nth-child(3) .features-slide-item-text', 'features.item3.text')
      setText('.features-slide-grid li:nth-child(4) .features-slide-item-title', 'features.item4.title')
      setText('.features-slide-grid li:nth-child(4) .features-slide-item-text', 'features.item4.text')
      setText('.features-slide-grid li:nth-child(5) .features-slide-item-title', 'features.item5.title')
      setText('.features-slide-grid li:nth-child(5) .features-slide-item-text', 'features.item5.text')
      setText('.features-slide-grid li:nth-child(6) .features-slide-item-title', 'features.item6.title')
      setText('.features-slide-grid li:nth-child(6) .features-slide-item-text', 'features.item6.text')
      setTextKeepIcons('.features-slide-btn', 'features.cta')
      setTextKeepIcons('.features-slide-note', 'features.note')

      // For whom
      setText('.forwhom-hz--1 .forwhom-card-title', 'forwhom.t1')
      setText('.forwhom-hz--1 .forwhom-card-desc', 'forwhom.d1')
      setText('.forwhom-hz--2 .forwhom-card-title', 'forwhom.t2')
      setText('.forwhom-hz--2 .forwhom-card-desc', 'forwhom.d2')
      setText('.forwhom-hz--3 .forwhom-card-title', 'forwhom.t3')
      setText('.forwhom-hz--3 .forwhom-card-desc', 'forwhom.d3')
      setText('.forwhom-hz--4 .forwhom-card-title', 'forwhom.t4')
      setText('.forwhom-hz--4 .forwhom-card-desc', 'forwhom.d4')

      // Pricing
      setText('.pricing-eyebrow', 'pricing.eyebrow')
      setText('.pricing-title', 'pricing.title')
      setText('.pricing-lead', 'pricing.lead')
      setText('.pricing-grid .pricing-card:nth-child(1) .pricing-card-name', 'pricing.startName')
      setText('.pricing-grid .pricing-card:nth-child(1) .pricing-card-tagline', 'pricing.startTag')
      setText('.pricing-grid .pricing-card:nth-child(1) .pricing-btn', 'pricing.startCta')
      setText('.pricing-grid .pricing-card:nth-child(2) .pricing-badge--early', 'pricing.proBadge')
      setText('.pricing-grid .pricing-card:nth-child(2) .pricing-card-price', 'pricing.proPrice')
      setText('.pricing-grid .pricing-card:nth-child(2) .pricing-card-later', 'pricing.proLater')
      setText('.pricing-grid .pricing-card:nth-child(2) .pricing-card-tagline', 'pricing.proTag')
      setText('.pricing-grid .pricing-card:nth-child(2) .pricing-btn', 'pricing.proCta')
      setText('.pricing-grid .pricing-card:nth-child(3) .pricing-badge--soon', 'pricing.teamBadge')
      setText('.pricing-grid .pricing-card:nth-child(3) .pricing-card-name', 'pricing.teamName')
      setText('.pricing-grid .pricing-card:nth-child(3) .pricing-card-price', 'pricing.teamPrice')
      setText('.pricing-grid .pricing-card:nth-child(3) .pricing-card-tagline', 'pricing.teamTag')
      setText('.pricing-grid .pricing-card:nth-child(3) .pricing-btn', 'pricing.teamCta')
      setListKeepIcons('.pricing-grid .pricing-card:nth-child(1) .pricing-features li', ['pricing.f1', 'pricing.f2', 'pricing.f3', 'pricing.f4', 'pricing.f5'])
      setListKeepIcons('.pricing-grid .pricing-card:nth-child(2) .pricing-features li', ['pricing.p1', 'pricing.p2', 'pricing.p3', 'pricing.p4', 'pricing.p5', 'pricing.p6', 'pricing.p7'])
      setListKeepIcons('.pricing-grid .pricing-card:nth-child(3) .pricing-features li', ['pricing.t1', 'pricing.t2', 'pricing.t3', 'pricing.t4', 'pricing.t5'])
      setList('.pricing-trust .pricing-trust-item span:last-child', ['pricing.trust1', 'pricing.trust2', 'pricing.trust3'])

      // FAQ
      setText('#faq-heading', 'faq.title')
      const faqQuestions = Array.from(document.querySelectorAll<HTMLElement>('.faq-question'))
      const faqAnswers = Array.from(document.querySelectorAll<HTMLElement>('.faq-answer-inner'))
      const qKeys = ['faq.q1', 'faq.q2', 'faq.q3', 'faq.q4', 'faq.q5', 'faq.q6']
      const aKeys = ['faq.a1', 'faq.a2', 'faq.a3', 'faq.a4', 'faq.a5', 'faq.a6']
      faqQuestions.forEach((el, i) => {
        const textNode = el.childNodes[0]
        if (textNode && qKeys[i] && dict[qKeys[i]]) textNode.textContent = dict[qKeys[i]]
      })
      faqAnswers.forEach((el, i) => {
        if (aKeys[i] && dict[aKeys[i]]) el.textContent = dict[aKeys[i]]
      })

      // Footer
      setText('.footer-tagline', 'footer.tagline')
      setText('.footer-apps a:nth-child(1) .app-store-text small', 'footer.appStore')
      setText('.footer-apps a:nth-child(2) .app-store-text small', 'footer.googlePlay')
      setText('.footer-top > div:nth-child(2) .footer-col-title', 'footer.product')
      setText('.footer-top > div:nth-child(3) .footer-col-title', 'footer.pricing')
      setText('.footer-top > div:nth-child(4) .footer-col-title', 'footer.company')
      setList('.footer-top > div:nth-child(2) .footer-links a', ['footer.l1', 'footer.l2', 'footer.l3', 'footer.l4'])
      setList('.footer-top > div:nth-child(3) .footer-links a', ['footer.l5', 'footer.pro', 'footer.l6'])
      setList('.footer-top > div:nth-child(4) .footer-links a', ['footer.l7', 'footer.l8', 'footer.l9', 'footer.l10', 'footer.l11'])
      setText('.footer-copy', 'footer.copy')
      setText('.footer-legal a:nth-child(1)', 'footer.privacy')
      setText('.footer-legal a:nth-child(2)', 'footer.terms')

      // active-state is managed by LangSwitcherWidget (React state)
    }

    // FAQ accordion
    document.querySelectorAll<HTMLButtonElement>('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item')
        if (!item) return
        const answer = item.querySelector<HTMLElement>('.faq-answer')
        const isOpen = item.classList.contains('open')

        document.querySelectorAll('.faq-item').forEach(i => {
          i.classList.remove('open')
          const a = i.querySelector<HTMLElement>('.faq-answer')
          const c = i.querySelector<HTMLElement>('.faq-chevron')
          if (a) a.style.maxHeight = '0'
          if (c) c.textContent = '▼'
        })

        if (!isOpen && answer) {
          item.classList.add('open')
          answer.style.maxHeight = answer.scrollHeight + 'px'
          const chevron = item.querySelector<HTMLElement>('.faq-chevron')
          if (chevron) chevron.textContent = '▲'
        }
      })
    })

    // Mobile nav toggle
    const hamburger = document.getElementById('hamburger')
    const mobileNav = document.getElementById('mobileNav')
    if (hamburger && mobileNav) {
      hamburger.addEventListener('click', () => mobileNav.classList.toggle('open'))
      mobileNav.querySelectorAll('a').forEach(link =>
        link.addEventListener('click', () => mobileNav.classList.remove('open'))
      )
    }

    // Smooth scroll
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const href = a.getAttribute('href')
        const target = href ? document.querySelector(href) : null
        if (target) {
          e.preventDefault()
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    })

    // Lang switcher + i18n
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
    return () => window.removeEventListener('subcuro:lang', onLangChange)
  }, [])

  return null
}
