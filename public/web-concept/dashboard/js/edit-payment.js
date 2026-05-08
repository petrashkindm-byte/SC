(function () {
  var D = window.SubCuroData;
  var Icons = window.SubCuroPaymentIcons;
  if (!D || !Icons) return;

  var TZ = D.TZ;
  var params = new URLSearchParams(location.search);
  var payId = params.get('id');
  if (!payId) {
    window.location.href = 'payments.html';
    return;
  }

  var p0;
  (D.getState().payments || []).some(function (x) {
    if (x.id === payId) {
      p0 = x;
      return true;
    }
    return false;
  });
  if (!p0) {
    window.location.href = 'payments.html';
    return;
  }

  function qs(id) {
    return document.getElementById(id);
  }

  var vis = {
    icon: p0.icon,
    iconBg: p0.iconBg || '',
    iconShape: p0.iconShape || 'rounded',
    cardFill: p0.cardFill || 'none',
    currency: D.normalizeCurrency(p0.currency),
    cardId: p0.cardId || '',
  };

  function iconOpts() {
    var meta = Icons.map[vis.icon] || Icons.map.payments;
    return {
      bg: vis.iconBg || meta.bg,
      shape: vis.iconShape || 'rounded',
    };
  }

  function fmtShort(ymd) {
    var p = String(ymd).split('-').map(Number);
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: TZ,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0)));
  }

  function refreshPreview() {
    var nameEl = qs('edit-name');
    var catEl = qs('edit-category');
    var amtEl = qs('edit-amount');
    var cycEl = qs('edit-cycle');
    var dueEl = qs('edit-next-due');
    var name = (nameEl && nameEl.value.trim()) || 'Название';
    var cat = (catEl && catEl.value) || 'Категория';
    var raw = amtEl ? Number(amtEl.value) : 0;
    var amount = vis.currency === 'RUB' ? Math.round(raw) : Math.round(raw * 100) / 100;
    var cycle = cycEl && cycEl.value === 'yearly' ? 'yearly' : 'monthly';
    var due = (dueEl && dueEl.value) || p0.nextDue;
    var monthly = cycle === 'yearly' ? amount / 12 : amount;

    var sumName = qs('edit-sum-name');
    var sumCat = qs('edit-sum-cat');
    var sumAmt = qs('edit-sum-amt');
    var sumDue = qs('edit-sum-due');
    var sumStat = qs('edit-sum-status');
    var sumIcon = qs('edit-sum-icon');
    var prevHost = qs('edit-preview-inner');

    if (sumName) sumName.textContent = name;
    if (sumCat) sumCat.textContent = cat;
    if (sumAmt) {
      var sumHtml =
        '<span style="color:var(--text-muted);">Сумма:</span> <strong>' +
        D.formatMoneyNative(monthly, vis.currency) +
        ' / мес</strong>';
      if (cycle === 'yearly') {
        sumHtml +=
          ' <span style="font-size:12px;color:var(--text-muted)">(год: ' +
          D.formatMoneyNative(amount, vis.currency) +
          ')</span>';
      }
      if (vis.currency !== 'RUB') {
        sumHtml +=
          '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">В приложении ≈ ' +
          D.formatRub(Math.round(D.convertToRub(monthly, vis.currency))) +
          ' / мес</div>';
      }
      sumAmt.innerHTML = sumHtml;
    }
    if (sumDue) {
      var tDue = D.moscowYmd(new Date());
      var nDue = D.daysBetweenYmd(tDue, due);
      var relDue =
        nDue < 0
          ? 'просрочено на ' + Math.abs(nDue) + ' дн.'
          : nDue === 0
            ? 'сегодня'
            : nDue === 1
              ? 'завтра'
              : 'через ' + nDue + ' дн.';
      sumDue.innerHTML =
        '<span style="color:var(--text-muted);">Следующее списание:</span> <strong>' +
        fmtShort(due) +
        '</strong><div style="font-size:12px;color:var(--text-muted);margin-top:4px">' +
        relDue +
        '</div>';
    }
    if (sumStat) {
      var st = getStatusValue();
      sumStat.textContent = st === 'active' ? '● Активен' : st === 'paused' ? '● На паузе' : st === 'cancelled' ? '● Отменён' : '● В архиве';
      sumStat.className =
        'chip ' +
        (st === 'active' ? 'tag-green' : st === 'paused' ? 'tag-orange' : st === 'cancelled' ? 'tag-red' : 'tag-gray');
    }
    if (sumIcon) sumIcon.innerHTML = Icons.cellHtml(vis.icon, iconOpts());

    var prevAmt =
      '<strong style="margin-left:auto;white-space:nowrap;text-align:right;">' +
      D.formatMoneyNative(cycle === 'yearly' ? amount : monthly, vis.currency) +
      '</strong>';
    if (vis.currency !== 'RUB') {
      prevAmt +=
        '<div style="font-size:11px;color:var(--text-muted);white-space:nowrap;">≈ ' +
        D.formatRub(Math.round(D.convertToRub(monthly, vis.currency))) +
        '</div>';
    }

    if (prevHost) {
      prevHost.innerHTML =
        '<div class="pay-svc-row" style="width:100%;">' +
        Icons.cellHtml(vis.icon, iconOpts()) +
        '<div style="min-width:0;flex:1;">' +
        '<strong>' +
        escapeHtml(name) +
        '</strong>' +
        '<div style="font-size:12px;color:var(--text-muted);">' +
        escapeHtml(cat) +
        '</div></div>' +
        prevAmt +
        '</div>';
    }

    var phone = qs('edit-preview-phone');
    if (phone) {
      phone.className = 'preview-phone';
      if (vis.cardFill && vis.cardFill !== 'none') phone.classList.add('preview-phone--' + vis.cardFill);
    }

    syncCurrencyPills();
    renderEditCardPills();
    syncColorSwatches();
    syncCardFillButtons();
    syncShapeSegmented();
    updateEditFxHint();
  }

  function syncCurrencyPills() {
    document.querySelectorAll('#edit-currency-pills [data-cur]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-cur') === vis.currency);
    });
  }

  function syncAmountStep() {
    var inp = qs('edit-amount');
    if (inp) inp.step = vis.currency === 'RUB' ? '1' : '0.01';
    var lbl = qs('edit-amount-lbl');
    if (lbl) lbl.textContent = vis.currency === 'RUB' ? 'Сумма, ₽' : 'Сумма в ' + vis.currency;
  }

  function renderEditCardPills() {
    var host = qs('edit-card-pills');
    if (!host || !D.getSavedCards) return;
    var cards = D.getSavedCards();
    if (!vis.cardId || !cards.some(function (c) { return c.id === vis.cardId; })) {
      vis.cardId = cards[0] && cards[0].id;
    }
    host.innerHTML = cards
      .map(function (c) {
        var on = c.id === vis.cardId ? ' is-on' : '';
        return (
          '<button type="button" class="pill-btn' +
          on +
          '" data-card-id="' +
          c.id +
          '"><span class="pill-check">✓</span> ' +
          escapeHtml(c.brand + ' ···· ' + c.last4) +
          '</button>'
        );
      })
      .join('');
  }

  function updateEditFxHint() {
    var el = qs('edit-fx-hint');
    if (!el) return;
    el.textContent =
      'Для USD и EUR подсказка в ₽ считается по внутреннему курсу (Frankfurter). Валюта подписки задаётся кнопками RUB / USD / EUR выше.';
  }

  function openCardModal(isNew) {
    var modal = qs('card-edit-modal');
    if (!modal) return;
    var sel = qs('card-modal-select');
    var brand = qs('card-modal-brand');
    var last4 = qs('card-modal-last4');
    if (!sel || !brand || !last4) return;
    if (isNew) {
      sel.innerHTML =
        '<option value="">Новая карта</option>' +
        D.getSavedCards()
          .map(function (c) {
            return '<option value="' + c.id + '">' + escapeHtml(c.brand + ' ···· ' + c.last4) + '</option>';
          })
          .join('');
      sel.value = '';
      brand.value = 'Visa';
      last4.value = '';
    } else {
      sel.innerHTML = D.getSavedCards()
        .map(function (c) {
          return '<option value="' + c.id + '">' + escapeHtml(c.brand + ' ···· ' + c.last4) + '</option>';
        })
        .join('');
      sel.value = vis.cardId || (D.getSavedCards()[0] && D.getSavedCards()[0].id);
      var cur = D.getSavedCards().filter(function (c) {
        return c.id === sel.value;
      })[0];
      if (cur) {
        brand.value = cur.brand;
        last4.value = cur.last4;
      }
    }
    modal.dataset.mode = isNew ? 'new' : 'edit';
    modal.removeAttribute('hidden');
  }

  function closeCardModal() {
    var modal = qs('card-edit-modal');
    if (modal) modal.setAttribute('hidden', '');
  }

  function wireCurrencyAndCards() {
    var curHost = qs('edit-currency-pills');
    if (curHost) {
      curHost.addEventListener('click', function (e) {
        var b = e.target.closest('[data-cur]');
        if (!b) return;
        vis.currency = D.normalizeCurrency(b.getAttribute('data-cur'));
        syncAmountStep();
        refreshPreview();
      });
    }
    var cardHost = qs('edit-card-pills');
    if (cardHost) {
      cardHost.addEventListener('click', function (e) {
        var b = e.target.closest('[data-card-id]');
        if (!b) return;
        vis.cardId = b.getAttribute('data-card-id');
        renderEditCardPills();
      });
    }
    var btnEdit = qs('edit-card-manage');
    if (btnEdit) btnEdit.addEventListener('click', function () { openCardModal(false); });
    var btnNew = qs('edit-card-new');
    if (btnNew) btnNew.addEventListener('click', function () { openCardModal(true); });

    var modal = qs('card-edit-modal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target.getAttribute('data-card-close') != null) closeCardModal();
      });
      var sel = qs('card-modal-select');
      if (sel) {
        sel.addEventListener('change', function () {
          var c = D.getSavedCards().filter(function (x) {
            return x.id === sel.value;
          })[0];
          if (c) {
            qs('card-modal-brand').value = c.brand;
            qs('card-modal-last4').value = c.last4;
          }
        });
      }
      var saveM = qs('card-modal-save');
      if (saveM) {
        saveM.addEventListener('click', function () {
          var brandV = qs('card-modal-brand').value.trim() || 'Карта';
          var lastV = qs('card-modal-last4').value.replace(/\D/g, '').slice(0, 4) || '0000';
          var sid = qs('card-modal-select').value;
          if (!sid || modal.dataset.mode === 'new') {
            vis.cardId = D.addSavedCard({ brand: brandV, last4: lastV });
          } else {
            D.updateSavedCard(sid, { brand: brandV, last4: lastV });
          }
          closeCardModal();
          renderEditCardPills();
        });
      }
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function getStatusValue() {
    var root = qs('edit-seg-status');
    if (!root) return 'active';
    var on = root.querySelector('button.on');
    return (on && on.getAttribute('data-val')) || 'active';
  }

  function statusToActive(val) {
    return val === 'active';
  }

  function syncColorSwatches() {
    var meta = Icons.map[vis.icon] || Icons.map.payments;
    var cur = (vis.iconBg || '').toLowerCase();
    var preset = (meta.bg || '').toLowerCase();
    document.querySelectorAll('.edit-color-btn').forEach(function (btn) {
      var h = (btn.getAttribute('data-hex') || '').toLowerCase();
      btn.classList.toggle('on', cur ? h === cur : h === preset);
    });
  }

  function syncCardFillButtons() {
    document.querySelectorAll('.edit-cardfill-btn').forEach(function (btn) {
      var f = btn.getAttribute('data-fill') || 'none';
      btn.classList.toggle('on', f === (vis.cardFill || 'none'));
    });
  }

  function syncShapeSegmented() {
    var root = qs('edit-shape-seg');
    if (!root) return;
    root.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('on', (b.getAttribute('data-shape') || 'rounded') === vis.iconShape);
    });
  }

  function renderIconPicker() {
    var host = qs('edit-icon-picker');
    if (!host) return;
    host.innerHTML = Icons.pickerHtml(vis.icon);
  }

  function wireTabs() {
    document.querySelectorAll('[data-edit-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.getAttribute('data-edit-tab');
        document.querySelectorAll('[data-edit-tab]').forEach(function (b) {
          b.classList.toggle('on', b === btn);
        });
        document.querySelectorAll('[data-edit-pane]').forEach(function (pane) {
          pane.hidden = pane.getAttribute('data-edit-pane') !== t;
        });
      });
    });
  }

  function wireSegmented(root, attr, onPick) {
    if (!root) return;
    root.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        root.querySelectorAll('button').forEach(function (b) {
          b.classList.remove('on');
        });
        btn.classList.add('on');
        onPick(btn.getAttribute(attr));
        refreshPreview();
      });
    });
  }

  function wireIconPicker() {
    var host = qs('edit-icon-picker');
    if (!host) return;
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-icon-id]');
      if (!b) return;
      vis.icon = b.getAttribute('data-icon-id');
      renderIconPicker();
      refreshPreview();
    });
  }

  function wireColors() {
    document.querySelectorAll('.edit-color-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        vis.iconBg = btn.getAttribute('data-hex') || '';
        refreshPreview();
      });
    });
    var reset = qs('edit-color-reset');
    if (reset) {
      reset.addEventListener('click', function () {
        vis.iconBg = '';
        refreshPreview();
      });
    }
  }

  function wireCardFills() {
    document.querySelectorAll('.edit-cardfill-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        vis.cardFill = btn.getAttribute('data-fill') || 'none';
        refreshPreview();
      });
    });
  }

  function wireShape() {
    var root = qs('edit-shape-seg');
    if (!root) return;
    root.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        root.querySelectorAll('button').forEach(function (b) {
          b.classList.remove('on');
        });
        btn.classList.add('on');
        vis.iconShape = btn.getAttribute('data-shape') || 'rounded';
        refreshPreview();
      });
    });
  }

  function wireToggles() {
    document.querySelectorAll('[data-edit-toggle]').forEach(function (el) {
      el.addEventListener('click', function () {
        el.classList.toggle('is-on');
      });
    });
  }

  function setSegmentValue(root, val, attr) {
    if (!root) return;
    root.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('on', (b.getAttribute(attr) || '') === val);
    });
  }

  function initForm() {
    qs('edit-name').value = p0.name || '';
    qs('edit-amount').value = String(p0.amount != null ? p0.amount : '');
    var cat = D.normalizeCategory ? D.normalizeCategory(p0.category) : p0.category || 'Развлечения';
    var selCat = qs('edit-category');
    if (selCat) {
      selCat.value = cat;
    }
    vis.currency = D.normalizeCurrency(p0.currency);
    vis.cardId = p0.cardId || (D.getSavedCards()[0] && D.getSavedCards()[0].id);
    syncAmountStep();
    qs('edit-cycle').value = p0.cycle === 'yearly' ? 'yearly' : 'monthly';
    qs('edit-next-due').value = p0.nextDue || D.moscowYmd(new Date());

    var st = p0.payStatus;
    if (!st || ['active', 'paused', 'cancelled', 'archived'].indexOf(st) < 0) {
      st = p0.active !== false ? 'active' : 'paused';
    }
    setSegmentValue(qs('edit-seg-status'), st, 'data-val');

    setSegmentValue(qs('edit-seg-repeat'), p0.repeatAuto === false ? 'no' : 'yes', 'data-val');
    setSegmentValue(qs('edit-seg-autopay'), p0.autopayEnabled === false ? 'manual' : 'enabled', 'data-val');

    qs('tog-3d').classList.toggle('is-on', !!p0.reminders3d);
    qs('tog-trial').classList.toggle('is-on', !!p0.remindersTrial);
    qs('tog-price').classList.toggle('is-on', !!p0.remindersPrice);

    qs('edit-link-manage').value = p0.linkManage || '';
    qs('edit-link-cancel').value = p0.linkCancel || '';
    qs('edit-notes').value = p0.notes || '';

    updateNotesCount();
  }

  function updateNotesCount() {
    var ta = qs('edit-notes');
    var c = qs('edit-notes-count');
    if (ta && c) c.textContent = ta.value.length + ' / 500';
  }

  function gatherPatch() {
    var statusVal = getStatusValue();
    var repBtn = qs('edit-seg-repeat').querySelector('button.on');
    var autoBtn = qs('edit-seg-autopay').querySelector('button.on');
    var cur = D.normalizeCurrency(vis.currency);
    var rawAmt = Number(qs('edit-amount').value) || 0;
    var amount = cur === 'RUB' ? Math.round(rawAmt) : Math.round(rawAmt * 100) / 100;
    return {
      name: qs('edit-name').value,
      amount: amount,
      currency: cur,
      cardId: vis.cardId,
      category: qs('edit-category').value,
      cycle: qs('edit-cycle').value === 'yearly' ? 'yearly' : 'monthly',
      nextDue: qs('edit-next-due').value,
      payStatus: statusVal,
      active: statusToActive(statusVal),
      icon: vis.icon,
      iconBg: vis.iconBg || '',
      iconShape: vis.iconShape || 'rounded',
      cardFill: vis.cardFill && vis.cardFill !== 'none' ? vis.cardFill : '',
      repeatAuto: (repBtn && repBtn.getAttribute('data-val')) === 'yes',
      autopayEnabled: (autoBtn && autoBtn.getAttribute('data-val')) === 'enabled',
      reminders3d: qs('tog-3d').classList.contains('is-on'),
      remindersTrial: qs('tog-trial').classList.contains('is-on'),
      remindersPrice: qs('tog-price').classList.contains('is-on'),
      linkManage: qs('edit-link-manage').value.trim(),
      linkCancel: qs('edit-link-cancel').value.trim(),
      notes: qs('edit-notes').value,
    };
  }

  var saveToastTimer = null;

  function hideSaveToast() {
    var t = qs('edit-save-toast');
    if (!t) return;
    t.hidden = true;
    if (saveToastTimer) {
      clearTimeout(saveToastTimer);
      saveToastTimer = null;
    }
  }

  function showSaveToast() {
    var t = qs('edit-save-toast');
    if (!t) return;
    t.hidden = false;
    if (saveToastTimer) clearTimeout(saveToastTimer);
    saveToastTimer = setTimeout(hideSaveToast, 5000);
  }

  function save() {
    var patch = gatherPatch();
    D.updatePayment(payId, patch);
    D.patchSidebarBadges();
    p0 = D.getState().payments.filter(function (x) {
      return x.id === payId;
    })[0];
    showSaveToast();
  }

  function wireSave() {
    var top = qs('edit-btn-save-top');
    var foot = qs('edit-btn-save-foot');
    if (top) top.addEventListener('click', save);
    if (foot) foot.addEventListener('click', save);
  }

  function wireDelete() {
    var btn = qs('edit-btn-delete');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!confirm('Удалить этот платёж?')) return;
      D.removePayment(payId);
      D.patchSidebarBadges();
      window.location.href = 'payments.html';
    });
  }

  function run() {
    initForm();
    renderIconPicker();
    wireTabs();
    wireSegmented(qs('edit-seg-status'), 'data-val', function () {});
    wireSegmented(qs('edit-seg-repeat'), 'data-val', function () {});
    wireSegmented(qs('edit-seg-autopay'), 'data-val', function () {});
    wireIconPicker();
    wireColors();
    wireCardFills();
    wireShape();
    wireToggles();
    wireSave();
    wireDelete();
    wireCurrencyAndCards();

    var toastClose = qs('edit-save-toast-close');
    if (toastClose) toastClose.addEventListener('click', hideSaveToast);

    ['edit-name', 'edit-amount', 'edit-category', 'edit-cycle', 'edit-next-due'].forEach(function (id) {
      var el = qs(id);
      if (el) el.addEventListener('input', refreshPreview);
      if (el) el.addEventListener('change', refreshPreview);
    });
    var notes = qs('edit-notes');
    if (notes) {
      notes.addEventListener('input', function () {
        updateNotesCount();
      });
    }

    refreshPreview();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
