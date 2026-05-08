(function () {
  var TZ = 'Europe/Moscow';
  var LS_KEY = 'subcuro-dashboard-v1';

  function formatRub(n) {
    var v = Math.round(Number(n) || 0);
    var s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + s + ' ₽';
  }

  function normalizeCurrency(c) {
    c = String(c || 'RUB').toUpperCase();
    if (c === 'USD' || c === 'EUR' || c === 'RUB') return c;
    return 'RUB';
  }

  function normalizeAmountForCurrency(n, currency) {
    var x = Number(n) || 0;
    if (normalizeCurrency(currency) === 'RUB') return Math.max(0, Math.round(x));
    return Math.max(0, Math.round(x * 100) / 100);
  }

  function formatMoneyNative(amount, currency) {
    currency = normalizeCurrency(currency);
    var x = Number(amount) || 0;
    if (currency === 'USD') {
      var s = x.toFixed(2);
      var parts = s.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return '$' + parts.join('.');
    }
    if (currency === 'EUR') {
      var s2 = x.toFixed(2);
      var p2 = s2.split('.');
      p2[0] = p2[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return p2.join('.') + ' €';
    }
    var v = Math.round(x);
    var s3 = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + s3 + ' ₽';
  }

  function convertToRub(amount, currency, st) {
    currency = normalizeCurrency(currency);
    if (currency === 'RUB') return Number(amount) || 0;
    var fx = (st && st.fxRates) || {};
    var rate = fx[currency];
    if (!rate || rate <= 0) rate = currency === 'USD' ? 92 : currency === 'EUR' ? 100 : 1;
    return (Number(amount) || 0) * rate;
  }

  function monthlyEquivalentRub(p, st) {
    if (!p.active) return 0;
    var amt = Number(p.amount) || 0;
    var cur = normalizeCurrency(p.currency);
    var monthlyNat = p.cycle === 'yearly' ? amt / 12 : amt;
    return convertToRub(monthlyNat, cur, st);
  }

  function escapeAmp(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function defaultSavedCards() {
    return [
      { id: 'c1', brand: 'Visa', last4: '4488' },
      { id: 'c2', brand: 'Mastercard', last4: '9012' },
    ];
  }

  function defaultFxRates() {
    return { USD: 92, EUR: 100, updatedAt: null };
  }

  function formatPaymentAmountHtml(p, st) {
    var cur = normalizeCurrency(p.currency);
    var amt = Number(p.amount) || 0;
    var main = '<strong>' + escapeAmp(formatMoneyNative(amt, cur)) + '</strong>';
    if (p.cycle === 'yearly') {
      main += '<div style="font-size:11px;color:var(--text-muted)">за год</div>';
    }
    if (cur !== 'RUB') {
      var rubF = convertToRub(amt, cur, st);
      var rubM = p.cycle === 'yearly' ? rubF / 12 : rubF;
      main +=
        '<div style="font-size:12px;color:var(--text-muted);margin-top:2px">≈ ' +
        escapeAmp(formatRub(Math.round(rubM))) +
        ' / мес</div>';
    }
    return main;
  }

  function cardLabel(st, cardId) {
    var c = (st.savedCards || []).filter(function (x) {
      return x.id === cardId;
    })[0];
    if (!c) return 'Карта';
    return c.brand + ' ···· ' + c.last4;
  }

  function moscowYmd(d) {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d instanceof Date ? d : new Date(d));
  }

  function parseYmd(ymd) {
    var p = String(ymd).split('-').map(Number);
    return { y: p[0], m: p[1], d: p[2] };
  }

  /** UTC полдень для Y-M-D, чтобы не ловить сдвиги дат при арифметике */
  function utcNoon(y, m, d) {
    return Date.UTC(y, m - 1, d, 12, 0, 0);
  }

  function addDaysYmd(ymd, delta) {
    var p = parseYmd(ymd);
    var t = utcNoon(p.y, p.m, p.d) + delta * 86400000;
    return moscowYmd(new Date(t));
  }

  function ymdCmp(a, b) {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }

  function daysBetweenYmd(fromYmd, toYmd) {
    var a = parseYmd(fromYmd);
    var b = parseYmd(toYmd);
    return Math.round((utcNoon(b.y, b.m, b.d) - utcNoon(a.y, a.m, a.d)) / 86400000);
  }

  function defaultState() {
    var base = moscowYmd(new Date());
    return {
      payments: [
        {
          id: 'p1',
          name: 'Видео+',
          amount: 1490,
          currency: 'RUB',
          cardId: 'c1',
          cycle: 'monthly',
          nextDue: addDaysYmd(base, 1),
          active: true,
          icon: 'video',
        },
        {
          id: 'p2',
          name: 'Музыка',
          amount: 699,
          currency: 'RUB',
          cardId: 'c1',
          cycle: 'monthly',
          nextDue: addDaysYmd(base, 4),
          active: true,
          icon: 'music',
        },
        {
          id: 'p3',
          name: 'Облако',
          amount: 2990,
          currency: 'RUB',
          cardId: 'c1',
          cycle: 'yearly',
          nextDue: addDaysYmd(base, 6),
          active: true,
          icon: 'cloud',
        },
        {
          id: 'p4',
          name: 'Фитнес',
          amount: 990,
          currency: 'RUB',
          cardId: 'c2',
          cycle: 'monthly',
          nextDue: addDaysYmd(base, 10),
          active: true,
          icon: 'fitness',
        },
        {
          id: 'p5',
          name: 'Сервис (USD)',
          amount: 15.99,
          currency: 'USD',
          cardId: 'c1',
          cycle: 'monthly',
          nextDue: addDaysYmd(base, 3),
          active: true,
          icon: 'video',
        },
      ],
      lastMonthTotal: null,
      actionsPending: 4,
      notifications: [
        { id: 'n1', text: 'Скоро списание: проверьте очередь действий', read: false },
        { id: 'n2', text: 'Новый платёж можно добавить из панели «Сегодня»', read: true },
      ],
    };
  }

  var PAY_STATUSES = ['active', 'paused', 'cancelled', 'archived'];
  var COLLECTION_CATEGORIES = [
    'Развлечения',
    'Продуктивность',
    'Здоровье и образ жизни',
    'Сервисы и утилиты',
    'Покупки и повседневные сервисы',
    'Другое',
  ];

  function normalizeCategory(v) {
    var s = String(v || '').trim();
    if (!s) return 'Другое';
    var low = s.toLowerCase();
    if (
      low.indexOf('развлеч') >= 0 ||
      low.indexOf('музык') >= 0 ||
      low.indexOf('видео') >= 0 ||
      low.indexOf('music') >= 0 ||
      low.indexOf('video') >= 0 ||
      low.indexOf('кино') >= 0
    ) {
      return 'Развлечения';
    }
    if (
      low.indexOf('продукт') >= 0 ||
      low.indexOf('работ') >= 0 ||
      low.indexOf('work') >= 0 ||
      low.indexOf('edu') >= 0 ||
      low.indexOf('обуч') >= 0
    ) {
      return 'Продуктивность';
    }
    if (
      low.indexOf('здоров') >= 0 ||
      low.indexOf('фитнес') >= 0 ||
      low.indexOf('health') >= 0 ||
      low.indexOf('fit') >= 0 ||
      low.indexOf('мед') >= 0
    ) {
      return 'Здоровье и образ жизни';
    }
    if (
      low.indexOf('облак') >= 0 ||
      low.indexOf('сервис') >= 0 ||
      low.indexOf('утил') >= 0 ||
      low.indexOf('cloud') >= 0 ||
      low.indexOf('service') >= 0 ||
      low.indexOf('vpn') >= 0
    ) {
      return 'Сервисы и утилиты';
    }
    if (low.indexOf('покуп') >= 0 || low.indexOf('shop') >= 0 || low.indexOf('еда') >= 0 || low.indexOf('food') >= 0 || low.indexOf('достав') >= 0) {
      return 'Покупки и повседневные сервисы';
    }
    if (low.indexOf('общее') >= 0 || low.indexOf('другое') >= 0 || low.indexOf('other') >= 0) return 'Другое';
    return 'Другое';
  }

  function normalizePaymentIcon(id) {
    if (id == null || id === '') return 'payments';
    id = String(id);
    /* payment-icons.js может подключиться позже: не затирать id в «кошелёк» до загрузки справочника */
    if (!window.SubCuroPaymentIcons) return id;
    if (window.SubCuroPaymentIcons.isValid(id)) return id;
    return 'payments';
  }

  /** Состояние подписки в UI (пауза / отмена / архив — не сводить к одному «неактивна»). */
  function resolvePayStatus(p) {
    var s = p && p.payStatus;
    if (s && PAY_STATUSES.indexOf(s) >= 0) return s;
    return p && p.active !== false ? 'active' : 'paused';
  }

  /** Частая ошибка: валюта USD при суммах из демо в рублях — исправляем на RUB */
  function fixDemoUsdMistakenForRub(state) {
    var hints = { Фитнес: 990, Музыка: 699, 'Видео+': 1490, Облако: 2990 };
    var changed = false;
    state.payments.forEach(function (p) {
      if (normalizeCurrency(p.currency) !== 'USD') return;
      var exp = hints[p.name];
      if (exp != null && Number(p.amount) === exp) {
        p.currency = 'RUB';
        changed = true;
      }
    });
    return changed;
  }

  function ensurePaymentsMeta(state) {
    if (!state || !Array.isArray(state.payments)) return;
    if (!state.fxRates || typeof state.fxRates !== 'object') state.fxRates = defaultFxRates();
    if (!Array.isArray(state.savedCards) || !state.savedCards.length) {
      state.savedCards = defaultSavedCards();
    }
    state.payments.forEach(function (p) {
      p.icon = normalizePaymentIcon(p.icon);
      p.currency = normalizeCurrency(p.currency);
      p.category = normalizeCategory(p.category);
      if (!p.cardId) p.cardId = state.savedCards[0] && state.savedCards[0].id;
      var ps = p.payStatus;
      if (!ps || PAY_STATUSES.indexOf(ps) < 0) {
        p.payStatus = p.active !== false ? 'active' : 'paused';
      }
      p.active = p.payStatus === 'active';
    });
    recalcActionsPending(state);
  }

  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) {
        var d0 = defaultState();
        ensurePaymentsMeta(d0);
        return d0;
      }
      var s = JSON.parse(raw);
      if (!s || !Array.isArray(s.payments)) {
        var d1 = defaultState();
        ensurePaymentsMeta(d1);
        return d1;
      }
      ensurePaymentsMeta(s);
      if (fixDemoUsdMistakenForRub(s)) save(s);
      if (!Array.isArray(s.notifications)) {
        s.notifications = defaultState().notifications;
        save(s);
      }
      return s;
    } catch (e) {
      var d2 = defaultState();
      ensurePaymentsMeta(d2);
      return d2;
    }
  }

  function save(state) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function computeMonthlySpend(state) {
    var sum = 0;
    state.payments.forEach(function (p) {
      if (p.active) sum += monthlyEquivalentRub(p, state);
    });
    return sum;
  }

  function computePotentialSavings(monthlySpend) {
    return Math.min(20000, Math.round(monthlySpend * 0.22));
  }

  function recalcActionsPending(state) {
    if (!state || !Array.isArray(state.payments)) return 0;
    state.actionsPending = getActivePayments(state).length;
    return state.actionsPending;
  }

  function getActivePayments(state) {
    return state.payments.filter(function (p) {
      return p.active;
    });
  }

  function upcomingList(state, limit) {
    var t0 = moscowYmd(new Date());
    return state.payments
      .filter(function (p) {
        return p.active && p.nextDue;
      })
      .sort(function (a, b) {
        return ymdCmp(a.nextDue, b.nextDue);
      })
      .slice(0, limit || 20);
  }

  function spendOnYmd(state, ymd) {
    var sum = 0;
    state.payments.forEach(function (p) {
      if (p.active && p.nextDue === ymd) {
        sum += convertToRub(Number(p.amount) || 0, p.currency, state);
      }
    });
    return sum;
  }

  function chargesInMonthYmd(state, y, m) {
    var pad = function (n) {
      return String(n).padStart(2, '0');
    };
    var prefix = y + '-' + pad(m) + '-';
    var sum = 0;
    state.payments.forEach(function (p) {
      if (!p.active || !p.nextDue) return;
      if (p.nextDue.indexOf(prefix) === 0) {
        sum += convertToRub(Number(p.amount) || 0, p.currency, state);
      }
    });
    return sum;
  }

  function addPayment(state, payload) {
    var id = 'p' + Date.now();
    ensurePaymentsMeta(state);
    var cur = normalizeCurrency(payload && payload.currency);
    var amt = normalizeAmountForCurrency(payload && payload.amount, cur);
    state.payments.push({
      id: id,
      name: String(payload.name || 'Платёж').trim().slice(0, 60),
      amount: amt,
      currency: cur,
      cardId:
        (payload && payload.cardId) ||
        (state.savedCards[0] && state.savedCards[0].id),
      cycle: payload.cycle === 'yearly' ? 'yearly' : 'monthly',
      nextDue: String(payload.nextDue || moscowYmd(new Date())),
      active: true,
      payStatus: 'active',
      category: normalizeCategory(payload && payload.category),
      icon: normalizePaymentIcon(
        payload && payload.icon != null ? payload.icon : 'payments'
      ),
    });
    recalcActionsPending(state);
    save(state);
    return id;
  }

  function refreshFxRates(st, cb) {
    cb = cb || function () {};
    st.fxRates = st.fxRates || defaultFxRates();
    if (typeof fetch !== 'function') {
      cb(new Error('no-fetch'));
      return;
    }
    var u = 'https://api.frankfurter.app/latest';
    fetch(u + '?from=USD&to=RUB')
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (j.rates && j.rates.RUB) st.fxRates.USD = j.rates.RUB;
        return fetch(u + '?from=EUR&to=RUB');
      })
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (j.rates && j.rates.RUB) st.fxRates.EUR = j.rates.RUB;
        st.fxRates.updatedAt = moscowYmd(new Date());
        save(st);
        cb(null);
      })
      .catch(function () {
        cb(new Error('fx'));
      });
  }

  function updateSavedCard(st, id, patch) {
    (st.savedCards || []).forEach(function (c) {
      if (c.id !== id) return;
      if (patch.brand != null) c.brand = String(patch.brand).trim().slice(0, 24);
      if (patch.last4 != null) {
        c.last4 = String(patch.last4).replace(/\D/g, '').slice(0, 4);
      }
    });
    save(st);
  }

  function addSavedCard(st, payload) {
    ensurePaymentsMeta(st);
    var id = 'c' + Date.now();
    st.savedCards.push({
      id: id,
      brand: String((payload && payload.brand) || 'Карта').trim().slice(0, 24),
      last4: String((payload && payload.last4) || '0000').replace(/\D/g, '').slice(0, 4),
    });
    save(st);
    return id;
  }

  function updatePayment(state, id, patch) {
    if (!patch) return;
    state.payments.forEach(function (p) {
      if (p.id !== id) return;
      if (patch.name != null) p.name = String(patch.name).trim().slice(0, 60);
      if (patch.currency != null) {
        p.currency = normalizeCurrency(patch.currency);
      }
      if (patch.amount != null) {
        p.amount = normalizeAmountForCurrency(patch.amount, p.currency || 'RUB');
      }
      if (patch.cardId != null) p.cardId = String(patch.cardId);
      if (patch.cycle != null) p.cycle = patch.cycle === 'yearly' ? 'yearly' : 'monthly';
      if (patch.nextDue != null) p.nextDue = String(patch.nextDue);
      if (patch.payStatus != null) {
        var ps = String(patch.payStatus);
        if (PAY_STATUSES.indexOf(ps) >= 0) {
          p.payStatus = ps;
          p.active = ps === 'active';
        }
      } else if (patch.active != null) {
        p.active = !!patch.active;
        p.payStatus = p.active ? 'active' : 'paused';
      }
      if (patch.icon != null) p.icon = normalizePaymentIcon(patch.icon);
      if (patch.category != null) p.category = normalizeCategory(patch.category);
      if (patch.iconBg !== undefined) {
        if (!patch.iconBg) delete p.iconBg;
        else p.iconBg = String(patch.iconBg);
      }
      if (patch.iconShape != null) {
        var sh = patch.iconShape;
        if (sh === 'circle' || sh === 'square') p.iconShape = sh;
        else delete p.iconShape;
      }
      if (patch.cardFill !== undefined) {
        if (!patch.cardFill || patch.cardFill === 'none') delete p.cardFill;
        else if (['lavender', 'mint', 'peach'].indexOf(patch.cardFill) >= 0) p.cardFill = patch.cardFill;
      }
      if (patch.notes !== undefined) p.notes = String(patch.notes || '').slice(0, 500);
      if (patch.reminders3d != null) p.reminders3d = !!patch.reminders3d;
      if (patch.remindersTrial != null) p.remindersTrial = !!patch.remindersTrial;
      if (patch.remindersPrice != null) p.remindersPrice = !!patch.remindersPrice;
      if (patch.repeatAuto != null) p.repeatAuto = !!patch.repeatAuto;
      if (patch.autopayEnabled != null) p.autopayEnabled = !!patch.autopayEnabled;
      if (patch.linkManage !== undefined) {
        if (!patch.linkManage) delete p.linkManage;
        else p.linkManage = String(patch.linkManage).trim().slice(0, 500);
      }
      if (patch.linkCancel !== undefined) {
        if (!patch.linkCancel) delete p.linkCancel;
        else p.linkCancel = String(patch.linkCancel).trim().slice(0, 500);
      }
      if (patch.meta != null && typeof patch.meta === 'object') {
        p.meta = Object.assign({}, p.meta || {}, patch.meta);
      }
    });
    recalcActionsPending(state);
    save(state);
  }

  function removePayment(state, id) {
    state.payments = state.payments.filter(function (p) {
      return p.id !== id;
    });
    recalcActionsPending(state);
    save(state);
  }

  function percentVsLast(current, last) {
    if (!last || last <= 0) return null;
    return Math.round(((current - last) / last) * 100);
  }

  var state = load();
  if (state.lastMonthTotal == null) {
    state.lastMonthTotal = Math.round(computeMonthlySpend(state) * 0.92);
    save(state);
  }

  window.SubCuroData = {
    TZ: TZ,
    formatRub: formatRub,
    normalizeCurrency: normalizeCurrency,
    formatMoneyNative: function (amount, currency) {
      return formatMoneyNative(amount, currency);
    },
    convertToRub: function (amount, currency) {
      return convertToRub(amount, currency, state);
    },
    formatPaymentAmountHtml: function (p) {
      return formatPaymentAmountHtml(p, state);
    },
    cardLabel: function (cardId) {
      return cardLabel(state, cardId);
    },
    getSavedCards: function () {
      return (state.savedCards || []).slice();
    },
    getFxRates: function () {
      return Object.assign({}, state.fxRates || {});
    },
    refreshFxRates: function (cb) {
      refreshFxRates(state, cb);
    },
    updateSavedCard: function (id, patch) {
      updateSavedCard(state, id, patch);
    },
    addSavedCard: function (payload) {
      return addSavedCard(state, payload);
    },
    moscowYmd: moscowYmd,
    addDaysYmd: addDaysYmd,
    daysBetweenYmd: daysBetweenYmd,
    resolvePayStatus: function (p) {
      return resolvePayStatus(p);
    },
    normalizeCategory: normalizeCategory,
    collectionCategories: function () {
      return COLLECTION_CATEGORIES.slice();
    },
    load: function () {
      state = load();
      return state;
    },
    getState: function () {
      return state;
    },
    save: function () {
      save(state);
    },
    resetDemo: function () {
      state = defaultState();
      ensurePaymentsMeta(state);
      state.lastMonthTotal = Math.round(computeMonthlySpend(state) * 0.92);
      save(state);
    },
    computeMonthlySpend: function () {
      return computeMonthlySpend(state);
    },
    computePotentialSavings: function () {
      return computePotentialSavings(computeMonthlySpend(state));
    },
    getActiveCount: function () {
      return getActivePayments(state).length;
    },
    upcomingList: function (n) {
      return upcomingList(state, n);
    },
    spendOnYmd: function (ymd) {
      return spendOnYmd(state, ymd);
    },
    chargesInMonthYmd: function (y, m) {
      return chargesInMonthYmd(state, y, m);
    },
    addPayment: function (payload) {
      return addPayment(state, payload);
    },
    removePayment: function (id) {
      removePayment(state, id);
    },
    updatePayment: function (id, patch) {
      updatePayment(state, id, patch);
    },
    percentVsLast: function () {
      var cur = computeMonthlySpend(state);
      return percentVsLast(cur, state.lastMonthTotal);
    },
    getActionsPending: function () {
      return recalcActionsPending(state);
    },
    /** Сумма списаний в календарном месяце Москвы по nextDue (упрощённо) */
    monthChargesTotal: function () {
      var parts = parseYmd(moscowYmd(new Date()));
      return chargesInMonthYmd(state, parts.y, parts.m);
    },
    patchSidebarBadges: function () {
      var root = document.getElementById('sidebar-root');
      if (!root) return;
      var g = root.querySelector('a[href="payments.html"] .nav-badge');
      var r = root.querySelector('a[href="actions.html"] .nav-badge');
      if (g && g.classList.contains('green')) g.textContent = String(getActivePayments(state).length);
      if (r && r.classList.contains('red')) r.textContent = String(recalcActionsPending(state));
    },
    getNotifications: function () {
      return state.notifications || [];
    },
    markNotifRead: function (id) {
      (state.notifications || []).forEach(function (n) {
        if (n.id === id) n.read = true;
      });
      save(state);
    },
  };
})();

