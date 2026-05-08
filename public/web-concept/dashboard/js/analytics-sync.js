(function () {
  var D = window.SubCuroData;
  var Icons = window.SubCuroPaymentIcons;
  if (!D) return;

  var TZ = D.TZ;
  var MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  var CAT_COLORS = [
    'var(--purple)',
    'var(--green)',
    '#c4a574',
    'var(--orange)',
    '#2563eb',
    '#db2777',
    '#8b5cf6',
    '#0d9488',
  ];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function capitalizeRu(s) {
    if (!s) return s;
    return s.charAt(0).toLocaleUpperCase('ru-RU') + s.slice(1);
  }

  function headerDate() {
    var raw = new Intl.DateTimeFormat('ru-RU', {
      timeZone: TZ,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
    return capitalizeRu(raw.replace(/\s?г\.?$/, '').trim());
  }

  function shiftCalendarMonth(y, m, delta) {
    var d = new Date(Date.UTC(y, m - 1 + delta, 1));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
  }

  function isPaymentActive(p) {
    return D.resolvePayStatus(p) === 'active';
  }

  function monthlyRubNat(p) {
    var amt = Number(p.amount) || 0;
    var cur = D.normalizeCurrency(p.currency);
    var monthlyNat = p.cycle === 'yearly' ? amt / 12 : amt;
    if (cur === 'RUB') return monthlyNat;
    return D.convertToRub(monthlyNat, cur);
  }

  function fmtShortYmd(ymd) {
    var p = String(ymd).split('-').map(Number);
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: TZ,
      day: 'numeric',
      month: 'short',
    }).format(new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0)));
  }

  function activePaymentsResolved() {
    return D.getState().payments.filter(isPaymentActive);
  }

  function renderHeaderStats() {
    var list = activePaymentsResolved();
    var m = 0;
    list.forEach(function (p) {
      m += monthlyRubNat(p);
    });
    var elSub = document.getElementById('analytics-live-sub');
    var c = document.getElementById('sync-analytics-count');
    var mo = document.getElementById('sync-analytics-month');
    var y = document.getElementById('sync-analytics-year');
    if (elSub) elSub.textContent = headerDate();
    if (c) c.textContent = String(list.length);
    if (mo) mo.textContent = D.formatRub(Math.round(m));
    if (y) y.textContent = D.formatRub(Math.round(m * 12));
  }

  function renderMonthlyChart() {
    var host = document.getElementById('analytics-chart-bars');
    var labels = document.getElementById('analytics-chart-labels');
    if (!host) return;
    var parts = D.moscowYmd(new Date()).split('-').map(Number);
    var y0 = parts[0];
    var m0 = parts[1];
    var totals = [];
    var i;
    for (i = -5; i <= 0; i++) {
      var nm = shiftCalendarMonth(y0, m0, i);
      var t = D.chargesInMonthYmd(nm.y, nm.m);
      totals.push({
        y: nm.y,
        m: nm.m,
        total: t,
        label: capitalizeRu(MONTH_SHORT[nm.m - 1]),
      });
    }
    var maxTot = 1;
    totals.forEach(function (x) {
      if (x.total > maxTot) maxTot = x.total;
    });
    host.innerHTML = totals
      .map(function (item, idx) {
        var h = maxTot > 0 ? Math.max(14, Math.round((item.total / maxTot) * 100)) : 14;
        var isOn = idx === totals.length - 1;
        var tip =
          isOn && item.total > 0
            ? '<span class="chart-bar__tip">' + escapeHtml(D.formatRub(Math.round(item.total))) + '</span>'
            : '';
        return (
          '<div class="chart-bar' +
          (isOn ? ' on' : '') +
          '" style="height:' +
          h +
          '%;">' +
          tip +
          '</div>'
        );
      })
      .join('');
    if (labels) {
      labels.innerHTML = totals
        .map(function (item) {
          return '<span>' + escapeHtml(item.label) + '</span>';
        })
        .join('');
    }
  }

  function catIconHtml(p) {
    if (Icons && Icons.cellHtml) {
      return (
        '<span class="analytics-cat-icon">' +
        Icons.cellHtml(p.icon, { bg: p.iconBg, shape: p.iconShape || 'rounded' }) +
        '</span>'
      );
    }
    return '<span class="analytics-cat-fallback" aria-hidden="true">●</span>';
  }

  function renderCategories() {
    var host = document.getElementById('analytics-categories');
    if (!host) return;
    var map = {};
    activePaymentsResolved().forEach(function (p) {
      var cat = (p.category || '').trim() || 'Без категории';
      if (!map[cat]) map[cat] = { total: 0, rep: p };
      var mr = monthlyRubNat(p);
      map[cat].total += mr;
      if (mr > monthlyRubNat(map[cat].rep)) map[cat].rep = p;
    });
    var rows = Object.keys(map).map(function (k) {
      return { name: k, total: map[k].total, rep: map[k].rep };
    });
    rows.sort(function (a, b) {
      return b.total - a.total;
    });
    if (!rows.length) {
      host.innerHTML =
        '<p class="analytics-empty-hint">Нет активных подписок с категориями. Укажите категорию в <a href="payments.html">«Платежах»</a>.</p>';
      return;
    }
    var maxT = rows[0].total || 1;
    host.innerHTML = rows
      .map(function (row, idx) {
        var w = Math.round((row.total / maxT) * 100);
        var col = CAT_COLORS[idx % CAT_COLORS.length];
        return (
          '<div class="cat-row">' +
          catIconHtml(row.rep) +
          '<div class="cat-row__name">' +
          escapeHtml(row.name) +
          '</div>' +
          '<div class="bar-bg"><div class="bar-fill" style="width:' +
          w +
          '%;background:' +
          col +
          ';"></div></div>' +
          '<strong class="cat-row__amt">' +
          escapeHtml(D.formatRub(Math.round(row.total))) +
          '</strong></div>'
        );
      })
      .join('');
  }

  function nextCellHtml(p, t0) {
    var overdueDays = D.daysBetweenYmd(p.nextDue, t0);
    if (overdueDays > 0) {
      return (
        '<td class="analytics-td-next analytics-td-next--late"><strong>Просрочено</strong> · ' +
        escapeHtml(fmtShortYmd(p.nextDue)) +
        '</td>'
      );
    }
    return (
      '<td class="analytics-td-next">Следующее <strong>' + escapeHtml(fmtShortYmd(p.nextDue)) + '</strong></td>'
    );
  }

  function statusBadge(p, t0) {
    var ps = D.resolvePayStatus(p);
    if (ps === 'paused') return { cls: 'pause', label: 'На паузе' };
    if (ps === 'cancelled') return { cls: 'cancelled', label: 'Отменён' };
    if (ps === 'archived') return { cls: 'archived', label: 'В архиве' };
    var overdueDays = D.daysBetweenYmd(p.nextDue, t0);
    if (overdueDays > 0) return { cls: 'overdue', label: 'Просрочено' };
    return { cls: 'active', label: 'Активна' };
  }

  function rowIconHtml(p) {
    if (Icons && Icons.cellHtml) {
      return Icons.cellHtml(p.icon, { bg: p.iconBg, shape: p.iconShape || 'rounded' });
    }
    return '';
  }

  function renderPaymentsTable() {
    var tb = document.getElementById('analytics-payments-tbody');
    if (!tb) return;
    var t0 = D.moscowYmd(new Date());
    var list = D.getState().payments
      .filter(isPaymentActive)
      .map(function (p) {
        return { p: p, m: monthlyRubNat(p) };
      })
      .sort(function (a, b) {
        return b.m - a.m;
      });
    if (!list.length) {
      tb.innerHTML =
        '<tr><td colspan="5" class="analytics-empty-cell">Нет активных платежей. <a href="payments.html">Добавить в «Платежах»</a></td></tr>';
      return;
    }
    tb.innerHTML = list
      .map(function (row) {
        var p = row.p;
        var st = statusBadge(p, t0);
        var amt =
          D.formatPaymentAmountHtml ? D.formatPaymentAmountHtml(p) : '<strong>' + escapeHtml(D.formatRub(p.amount)) + '</strong>';
        return (
          '<tr class="pay-row--link" data-id="' +
          escapeHtml(p.id) +
          '">' +
          '<td><div class="pay-svc-row">' +
          rowIconHtml(p) +
          '<strong><a class="pay-svc-link" href="edit-payment.html?id=' +
          encodeURIComponent(p.id) +
          '">' +
          escapeHtml(p.name || 'Подписка') +
          '</a></strong></div></td>' +
          nextCellHtml(p, t0) +
          '<td class="pay-amt-cell">' +
          amt +
          '</td>' +
          '<td><span class="badge-status ' +
          st.cls +
          '">' +
          escapeHtml(st.label) +
          '</span></td>' +
          '<td><span class="analytics-row-menu" aria-hidden="true">⋯</span></td></tr>'
        );
      })
      .join('');

    tb.querySelectorAll('tr.pay-row--link[data-id]').forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        window.location.href = 'edit-payment.html?id=' + encodeURIComponent(tr.getAttribute('data-id'));
      });
    });
  }

  function wireChrome() {
    var addBtn = document.querySelector('.header-actions .btn-primary');
    if (addBtn) {
      addBtn.onclick = function () {
        window.location.href = 'payments.html';
      };
    }
  }

  function run() {
    renderHeaderStats();
    renderMonthlyChart();
    renderCategories();
    renderPaymentsTable();
    D.patchSidebarBadges();
    wireChrome();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
