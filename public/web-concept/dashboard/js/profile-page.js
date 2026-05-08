(function () {
  var D = window.SubCuroData;
  if (!D) return;
  var PREF_KEY = 'subcuro-profile-prefs-v1';
  var toastTimer = null;
  var prefs = loadPrefs();

  function capitalizeRu(s) {
    if (!s) return s;
    return s.charAt(0).toLocaleUpperCase('ru-RU') + s.slice(1);
  }

  function headerDate() {
    var raw = new Intl.DateTimeFormat('ru-RU', {
      timeZone: D.TZ,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
    return capitalizeRu(raw.replace(/\s?г\.?$/, '').trim());
  }

  function loadPrefs() {
    var p = { theme: 'system', currency: 'RUB' };
    try {
      var raw = localStorage.getItem(PREF_KEY);
      if (!raw) return p;
      var v = JSON.parse(raw);
      if (v && typeof v === 'object') {
        if (v.theme === 'system' || v.theme === 'light' || v.theme === 'dark') p.theme = v.theme;
        if (v.currency === 'RUB' || v.currency === 'USD' || v.currency === 'EUR') p.currency = v.currency;
      }
    } catch (e) {}
    return p;
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  function showToast(text, isWarn) {
    var t = document.getElementById('profile-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'profile-toast';
      t.className = 'profile-toast';
      document.body.appendChild(t);
    }
    t.classList.toggle('profile-toast--warn', !!isWarn);
    t.textContent = text;
    t.classList.add('is-on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('is-on');
    }, 2200);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function themeLabel(v) {
    if (v === 'light') return 'Светлая';
    if (v === 'dark') return 'Тёмная';
    return 'Системная';
  }

  function bindSegmented(root) {
    root.querySelectorAll('.segmented[data-pref-group]').forEach(function (seg) {
      var group = seg.getAttribute('data-pref-group');
      var activeValue = prefs[group];
      seg.querySelectorAll('button[data-pref-value]').forEach(function (btn) {
        if (btn.getAttribute('data-pref-value') === activeValue) btn.classList.add('on');
        else btn.classList.remove('on');
        btn.addEventListener('click', function () {
          seg.querySelectorAll('button').forEach(function (b) {
            b.classList.remove('on');
          });
          btn.classList.add('on');
          prefs[group] = btn.getAttribute('data-pref-value');
          savePrefs();
          if (group === 'theme') showToast('Тема: ' + themeLabel(prefs.theme));
          else showToast('Базовая валюта: ' + prefs.currency);
        });
      });
    });
  }

  function bindActions(root) {
    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (!el) return;
      e.preventDefault();
      var action = el.getAttribute('data-action');
      if (action === 'account') return showToast('Редактирование профиля в демо недоступно');
      if (action === 'import-csv') return openImportCsv();
      if (action === 'connect-bank') return showToast('Скоро: подключение банка через Open Banking');
      if (action === 'export-csv') return exportCsvAndStyledTable();
      if (action === 'export-report') return exportHtmlReport();
      if (action === 'privacy-policy') return openPrivacyPolicy();
      if (action === 'delete-data') return destroyDataWithConfirm();
      if (action === 'logout') return logoutDemo();
    });
  }

  function downloadBlob(filename, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 600);
  }

  function csvParseLine(line, sep) {
    var out = [];
    var cur = '';
    var q = false;
    var i;
    for (i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (ch === '"') {
        if (q && line.charAt(i + 1) === '"') {
          cur += '"';
          i++;
        } else q = !q;
      } else if (ch === sep && !q) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out;
  }

  function findHeader(headers, aliases) {
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i].replace(/\s/g, '');
      for (var j = 0; j < aliases.length; j++) {
        if (h === aliases[j]) return i;
      }
    }
    return -1;
  }

  function getBy(arr, idx) {
    if (idx == null || idx < 0 || idx >= arr.length) return '';
    return String(arr[idx] || '').trim();
  }

  function normalizeDate(v) {
    var s = String(v || '').trim();
    if (!s) return D.moscowYmd(new Date());
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (m) return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
    return D.moscowYmd(new Date());
  }

  function openImportCsv() {
    var input = document.getElementById('profile-import-csv-input');
    if (!input) return;
    input.value = '';
    input.onchange = function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        var txt = String(r.result || '');
        var res = importCsvText(txt);
        if (res.added > 0) {
          D.patchSidebarBadges();
          showToast('Импортировано подписок: ' + res.added);
        } else showToast('В CSV не найдено валидных строк', true);
      };
      r.readAsText(f, 'utf-8');
    };
    input.click();
  }

  function importCsvText(text) {
    var lines = String(text || '')
      .replace(/\r/g, '')
      .split('\n')
      .filter(function (x) {
        return x.trim().length > 0;
      });
    if (!lines.length) return { added: 0 };
    var sep = lines[0].indexOf(';') >= 0 ? ';' : ',';
    var head = csvParseLine(lines[0], sep).map(function (x) {
      return x.trim().toLowerCase();
    });
    var map = {
      name: findHeader(head, ['name', 'название', 'сервис']),
      amount: findHeader(head, ['amount', 'сумма']),
      currency: findHeader(head, ['currency', 'валюта']),
      cycle: findHeader(head, ['cycle', 'период', 'частота']),
      nextDue: findHeader(head, ['nextdue', 'next_due', 'дата', 'следующее']),
      category: findHeader(head, ['category', 'категория']),
    };
    var added = 0;
    for (var i = 1; i < lines.length; i++) {
      var row = csvParseLine(lines[i], sep);
      var name = getBy(row, map.name) || 'Новая подписка';
      var amount = Number(String(getBy(row, map.amount) || '').replace(',', '.'));
      if (!isFinite(amount) || amount <= 0) continue;
      var currency = String(getBy(row, map.currency) || prefs.currency || 'RUB').toUpperCase();
      if (['RUB', 'USD', 'EUR'].indexOf(currency) < 0) currency = 'RUB';
      var cycleRaw = String(getBy(row, map.cycle) || 'monthly').toLowerCase();
      var cycle = cycleRaw.indexOf('year') >= 0 || cycleRaw.indexOf('год') >= 0 ? 'yearly' : 'monthly';
      var nextDue = normalizeDate(getBy(row, map.nextDue));
      var category = String(getBy(row, map.category) || '').trim();
      var id = D.addPayment({ name: name, amount: amount, currency: currency, cycle: cycle, nextDue: nextDue });
      if (category) D.updatePayment(id, { category: category });
      added++;
    }
    return { added: added };
  }

  function quoteCsv(v) {
    var s = String(v == null ? '' : v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function reportLang() {
    var lang = String((document.documentElement && document.documentElement.lang) || 'ru').toLowerCase();
    return lang.indexOf('en') === 0 ? 'en' : 'ru';
  }

  function i18n(key) {
    var dict = {
      en: {
        unknown: 'Unknown',
        uncategorized: 'Uncategorized',
        paused: 'Paused',
        canceled: 'Canceled',
        archived: 'Archived',
        active: 'Active',
        yearly: 'Yearly',
        monthly: 'Monthly',
        paymentsTableTitle: 'SubCuro Payments Table',
        reportTitle: 'Subscription Report',
        generatedOn: 'Generated on',
        generatedAt: 'Generated at',
        subscriptions: 'subscriptions',
        service: 'Service',
        amount: 'Amount',
        billing: 'Billing',
        nextCharge: 'Next Charge',
        status: 'Status',
        category: 'Category',
        activeSubscriptions: 'Active Subscriptions',
        monthlySpend: 'Monthly Spend',
        yearlyProjection: 'Yearly Projection',
        exportFoot: 'SubCuro Export · Confidential internal use only',
        reportFoot: 'SubCuro Analytics Report · Internal use',
        csvHeader: 'service_name,amount,currency,billing,next_charge,status,category',
      },
      ru: {
        unknown: 'Неизвестно',
        uncategorized: 'Без категории',
        paused: 'На паузе',
        canceled: 'Отменён',
        archived: 'В архиве',
        active: 'Активна',
        yearly: 'Ежегодно',
        monthly: 'Ежемесячно',
        paymentsTableTitle: 'Таблица платежей SubCuro',
        reportTitle: 'Отчёт по подпискам',
        generatedOn: 'Сформировано',
        generatedAt: 'Сформировано',
        subscriptions: 'подписок',
        service: 'Сервис',
        amount: 'Сумма',
        billing: 'Период',
        nextCharge: 'Следующее списание',
        status: 'Статус',
        category: 'Категория',
        activeSubscriptions: 'Активных подписок',
        monthlySpend: 'В месяц',
        yearlyProjection: 'В год',
        exportFoot: 'Экспорт SubCuro · Для внутреннего использования',
        reportFoot: 'Отчёт SubCuro Analytics · Для внутреннего использования',
        csvHeader: 'service_name,amount,currency,billing,next_charge,status,category',
      },
    };
    var lang = reportLang();
    return (dict[lang] && dict[lang][key]) || dict.en[key] || key;
  }

  function formatDateByLang(ymd) {
    if (!ymd) return '';
    var p = String(ymd).split('-').map(Number);
    if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return String(ymd);
    var lang = reportLang() === 'en' ? 'en-GB' : 'ru-RU';
    return new Intl.DateTimeFormat(lang, {
      timeZone: D.TZ,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0)));
  }

  function statusLocalized(s) {
    if (s === 'paused') return i18n('paused');
    if (s === 'cancelled') return i18n('canceled');
    if (s === 'archived') return i18n('archived');
    if (s === 'active') return i18n('active');
    return String(s || i18n('unknown'));
  }

  function cycleLocalized(c) {
    return c === 'yearly' ? i18n('yearly') : i18n('monthly');
  }

  function categoryLocalized(cat) {
    var s = String(cat || '').trim();
    if (!s) return i18n('uncategorized');
    var map = {
      'Развлечения': 'Entertainment',
      'Здоровье': 'Health',
      'Продуктивность': 'Productivity',
      'Облако': 'Cloud',
      'Без категории': i18n('uncategorized'),
    };
    if (reportLang() === 'ru') {
      var rev = {
        Entertainment: 'Развлечения',
        Health: 'Здоровье',
        Productivity: 'Продуктивность',
        Cloud: 'Облако',
        Uncategorized: 'Без категории',
      };
      return rev[s] || s;
    }
    return map[s] || s;
  }

  function logoSvgMarkup() {
    return (
      '<svg width="22" height="22" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs><linearGradient id="gvx" x1="314" y1="189" x2="699" y2="404" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8D7AB8"/><stop offset="1" stop-color="#6C5995"/></linearGradient><linearGradient id="gtx" x1="723" y1="593" x2="326" y2="840" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#67CFC8"/><stop offset="1" stop-color="#35AAA3"/></linearGradient></defs>' +
      '<path d="M656 181C764 181 838 244 838 336C838 415 791 468 689 511L478 599C438 616 418 638 418 668C418 714 460 744 522 744C590 744 649 721 704 680C719 668 738 669 751 683L793 725C807 738 807 759 793 772C716 846 620 882 505 882C350 882 256 804 256 682C256 584 313 519 430 476L626 403C670 387 692 366 692 333C692 294 657 267 601 267C544 267 491 287 439 326C424 338 405 338 392 325L349 285C336 272 336 251 349 239C426 171 529 181 656 181Z" fill="url(#gvx)"/>' +
      '<path d="M368 843C260 843 186 780 186 688C186 609 233 556 335 513L546 425C586 408 606 386 606 356C606 310 564 280 502 280C434 280 375 303 320 344C305 356 286 355 273 341L231 299C218 286 218 265 232 252C309 178 405 141 520 141C675 141 769 219 769 341C769 439 712 504 595 547L399 620C355 636 333 657 333 690C333 729 368 757 424 757C481 757 534 737 586 698C601 686 620 687 633 700L676 740C689 753 689 774 675 786C598 854 495 843 368 843Z" fill="url(#gtx)"/>' +
      '</svg>'
    );
  }

  function loadXlsxLib(cb) {
    if (window.XLSX) return cb(null, window.XLSX);
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.async = true;
    s.onload = function () {
      if (window.XLSX) cb(null, window.XLSX);
      else cb(new Error('xlsx-lib-missing'));
    };
    s.onerror = function () {
      cb(new Error('xlsx-lib-failed'));
    };
    document.head.appendChild(s);
  }

  function buildTableRows(list) {
    return list
      .map(function (p) {
        var status = D.resolvePayStatus(p);
        return (
          '<tr><td><strong>' +
          escapeHtml(p.name || '') +
          '</strong></td><td>' +
          escapeHtml(D.formatMoneyNative(p.amount, p.currency)) +
          '</td><td>' +
          escapeHtml(cycleLocalized(p.cycle)) +
          '</td><td>' +
          escapeHtml(formatDateByLang(p.nextDue || '')) +
          '</td><td>' +
          '<span class="badge st-' +
          escapeHtml(status) +
          '">' +
          escapeHtml(statusLocalized(status)) +
          '</span>' +
          '</td></tr>'
        );
      })
      .join('');
  }

  function buildTableHtml(list, title) {
    return (
      '<!doctype html><html lang="' +
      reportLang() +
      '"><head><meta charset="utf-8"><title>' +
      escapeHtml(title) +
      '</title><style>body{font-family:Inter,system-ui,sans-serif;background:linear-gradient(180deg,#f5f0e8,#f6f7fb);color:#1a1a2e;padding:24px}.wrap{max-width:1040px;margin:0 auto;position:relative;background:#fff;border:1px solid rgba(26,26,61,.08);border-radius:18px;padding:22px;overflow:hidden;box-shadow:0 8px 28px rgba(26,26,61,.08)}.water{position:absolute;right:18px;bottom:12px;font-size:40px;font-weight:700;color:rgba(91,67,212,.055);pointer-events:none;user-select:none;white-space:nowrap}.head{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;margin-bottom:14px}.brandline{display:flex;align-items:center;gap:8px;margin-bottom:2px}.brand{font-size:12px;font-weight:700;color:#5b43d4;letter-spacing:.08em;text-transform:uppercase}h1{margin:0;font-size:24px;letter-spacing:-.02em}p{margin:6px 0 0;color:#6b6b80;font-size:13px}.pill{padding:7px 12px;border-radius:999px;background:#ede9fc;color:#5b43d4;font-size:12px;font-weight:600}.table-wrap{border:1px solid rgba(26,26,61,.08);border-radius:14px;overflow:hidden;position:relative}table{width:100%;border-collapse:collapse;background:#fff}th,td{padding:11px 12px;border-bottom:1px solid rgba(26,26,61,.08);font-size:13px;text-align:left}th{font-size:11px;color:#6b6b80;text-transform:uppercase;letter-spacing:.06em;background:#fafafe}.badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:600}.st-active{background:#ede9fc;color:#5b43d4}.st-paused{background:#fff4e0;color:#b35a00}.st-cancelled,.st-canceled{background:#fdecec;color:#e5484d}.st-archived{background:#ececf0;color:#6b6b80}.foot{margin-top:10px;font-size:11px;color:#8b8ba3}</style></head><body><div class="wrap"><div class="water">SubCuro</div><div class="head"><div><div class="brandline">' +
      logoSvgMarkup() +
      '<div class="brand">SubCuro</div></div><h1>' +
      escapeHtml(title) +
      '</h1><p>' +
      i18n('generatedOn') +
      ' ' +
      escapeHtml(new Intl.DateTimeFormat(reportLang() === 'en' ? 'en-GB' : 'ru-RU', { dateStyle: 'full', timeZone: D.TZ }).format(new Date())) +
      '</p></div><div class="pill">' +
      list.length +
      ' ' +
      i18n('subscriptions') +
      '</div></div><div class="table-wrap"><table><thead><tr><th>' +
      i18n('service') +
      '</th><th>' +
      i18n('amount') +
      '</th><th>' +
      i18n('billing') +
      '</th><th>' +
      i18n('nextCharge') +
      '</th><th>' +
      i18n('status') +
      '</th></tr></thead><tbody>' +
      buildTableRows(list) +
      '</tbody></table></div><div class="foot">' +
      i18n('exportFoot') +
      '</div></div></body></html>'
    );
  }

  function buildReportHtml(list) {
    var monthly = Math.round(D.computeMonthlySpend());
    var yearly = Math.round(monthly * 12);
    return (
      '<!doctype html><html lang="' +
      reportLang() +
      '"><head><meta charset="utf-8"><title>' +
      escapeHtml(i18n('reportTitle')) +
      '</title><style>body{font-family:Inter,system-ui,sans-serif;background:linear-gradient(180deg,#f5f0e8,#f6f7fb);color:#1a1a2e;padding:24px}.card{max-width:1040px;margin:0 auto;background:#fff;border:1px solid rgba(26,26,61,.08);border-radius:18px;padding:24px;position:relative;overflow:hidden;box-shadow:0 8px 28px rgba(26,26,61,.08)}.water{position:absolute;right:20px;bottom:12px;font-size:42px;font-weight:700;color:rgba(91,67,212,.055);pointer-events:none;user-select:none;white-space:nowrap}.top{display:flex;justify-content:space-between;gap:12px;align-items:flex-end}.brandline{display:flex;align-items:center;gap:8px}.brand{font-size:12px;font-weight:700;color:#5b43d4;letter-spacing:.08em;text-transform:uppercase}h1{margin:2px 0 0;font-size:26px;letter-spacing:-.02em}.sub{margin:7px 0 0;color:#6b6b80;font-size:13px}.kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0 18px}.k{border:1px solid rgba(26,26,61,.08);border-radius:12px;padding:12px;background:#fff}.k h3{margin:0;font-size:11px;color:#6b6b80;font-weight:600;text-transform:uppercase;letter-spacing:.06em}.k div{margin-top:7px;font-size:24px;font-weight:700}.k:nth-child(2) div{color:#12b76a}.k:nth-child(3) div{color:#5b43d4}.table-wrap{border:1px solid rgba(26,26,61,.08);border-radius:14px;overflow:hidden}table{width:100%;border-collapse:collapse}th,td{padding:11px 12px;border-bottom:1px solid rgba(26,26,61,.08);font-size:13px;text-align:left}th{font-size:11px;color:#6b6b80;text-transform:uppercase;letter-spacing:.06em;background:#fafafe}.badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:600}.st-active{background:#ede9fc;color:#5b43d4}.st-paused{background:#fff4e0;color:#b35a00}.st-cancelled,.st-canceled{background:#fdecec;color:#e5484d}.st-archived{background:#ececf0;color:#6b6b80}.foot{margin-top:10px;font-size:11px;color:#8b8ba3}</style></head><body><section class="card"><div class="water">SubCuro</div><div class="top"><div><div class="brandline">' +
      logoSvgMarkup() +
      '<div class="brand">SubCuro</div></div><h1>' +
      escapeHtml(i18n('reportTitle')) +
      '</h1><p class="sub">' +
      i18n('generatedAt') +
      ' ' +
      escapeHtml(new Intl.DateTimeFormat(reportLang() === 'en' ? 'en-GB' : 'ru-RU', { dateStyle: 'full', timeStyle: 'short', timeZone: D.TZ }).format(new Date())) +
      '</p></div></div><div class="kpis"><div class="k"><h3>' +
      i18n('activeSubscriptions') +
      '</h3><div>' +
      D.getActiveCount() +
      '</div></div><div class="k"><h3>' +
      i18n('monthlySpend') +
      '</h3><div>' +
      escapeHtml(D.formatRub(monthly)) +
      '</div></div><div class="k"><h3>' +
      i18n('yearlyProjection') +
      '</h3><div>' +
      escapeHtml(D.formatRub(yearly)) +
      '</div></div></div><div class="table-wrap"><table><thead><tr><th>' +
      i18n('service') +
      '</th><th>' +
      i18n('amount') +
      '</th><th>' +
      i18n('billing') +
      '</th><th>' +
      i18n('nextCharge') +
      '</th><th>' +
      i18n('status') +
      '</th></tr></thead><tbody>' +
      buildTableRows(list) +
      '</tbody></table></div><div class="foot">' +
      i18n('reportFoot') +
      '</div></section></body></html>'
    );
  }

  function exportXlsxWorkbook(list, done) {
    loadXlsxLib(function (err, XLSX) {
      if (err || !XLSX) return done(err || new Error('xlsx-lib-missing'));
      try {
        var rows = [
          ['SubCuro Payments Export'],
          [
            i18n('generatedAt'),
            new Intl.DateTimeFormat(reportLang() === 'en' ? 'en-GB' : 'ru-RU', {
              dateStyle: 'full',
              timeStyle: 'short',
              timeZone: D.TZ,
            }).format(new Date()),
          ],
          [],
          [i18n('service'), i18n('amount'), 'Currency', i18n('billing'), i18n('nextCharge'), i18n('status'), i18n('category')],
        ];
        list.forEach(function (p) {
          rows.push([
            p.name || '',
            Number(p.amount || 0),
            String((p.currency || 'RUB').toUpperCase()),
            cycleLocalized(p.cycle),
            formatDateByLang(p.nextDue || ''),
            statusLocalized(D.resolvePayStatus(p)),
            categoryLocalized(p.category || ''),
          ]);
        });
        var ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [
          { wch: 28 },
          { wch: 12 },
          { wch: 10 },
          { wch: 12 },
          { wch: 16 },
          { wch: 12 },
          { wch: 18 },
        ];
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Payments');
        XLSX.writeFile(wb, 'subcuro-payments.xlsx');
        done(null);
      } catch (e) {
        done(e);
      }
    });
  }

  function exportCsvAndStyledTable() {
    var list = D.getState().payments.slice();
    var csv = [];
    csv.push('# SubCuro export');
    csv.push(i18n('csvHeader'));
    list.forEach(function (p) {
      csv.push(
        [
          quoteCsv(p.name || ''),
          Number(p.amount || 0),
          quoteCsv((p.currency || 'RUB').toUpperCase()),
          quoteCsv(p.cycle === 'yearly' ? 'yearly' : 'monthly'),
          quoteCsv(p.nextDue || ''),
          quoteCsv(statusLocalized(D.resolvePayStatus(p))),
          quoteCsv(categoryLocalized(p.category || '')),
        ].join(',')
      );
    });
    downloadBlob('subcuro-payments.csv', new Blob(['\uFEFF' + csv.join('\n')], { type: 'text/csv;charset=utf-8' }));
    downloadBlob(
      'subcuro-payments-table.html',
      new Blob([buildTableHtml(list, i18n('paymentsTableTitle'))], { type: 'text/html;charset=utf-8' })
    );
    exportXlsxWorkbook(list, function (err) {
      if (err) {
        showToast('CSV + HTML exported. XLSX unavailable (check internet).', true);
      } else {
        showToast('Export ready: CSV + HTML + XLSX');
      }
    });
  }

  function exportHtmlReport() {
    var list = D.getState().payments.slice();
    downloadBlob('subcuro-report.html', new Blob([buildReportHtml(list)], { type: 'text/html;charset=utf-8' }));
    showToast('Styled HTML report exported');
  }

  function openPrivacyPolicy() {
    window.alert(
      'Политика приватности (демо):\n\n' +
        '1) Данные хранятся локально в браузере.\n' +
        '2) Экспорт выполняется только по вашему действию.\n' +
        '3) Удаление данных очищает локальное хранилище и восстанавливает демо-состояние.'
    );
  }

  function destroyDataWithConfirm() {
    if (!window.confirm('Удалить все данные и настройки в демо? Действие необратимо.')) return;
    D.resetDemo();
    D.patchSidebarBadges();
    showToast('Данные удалены, демо восстановлено', true);
    setTimeout(function () {
      window.location.reload();
    }, 600);
  }

  function logoutDemo() {
    if (!window.confirm('Выйти из аккаунта в демо?')) return;
    showToast('Вы вышли из аккаунта (демо)');
  }

  var sub = document.querySelector('.page-sub');
  if (sub) sub.textContent = headerDate();

  var addBtn = document.querySelector('.header-actions .btn-primary');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      window.location.href = 'payments.html';
    });
  }

  var main = document.querySelector('.main--profile');
  if (main) {
    bindSegmented(main);
    bindActions(main);
  }
})();
