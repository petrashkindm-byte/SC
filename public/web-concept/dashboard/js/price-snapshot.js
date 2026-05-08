/**
 * Локальные снимки цены с официальной страницы тарифов (ручной ввод после проверки на сайте).
 * Сравнение с суммой платежа в приложении — без парсинга чужих сайтов.
 */
(function () {
  var KEY = 'subcuro_price_snap_v1';

  function readAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeAll(obj) {
    try {
      localStorage.setItem(KEY, JSON.stringify(obj));
    } catch (e) {}
  }

  function get(catalogId) {
    if (!catalogId) return null;
    var rec = readAll()[catalogId];
    if (!rec || typeof rec.monthlyRub !== 'number') return null;
    return rec;
  }

  /**
   * @param {string} catalogId — id из SubCuroServiceCatalog
   * @param {number} monthlyRub — цена / мес с сайта, ₽
   * @param {{ title?: string, pricingUrl?: string }} meta
   */
  function setRecord(catalogId, monthlyRub, meta) {
    if (!catalogId) return null;
    var v = Math.max(0, Math.round(Number(monthlyRub) || 0));
    if (v <= 0) return null;
    var all = readAll();
    var prev = all[catalogId];
    all[catalogId] = {
      monthlyRub: v,
      title: (meta && meta.title) || '',
      pricingUrl: (meta && meta.pricingUrl) || '',
      savedAt: new Date().toISOString(),
      previousRub: prev && typeof prev.monthlyRub === 'number' ? prev.monthlyRub : null,
      previousAt: prev && prev.savedAt ? prev.savedAt : null,
    };
    writeAll(all);
    return all[catalogId];
  }

  function remove(catalogId) {
    if (!catalogId) return;
    var all = readAll();
    delete all[catalogId];
    writeAll(all);
  }

  function formatRuDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  /**
   * Сравнение: цена в приложении vs последний снимок «как на сайте».
   */
  function compareToApp(snap, appMonthlyRub) {
    if (!snap) return { kind: 'none' };
    var app = Math.max(0, Math.round(Number(appMonthlyRub) || 0));
    var web = snap.monthlyRub;
    if (app <= 0) return { kind: 'no_app', web: web };
    var d = Math.abs(app - web);
    var rel = web > 0 ? d / web : 0;
    if (d >= 15 || rel >= 0.08) {
      return { kind: 'mismatch', app: app, web: web, delta: app - web };
    }
    return { kind: 'aligned', app: app, web: web };
  }

  /** Изменение относительно прошлого снимка (после обновления). */
  function trendFromPrevious(snap) {
    if (!snap || snap.previousRub == null) return { kind: 'none' };
    var d = snap.monthlyRub - snap.previousRub;
    if (Math.abs(d) < 1) return { kind: 'flat', prev: snap.previousRub, now: snap.monthlyRub };
    return { kind: d > 0 ? 'up' : 'down', prev: snap.previousRub, now: snap.monthlyRub, delta: d };
  }

  window.SubCuroPriceSnapshot = {
    get: get,
    setRecord: setRecord,
    remove: remove,
    formatRuDate: formatRuDate,
    compareToApp: compareToApp,
    trendFromPrevious: trendFromPrevious,
    readAll: readAll,
  };
})();
