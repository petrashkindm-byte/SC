(function () {
  var D = window.SubCuroData;
  var Icons = window.SubCuroPaymentIcons;
  var AI = window.SubCuroAIAdvisor;
  if (!D) return;

  var TZ = D.TZ;
  var savingsSimSync = null;

  function ensureSavingsSimDelegation() {
    if (ensureSavingsSimDelegation.done) return;
    var panel = document.getElementById('actions-savings-panel');
    if (!panel) return;
    ensureSavingsSimDelegation.done = true;
    panel.addEventListener('change', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('actions-sim__cb') && savingsSimSync) savingsSimSync();
    });
  }

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

  function formatHeaderSub(date) {
    var raw = new Intl.DateTimeFormat('ru-RU', {
      timeZone: TZ,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
    return capitalizeRu(raw.replace(/\s?г\.?$/, '').trim());
  }

  function formatShortYmd(ymd) {
    var p = String(ymd).split('-').map(Number);
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: TZ,
      day: 'numeric',
      month: 'short',
    }).format(new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0)));
  }

  function monthlyRubNat(p) {
    var amt = Number(p.amount) || 0;
    var cur = D.normalizeCurrency(p.currency);
    var monthlyNat = p.cycle === 'yearly' ? amt / 12 : amt;
    if (cur === 'RUB') return Math.round(monthlyNat);
    return Math.round(D.convertToRub(monthlyNat, cur));
  }

  function statusLabel(p) {
    var s = D.resolvePayStatus ? D.resolvePayStatus(p) : p.active ? 'active' : 'paused';
    if (s === 'paused') return 'На паузе';
    if (s === 'cancelled') return 'Отменён';
    if (s === 'archived') return 'В архиве';
    return 'Активна';
  }

  function actionHintForPayment(t0, p) {
    var until = D.daysBetweenYmd(t0, p.nextDue);
    if (until < 0) return 'Дата списания прошла — проверьте подписку в «Платежах».';
    if (until === 0) return 'Сегодня плановое списание по этой подписке.';
    if (until <= 3) return 'Списание через ' + until + ' ' + pluralDays(until) + ' — успейте изменить условия при необходимости.';
    if (until <= 14) return 'Скоро очередное списание; сверьте сумму и тариф.';
    return 'Активная подписка из вашего списка — при необходимости откройте карточку.';
  }

  function pluralDays(n) {
    var m10 = n % 10;
    var m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'день';
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'дня';
    return 'дней';
  }

  function priorityMeta(t0, p) {
    var until = D.daysBetweenYmd(t0, p.nextDue);
    if (until < 0) return 'Просрочено · ' + formatShortYmd(p.nextDue);
    if (until <= 3) return 'Срочно · ' + formatShortYmd(p.nextDue);
    if (until <= 14) return 'Скоро · ' + formatShortYmd(p.nextDue);
    return formatShortYmd(p.nextDue);
  }

  function iconBlock(p) {
    if (Icons && Icons.cellHtml) {
      return (
        '<div class="action-card__icon-wrap">' +
        Icons.cellHtml(p.icon, { bg: p.iconBg, shape: p.iconShape || 'rounded' }) +
        '</div>'
      );
    }
    return (
      '<div class="svc-icon" aria-hidden="true">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>' +
      '</div>'
    );
  }

  function actionsWord(n) {
    var m10 = n % 10;
    var m100 = n % 100;
    if (m100 >= 11 && m100 <= 14) return 'действий';
    if (m10 === 1) return 'действие';
    if (m10 >= 2 && m10 <= 4) return 'действия';
    return 'действий';
  }

  function renderBanner(nActive, nShown, slice, t0) {
    var h = document.querySelector('.banner-actions .copy h2');
    var pEl = document.querySelector('.banner-actions .copy p');
    var chipsEl = document.getElementById('actions-banner-chips');
    if (h) {
      h.textContent =
        '⚡ Очередь по подпискам — ' +
        nShown +
        (nActive > nShown ? ' из ' + nActive : '') +
        ' ' +
        actionsWord(nShown);
    }
    if (pEl) {
      var save = D.computePotentialSavings();
      pEl.textContent =
        'Подсказки по активным подпискам из «Платежей». Потенциально до ' + D.formatRub(save) + ' / мес при оптимизации.';
    }
    if (chipsEl && slice) {
      var urgent = 0;
      var week = 0;
      var auto = 0;
      slice.forEach(function (p) {
        var u = D.daysBetweenYmd(t0, p.nextDue);
        if (u < 0 || (u >= 0 && u <= 3)) urgent++;
        else if (u > 3 && u <= 7) week++;
        if (p.repeatAuto || p.autopayEnabled) auto++;
      });
      chipsEl.innerHTML =
        '<span class="chip" style="background:var(--red-soft);color:var(--red);">Срочно ' +
        urgent +
        '</span>' +
        '<span class="chip" style="background:var(--orange-soft);color:#b35a00;">На неделе ' +
        week +
        '</span>' +
        '<span class="chip" style="background:var(--green-soft);color:var(--green);">Авто ' +
        auto +
        '</span>';
    }
  }

  function wirePause(id) {
    return function () {
      if (!confirm('Поставить эту подписку на паузу? Её можно снова включить в редакторе.')) return;
      D.updatePayment(id, { payStatus: 'paused', active: false });
      D.patchSidebarBadges();
      run();
    };
  }

  function simIconHtml(p) {
    if (Icons && Icons.cellHtml) {
      return Icons.cellHtml(p.icon, { bg: p.iconBg, shape: p.iconShape || 'rounded' });
    }
    return '';
  }

  function renderSavingsSimulator(active) {
    var inner = document.getElementById('actions-sim-inner');
    if (!inner) return;
    ensureSavingsSimDelegation();
    var base = D.computeMonthlySpend();
    var potential = D.computePotentialSavings();

    if (!active.length) {
      savingsSimSync = null;
      inner.innerHTML =
        '<p class="actions-sim__empty">Нет активных подписок. <a href="payments.html">Добавьте в «Платежах»</a>, чтобы симулятор посчитал экономию.</p>';
      return;
    }

    var rows = active
      .map(function (p) {
        return { p: p, m: monthlyRubNat(p) };
      })
      .sort(function (a, b) {
        return b.m - a.m;
      })
      .slice(0, 12);

    inner.innerHTML =
      '<div class="actions-sim__hero">' +
      '<div class="actions-sim__hero-main">' +
      '<p class="actions-sim__kicker">Экономия при отмеченных отказах</p>' +
      '<div class="actions-sim__big" id="actions-sim-monthly">' +
      escapeHtml(D.formatRub(0)) +
      ' / мес</div>' +
      '<div class="actions-sim__sub" id="actions-sim-yearly">' +
      escapeHtml(D.formatRub(0)) +
      ' / год</div>' +
      '</div>' +
      '<div class="actions-sim__hint chip">Ориентир: до ' +
      escapeHtml(D.formatRub(potential)) +
      ' / мес при оптимизации всего портфеля</div>' +
      '</div>' +
      '<div class="actions-sim__stats">' +
      '<div><span class="actions-sim__stat-label">Сейчас в месяц (все активные)</span><strong id="actions-sim-base">' +
      escapeHtml(D.formatRub(Math.round(base))) +
      '</strong></div>' +
      '<div><span class="actions-sim__stat-label">Останется после отказов</span><strong id="actions-sim-after" class="actions-sim__after">' +
      escapeHtml(D.formatRub(Math.round(base))) +
      '</strong></div>' +
      '</div>' +
      '<div class="actions-sim__bar-wrap" aria-hidden="true">' +
      '<div class="actions-sim__bar-track" id="actions-sim-bar-track">' +
      '<span class="actions-sim__bar-remain" id="actions-sim-bar-remain" style="width:100%"></span>' +
      '<span class="actions-sim__bar-save" id="actions-sim-bar-save" style="width:0%"></span>' +
      '</div>' +
      '<div class="actions-sim__bar-legend"><span>Остаётся</span><span>Экономия</span></div>' +
      '</div>' +
      '<p class="actions-sim__list-title">Что могли бы отключить</p>' +
      '<ul class="actions-sim__list">' +
      rows
        .map(function (row) {
          var p = row.p;
          var m = row.m;
          return (
            '<li class="actions-sim__row">' +
            '<label class="actions-sim__label">' +
            '<input type="checkbox" class="actions-sim__cb" data-monthly="' +
            m +
            '">' +
            '<span class="actions-sim__glyph">' +
            simIconHtml(p) +
            '</span>' +
            '<span class="actions-sim__row-text">' +
            '<span class="actions-sim__name">' +
            escapeHtml(p.name || 'Подписка') +
            '</span>' +
            '<span class="actions-sim__amt">~ ' +
            escapeHtml(D.formatRub(m)) +
            ' / мес</span>' +
            '</span></label></li>'
          );
        })
        .join('') +
      '</ul>' +
      '<p class="actions-sim__fine">Ничего не меняется автоматически — снимите галочки или поставьте подписку на паузу в <a href="payments.html">«Платежах»</a>.</p>';

    function sync() {
      var cbs = inner.querySelectorAll('.actions-sim__cb');
      var sum = 0;
      cbs.forEach(function (cb) {
        if (cb.checked) sum += Number(cb.getAttribute('data-monthly')) || 0;
      });
      var after = Math.max(0, base - sum);
      var elM = document.getElementById('actions-sim-monthly');
      var elY = document.getElementById('actions-sim-yearly');
      var elA = document.getElementById('actions-sim-after');
      if (elM) elM.textContent = D.formatRub(Math.round(sum)) + ' / мес';
      if (elY) elY.textContent = D.formatRub(Math.round(sum * 12)) + ' / год';
      if (elA) elA.textContent = D.formatRub(Math.round(after));
      var br = document.getElementById('actions-sim-bar-remain');
      var bs = document.getElementById('actions-sim-bar-save');
      if (base <= 0) {
        if (br) br.style.width = '100%';
        if (bs) bs.style.width = '0%';
      } else {
        var pctAfter = Math.min(100, Math.max(0, Math.round((after / base) * 1000) / 10));
        var pctSave = Math.min(100, Math.max(0, Math.round((sum / base) * 1000) / 10));
        if (br) br.style.width = pctAfter + '%';
        if (bs) bs.style.width = pctSave + '%';
      }
    }

    savingsSimSync = sync;
    sync();
  }

  function renderAiWarnings() {
    var host = document.getElementById('actions-ai-alerts-list');
    if (!host) return;
    if (!AI || typeof AI.buildInsights !== 'function') {
      host.innerHTML = '<p class="actions-empty">AI-анализ недоступен.</p>';
      return;
    }
    var insights = AI.buildInsights(D);
    var rows = ((insights && insights.clusters) || [])
      .filter(function (c) {
        return c && c.items && c.items.length > 1 && c.potential > 0;
      })
      .sort(function (a, b) {
        return b.potential - a.potential;
      })
      .slice(0, 3);
    if (!rows.length) {
      host.innerHTML = '<p class="actions-empty">Явных дублей не найдено. Новые рекомендации появятся при изменении подписок.</p>';
      return;
    }
    host.className = 'ai-alerts__list';
    host.innerHTML = rows
      .map(function (c, idx) {
        var pr = idx === 0 ? 'high' : idx === 1 ? 'med' : 'low';
        var prTxt = idx === 0 ? 'СРОЧНО' : idx === 1 ? 'ВАЖНО' : 'НАБЛЮДАТЬ';
        return (
          '<div class="ai-alert">' +
          '<span class="ai-alert__prio ai-alert__prio--' + pr + '">' + prTxt + '</span>' +
          '<div><strong>' + escapeHtml(c.title) + '</strong><span>' +
          c.items.length + ' сервис(ов), доверие ' + Math.round((c.avgConfidence || 0) * 100) +
          '%</span></div>' +
          '<span class="ai-alert__save">до ' + escapeHtml(D.formatRub(Math.round(c.potential))) + '/мес</span>' +
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
          text: 'Рекомендуем оставить «' + keep.p.name + '». Остальные сервисы можно перевести на паузу.',
          okText: 'Понятно',
        });
        return;
      }
      if (btn.hasAttribute('data-ai-pause')) {
        showAiModal({
          title: 'Пауза для остальных',
          text: 'Оставим активным «' + keep.p.name + '», остальные похожие сервисы поставим на паузу.',
          okText: 'Подтвердить',
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
            run();
          },
        });
      }
    };
  }

  function showAiModal(cfg) {
    var root = document.getElementById('actions-ai-modal');
    if (!root) {
      root = document.createElement('div');
      root.id = 'actions-ai-modal';
      root.className = 'dash-modal';
      root.hidden = true;
      root.innerHTML =
        '<div class="dash-modal__backdrop" data-ai-close></div>' +
        '<div class="dash-modal__panel">' +
        '<button type="button" class="dash-modal__x" data-ai-close aria-label="Закрыть">×</button>' +
        '<h2 class="dash-modal__title" id="actions-ai-modal-title"></h2>' +
        '<p class="dash-modal__text" id="actions-ai-modal-text"></p>' +
        '<div class="dash-modal__actions" id="actions-ai-modal-actions"></div>' +
        '</div>';
      document.body.appendChild(root);
      root.addEventListener('click', function (e) {
        if (e.target && e.target.hasAttribute('data-ai-close')) root.hidden = true;
      });
    }
    document.getElementById('actions-ai-modal-title').textContent = cfg.title || 'Информация';
    document.getElementById('actions-ai-modal-text').textContent = cfg.text || '';
    var actions = document.getElementById('actions-ai-modal-actions');
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

  function run() {
    var subEl = document.querySelector('.page-sub');
    if (subEl) subEl.textContent = formatHeaderSub(new Date());

    var addBtn = document.querySelector('.header-actions .btn-primary');
    if (addBtn) {
      addBtn.onclick = function () {
        window.location.href = 'payments.html';
      };
    }

    var host = document.getElementById('actions-list');
    if (!host) return;
    renderAiWarnings();

    var t0 = D.moscowYmd(new Date());
    var active = D.getState().payments.filter(function (p) {
      return D.resolvePayStatus(p) === 'active';
    });
    active.sort(function (a, b) {
      return D.daysBetweenYmd(t0, a.nextDue) - D.daysBetweenYmd(t0, b.nextDue);
    });

    var slice = active.slice(0, 6);
    renderBanner(active.length, slice.length, slice, t0);

    if (!slice.length) {
      host.innerHTML =
        '<p class="actions-empty">Нет активных подписок для подсказок. Добавьте или включите подписки в разделе <a href="payments.html">«Платежи»</a>.</p>';
      D.patchSidebarBadges();
      renderSavingsSimulator(active);
      return;
    }

    host.innerHTML = slice
      .map(function (p) {
        var mrub = monthlyRubNat(p);
        var cat = escapeHtml(p.category || 'Без категории');
        var hint = actionHintForPayment(t0, p);
        var meta = priorityMeta(t0, p);
        var st = statusLabel(p);
        var pillOrange = mrub <= 0;
        return (
          '<article class="card action-card" data-pay-id="' +
          escapeHtml(p.id) +
          '">' +
          '<div class="top">' +
          '<div class="action-card__lead">' +
          iconBlock(p) +
          '<div>' +
          '<h3>' +
          escapeHtml(p.name || 'Подписка') +
          '</h3>' +
          '<p class="action-card__from">Та же запись, что в <a href="payments.html">«Платежах»</a> · ' +
          st +
          ' · ' +
          cat +
          '</p>' +
          '<p class="desc">' +
          escapeHtml(hint) +
          '</p>' +
          '<span class="saving-pill' +
          (pillOrange ? ' saving-pill--warn' : '') +
          '">~ ' +
          escapeHtml(D.formatRub(mrub)) +
          ' / мес</span>' +
          '</div></div>' +
          '<span class="action-card__meta">' +
          escapeHtml(meta) +
          '</span></div>' +
          '<div class="action-btns">' +
          '<a class="btn-a" href="edit-payment.html?id=' +
          encodeURIComponent(p.id) +
          '">Открыть подписку</a>' +
          '<a class="btn-b" href="payments.html">Все платежи</a>' +
          '<button type="button" class="btn-c" data-pause-id="' +
          escapeHtml(p.id) +
          '">На паузу</button>' +
          '</div></article>'
        );
      })
      .join('');

    host.querySelectorAll('[data-pause-id]').forEach(function (btn) {
      var id = btn.getAttribute('data-pause-id');
      if (id) btn.addEventListener('click', wirePause(id));
    });

    D.patchSidebarBadges();

    renderSavingsSimulator(active);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
