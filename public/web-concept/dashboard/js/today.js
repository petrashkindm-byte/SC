(function () {
  var D = window.SubCuroData;
  var AI = window.SubCuroAIAdvisor;
  if (!D) return;

  var TZ = D.TZ;
  var calViewYear = null;
  var calViewMonth = null;
  var selectedYmd = null;
  var searchQuery = '';

  function capitalizeRu(s) {
    if (!s) return s;
    return s.charAt(0).toLocaleUpperCase('ru-RU') + s.slice(1);
  }

  function formatHeaderDate(date) {
    var raw = new Intl.DateTimeFormat('ru-RU', {
      timeZone: TZ,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
    raw = raw.replace(/\s?г\.?$/, '').trim();
    return capitalizeRu(raw);
  }

  function formatMonthTitle(date) {
    var m = new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, month: 'long' }).format(date);
    return capitalizeRu(m);
  }

  function formatMonthYearTitle(y, month1to12) {
    var d = new Date(Date.UTC(y, month1to12 - 1, 15, 12, 0, 0));
    var raw = new Intl.DateTimeFormat('ru-RU', {
      timeZone: TZ,
      month: 'long',
      year: 'numeric',
    }).format(d);
    return capitalizeRu(raw.replace(/\s?г\.?$/, '').trim());
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function ymdParts(y, month1to12, day) {
    return y + '-' + pad2(month1to12) + '-' + pad2(day);
  }

  function daysInMonth(y, month1to12) {
    return new Date(Date.UTC(y, month1to12, 0)).getUTCDate();
  }

  /** Понедельник = 0 … воскресенье = 6 (по календарю Москвы) */
  function moscowWeekdayMon0(y, month1to12, day) {
    var p = ymdParts(y, month1to12, day).split('-').map(Number);
    var date = new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0));
    var w = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(date);
    var map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    return map[w] != null ? map[w] : 0;
  }

  function buildMonthGridCells(y, m) {
    var firstDow = moscowWeekdayMon0(y, m, 1);
    var dim = daysInMonth(y, m);
    var cells = [];
    var pm = m === 1 ? 12 : m - 1;
    var py = m === 1 ? y - 1 : y;
    var pDim = daysInMonth(py, pm);
    var startPrev = pDim - firstDow + 1;
    var i;
    for (i = 0; i < firstDow; i++) {
      cells.push({ y: py, m: pm, d: startPrev + i, muted: true });
    }
    for (i = 1; i <= dim; i++) {
      cells.push({ y: y, m: m, d: i, muted: false });
    }
    var nm = m === 12 ? 1 : m + 1;
    var ny = m === 12 ? y + 1 : y;
    var nd = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ y: ny, m: nm, d: nd, muted: true });
      nd++;
      if (nd > daysInMonth(ny, nm)) {
        nd = 1;
        nm++;
        if (nm > 12) {
          nm = 1;
          ny++;
        }
      }
    }
    return cells;
  }

  function ensureCalViewInit() {
    if (calViewYear != null && calViewMonth != null) return;
    var parts = D.moscowYmd(new Date()).split('-').map(Number);
    calViewYear = parts[0];
    calViewMonth = parts[1];
  }

  function ensureSelectedInViewMonth() {
    ensureCalViewInit();
    var p = selectedYmd.split('-').map(Number);
    if (p[0] === calViewYear && p[1] === calViewMonth) return;
    var todayYmd = D.moscowYmd(new Date());
    var tp = todayYmd.split('-').map(Number);
    if (tp[0] === calViewYear && tp[1] === calViewMonth) {
      selectedYmd = todayYmd;
    } else {
      selectedYmd = ymdParts(calViewYear, calViewMonth, 1);
    }
  }

  function formatDayNum(date) {
    return new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, day: 'numeric' }).format(date);
  }

  function formatShortRuFromYmd(ymd) {
    var p = ymd.split('-').map(Number);
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: TZ,
      day: 'numeric',
      month: 'short',
    }).format(new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0)));
  }

  function cycleLabel(c) {
    return c === 'yearly' ? 'Ежегодно' : 'Ежемесячно';
  }

  function relBadge(todayYmd, dueYmd) {
    var n = D.daysBetweenYmd(todayYmd, dueYmd);
    if (n < 0) return { text: 'Просрочено', cls: 'upcoming-row__badge--tomorrow' };
    if (n === 0) return { text: 'Сегодня', cls: 'upcoming-row__badge--tomorrow' };
    if (n === 1) return { text: 'Завтра', cls: 'upcoming-row__badge--tomorrow' };
    return { text: 'Через ' + n + ' дн.', cls: n <= 5 ? 'upcoming-row__badge--d4' : 'upcoming-row__badge--d6' };
  }

  function iconHtml(p) {
    var icon = p.icon;
    var PI = window.SubCuroPaymentIcons;
    if (PI && PI.cellHtml) {
      return (
        '<div class="upcoming-row__icon upcoming-row__icon--preset">' +
        PI.cellHtml(icon, { bg: p.iconBg, shape: p.iconShape || 'rounded' }) +
        '</div>'
      );
    }
    if (icon === 'music')
      return '<div class="upcoming-row__icon upcoming-row__icon--music"><div class="upcoming-row__glyph"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#fff"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg></div></div>';
    if (icon === 'cloud')
      return '<div class="upcoming-row__icon upcoming-row__icon--cloud"><div class="upcoming-row__glyph"><svg viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 11h2a3.5 3.5 0 0 0 .2-7 4.5 4.5 0 0 0-8.5-1.5A3.5 3.5 0 0 0 4 11h8.5z"/></svg></div></div>';
    if (icon === 'fitness')
      return '<div class="upcoming-row__icon upcoming-row__icon--fitness"><div class="upcoming-row__glyph"><svg viewBox="0 0 16 10" xmlns="http://www.w3.org/2000/svg"><path d="M1 5h3M12 5h3M5 1v8M11 1v8M5 3h6M5 7h6"/></svg></div></div>';
    return '<div class="upcoming-row__icon upcoming-row__icon--video"><div class="upcoming-row__glyph"><svg viewBox="0 0 10 12" xmlns="http://www.w3.org/2000/svg"><path d="M0 0v12l10-6L0 0z"/></svg></div></div>';
  }

  function renderStats() {
    var monthly = D.computeMonthlySpend();
    var save = D.computePotentialSavings();
    var cnt = D.getActiveCount();
    var pct = D.percentVsLast();

    var elM = document.getElementById('stat-monthly-value');
    var elS = document.getElementById('stat-save-value');
    var elC = document.getElementById('stat-active-count');
    var elP = document.getElementById('stat-pill-compare');
    var elPa = document.getElementById('stat-pill-active');

    if (elM) elM.textContent = D.formatRub(monthly);
    if (elS) elS.textContent = D.formatRub(save);
    if (elC) elC.textContent = String(cnt);
    if (elP) {
      if (pct == null) elP.textContent = '—';
      else elP.textContent = (pct >= 0 ? '+' : '') + pct + '% к прошлому месяцу';
    }
    if (elPa) {
      var todayYmd = D.moscowYmd(new Date());
      var overdue = D.upcomingList(500).filter(function (p) {
        return D.daysBetweenYmd(p.nextDue, todayYmd) > 0;
      }).length;
      elPa.textContent = overdue > 0 ? overdue + ' просрочено' : 'все в срок';
    }

    var ban = document.getElementById('banner-save-line');
    if (ban) ban.textContent = 'Экономия до ' + D.formatRub(save).replace(' ', '\u00a0') + ' / мес';

    var aq = document.getElementById('banner-actions-count');
    if (aq) aq.textContent = String(D.getActionsPending());
  }

  function renderUpcoming() {
    var host = document.getElementById('upcoming-list');
    if (!host) return;
    var todayYmd = D.moscowYmd(new Date());
    var q = searchQuery.trim().toLowerCase();
    var list = D.upcomingList(30);
    var html = '';
    var any = false;
    list.forEach(function (p) {
      if (!p || p.id == null || p.id === '') return;
      if (q && p.name.toLowerCase().indexOf(q) === -1) return;
      any = true;
      var b = relBadge(todayYmd, p.nextDue);
      var pid = String(p.id);
      html +=
        '<div class="upcoming-row-wrap" data-pay-id="' +
        escapeHtml(pid) +
        '">' +
        '<a class="upcoming-row upcoming-row--link" href="./edit-payment.html?id=' +
        encodeURIComponent(pid) +
        '" aria-label="Открыть подписку: ' +
        escapeHtml(p.name || '') +
        '">' +
        iconHtml(p) +
        '<div class="upcoming-row__svc">' +
        '<div class="upcoming-row__name">' +
        escapeHtml(p.name) +
        '</div>' +
        '<div class="upcoming-row__cycle">' +
        cycleLabel(p.cycle) +
        '</div></div>' +
        '<div class="upcoming-row__pay">' +
        '<div class="upcoming-row__amount">' +
        (D.formatPaymentAmountHtml ? D.formatPaymentAmountHtml(p) : D.formatRub(p.amount)) +
        '</div>' +
        '<div class="upcoming-row__date">' +
        formatShortRuFromYmd(p.nextDue) +
        '</div></div>' +
        '<span class="upcoming-row__badge ' +
        b.cls +
        '">' +
        escapeHtml(b.text) +
        '</span></a>' +
        '<button type="button" class="upcoming-row__del" title="Удалить" aria-label="Удалить">&times;</button></div>';
    });
    if (!any) {
      html =
        '<p class="upcoming-empty">' +
        (q ? 'Ничего не найдено по запросу.' : 'Нет активных платежей.') +
        '</p>';
    }
    host.innerHTML = html;

    host.querySelectorAll('.upcoming-row__del').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = btn.closest('.upcoming-row-wrap').getAttribute('data-pay-id');
        if (id && confirm('Удалить платёж из учёта?')) {
          D.removePayment(id);
          D.save();
          refreshAll();
        }
      });
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderCalendar() {
    ensureCalViewInit();
    var monthEl = document.getElementById('writeoff-month');
    var daysEl = document.getElementById('writeoff-days');
    if (!monthEl || !daysEl) return;

    var todayYmd = D.moscowYmd(new Date());
    if (!selectedYmd) selectedYmd = todayYmd;
    ensureSelectedInViewMonth();

    monthEl.textContent = formatMonthYearTitle(calViewYear, calViewMonth);

    var grid = buildMonthGridCells(calViewYear, calViewMonth);
    daysEl.innerHTML = '';

    grid.forEach(function (c) {
      var ymd = ymdParts(c.y, c.m, c.d);
      var isToday = ymd === todayYmd;
      var isSel = ymd === selectedYmd;
      var spend = D.spendOnYmd(ymd);

      var cell = document.createElement('div');
      cell.className = 'writeoff-cal__cell' + (c.muted ? ' writeoff-cal__cell--muted' : '');
      cell.setAttribute('role', 'button');
      cell.setAttribute('tabindex', '0');
      cell.dataset.ymd = ymd;

      var num = document.createElement('div');
      num.className = 'writeoff-cal__num';
      if (isSel) num.classList.add('writeoff-cal__num--sel');
      else if (isToday) num.classList.add('writeoff-cal__num--ring');
      num.textContent = String(c.d);
      cell.appendChild(num);

      if (spend > 0) {
        var mark = document.createElement('span');
        mark.className = 'writeoff-cal__charge-dot';
        mark.setAttribute('aria-hidden', 'true');
        cell.appendChild(mark);
      }

      function pickDay() {
        selectedYmd = cell.dataset.ymd;
        var parts = selectedYmd.split('-').map(Number);
        calViewYear = parts[0];
        calViewMonth = parts[1];
        renderCalendar();
      }
      cell.addEventListener('click', pickDay);
      cell.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          pickDay();
        }
      });

      daysEl.appendChild(cell);
    });

    var spendTop = document.getElementById('writeoff-spend-val');
    if (spendTop) spendTop.textContent = D.formatRub(D.chargesInMonthYmd(calViewYear, calViewMonth));

    var hint = document.getElementById('cal-day-hint');
    if (hint) {
      var ds = D.spendOnYmd(selectedYmd);
      var cnt = 0;
      D.getState().payments.forEach(function (p) {
        if (p.active && p.nextDue === selectedYmd) cnt++;
      });
      if (ds > 0) {
        hint.textContent =
          formatShortRuFromYmd(selectedYmd) +
          ': спишется ' +
          D.formatRub(ds) +
          (cnt > 1 ? ' (' + cnt + ' ' + pluralSubs(cnt) + ')' : '');
      } else {
        hint.textContent =
          formatShortRuFromYmd(selectedYmd) + ': в этот день по учёту списаний нет';
      }
    }
  }

  function pluralSubs(n) {
    var m10 = n % 10;
    var m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'подписка';
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'подписки';
    return 'подписок';
  }

  function refreshAll() {
    renderStats();
    renderAiAlerts();
    renderUpcoming();
    renderCalendar();
    D.patchSidebarBadges();
    renderNotifList();
  }

  function renderAiAlerts() {
    var host = document.getElementById('today-ai-alerts-list');
    if (!host) return;
    if (!AI || typeof AI.buildInsights !== 'function') {
      host.innerHTML = '<p class="upcoming-empty">AI-анализ недоступен.</p>';
      return;
    }
    var insights = AI.buildInsights(D);
    var clusters = (insights && insights.clusters) || [];
    var rows = clusters
      .filter(function (c) {
        return c && c.items && c.items.length > 1 && c.potential > 0;
      })
      .sort(function (a, b) {
        return b.potential - a.potential;
      })
      .slice(0, 3);
    if (!rows.length) {
      host.innerHTML = '<p class="upcoming-empty">Пока не найдено явных дублей. Продолжайте добавлять платежи для более точного анализа.</p>';
      return;
    }
    host.className = 'ai-alerts__list';
    host.innerHTML = rows
      .map(function (c, idx) {
        var pr = idx === 0 ? 'high' : idx === 1 ? 'med' : 'low';
        var prTxt = idx === 0 ? 'СРОЧНО' : idx === 1 ? 'ВАЖНО' : 'НАБЛЮДАТЬ';
        return (
          '<div class="ai-alert">' +
          '<span class="ai-alert__prio ai-alert__prio--' +
          pr +
          '">' +
          prTxt +
          '</span>' +
          '<div><strong>' +
          c.title +
          '</strong><span>' +
          c.items.length +
          ' сервис(ов), средняя точность ' +
          Math.round((c.avgConfidence || 0) * 100) +
          '%</span></div>' +
          '<span class="ai-alert__save">до ' +
          D.formatRub(Math.round(c.potential)) +
          '/мес</span>' +
          '<div class="ai-alert__actions">' +
          '<button type="button" class="ai-alert__btn" data-ai-open="' + c.id + '">Открыть группу</button>' +
          '<button type="button" class="ai-alert__btn" data-ai-keep="' + c.id + '">Оставить лучший</button>' +
          '<button type="button" class="ai-alert__btn" data-ai-pause="' + c.id + '">Пауза для остальных</button>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    host.onclick = function (e) {
      var btn = e.target.closest('.ai-alert__btn');
      if (!btn) return;
      var insights = AI.buildInsights(D);
      var id = btn.getAttribute('data-ai-open') || btn.getAttribute('data-ai-keep') || btn.getAttribute('data-ai-pause');
      if (!id) return;
      var cluster = (insights.clusters || []).filter(function (x) { return x.id === id; })[0];
      if (!cluster || !cluster.items || !cluster.items.length) return;
      if (btn.hasAttribute('data-ai-open')) {
        window.location.href = 'savings-simulator.html';
        return;
      }
      var keep = cluster.items[0];
      if (btn.hasAttribute('data-ai-keep')) {
        showAiModal({
          title: 'Рекомендуемый основной сервис',
          text: 'Рекомендуем оставить «' + keep.p.name + '». Остальные сервисы в группе можно поставить на паузу.',
          okText: 'Понятно',
        });
        return;
      }
      if (btn.hasAttribute('data-ai-pause')) {
        showAiModal({
          title: 'Поставить на паузу остальные?',
          text: 'Оставим активным «' + keep.p.name + '», остальные похожие сервисы будут поставлены на паузу.',
          okText: 'Да, поставить на паузу',
          cancelText: 'Отмена',
          onConfirm: function () {
            var paused = 0;
            cluster.items.forEach(function (it) {
              if (it.p.id === keep.p.id) return;
              D.updatePayment(it.p.id, { payStatus: 'paused', active: false });
              paused++;
            });
            D.patchSidebarBadges();
            showAiModal({
              title: 'Готово',
              text: 'На паузу отправлено: ' + paused + ' сервис(ов).',
              okText: 'Закрыть',
            });
            refreshAll();
          },
        });
      }
    };
  }

  function showAiModal(cfg) {
    var root = document.getElementById('today-ai-modal');
    if (!root) {
      root = document.createElement('div');
      root.id = 'today-ai-modal';
      root.className = 'dash-modal';
      root.hidden = true;
      root.innerHTML =
        '<div class="dash-modal__backdrop" data-ai-close></div>' +
        '<div class="dash-modal__panel">' +
        '<button type="button" class="dash-modal__x" data-ai-close aria-label="Закрыть">×</button>' +
        '<h2 class="dash-modal__title" id="today-ai-modal-title"></h2>' +
        '<p class="dash-modal__text" id="today-ai-modal-text"></p>' +
        '<div class="dash-modal__actions" id="today-ai-modal-actions"></div>' +
        '</div>';
      document.body.appendChild(root);
      root.addEventListener('click', function (e) {
        if (e.target && e.target.hasAttribute('data-ai-close')) root.hidden = true;
      });
    }
    document.getElementById('today-ai-modal-title').textContent = cfg.title || 'Информация';
    document.getElementById('today-ai-modal-text').textContent = cfg.text || '';
    var actions = document.getElementById('today-ai-modal-actions');
    actions.innerHTML = '';
    if (cfg.cancelText) {
      var cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'btn-outline';
      cancel.textContent = cfg.cancelText;
      cancel.onclick = function () {
        root.hidden = true;
      };
      actions.appendChild(cancel);
    }
    var ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'btn-primary';
    ok.textContent = cfg.okText || 'ОК';
    ok.onclick = function () {
      root.hidden = true;
      if (typeof cfg.onConfirm === 'function') cfg.onConfirm();
    };
    actions.appendChild(ok);
    root.hidden = false;
  }

  function renderNotifList() {
    var box = document.getElementById('notif-list');
    if (!box) return;
    var items = D.getNotifications();
    box.innerHTML = items
      .map(function (n) {
        return (
          '<button type="button" class="notif-item' +
          (n.read ? ' notif-item--read' : '') +
          '" data-id="' +
          escapeHtml(n.id) +
          '">' +
          escapeHtml(n.text) +
          '</button>'
        );
      })
      .join('');
    box.querySelectorAll('.notif-item').forEach(function (b) {
      b.addEventListener('click', function () {
        D.markNotifRead(this.getAttribute('data-id'));
        this.classList.add('notif-item--read');
      });
    });
  }

  function wireSearch() {
    var inp = document.getElementById('today-search');
    if (!inp) return;
    var t;
    inp.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        searchQuery = inp.value;
        renderUpcoming();
      }, 120);
    });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchQuery = inp.value;
        renderUpcoming();
      }
    });
  }

  function wireModals() {
    function open(id) {
      var m = document.getElementById(id);
      if (m) m.hidden = false;
    }
    function close(id) {
      var m = document.getElementById(id);
      if (m) m.hidden = true;
    }
    document.querySelectorAll('[data-modal-close]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        close(this.closest('.dash-modal').id);
      });
    });
    var g = document.getElementById('btn-gift');
    if (g) g.addEventListener('click', function () {
      open('modal-gift');
    });
    var inv = document.getElementById('btn-invite');
    if (inv) inv.addEventListener('click', function () {
      open('modal-invite');
    });
    var add = document.getElementById('btn-add-payment');
    if (add) add.addEventListener('click', function () {
      open('modal-add-payment');
      var nd = document.getElementById('add-next-due');
      if (nd) nd.value = D.moscowYmd(new Date());
    });

    var copy = document.getElementById('btn-copy-invite');
    if (copy) {
      copy.addEventListener('click', function () {
        var u = document.getElementById('invite-url');
        if (u) {
          navigator.clipboard.writeText(u.value).then(
            function () {
              copy.textContent = 'Скопировано';
              setTimeout(function () {
                copy.textContent = 'Копировать ссылку';
              }, 2000);
            },
            function () {
              u.select();
              document.execCommand('copy');
            }
          );
        }
      });
    }

    var form = document.getElementById('form-add-payment');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = document.getElementById('add-name').value;
        var amount = document.getElementById('add-amount').value;
        var cycle = document.getElementById('add-cycle').value;
        var nextDue = document.getElementById('add-next-due').value;
        D.addPayment({ name: name, amount: amount, cycle: cycle, nextDue: nextDue });
        form.reset();
        close('modal-add-payment');
        refreshAll();
      });
    }

    var bell = document.getElementById('btn-notif');
    var pop = document.getElementById('notif-pop');
    if (bell && pop) {
      bell.addEventListener('click', function (e) {
        e.stopPropagation();
        pop.hidden = !pop.hidden;
      });
    }
    document.addEventListener('mousedown', function (e) {
      var p = document.getElementById('notif-pop');
      var b = document.getElementById('btn-notif');
      if (!p || p.hidden) return;
      if (p.contains(e.target) || (b && b.contains(e.target))) return;
      p.hidden = true;
    });

    var prev = document.getElementById('cal-prev-month');
    if (prev) {
      prev.addEventListener('click', function () {
        ensureCalViewInit();
        calViewMonth--;
        if (calViewMonth < 1) {
          calViewMonth = 12;
          calViewYear--;
        }
        ensureSelectedInViewMonth();
        renderCalendar();
      });
    }
    var next = document.getElementById('cal-next-month');
    if (next) {
      next.addEventListener('click', function () {
        ensureCalViewInit();
        calViewMonth++;
        if (calViewMonth > 12) {
          calViewMonth = 1;
          calViewYear++;
        }
        ensureSelectedInViewMonth();
        renderCalendar();
      });
    }
  }

  function initHeaderDate() {
    var subEl = document.getElementById('today-page-sub');
    if (subEl) subEl.textContent = formatHeaderDate(new Date());
  }

  function run() {
    initHeaderDate();
    wireSearch();
    wireModals();
    refreshAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
