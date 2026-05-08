(function () {
  var D = window.SubCuroData;
  var Icons = window.SubCuroPaymentIcons;
  if (!D) return;

  var CATS = [
    {
      key: 'ent',
      title: 'Развлечения',
      match: ['развлеч', 'entertain'],
      icon: 'video',
      cls: 'ent',
      art: '/Users/daniil/.cursor/projects/Users-daniil-Documents-Codex/assets/entertainment-fd33fc53-4f29-45b9-9f19-d5b5c5690eb8.png',
    },
    {
      key: 'prod',
      title: 'Продуктивность',
      match: ['продукт', 'product'],
      icon: 'education',
      cls: 'prod',
      art: '/Users/daniil/.cursor/projects/Users-daniil-Documents-Codex/assets/productivity-8715cac1-d617-49ce-9258-b5f952e80e72.png',
    },
    {
      key: 'health',
      title: 'Здоровье и образ жизни',
      match: ['здоров', 'health', 'fit'],
      icon: 'fitness',
      cls: 'health',
      art: '/Users/daniil/.cursor/projects/Users-daniil-Documents-Codex/assets/health-2162302e-feee-4653-9b69-438bde73bb8d.png',
    },
    {
      key: 'utils',
      title: 'Сервисы и утилиты',
      match: ['облак', 'cloud', 'утил', 'service', 'vpn'],
      icon: 'cloud',
      cls: 'utils',
      art: '/Users/daniil/.cursor/projects/Users-daniil-Documents-Codex/assets/utilities-8177b87b-ef81-4dcb-a961-720c5352cc0f.png',
    },
    {
      key: 'shop',
      title: 'Покупки и повседневные сервисы',
      match: ['покуп', 'shop', 'еда', 'food'],
      icon: 'shopping',
      cls: 'shop',
      art: '/Users/daniil/.cursor/projects/Users-daniil-Documents-Codex/assets/shopping-e316a288-285d-490f-9ad7-b32dea058ba8.png',
    },
    {
      key: 'other',
      title: 'Другое',
      match: [],
      icon: 'payments',
      cls: 'other',
      art: '/Users/daniil/.cursor/projects/Users-daniil-Documents-Codex/assets/other-220388f5-b7c4-46e0-98aa-54e55406eebb.png',
    },
  ];

  function monthlyRub(p) {
    var amt = Number(p.amount) || 0;
    var cur = D.normalizeCurrency(p.currency);
    var nat = p.cycle === 'yearly' ? amt / 12 : amt;
    if (cur === 'RUB') return nat;
    return D.convertToRub(nat, cur);
  }

  function matchesCat(raw, cat) {
    if (!raw) return false;
    var v = String(raw).toLowerCase();
    return cat.match.some(function (m) {
      return v.indexOf(m) >= 0;
    });
  }

  function catByPayment(p) {
    var raw = D.normalizeCategory ? D.normalizeCategory(p.category) : p.category || '';
    for (var j = 0; j < CATS.length; j++) {
      if (CATS[j].title === raw) return CATS[j];
    }
    for (var i = 0; i < CATS.length - 1; i++) {
      if (matchesCat(raw, CATS[i])) return CATS[i];
    }
    return CATS[CATS.length - 1];
  }

  function iconHtml(iconId) {
    if (Icons && Icons.cellHtml) return Icons.cellHtml(iconId || 'payments', { shape: 'rounded' });
    return '<span class="pay-svc-icon"></span>';
  }

  function escAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function render() {
    var host = document.getElementById('collections-list');
    var details = document.getElementById('collections-detail');
    if (!host) return;
    var sub = document.getElementById('collections-live-sub');
    if (sub) sub.textContent = 'Ваши подписки в красивом порядке';

    var list = D.getState().payments.filter(function (p) {
      return D.resolvePayStatus(p) === 'active';
    });
    var total = 0;
    var agg = {};
    CATS.forEach(function (c) {
      agg[c.key] = { cat: c, total: 0, count: 0, icons: [] };
    });
    list.forEach(function (p) {
      var c = catByPayment(p);
      var val = monthlyRub(p);
      total += val;
      agg[c.key].total += val;
      agg[c.key].count++;
      if (agg[c.key].icons.length < 2) agg[c.key].icons.push(p.icon || c.icon);
    });

    var byCat = {};
    CATS.forEach(function (c) {
      byCat[c.key] = [];
    });
    list.forEach(function (p) {
      byCat[catByPayment(p).key].push(p);
    });

    host.innerHTML = CATS.map(function (c) {
      var x = agg[c.key];
      var pct = total > 0 ? Math.round((x.total / total) * 100) : 0;
      var icons = x.icons.length ? x.icons : [c.icon];
      var iconList = icons
        .map(function (id) {
          return '<span class="pc-card__icon">' + iconHtml(id) + '</span>';
        })
        .join('');
      return (
        '<article class="pc-card pc-card--' +
        c.cls +
        '" data-cat-key="' +
        c.key +
        '">' +
        '<div class="pc-card__row-top"><div><h3 class="pc-card__title">' +
        c.title +
        '</h3><p class="pc-card__sub">' +
        x.count +
        ' ' +
        (x.count === 1 ? 'сервис' : x.count < 5 ? 'сервиса' : 'сервисов') +
        '</p></div><span class="pc-card__pct">' +
        pct +
        '%</span></div>' +
        '<div class="pc-card__amount">' +
        D.formatRub(Math.round(x.total)) +
        ' <small>/ мес</small></div>' +
        '<div class="pc-card__bottom"><div class="pc-card__icons">' +
        iconList +
        '</div><div class="pc-card__art-wrap"><img class="pc-card__art" src="' +
        escAttr(c.art) +
        '" alt="" loading="lazy" decoding="async"><span class="pc-card__go" aria-hidden="true">›</span></div></div>' +
        '</article>'
      );
    }).join('');

    if (details) {
      details.hidden = false;
      renderDetails(CATS[0], byCat[CATS[0].key], agg[CATS[0].key].total);
    }

    host.querySelectorAll('.pc-card[data-cat-key]').forEach(function (card) {
      card.addEventListener('click', function () {
        host.querySelectorAll('.pc-card').forEach(function (x) {
          x.classList.remove('is-active');
        });
        card.classList.add('is-active');
        var key = card.getAttribute('data-cat-key');
        var cat = CATS.filter(function (c) {
          return c.key === key;
        })[0];
        renderDetails(cat, byCat[key] || [], agg[key] ? agg[key].total : 0);
      });
    });
    var first = host.querySelector('.pc-card[data-cat-key]');
    if (first) first.classList.add('is-active');
  }

  function fmtShort(ymd) {
    var p = String(ymd || '').split('-').map(Number);
    if (!p[0]) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: D.TZ,
      day: 'numeric',
      month: 'short',
    }).format(new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0)));
  }

  function renderDetails(cat, list, total) {
    var host = document.getElementById('collections-detail');
    if (!host || !cat) return;
    if (!list.length) {
      host.innerHTML =
        '<div class="collections-detail__head"><h3>' +
        cat.title +
        '</h3><span class="collections-detail__sum">' +
        D.formatRub(Math.round(total)) +
        ' / мес</span></div><p class="pc-empty">В этом разделе пока нет активных подписок.</p>';
      return;
    }
    list.sort(function (a, b) {
      return monthlyRub(b) - monthlyRub(a);
    });
    host.innerHTML =
      '<div class="collections-detail__head"><h3>' +
      cat.title +
      '</h3><span class="collections-detail__sum">' +
      D.formatRub(Math.round(total)) +
      ' / мес</span></div><ul class="collections-detail__list">' +
      list
        .map(function (p) {
          return (
            '<li><a class="collections-detail__row" href="edit-payment.html?id=' +
            encodeURIComponent(p.id) +
            '">' +
            iconHtml(p.icon) +
            '<span class="collections-detail__svc"><strong>' +
            escHtml(p.name) +
            '</strong><span>Следующее: ' +
            fmtShort(p.nextDue) +
            '</span></span><span class="collections-detail__amt">' +
            D.formatRub(Math.round(monthlyRub(p))) +
            '</span></a></li>'
          );
        })
        .join('') +
      '</ul>';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
