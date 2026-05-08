/**
 * Компактная библиотека сценариев экономии: без дублей по смыслу.
 * expand() отдаёт не больше maxTotal сценариев и не больше limitPerTag на категорию.
 */
(function () {
  function matches(needs, ctx) {
    for (var i = 0; i < needs.length; i++) {
      var n = needs[i];
      if (n === 'save_pos' && ctx.save <= 0) return false;
      if (n === 'multi' && ctx.rowCount < 2) return false;
      if (n === 'three_plus' && ctx.rowCount < 3) return false;
      if (n === 'catalog' && !ctx.catalog) return false;
      if (n === 'annual_ok' && (!ctx.catalog || !ctx.catalog.annualMonthsCost || ctx.catalog.annualMonthsCost >= 12)) return false;
      if (n === 'family_ok' && (!ctx.catalog || !ctx.catalog.familyPlanHint)) return false;
      if (n === 'not_yearly' && ctx.recommendedYearly) return false;
      if (n === 'usage' && !ctx.hasUsage) return false;
      if (n === 'high_save' && ctx.save < 200) return false;
      if (n === 'pricing_url' && !ctx.pricingUrl) return false;
    }
    return true;
  }

  function m(ctx, factor) {
    return Math.max(0, Math.round(ctx.save * factor));
  }

  function buildTemplates() {
    var cl = '{cluster}';
    var kn = '{keep}';
    return [
      {
        id: 'dup_main',
        tag: 'Дубликаты',
        needs: ['save_pos', 'multi'],
        factor: 1,
        title: 'Оставить «' + kn + '», отключить пересечения в «' + cl + '»',
        whyTpl: 'Сумма всех похожих подписок минус выбранный основной сервис — максимальный реальный эффект.',
        track: false,
      },
      {
        id: 'pause_soft',
        tag: 'Пауза',
        needs: ['save_pos', 'multi'],
        factor: 0.45,
        title: 'Пауза для лишних сервисов в группе',
        whyTpl: 'Временно остановить списания у второстепенных, не отменяя полностью.',
        track: false,
      },
      {
        id: 'tariff_mix',
        tag: 'Тариф',
        needs: ['save_pos', 'multi'],
        factor: 0.38,
        title: 'Дешевле тариф или отказ от редких опций',
        whyTpl: 'Даунгрейд плана или отключение дополнений без потери ядра — часть потенциала экономии.',
        track: true,
      },
      {
        id: 'annual_one',
        tag: 'Годовой',
        needs: ['save_pos', 'annual_ok', 'not_yearly', 'catalog'],
        factor: 0,
        title: 'Годовая оплата вместо 12 месяцев',
        whyTpl: 'По каталогу: год ≈ N месяцев по цене; разница — ориентир экономии.',
        track: true,
        monthlyOverride: function (ctx) {
          var mc = ctx.catalog && ctx.catalog.annualMonthsCost;
          if (!mc || mc >= 12) return 0;
          var base = ctx.recommendedRow ? ctx.recommendedMonthly : 0;
          return Math.max(0, Math.round(base * (12 - mc)));
        },
      },
      {
        id: 'family_one',
        tag: 'Семья',
        needs: ['save_pos', 'family_ok', 'catalog'],
        factor: 0.18,
        title: 'Семейный / Duo вместо двух отдельных подписок',
        whyTpl: 'Если в доме несколько пользователей — один семейный план часто дешевле двух индивидуальных.',
        track: true,
      },
      {
        id: 'use_focus',
        tag: 'Активность',
        needs: ['save_pos', 'multi', 'usage'],
        factor: 0.4,
        title: 'Ориентир по времени: оставить то, чем реально пользуетесь',
        whyTpl: 'По данным активности выше ценность у сервиса с большим временем — дубль логичнее убрать или поставить на паузу.',
        track: false,
      },
      {
        id: 'promo_site',
        tag: 'Промо',
        needs: ['save_pos', 'catalog'],
        factor: 0.12,
        title: 'Льготы и акции на сайте провайдера',
        whyTpl: 'Студенческие, семейные и сезонные предложения — проверьте на официальной странице тарифов.',
        track: true,
      },
      {
        id: 'bundle_one',
        tag: 'Пакеты',
        needs: ['save_pos', 'three_plus'],
        factor: 0.2,
        title: 'Один пакет вместо нескольких пересекающихся',
        whyTpl: 'При многих подписках один bundle у экосистемы может заменить две строки в бюджете.',
        track: true,
      },
      {
        id: 'retain_one',
        tag: 'Удержание',
        needs: ['save_pos', 'high_save'],
        factor: 0.22,
        title: 'Скидка удержания перед отменой',
        whyTpl: 'Часть сервисов предлагает скидку при попытке отключения — имеет смысл уточнить в поддержке.',
        track: true,
      },
      {
        id: 'pw_track',
        tag: 'Цена на сайте',
        needs: ['save_pos', 'pricing_url'],
        factor: 0.06,
        title: 'Сверка «' + kn + '» с официальным прайсом',
        whyTpl: 'Регулярно сравнивайте сумму в приложении с ценой на сайте; при расхождении обновите подписку или тариф.',
        track: true,
        forceTrackLink: true,
      },
      {
        id: 'pw_snap',
        tag: 'Цена на сайте',
        needs: ['save_pos', 'pricing_url'],
        factor: 0.05,
        title: 'Запоминать цену с сайта при продлении',
        whyTpl: 'Сохраняйте снимок тарифа и отслеживайте изменения при следующем продлении.',
        track: true,
        forceTrackLink: true,
      },
    ];
  }

  var TEMPLATES = buildTemplates();

  /** Лимиты на категорию (остальные теги — по 1). */
  var TAG_LIMIT = { 'Цена на сайте': 2 };
  var MAX_TOTAL = 10;

  function resolveTitle(tpl, ctx) {
    return tpl.title.replace(/\{cluster\}/g, ctx.clusterTitle || 'группа').replace(/\{keep\}/g, ctx.keepName || 'основной сервис');
  }

  function resolveWhy(tpl, ctx) {
    var w = tpl.whyTpl.replace(/\{cluster\}/g, ctx.clusterTitle || 'группа').replace(/\{keep\}/g, ctx.keepName || 'основной сервис');
    if (tpl.tag === 'Семья' && ctx.catalog && ctx.catalog.familyPlanHint) {
      w += ' Подсказка: ' + ctx.catalog.familyPlanHint + '.';
    }
    return w;
  }

  function expand(ctx) {
    var raw = [];
    TEMPLATES.forEach(function (tpl) {
      if (!matches(tpl.needs, ctx)) return;
      var monthly = typeof tpl.monthlyOverride === 'function' ? tpl.monthlyOverride(ctx) : m(ctx, tpl.factor);
      if (monthly <= 0 && tpl.needs.indexOf('annual_ok') < 0) return;
      if (tpl.needs.indexOf('annual_ok') >= 0 && monthly <= 0) return;
      var yearly = monthly * 12;
      var showLink = !!(tpl.forceTrackLink || (tpl.track && ctx.pricingUrl));
      raw.push({
        id: tpl.id,
        tag: tpl.tag,
        title: resolveTitle(tpl, ctx),
        monthly: monthly,
        yearly: yearly,
        why: resolveWhy(tpl, ctx),
        pricingUrl: showLink ? ctx.pricingUrl : '',
        pricingTitle: ctx.catalog && ctx.catalog.title ? ctx.catalog.title : ctx.keepName,
        catalogId: showLink && ctx.catalog && ctx.catalog.id ? String(ctx.catalog.id) : '',
        _prio: tpl.tag === 'Дубликаты' ? 1000 : monthly,
      });
    });
    raw.sort(function (a, b) {
      if (b._prio !== a._prio) return b._prio - a._prio;
      return b.monthly - a.monthly;
    });
    var countByTag = {};
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var x = raw[i];
      var tag = x.tag;
      var lim = TAG_LIMIT[tag] != null ? TAG_LIMIT[tag] : 1;
      var c = countByTag[tag] || 0;
      if (c >= lim) continue;
      countByTag[tag] = c + 1;
      delete x._prio;
      out.push(x);
      if (out.length >= MAX_TOTAL) break;
    }
    return out;
  }

  window.SubCuroScenarioLibrary = {
    templateCount: TEMPLATES.length,
    expand: expand,
  };
})();
