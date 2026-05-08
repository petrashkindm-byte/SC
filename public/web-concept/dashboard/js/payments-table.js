(function () {
  var D = window.SubCuroData;
  var Icons = window.SubCuroPaymentIcons;
  if (!D) return;

  var TZ = D.TZ;
  var filter = 'all';
  var searchQuery = '';
  var selectedIconId = 'payments';
  var selectedCurrency = 'RUB';
  var selectedCardId = '';

  function fmtShort(ymd) {
    var p = ymd.split('-').map(Number);
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: TZ,
      day: 'numeric',
      month: 'short',
    }).format(new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0)));
  }

  function payStatusOf(p) {
    return D.resolvePayStatus ? D.resolvePayStatus(p) : p.active !== false ? 'active' : 'paused';
  }

  function statusFor(p) {
    var ps = payStatusOf(p);
    var t0 = D.moscowYmd(new Date());
    var overdueDays = D.daysBetweenYmd(p.nextDue, t0);
    if (ps === 'paused') return { label: 'На паузе', cls: 'pause', col: '' };
    if (ps === 'cancelled') return { label: 'Отменён', cls: 'cancelled', col: '' };
    if (ps === 'archived') return { label: 'В архиве', cls: 'archived', col: '' };
    if (overdueDays > 0) return { label: 'Просрочено', cls: 'overdue', col: 'color:var(--red);font-weight:600;' };
    return { label: 'Активна', cls: 'active', col: '' };
  }

  function cycleRu(c) {
    return c === 'yearly' ? 'Ежегодно' : 'Ежемесячно';
  }

  function escape(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function cellIcon(p) {
    if (Icons && Icons.cellHtml) {
      return Icons.cellHtml(p.icon, {
        bg: p.iconBg,
        shape: p.iconShape || 'rounded',
      });
    }
    return '<span class="pay-svc-icon" style="--pay-icon-bg:#ede9fc"></span>';
  }

  function dueRelativePhrase(t0, dueYmd) {
    var n = D.daysBetweenYmd(t0, dueYmd);
    if (n < 0) return 'просрочено на ' + Math.abs(n) + ' дн.';
    if (n === 0) return 'сегодня';
    if (n === 1) return 'завтра';
    return 'через ' + n + ' дн.';
  }

  function rowHtml(p) {
    var st = statusFor(p);
    var t0 = D.moscowYmd(new Date());
    var rel = dueRelativePhrase(t0, p.nextDue);
    var nextCell =
      st.cls === 'overdue'
        ? '<td style="' + st.col + '"><strong>Просрочено</strong><div style="font-size:12px;font-weight:500;margin-top:4px;opacity:0.95">' +
          fmtShort(p.nextDue) +
          '</div><div style="font-size:12px;margin-top:2px">' +
          rel +
          '</div></td>'
        : '<td><div style="font-weight:500">' +
          fmtShort(p.nextDue) +
          '</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">' +
          rel +
          '</div></td>';
    return (
      '<tr class="pay-row--link" data-id="' +
      p.id +
      '">' +
      '<td><div class="pay-svc-row">' +
      cellIcon(p) +
      '<strong><a class="pay-svc-link" href="edit-payment.html?id=' +
      encodeURIComponent(p.id) +
      '">' +
      escape(p.name) +
      '</a></strong></div></td>' +
      nextCell +
      '<td>' +
      cycleRu(p.cycle) +
      '</td>' +
      '<td class="pay-amt-cell">' +
      (D.formatPaymentAmountHtml ? D.formatPaymentAmountHtml(p) : '<strong>' + D.formatRub(p.amount) + '</strong>') +
      '</td>' +
      '<td><span class="badge-status ' +
      st.cls +
      '">' +
      st.label +
      '</span></td>' +
      '<td><button type="button" class="pay-del" aria-label="Удалить" style="border:none;background:none;cursor:pointer;font-size:18px;">⋯</button></td></tr>'
    );
  }

  function matchesSearch(p, q) {
    if (!q) return true;
    var n = (p.name || '').toLowerCase();
    var cat = (p.category || '').toLowerCase();
    var lbl = Icons && Icons.labelFor ? String(Icons.labelFor(p.icon)).toLowerCase() : '';
    var id = String(p.icon || '').toLowerCase();
    return n.indexOf(q) >= 0 || cat.indexOf(q) >= 0 || lbl.indexOf(q) >= 0 || id.indexOf(q) >= 0;
  }

  function render() {
    var tb = document.getElementById('payments-tbody');
    if (!tb) return;
    var list = D.getState().payments.slice();
    var t0 = D.moscowYmd(new Date());
    var q = searchQuery.trim().toLowerCase();

    list = list.filter(function (p) {
      if (filter === 'all') return true;
      var until = D.daysBetweenYmd(t0, p.nextDue);
      var ps = payStatusOf(p);
      if (filter === 'active') return ps === 'active';
      if (filter === 'soon') return ps === 'active' && until >= 0 && until <= 14;
      if (filter === 'paused') return ps === 'paused';
      if (filter === 'cancelled') return ps === 'cancelled';
      return true;
    });

    list = list.filter(function (p) {
      return matchesSearch(p, q);
    });

    if (!list.length) {
      var emptyMsg =
        filter === 'soon'
          ? 'Нет списаний в ближайшие 14 дней. Все даты дальше или подписки неактивны.'
          : filter === 'active'
            ? 'Нет активных подписок.'
            : filter === 'paused'
              ? 'Нет подписок на паузе.'
              : filter === 'cancelled'
                ? 'Нет отменённых подписок.'
                : 'Ничего не найдено. Измените фильтр или поиск.';
      tb.innerHTML =
        '<tr><td colspan="6" style="padding:28px;text-align:center;color:var(--text-muted);">' +
        escape(emptyMsg) +
        '</td></tr>';
    } else {
      tb.innerHTML = list.map(rowHtml).join('');
      tb.querySelectorAll('.pay-del').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var tr = btn.closest('tr');
          var id = tr && tr.getAttribute('data-id');
          if (id && confirm('Удалить платёж?')) {
            D.removePayment(id);
            render();
            D.patchSidebarBadges();
          }
        });
      });
      tb.querySelectorAll('tr.pay-row--link[data-id]').forEach(function (tr) {
        var id = tr.getAttribute('data-id');
        if (!id) return;
        function goToEdit(e) {
          if (e.target.closest && (e.target.closest('.pay-del') || e.target.closest('a'))) return;
          window.location.href = 'edit-payment.html?id=' + encodeURIComponent(id);
        }
        tr.addEventListener('click', goToEdit);
      });
    }

    var sub = document.getElementById('payments-live-sub');
    if (sub) sub.textContent = 'Активных: ' + D.getActiveCount() + ' · сумма в месяц: ' + D.formatRub(D.computeMonthlySpend());
  }

  document.querySelectorAll('.filter-tabs button[data-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-tabs button').forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      filter = btn.getAttribute('data-filter') || 'all';
      render();
    });
  });

  var searchEl = document.getElementById('payments-search');
  if (searchEl) {
    searchEl.addEventListener('input', function () {
      searchQuery = searchEl.value;
      render();
    });
  }

  function setPickerSelection(id) {
    selectedIconId = id;
    var hid = document.getElementById('pay-form-icon');
    if (hid) hid.value = id;
    var wrap = document.getElementById('pay-icon-picker');
    if (wrap) {
      wrap.querySelectorAll('.icon-pick__btn').forEach(function (b) {
        b.classList.toggle('icon-pick__btn--on', b.getAttribute('data-icon-id') === id);
      });
    }
    updateAddPreview();
  }

  function inferCategoryByIcon(iconId) {
    var id = String(iconId || '').toLowerCase();
    if (id.indexOf('video') >= 0 || id.indexOf('music') >= 0 || id.indexOf('game') >= 0) return 'Развлечения';
    if (id.indexOf('education') >= 0 || id.indexOf('work') >= 0 || id.indexOf('product') >= 0) return 'Продуктивность';
    if (id.indexOf('fitness') >= 0 || id.indexOf('health') >= 0) return 'Здоровье и образ жизни';
    if (id.indexOf('cloud') >= 0 || id.indexOf('utility') >= 0 || id.indexOf('vpn') >= 0) return 'Сервисы и утилиты';
    if (id.indexOf('shopping') >= 0 || id.indexOf('shop') >= 0 || id.indexOf('food') >= 0) return 'Покупки и повседневные сервисы';
    return 'Другое';
  }

  function setPayAddCurrency(cur) {
    selectedCurrency = D.normalizeCurrency(cur);
    document.querySelectorAll('#pay-add-currency-pills [data-cur]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-cur') === selectedCurrency);
    });
    var amtEl = document.getElementById('pay-add-amount');
    if (amtEl) amtEl.step = selectedCurrency === 'RUB' ? '1' : '0.01';
    var lbl = document.getElementById('pay-add-amount-lbl');
    if (lbl) {
      lbl.textContent =
        selectedCurrency === 'RUB' ? 'Сумма, ₽' : 'Сумма в ' + selectedCurrency + ' (как на сайте)';
    }
  }

  function renderPayAddCardPills() {
    var host = document.getElementById('pay-add-card-pills');
    if (!host || !D.getSavedCards) return;
    var cards = D.getSavedCards();
    if (!cards.length) return;
    if (!selectedCardId || !cards.some(function (c) { return c.id === selectedCardId; })) {
      selectedCardId = cards[0].id;
    }
    host.innerHTML = cards
      .map(function (c) {
        var on = c.id === selectedCardId ? ' is-on' : '';
        return (
          '<button type="button" class="pill-btn' +
          on +
          '" data-card-id="' +
          c.id +
          '"><span class="pill-check">✓</span> ' +
          escape(c.brand + ' ···· ' + c.last4) +
          '</button>'
        );
      })
      .join('');
  }

  function updateAddPreview() {
    var prev = document.getElementById('pay-add-preview');
    if (!prev || !Icons) return;
    var nameEl = document.getElementById('pay-add-name');
    var amtEl = document.getElementById('pay-add-amount');
    var cycleEl = document.getElementById('pay-add-cycle');
    var name = nameEl && nameEl.value.trim() ? nameEl.value.trim() : 'Название';
    var raw = amtEl && amtEl.value ? Number(amtEl.value) : 0;
    var cur = D.normalizeCurrency(selectedCurrency);
    var amt = cur === 'RUB' ? Math.round(raw) : Math.round(raw * 100) / 100;
    var cyc = cycleEl && cycleEl.value === 'yearly' ? 'yearly' : 'monthly';
    var monthly = cyc === 'yearly' ? amt / 12 : amt;
    var priceLine = D.formatMoneyNative(monthly, cur) + ' / мес';
    if (cur !== 'RUB' && D.convertToRub) {
      priceLine +=
        ' <span style="color:var(--text-muted);font-size:12px">(≈ ' +
        D.formatRub(Math.round(D.convertToRub(monthly, cur))) +
        ')</span>';
    }
    prev.innerHTML =
      '<div class="pay-add-preview__inner">' +
      Icons.cellHtml(selectedIconId) +
      '<span class="pay-add-preview__name">' +
      escape(name) +
      '</span><span class="pay-add-preview__sep">|</span><span>' +
      priceLine +
      '</span><span class="pay-add-preview__chev">›</span></div>';
  }

  function renderNotifPay() {
    var box = document.getElementById('notif-list-pay');
    if (!box || !D.getNotifications) return;
    var items = D.getNotifications();
    box.innerHTML = items
      .map(function (n) {
        return (
          '<button type="button" class="notif-item' +
          (n.read ? ' notif-item--read' : '') +
          '" data-id="' +
          escape(n.id) +
          '">' +
          escape(n.text) +
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

  function wireNotifPay() {
    var bell = document.getElementById('btn-pay-notif');
    var pop = document.getElementById('notif-pop-pay');
    if (bell && pop) {
      bell.addEventListener('click', function (e) {
        e.stopPropagation();
        pop.hidden = !pop.hidden;
        if (!pop.hidden) renderNotifPay();
      });
    }
    document.addEventListener('mousedown', function (e) {
      var p = document.getElementById('notif-pop-pay');
      var b = document.getElementById('btn-pay-notif');
      if (!p || p.hidden) return;
      if (p.contains(e.target) || (b && b.contains(e.target))) return;
      p.hidden = true;
    });
  }

  function openAddModal() {
    var modal = document.getElementById('pay-add-modal');
    var picker = document.getElementById('pay-icon-picker');
    var form = document.getElementById('pay-add-form');
    if (!modal || !picker || !form || !Icons) return;
    form.reset();
    selectedIconId = 'payments';
    selectedCurrency = 'RUB';
    setPayAddCurrency('RUB');
    picker.innerHTML = Icons.pickerHtml('payments');
    setPickerSelection('payments');
    renderPayAddCardPills();
    var dateIn = document.getElementById('pay-add-next');
    if (dateIn) dateIn.value = D.moscowYmd(new Date());
    updateAddPreview();
    modal.removeAttribute('hidden');
    var first = document.getElementById('pay-add-name');
    if (first) setTimeout(function () {
      first.focus();
    }, 50);
  }

  function closeAddModal() {
    var modal = document.getElementById('pay-add-modal');
    if (modal) modal.setAttribute('hidden', '');
  }

  var addBtn = document.getElementById('payments-btn-add');
  if (addBtn) addBtn.addEventListener('click', openAddModal);

  var modal = document.getElementById('pay-add-modal');
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target.getAttribute('data-close') != null) closeAddModal();
    });
    var picker = document.getElementById('pay-icon-picker');
    if (picker) {
      picker.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-icon-id]');
        if (!btn) return;
        setPickerSelection(btn.getAttribute('data-icon-id'));
      });
    }
    var curHost = document.getElementById('pay-add-currency-pills');
    if (curHost) {
      curHost.addEventListener('click', function (e) {
        var b = e.target.closest('[data-cur]');
        if (!b) return;
        setPayAddCurrency(b.getAttribute('data-cur'));
        updateAddPreview();
      });
    }
    var cardHost = document.getElementById('pay-add-card-pills');
    if (cardHost) {
      cardHost.addEventListener('click', function (e) {
        var b = e.target.closest('[data-card-id]');
        if (!b) return;
        selectedCardId = b.getAttribute('data-card-id');
        renderPayAddCardPills();
      });
    }

    var form = document.getElementById('pay-add-form');
    if (form) {
      form.addEventListener('input', updateAddPreview);
      form.addEventListener('change', updateAddPreview);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var nameEl = document.getElementById('pay-add-name');
        var amtEl = document.getElementById('pay-add-amount');
        var cycleEl = document.getElementById('pay-add-cycle');
        var dateEl = document.getElementById('pay-add-next');
        var name = nameEl ? nameEl.value.trim() : '';
        if (!name) {
          alert('Введите название сервиса.');
          return;
        }
        var cur = D.normalizeCurrency(selectedCurrency);
        var rawAmt = amtEl ? Number(amtEl.value) : 0;
        var amount = cur === 'RUB' ? Math.round(rawAmt) : Math.round(rawAmt * 100) / 100;
        D.addPayment({
          name: name,
          amount: amount,
          currency: cur,
          cardId: selectedCardId,
          category: D.normalizeCategory ? D.normalizeCategory(inferCategoryByIcon(selectedIconId)) : inferCategoryByIcon(selectedIconId),
          cycle: cycleEl && cycleEl.value === 'yearly' ? 'yearly' : 'monthly',
          nextDue: dateEl && dateEl.value ? dateEl.value : D.moscowYmd(new Date()),
          icon: selectedIconId,
        });
        closeAddModal();
        render();
        D.patchSidebarBadges();
      });
    }
  }

  function run() {
    var h = (window.location.hash || '').replace(/^#/, '');
    if (['paused', 'active', 'soon', 'cancelled'].indexOf(h) >= 0) {
      filter = h;
      document.querySelectorAll('.filter-tabs button[data-filter]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-filter') === h);
      });
    }
    wireNotifPay();
    renderNotifPay();
    render();
    D.patchSidebarBadges();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
