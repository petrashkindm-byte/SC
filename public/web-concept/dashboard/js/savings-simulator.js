(function () {
  var D = window.SubCuroData;
  var Icons = window.SubCuroPaymentIcons;
  var AI = window.SubCuroAIAdvisor;
  var Catalog = window.SubCuroServiceCatalog || [];
  var Families = window.SubCuroServiceFamilies || {};
  var Lib = window.SubCuroScenarioLibrary;
  var Snap = window.SubCuroPriceSnapshot;
  if (!D) return;

  var pickedId = null;
  var rows = [];
  var clusterTitle = '—';
  var activeCluster = null;
  var simActionsBound = false;
  var headerBound = false;
  var recommendedId = null;
  var usageBound = false;
  var sourceBound = false;
  var manualBound = false;
  var detailBound = false;
  var scenariosBound = false;
  var scenariosState = [];
  var scenariosModalData = null;
  var priceSnapUiBound = false;
  var scrollSnapListenerBound = false;
  var snapModalCommitBound = false;
  var helpBound = false;
  var notifBound = false;

  function setUsageSource(v) {
    try {
      localStorage.setItem('subcuro_usage_source_v1', v || 'demo');
    } catch (e) {}
  }

  function getUsageSource() {
    try {
      return localStorage.getItem('subcuro_usage_source_v1') || 'demo';
    } catch (e) {
      return 'demo';
    }
  }

  function q(id) {
    return document.getElementById(id);
  }

  function money(v) {
    return D.formatRub(Math.round(v)) + ' / мес';
  }

  function monthlyRub(p) {
    var amt = Number(p.amount) || 0;
    var cur = D.normalizeCurrency(p.currency);
    var monthly = p.cycle === 'yearly' ? amt / 12 : amt;
    return cur === 'RUB' ? monthly : D.convertToRub(monthly, cur);
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** Фраза «N похожих подписок» с правильным склонением. */
  function similarSubsPhrase(count) {
    var n = Math.floor(Number(count) || 0);
    if (n <= 0) return '0 подписок';
    var mod100 = Math.abs(n) % 100;
    var mod10 = n % 10;
    if (mod100 > 10 && mod100 < 20) return n + ' похожих подписок';
    if (mod10 === 1) return n + ' похожая подписка';
    if (mod10 >= 2 && mod10 <= 4) return n + ' похожие подписки';
    return n + ' похожих подписок';
  }

  function servicesInGroupPhrase(count) {
    var n = Math.floor(Number(count) || 0);
    if (n <= 0) return '0 сервисов';
    var mod100 = Math.abs(n) % 100;
    var mod10 = n % 10;
    if (mod100 > 10 && mod100 < 20) return n + ' сервисов';
    if (mod10 === 1) return n + ' сервис';
    if (mod10 >= 2 && mod10 <= 4) return n + ' сервиса';
    return n + ' сервисов';
  }

  function scenarioWord(count) {
    var n = Math.abs(Math.floor(Number(count) || 0)) % 100;
    var n1 = n % 10;
    if (n > 10 && n < 20) return 'сценариев';
    if (n1 === 1) return 'сценарий';
    if (n1 >= 2 && n1 <= 4) return 'сценария';
    return 'сценариев';
  }

  function iconHtml(p) {
    var iconId = String((p && p.icon) || '');
    if ((!iconId || iconId === 'payments') && p && p._simFamily) {
      if (p._simFamily === 'music_streaming') iconId = 'music';
      else if (p._simFamily === 'video_streaming') iconId = 'video';
      else if (p._simFamily === 'cloud_storage') iconId = 'cloud';
      else if (p._simFamily === 'fitness_health') iconId = 'fitness';
      else if (p._simFamily === 'productivity_ai') iconId = 'ai';
    }
    if (Icons && Icons.isValid && !Icons.isValid(iconId)) iconId = 'payments';
    var bg = p && p.iconBg ? String(p.iconBg) : '';
    if (isTooLight(bg) && Icons && Icons.map && Icons.map[iconId] && Icons.map[iconId].bg) {
      bg = Icons.map[iconId].bg;
    }
    if (Icons && Icons.cellHtml) {
      // В симуляторе используем те же фирменные preset-цвета, что и в таблице платежей.
      return Icons.cellHtml(iconId, { bg: bg, shape: p.iconShape || 'rounded' });
    }
    return '<span style="font-size:18px;font-weight:700;color:#5b43d4;">' + escapeHtml((p.name || '?').slice(0, 1).toUpperCase()) + '</span>';
  }

  function isTooLight(hex) {
    if (!hex) return false;
    var h = hex.trim();
    if (h[0] !== '#') return false;
    if (h.length === 4) {
      h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    }
    if (h.length !== 7) return false;
    var r = parseInt(h.slice(1, 3), 16) / 255;
    var g = parseInt(h.slice(3, 5), 16) / 255;
    var b = parseInt(h.slice(5, 7), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
    var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.86;
  }

  function usageHoursForRow(r) {
    return Number((r && r.usageHours30d) || (r && r.meta && r.meta.usageHours30d) || 0);
  }

  function buildTariffHint(keepRow) {
    if (!keepRow || !keepRow.meta || !keepRow.meta.catalog) return '';
    var c = keepRow.meta.catalog;
    var parts = [];
    if (c.familyPlanHint) parts.push('Доступен ' + c.familyPlanHint + '.');
    if (keepRow.p && keepRow.p.cycle !== 'yearly' && c.annualMonthsCost && c.annualMonthsCost < 12) {
      var monthly = keepRow.m;
      var yearlySaving = monthly * (12 - c.annualMonthsCost);
      parts.push('При годовой оплате экономия до ' + D.formatRub(Math.round(yearlySaving)) + ' / год.');
    }
    return parts.join(' ');
  }

  function payCycleLine(p) {
    var cur = D.normalizeCurrency(p.currency);
    var amt = Number(p.amount) || 0;
    if (p.cycle === 'yearly') {
      return (
        'Период: раз в год · списание ' +
        D.formatMoneyNative(amt, cur) +
        ' (≈ ' +
        D.formatRub(Math.round(monthlyRub(p))) +
        ' / мес)'
      );
    }
    return 'Период: каждый месяц · ' + D.formatMoneyNative(amt, cur);
  }

  function paymentCategoryLabel(p) {
    return D.normalizeCategory ? D.normalizeCategory(p.category || '') : String(p.category || '—');
  }

  function compareCritHtml(title, accent, pairHtml, noteHtml) {
    return (
      '<div class="simx-compare-crit' +
      (accent ? ' simx-compare-crit--accent' : '') +
      '">' +
      '<div class="simx-compare-crit__title">' +
      escapeHtml(title) +
      '</div>' +
      pairHtml +
      (noteHtml ? '<div class="simx-compare-crit__note">' + noteHtml + '</div>' : '') +
      '</div>'
    );
  }

  function comparePairCol(badge, row, valueHtml) {
    return (
      '<div class="simx-compare-pair__col">' +
      '<span class="simx-compare-pair__badge">' +
      escapeHtml(badge) +
      '</span>' +
      '<div class="simx-compare-pair__name">' +
      iconHtml(row.p) +
      '<span>' +
      escapeHtml(row.p.name) +
      '</span></div>' +
      '<span class="simx-compare-pair__val">' +
      valueHtml +
      '</span></div>'
    );
  }

  function buildScenarioCtx(save, total, selectedRow, recommendedRow) {
    var catalog = recommendedRow && recommendedRow.meta && recommendedRow.meta.catalog;
    var hasUsage = rows.some(function (r) {
      return usageHoursForRow(r) > 0;
    });
    var recommendedYearly = recommendedRow && recommendedRow.p && recommendedRow.p.cycle === 'yearly';
    var pricingUrl = catalog && catalog.pricingPageUrl ? String(catalog.pricingPageUrl) : '';
    return {
      save: save,
      total: total,
      rowCount: rows.length,
      clusterTitle: clusterTitle,
      catalog: catalog || null,
      pricingUrl: pricingUrl,
      keepName: recommendedRow && recommendedRow.p ? recommendedRow.p.name : '',
      hasUsage: hasUsage,
      recommendedYearly: recommendedYearly,
      recommendedRow: recommendedRow,
      recommendedMonthly: recommendedRow ? Math.round(recommendedRow.m) : 0,
    };
  }

  function computeScenarios(save, total, selectedRow, recommendedRow) {
    if (!Lib || typeof Lib.expand !== 'function') return [];
    var ctx = buildScenarioCtx(save, total, selectedRow, recommendedRow);
    return Lib.expand(ctx);
  }

  function normalizeName(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function levenshtein(a, b) {
    var m = a.length;
    var n = b.length;
    if (!m) return n;
    if (!n) return m;
    var dp = [];
    for (var i = 0; i <= m; i++) {
      dp[i] = [i];
    }
    for (var j = 1; j <= n; j++) dp[0][j] = j;
    for (var i2 = 1; i2 <= m; i2++) {
      for (var j2 = 1; j2 <= n; j2++) {
        var cost = a[i2 - 1] === b[j2 - 1] ? 0 : 1;
        dp[i2][j2] = Math.min(dp[i2 - 1][j2] + 1, dp[i2][j2 - 1] + 1, dp[i2 - 1][j2 - 1] + cost);
      }
    }
    return dp[m][n];
  }

  function similarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.indexOf(b) >= 0 || b.indexOf(a) >= 0) return 0.92;
    var dist = levenshtein(a, b);
    var maxLen = Math.max(a.length, b.length) || 1;
    return Math.max(0, 1 - dist / maxLen);
  }

  function detectByCatalog(nameNorm) {
    var best = null;
    Catalog.forEach(function (item) {
      var all = [item.title].concat(item.aliases || []);
      all.forEach(function (alias) {
        var cand = normalizeName(alias);
        var score = similarity(nameNorm, cand);
        if (!best || score > best.score) {
          best = { item: item, score: score };
        }
      });
    });
    if (!best || best.score < 0.62) return null;
    return {
      canonicalId: best.item.id,
      family: best.item.family || 'other',
      familyTitle: (Families[best.item.family] && Families[best.item.family].title) || best.item.family || 'Прочие сервисы',
      confidence: best.score,
      catalog: best.item,
    };
  }

  function detectByKeywords(nameNorm, categoryNorm) {
    var bestId = 'other';
    var bestScore = 0;
    Object.keys(Families).forEach(function (id) {
      var fam = Families[id];
      (fam.keywords || []).forEach(function (kw) {
        var k = normalizeName(kw);
        if (!k) return;
        var s1 = similarity(nameNorm, k);
        var s2 = similarity(categoryNorm, k);
        var s = Math.max(s1, s2);
        if (s > bestScore) {
          bestScore = s;
          bestId = id;
        }
      });
    });
    return {
      canonicalId: null,
      family: bestId,
      familyTitle: (Families[bestId] && Families[bestId].title) || 'Прочие сервисы',
      confidence: Math.max(0.35, bestScore || 0),
    };
  }

  function analyzeService(p) {
    var nameNorm = normalizeName(p.name);
    var categoryNorm = normalizeName(D.normalizeCategory ? D.normalizeCategory(p.category) : p.category);
    var byCatalog = detectByCatalog(nameNorm);
    if (byCatalog) {
      return {
        nameNorm: nameNorm,
        source: 'catalog',
        canonicalId: byCatalog.canonicalId,
        family: byCatalog.family,
        familyTitle: byCatalog.familyTitle,
        confidence: byCatalog.confidence,
      };
    }
    var byKw = detectByKeywords(nameNorm, categoryNorm);
    return {
      nameNorm: nameNorm,
      source: 'heuristic',
      canonicalId: byKw.canonicalId,
      family: byKw.family,
      familyTitle: byKw.familyTitle,
      confidence: byKw.confidence,
    };
  }

  function buildClusters(active) {
    var byFamily = {};
    active.forEach(function (p) {
      var meta = analyzeService(p);
      var key = meta.family || 'other';
      if (!byFamily[key]) byFamily[key] = { family: key, title: meta.familyTitle || 'Прочие сервисы', items: [] };
      byFamily[key].items.push({ p: p, m: monthlyRub(p), meta: meta });
    });

    return Object.keys(byFamily).map(function (k) {
      var c = byFamily[k];
      c.items.sort(function (a, b) {
        return a.m - b.m;
      });
      var total = c.items.reduce(function (s, x) { return s + x.m; }, 0);
      var min = c.items.length ? c.items[0].m : 0;
      var potential = Math.max(0, total - min);
      var conf = c.items.reduce(function (s, x) { return s + (x.meta.confidence || 0); }, 0) / Math.max(1, c.items.length);
      c.score = c.items.length * 10 + potential / 100 + conf * 5;
      c.potential = potential;
      c.avgConfidence = conf;
      return c;
    });
  }

  function buildRows() {
    var active = D.getState().payments.filter(function (p) {
      return D.resolvePayStatus(p) === 'active';
    });
    if (!active.length) return { cluster: '—', rows: [], clusterObj: null };
    if (AI && typeof AI.buildInsights === 'function') {
      var insights = AI.buildInsights(D);
      if (insights && insights.topCluster && insights.topCluster.items && insights.topCluster.items.length) {
      return {
          cluster: insights.topCluster.title || 'Похожие сервисы',
          rows: insights.topCluster.items.map(function (x) {
            var pClone = Object.assign({}, x.p);
            pClone._simFamily = x.meta && x.meta.family;
            return { p: pClone, m: x.monthly, usageHours30d: x.usageHours30d, meta: x.meta };
          }),
          clusterObj: insights.topCluster,
          insights: insights,
        };
      }
    }
    var clusters = buildClusters(active).sort(function (a, b) {
      return b.score - a.score;
    });
    var best = clusters[0] || null;
    if (!best || best.items.length < 2) {
      var fallback = active.slice().sort(function (a, b) { return monthlyRub(a) - monthlyRub(b); });
      return {
        cluster: 'Все сервисы',
        rows: fallback.map(function (p) { return { p: p, m: monthlyRub(p), meta: analyzeService(p) }; }),
        clusterObj: { items: [], potential: 0, avgConfidence: 0 },
      };
    }
    return {
      cluster: best.title || 'Похожие сервисы',
      rows: best.items,
      clusterObj: best,
      insights: null,
    };
  }

  function renderReasons(insights) {
    var host = q('simx-reasons-list');
    if (!host) return;
    var list = (insights && insights.reasons && insights.reasons.length)
      ? insights.reasons
      : [
          { title: 'Дублирование функций', text: 'Система нашла сервисы с похожим назначением и предлагает оставить один основной.' },
          { title: 'Потенциал экономии', text: 'По выбранному набору рассчитана экономия при отключении пересечений.' },
          { title: 'Проверка пользователем', text: 'Вы сами подтверждаете действия; ничего не отключается автоматически.' },
        ];
    host.innerHTML = list
      .map(function (r) {
        return '<li><span>◫</span><div><strong>' + escapeHtml(r.title) + '</strong><p>' + escapeHtml(r.text) + '</p></div></li>';
      })
      .join('');
  }

  function renderList() {
    var host = q('simx-services-list');
    if (!host) return;
    if (!rows.length) {
      host.innerHTML = '<div class="simx-service-row"><span class="simx-service-meta"><strong>Нет активных подписок</strong><em>Добавьте подписку в разделе «Платежи»</em></span></div>';
      return;
    }
    host.innerHTML = rows
      .map(function (r) {
        var p = r.p;
        var picked = p.id === pickedId;
        return (
          '<button type="button" class="simx-service-row' +
          (picked ? ' is-picked' : '') +
          '" data-id="' +
          escapeHtml(p.id) +
          '">' +
          '<span class="simx-service-ico">' +
          iconHtml(p) +
          '</span>' +
          '<span class="simx-service-meta"><strong>' +
          escapeHtml(p.name) +
          '</strong><em>' +
          (usageHoursForRow(r) > 0
            ? 'Активность: ' + Math.round(usageHoursForRow(r)) + ' ч / 30 дн'
            : (r.meta && r.meta.confidence
                ? 'Совпадение: ' + Math.round(r.meta.confidence * 100) + '%'
                : (p.cycle === 'yearly' ? 'Ежегодно' : 'Ежемесячно'))) +
          '</em></span>' +
          '<b>' +
          D.formatRub(Math.round(r.m)) +
          ' / мес</b>' +
          '<i class="simx-pick-dot" aria-hidden="true"></i>' +
          '</button>'
        );
      })
      .join('');

    host.querySelectorAll('.simx-service-row[data-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        pickedId = btn.getAttribute('data-id');
        renderList();
        syncNumbers();
        var mm = q('simx-mini-modal');
        if (mm && !mm.hidden && mm.getAttribute('data-simx-kind') === 'compare') {
          renderComparePanel();
        }
      });
    });
  }

  function syncNumbers() {
    var total = rows.reduce(function (s, r) { return s + r.m; }, 0);
    var keepRecommended = rows.filter(function (r) { return r.p.id === recommendedId; })[0] || rows[0];
    var selected = rows.filter(function (r) { return r.p.id === pickedId; })[0] || keepRecommended;
    // Динамика блока "После изменений" считается от выбранного пользователем сервиса.
    // Рекомендованный AI сервис остаётся фиксированным в тексте.
    var remain = selected ? selected.m : total;
    var save = Math.max(0, total - remain);
    var pct = total > 0 ? Math.round((save / total) * 1000) / 10 : 0;

    var keepName = keepRecommended && keepRecommended.p ? keepRecommended.p.name : 'основной сервис';
    var conf = activeCluster && activeCluster.avgConfidence ? Math.round(activeCluster.avgConfidence * 100) : 0;
    if (q('simx-ai-title')) {
      q('simx-ai-title').textContent =
        servicesInGroupPhrase(rows.length) + ' в группе «' + clusterTitle + '».';
    }
    if (q('simx-ai-text')) {
      var suffix = buildTariffHint(keepRecommended);
      q('simx-ai-text').textContent =
        'Рекомендуемый основной сервис: «' +
        keepName +
        '». Точность: ' +
        conf +
        '%.' +
        (suffix ? ' ' + suffix : '');
    }
    if (q('simx-ai-save')) q('simx-ai-save').textContent = 'Экономия: ' + D.formatRub(Math.round(save)) + ' / мес.';
    var saveRub = Math.round(save);
    var yearRub = saveRub * 12;
    if (q('simx-top-monthly')) {
      q('simx-top-monthly').innerHTML = D.formatRub(saveRub) + '<span> / мес</span>';
    }
    if (q('simx-top-yearly')) {
      q('simx-top-yearly').innerHTML = D.formatRub(yearRub) + '<span> / год</span>';
    }
    if (q('simx-now')) q('simx-now').textContent = money(total);
    if (q('simx-after')) q('simx-after').textContent = money(remain);
    if (q('simx-left')) q('simx-left').textContent = money(remain);
    if (q('simx-save')) q('simx-save').textContent = money(save);
    if (q('simx-pct')) q('simx-pct').textContent = '-' + pct + '%';
    if (q('simx-donut-text')) q('simx-donut-text').textContent = pct + '%';
    if (q('simx-bar-now')) q('simx-bar-now').style.width = (100 - pct) + '%';
    if (q('simx-bar-save')) q('simx-bar-save').style.width = pct + '%';
    if (q('simx-donut')) q('simx-donut').style.background = 'conic-gradient(#7ce0c8 0 ' + pct + '%, #d9d4ff ' + pct + '% 100%)';
    var det = q('simx-detail-link');
    if (det) {
      det.dataset.detailNow = D.formatRub(Math.round(total));
      det.dataset.detailAfter = D.formatRub(Math.round(remain));
      det.dataset.detailSave = D.formatRub(Math.round(save));
      det.dataset.detailPct = String(pct);
    }

    scenariosState = computeScenarios(save, total, selected, keepRecommended);
    var scenarios = q('simx-scenarios-list');
    if (scenarios) {
      scenarios.innerHTML = scenariosState
        .slice(0, 3)
        .map(function (sc, idx) {
          return '<div class="simx-scenario' + (idx === 0 ? ' simx-scenario--hot' : '') + '"><div class="simx-scenario__title">' +
            escapeHtml(sc.title) +
            '</div><div class="simx-scenario__kpi"><strong>' +
            D.formatRub(sc.monthly) +
            '</strong><span>/ мес</span></div><div class="simx-scenario__sub">' +
            D.formatRub(sc.yearly) +
            ' / год</div></div>';
        })
        .join('');
    }
    var scenLink = q('simx-show-all-scenarios');
    if (scenLink) {
      var n = scenariosState.length;
      scenLink.textContent = n ? 'Показать все сценарии (' + n + ')' : 'Показать все сценарии';
    }
    var flagEl = q('simx-top-flag');
    if (flagEl) {
      if (rows.length < 2) {
        flagEl.innerHTML =
          '✦ Нет пересечений<br><span class="simx-top__flag-sub">Добавьте 2+ похожие подписки</span>';
      } else {
        var sn = scenariosState.length;
        flagEl.innerHTML =
          '✦ ' +
          similarSubsPhrase(rows.length) +
          '<br><span class="simx-top__flag-sub">«' +
          escapeHtml(clusterTitle) +
          '» · ' +
          sn +
          ' ' +
          scenarioWord(sn) +
          '</span>';
      }
    }
    renderPagePriceHint();
  }

  function renderPausedQueue() {
    var host = q('simx-paused-list');
    if (!host || !D.getState) return;
    var list = D.getState().payments.filter(function (p) {
      return D.resolvePayStatus(p) === 'paused';
    });
    list.sort(function (a, b) {
      var ta = a.meta && a.meta.simQueuedAt ? new Date(a.meta.simQueuedAt).getTime() : 0;
      var tb = b.meta && b.meta.simQueuedAt ? new Date(b.meta.simQueuedAt).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return String(a.name || '').localeCompare(String(b.name || ''), 'ru');
    });
    if (!list.length) {
      host.innerHTML =
        '<p class="simx-paused-empty">Пока пусто — после «Добавить в очередь» список появится здесь.</p>';
      return;
    }
    host.innerHTML = list
      .map(function (p) {
        var m = Math.round(monthlyRub(p));
        var badge =
          p.meta && p.meta.simQueuedAt
            ? '<span class="simx-paused-badge">из симулятора</span>'
            : '<span class="simx-paused-badge simx-paused-badge--muted">на паузе</span>';
        return (
          '<div class="simx-paused-row">' +
          '<span class="simx-paused-ico">' +
          iconHtml(p) +
          '</span>' +
          '<div class="simx-paused-body">' +
          '<div class="simx-paused-name">' +
          escapeHtml(p.name) +
          '</div>' +
          badge +
          '<div class="simx-paused-sum">' +
          D.formatRub(m) +
          ' / мес</div></div>' +
          '<a class="btn-outline simx-paused-edit" href="edit-payment.html?id=' +
          encodeURIComponent(p.id) +
          '">Открыть</a>' +
          '</div>'
        );
      })
      .join('');
  }

  function getSnapContext() {
    var keep = rows.filter(function (r) { return r.p.id === recommendedId; })[0] || rows[0];
    if (!keep || !keep.meta || !keep.meta.catalog) return null;
    var c = keep.meta.catalog;
    if (!c.pricingPageUrl) return null;
    return {
      catalogId: String(c.id),
      title: c.title || (keep.p && keep.p.name) || '',
      pricingUrl: String(c.pricingPageUrl),
      appMonthlyRub: Math.round(keep.m),
    };
  }

  function buildScenariosSnapBarHtml(ctx) {
    if (!ctx || !ctx.pricingUrl || !Snap) return '';
    var snap = Snap.get(ctx.catalogId);
    var parts = [];
    parts.push(
      '<p class="simx-scenarios-snap-bar__lead">Сервис <strong>' +
        escapeHtml(ctx.title) +
        '</strong>. Платёж в приложении: <strong>' +
        D.formatRub(ctx.appMonthlyRub) +
        ' / мес</strong>. Сверьте с официальной страницей тарифов.</p>'
    );
    if (snap) {
      parts.push(
        '<p class="simx-scenarios-snap-bar__snap">Снимок с сайта: <strong>' +
          D.formatRub(snap.monthlyRub) +
          ' / мес</strong> · ' +
          escapeHtml(Snap.formatRuDate(snap.savedAt)) +
          '</p>'
      );
      var cmp = Snap.compareToApp(snap, ctx.appMonthlyRub);
      if (cmp.kind === 'mismatch') {
        parts.push(
          '<p class="simx-scenarios-snap-bar__warn">Сумма в приложении и последний снимок сайта расходятся (Δ ' +
            D.formatRub(Math.abs(cmp.delta)) +
            ' / мес).</p>'
        );
      }
      var tr = Snap.trendFromPrevious(snap);
      if (tr.kind === 'up') {
        parts.push(
          '<p class="simx-scenarios-snap-bar__trend">К прошлому снимку цена на сайте выросла на ' +
            D.formatRub(tr.delta) +
            ' / мес.</p>'
        );
      } else if (tr.kind === 'down') {
        parts.push(
          '<p class="simx-scenarios-snap-bar__trend">К прошлому снимку на сайте дешевле на ' +
            D.formatRub(Math.abs(tr.delta)) +
            ' / мес.</p>'
        );
      }
    }
    parts.push('<div class="simx-scenarios-snap-bar__actions">');
    if (snap) {
      parts.push('<button type="button" class="btn-outline" data-snap-bar-edit>Обновить снимок</button>');
    } else {
      parts.push('<button type="button" class="btn-primary" data-snap-bar-open>Запомнить цену с сайта</button>');
    }
    parts.push(
      '<a class="btn-outline" href="' +
        escapeHtml(ctx.pricingUrl) +
        '" target="_blank" rel="noopener noreferrer">Открыть тарифы ↗</a>'
    );
    parts.push('</div>');
    return parts.join('');
  }

  function renderPagePriceHint() {
    var wrap = q('simx-price-track-wrap');
    var textEl = q('simx-price-track-text');
    var badge = q('simx-price-track-badge');
    var btnOpen = q('simx-price-snap-open');
    var btnEdit = q('simx-price-snap-edit');
    var link = q('simx-price-track-link');
    if (!wrap || !textEl || !Snap) return;
    var ctx = getSnapContext();
    if (!ctx) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    if (link) {
      link.href = ctx.pricingUrl;
      link.hidden = false;
    }
    var snap = Snap.get(ctx.catalogId);
    if (btnOpen) btnOpen.hidden = !!snap;
    if (btnEdit) btnEdit.hidden = !snap;
    var lines = [];
    if (!snap) {
      lines.push(
        'Для «' +
          ctx.title +
          '» откройте страницу тарифов и сохраните цену с сайта (₽/мес). Мы подсветим расхождение с платежом в приложении (' +
          D.formatRub(ctx.appMonthlyRub) +
          ' / мес).'
      );
      if (badge) badge.hidden = true;
    } else {
      lines.push(
        'Снимок с сайта: ' +
          D.formatRub(snap.monthlyRub) +
          ' / мес · ' +
          Snap.formatRuDate(snap.savedAt) +
          '. Платёж в приложении: ' +
          D.formatRub(ctx.appMonthlyRub) +
          ' / мес.'
      );
      var tr = Snap.trendFromPrevious(snap);
      if (tr.kind === 'up') lines.push('К прошлому снимку цена на сайте выросла на ' + D.formatRub(tr.delta) + ' / мес.');
      if (tr.kind === 'down') lines.push('К прошлому снимку на сайте ниже на ' + D.formatRub(Math.abs(tr.delta)) + ' / мес.');
      var cmp = Snap.compareToApp(snap, ctx.appMonthlyRub);
      if (badge) {
        badge.hidden = false;
        if (cmp.kind === 'mismatch') {
          badge.textContent = cmp.delta > 0 ? 'В приложении дороже снимка' : 'В приложении дешевле снимка';
          badge.className = 'simx-price-track__badge is-warn';
        } else if (cmp.kind === 'aligned') {
          badge.textContent = 'Совпадает с приложением';
          badge.className = 'simx-price-track__badge is-ok';
        } else {
          badge.hidden = true;
        }
      }
    }
    textEl.textContent = lines.join(' ');
  }

  function bindScrollSnapOnce() {
    if (scrollSnapListenerBound) return;
    var scroll = q('simx-mini-scroll');
    if (!scroll) return;
    scrollSnapListenerBound = true;
    scroll.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest && t.closest('[data-snap-bar-open]')) {
        e.preventDefault();
        if (scenariosModalData && scenariosModalData.snapCtx) openSnapForm(scenariosModalData.snapCtx, null);
      }
      if (t.closest && t.closest('[data-snap-bar-edit]')) {
        e.preventDefault();
        if (!scenariosModalData || !Snap) return;
        var s = Snap.get(scenariosModalData.snapCtx.catalogId);
        openSnapForm(scenariosModalData.snapCtx, s && s.monthlyRub);
      }
    });
  }

  function bindPriceSnapUi() {
    if (priceSnapUiBound || !Snap) return;
    priceSnapUiBound = true;
    var o = q('simx-price-snap-open');
    var e = q('simx-price-snap-edit');
    if (o) {
      o.addEventListener('click', function () {
        var ctx = getSnapContext();
        if (ctx) openSnapForm(ctx, null);
      });
    }
    if (e) {
      e.addEventListener('click', function () {
        var ctx = getSnapContext();
        if (!ctx) return;
        var s = Snap.get(ctx.catalogId);
        openSnapForm(ctx, s && s.monthlyRub);
      });
    }
  }

  function ensureSnapModal() {
    var root = q('simx-snap-modal');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'simx-snap-modal';
    root.className = 'dash-modal dash-modal--snap';
    root.hidden = true;
    root.innerHTML =
      '<div class="dash-modal__backdrop" data-close-snap></div>' +
      '<div class="dash-modal__panel dash-modal__panel--snap">' +
      '<button type="button" class="dash-modal__x" data-close-snap aria-label="Закрыть">×</button>' +
      '<h2 class="dash-modal__title" id="simx-snap-heading">Цена на официальном сайте</h2>' +
      '<p class="dash-modal__text" id="simx-snap-desc"></p>' +
      '<input type="hidden" id="simx-snap-catalog-id" />' +
      '<input type="hidden" id="simx-snap-meta-title" />' +
      '<input type="hidden" id="simx-snap-meta-url" />' +
      '<label class="simx-snap-label" for="simx-snap-input">Сумма в месяц, ₽</label>' +
      '<input type="number" class="simx-snap-input" id="simx-snap-input" min="1" step="1" placeholder="Например, 299" />' +
      '<p class="simx-snap-err" id="simx-snap-err" hidden></p>' +
      '<div class="dash-modal__actions">' +
      '<button type="button" class="btn-outline" data-close-snap>Отмена</button>' +
      '<button type="button" class="btn-primary" id="simx-snap-commit">Сохранить снимок</button>' +
      '</div></div>';
    document.body.appendChild(root);
    root.addEventListener('click', function (e) {
      if (e.target && e.target.hasAttribute('data-close-snap')) root.hidden = true;
    });
    return root;
  }

  function bindSnapModalCommit() {
    if (snapModalCommitBound) return;
    snapModalCommitBound = true;
    document.body.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'simx-snap-commit') {
        e.preventDefault();
        if (!Snap) return;
        var cid = q('simx-snap-catalog-id') && q('simx-snap-catalog-id').value;
        var title = q('simx-snap-meta-title') && q('simx-snap-meta-title').value;
        var url = q('simx-snap-meta-url') && q('simx-snap-meta-url').value;
        var v = Number(q('simx-snap-input') && q('simx-snap-input').value);
        if (!cid || !v || v <= 0) {
          var errEl = q('simx-snap-err');
          if (errEl) {
            errEl.textContent = 'Введите положительную сумму в рублях за месяц.';
            errEl.hidden = false;
          }
          return;
        }
        var errClear = q('simx-snap-err');
        if (errClear) errClear.hidden = true;
        Snap.setRecord(cid, v, { title: title, pricingUrl: url });
        var snapRoot = q('simx-snap-modal');
        if (snapRoot) snapRoot.hidden = true;
        renderPagePriceHint();
        var bar = q('simx-scenarios-snap-bar');
        if (bar && scenariosModalData && scenariosModalData.snapCtx) {
          bar.innerHTML = buildScenariosSnapBarHtml(scenariosModalData.snapCtx);
        }
      }
    });
  }

  function openSnapForm(ctx, initialRub) {
    if (!ctx || !Snap) return;
    bindSnapModalCommit();
    var root = ensureSnapModal();
    q('simx-snap-desc').innerHTML =
      'Откройте <a href="' +
      escapeHtml(ctx.pricingUrl) +
      '" target="_blank" rel="noopener noreferrer">страницу тарифов</a> сервиса «' +
      escapeHtml(ctx.title) +
      '» и введите стоимость подписки <strong>в месяц</strong> в рублях (как на сайте).';
    q('simx-snap-catalog-id').value = ctx.catalogId;
    q('simx-snap-meta-title').value = ctx.title;
    q('simx-snap-meta-url').value = ctx.pricingUrl;
    var inp = q('simx-snap-input');
    inp.value = initialRub != null && Number(initialRub) > 0 ? String(Math.round(Number(initialRub))) : '';
    var err0 = q('simx-snap-err');
    if (err0) {
      err0.hidden = true;
      err0.textContent = '';
    }
    root.hidden = false;
    setTimeout(function () {
      if (inp) inp.focus();
    }, 50);
  }

  function getCompareSidekick(pickedRow) {
    if (!rows || rows.length < 2 || !pickedRow) return null;
    var sorted = rows.slice().sort(function (a, b) {
      return a.m - b.m;
    });
    var cheap = sorted[0];
    var exp = sorted[sorted.length - 1];
    if (pickedRow.p.id === cheap.p.id) return exp;
    return cheap;
  }

  function openCompareRichModal(leadText, bodyInnerHtml, summaryPlain) {
    scenariosModalData = null;
    var root = ensureMiniModal();
    root.setAttribute('data-simx-kind', 'compare');
    setModalLayout(root, 'rich');
    var titleEl = q('simx-mini-title');
    if (titleEl) titleEl.textContent = 'Сравнение';
    var sub = q('simx-mini-sub');
    if (sub) {
      sub.textContent = leadText;
      sub.hidden = false;
    }
    var scroll = q('simx-mini-scroll');
    if (scroll) {
      scroll.innerHTML =
        '<div class="simx-compare-stack simx-compare-stack--modal">' +
        bodyInnerHtml +
        '</div>' +
        '<p class="simx-compare-modal-summary">' +
        escapeHtml(summaryPlain) +
        '</p>';
    }
    root.hidden = false;
  }

  function renderComparePanel() {
    if (rows.length < 2) {
      hideComparePanel();
      return;
    }
    var pickedRow = rows.filter(function (r) { return r.p.id === pickedId; })[0] || rows[0];
    var other = getCompareSidekick(pickedRow);
    if (!other || other.p.id === pickedRow.p.id) {
      hideComparePanel();
      return;
    }
    var leadText =
      '«' +
      pickedRow.p.name +
      '» и «' +
      other.p.name +
      '» в группе «' +
      clusterTitle +
      '». Одни и те же критерии для обоих — удобнее сопоставить факты.';

    var yPick = Math.round(pickedRow.m * 12);
    var yOth = Math.round(other.m * 12);
    var valPickCost =
      D.formatRub(Math.round(pickedRow.m)) + ' / мес<br>' + D.formatRub(yPick) + ' / год (эквивалент)';
    var valOthCost =
      D.formatRub(Math.round(other.m)) + ' / мес<br>' + D.formatRub(yOth) + ' / год (эквивалент)';
    var delta = Math.round(Math.abs(pickedRow.m - other.m));
    var noteCost;
    if (pickedRow.m < other.m) {
      noteCost =
        'По деньгам выгоднее <strong>выбранный</strong> сервис: −' +
        D.formatRub(delta) +
        ' / мес к «' +
        escapeHtml(other.p.name) +
        '».';
    } else if (pickedRow.m > other.m) {
      noteCost =
        'Дешевле <strong>второй</strong> сервис (−' +
        D.formatRub(delta) +
        ' / мес). Чтобы ориентироваться на минимальную цену — переключите выбор слева или нажмите «Оставить лучший».';
    } else {
      noteCost = 'В пересчёте на месяц суммы совпадают.';
    }

    var uPick = usageHoursForRow(pickedRow);
    var uOth = usageHoursForRow(other);
    var valPickUse =
      uPick > 0 ? Math.round(uPick) + ' ч за последние 30 дней' : 'Нет данных (укажите активность выше)';
    var valOthUse =
      uOth > 0 ? Math.round(uOth) + ' ч за последние 30 дней' : 'Нет данных (укажите активность выше)';
    var noteUse;
    if (uPick > 0 && uOth > 0) {
      if (uPick > uOth) {
        noteUse =
          'Больше времени уходит на <strong>выбранный</strong> сервис (+' +
          Math.round(uPick - uOth) +
          ' ч).';
      } else if (uOth > uPick) {
        noteUse =
          'Больше времени уходит на <strong>второй</strong> сервис (+' +
          Math.round(uOth - uPick) +
          ' ч).';
      } else {
        noteUse = 'По часам активность совпадает.';
      }
    } else {
      noteUse =
        'Без часов сложнее оценить «цену за час». Заполните источник активности или синхронизируйте демо-данные.';
    }

    var blocks = [];
    blocks.push(
      compareCritHtml(
        'Стоимость для бюджета',
        true,
        '<div class="simx-compare-pair">' +
          comparePairCol('Выбран', pickedRow, valPickCost) +
          comparePairCol('Второй', other, valOthCost) +
          '</div>',
        noteCost
      )
    );
    blocks.push(
      compareCritHtml(
        'Реальное использование',
        false,
        '<div class="simx-compare-pair">' +
          comparePairCol('Выбран', pickedRow, valPickUse) +
          comparePairCol('Второй', other, valOthUse) +
          '</div>',
        noteUse
      )
    );

    if (uPick > 0 || uOth > 0) {
      var rPick = uPick > 0 ? pickedRow.m / uPick : null;
      var rOth = uOth > 0 ? other.m / uOth : null;
      var sPick =
        rPick != null ? D.formatRub(Math.round(rPick)) + ' за 1 ч пользования' : '— нет часов для расчёта';
      var sOth =
        rOth != null ? D.formatRub(Math.round(rOth)) + ' за 1 ч пользования' : '— нет часов для расчёта';
      var noteRub;
      if (rPick != null && rOth != null) {
        if (rPick < rOth) {
          noteRub =
            'Ниже «цена за час» у <strong>выбранного</strong> — при похожей пользе он отрабатывает подписку экономичнее.';
        } else if (rOth < rPick) {
          noteRub =
            'Ниже «цена за час» у <strong>второго</strong> сервиса — пересмотрите выбор, если важна выгода за фактическое время.';
        } else {
          noteRub = 'Показатель «рубль за час» совпадает.';
        }
      } else {
        noteRub = 'Сравнение одностороннее — используйте как ориентир, не как точную метрику.';
      }
      blocks.push(
        compareCritHtml(
          'Цена за час (нагрузка на кошелёк)',
          false,
          '<div class="simx-compare-pair">' +
            comparePairCol('Выбран', pickedRow, sPick) +
            comparePairCol('Второй', other, sOth) +
            '</div>',
          noteRub
        )
      );
    }

    var catPick = paymentCategoryLabel(pickedRow.p);
    var catOth = paymentCategoryLabel(other.p);
    var valPickTerms =
      escapeHtml(payCycleLine(pickedRow.p)) + '<br>Категория в платеже: ' + escapeHtml(catPick);
    var valOthTerms =
      escapeHtml(payCycleLine(other.p)) + '<br>Категория в платеже: ' + escapeHtml(catOth);
    var noteTerms =
      'Группа симулятора: «' +
      escapeHtml(clusterTitle) +
      '». ' +
      (catPick === catOth
        ? 'Метка категории в данных совпадает.'
        : 'Метки категории различаются — группировка идёт по типу сервиса, а не только по полю «категория».');
    blocks.push(
      compareCritHtml(
        'Условия в приложении',
        false,
        '<div class="simx-compare-pair">' +
          comparePairCol('Выбран', pickedRow, valPickTerms) +
          comparePairCol('Второй', other, valOthTerms) +
          '</div>',
        noteTerms
      )
    );

    var hintPick = buildTariffHint(pickedRow);
    var hintOth = buildTariffHint(other);
    if (hintPick || hintOth) {
      blocks.push(
        compareCritHtml(
          'Тарифы и варианты (каталог)',
          false,
          '<div class="simx-compare-pair">' +
            comparePairCol(
              'Выбран',
              pickedRow,
              hintPick ? escapeHtml(hintPick) : 'Нет подсказки каталога для этого названия'
            ) +
            comparePairCol(
              'Второй',
              other,
              hintOth ? escapeHtml(hintOth) : 'Нет подсказки каталога для этого названия'
            ) +
            '</div>',
          'Перед решением сверьтесь с актуальными планами на сайте провайдера.'
        )
      );
    }

    var summaryText;
    if (pickedRow.m <= other.m) {
      summaryText =
        'Итог: если оставить «' +
        pickedRow.p.name +
        '» и не платить за «' +
        other.p.name +
        '», ориентировочно ' +
        D.formatRub(delta) +
        ' / мес (' +
        D.formatRub(delta * 12) +
        ' / год).';
    } else {
      summaryText =
        'Итог: минимальная плата у «' +
        other.p.name +
        '» (−' +
        D.formatRub(delta) +
        ' / мес к выбранному). Имеет смысл сменить основной сервис или нажать «Оставить лучший».';
    }
    openCompareRichModal(leadText, blocks.join(''), summaryText);
  }

  function hideComparePanel() {
    var root = q('simx-mini-modal');
    if (!root || root.hidden) return;
    if (root.getAttribute('data-simx-kind') !== 'compare') return;
    root.hidden = true;
    root.removeAttribute('data-simx-kind');
    setModalLayout(root, 'simple');
  }

  function bindSimActions() {
    if (simActionsBound) return;
    var host = document.querySelector('main.simx-main');
    if (!host) return;
    simActionsBound = true;
    host.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-sim-action]');
      if (!btn) return;
      var act = btn.getAttribute('data-sim-action');
      var can = rows.length >= 2;
      if (!can) {
        e.preventDefault();
        showMiniModal(
          'Нужно минимум две подписки',
          'Чтобы сравнить сервисы и поставить лишние на паузу, в группе должно быть не меньше двух похожих активных платежей.'
        );
        return;
      }
      if (act === 'compare') {
        e.preventDefault();
        renderComparePanel();
        return;
      }
      if (act === 'best') {
        e.preventDefault();
        pickedId = recommendedId || (rows[0] && rows[0].p.id);
        renderList();
        syncNumbers();
        hideComparePanel();
        return;
      }
      if (act === 'queue') {
        e.preventDefault();
        if (!pickedId) pickedId = recommendedId || (rows[0] && rows[0].p.id);
        var paused = 0;
        rows.forEach(function (r) {
          if (r.p.id === pickedId) return;
          var at = new Date().toISOString();
          D.updatePayment(r.p.id, {
            payStatus: 'paused',
            active: false,
            meta: Object.assign({}, r.p.meta || {}, { simQueuedAt: at }),
          });
          paused++;
        });
        D.patchSidebarBadges();
        showMiniModal(
          'Очередь действий',
          paused
            ? 'На паузу переведено подписок: ' +
                paused +
                '. Список ниже на этой странице («На паузе — очередь симулятора») и в разделе «Платежи» → фильтр «На паузе».'
            : 'Нет других сервисов для паузы в этой группе.'
        );
        hideComparePanel();
        run();
        if (paused) {
          setTimeout(function () {
            var el = q('simx-paused-section');
            if (el) {
              try {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              } catch (e) {}
            }
          }, 120);
        }
      }
    });
  }

  function bindScenariosLink() {
    if (scenariosBound) return;
    scenariosBound = true;
    var link = q('simx-show-all-scenarios');
    if (!link) return;
    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (!scenariosState.length) {
        showMiniModal('Сценарии', 'Пока недостаточно данных для сценариев.');
        return;
      }
      showScenariosModal(scenariosState, getSnapContext());
    });
  }

  function bindDetailLink() {
    if (detailBound) return;
    detailBound = true;
    var detail = q('simx-detail-link');
    if (!detail) return;
    detail.addEventListener('click', function (e) {
      e.preventDefault();
      showMiniModal(
        'Детализация расчёта',
        'Сейчас: ' +
          (detail.dataset.detailNow || '—') +
          ' / мес\nПосле изменений: ' +
          (detail.dataset.detailAfter || '—') +
          ' / мес\nЭкономия: ' +
          (detail.dataset.detailSave || '—') +
          ' / мес (' +
          (detail.dataset.detailPct || '0') +
          '%)'
      );
    });
  }

  function setModalLayout(root, mode) {
    var simpleText = q('simx-mini-text');
    var scroll = q('simx-mini-scroll');
    var sub = q('simx-mini-sub');
    var panel = root.querySelector('.dash-modal__panel');
    if (mode === 'rich') {
      if (simpleText) simpleText.hidden = true;
      if (scroll) scroll.hidden = false;
      if (sub) sub.hidden = false;
      root.classList.add('dash-modal--scenarios');
      if (panel) panel.classList.add('dash-modal__panel--wide');
    } else {
      scenariosModalData = null;
      if (simpleText) simpleText.hidden = false;
      if (scroll) {
        scroll.hidden = true;
        scroll.innerHTML = '';
      }
      if (sub) sub.hidden = true;
      root.classList.remove('dash-modal--scenarios');
      if (panel) panel.classList.remove('dash-modal__panel--wide');
    }
  }

  function ensureMiniModal() {
    var root = q('simx-mini-modal');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'simx-mini-modal';
    root.className = 'dash-modal';
    root.hidden = true;
    root.innerHTML =
      '<div class="dash-modal__backdrop" data-close-mini></div>' +
      '<div class="dash-modal__panel dash-modal__panel--simx">' +
      '<button type="button" class="dash-modal__x" data-close-mini aria-label="Закрыть">×</button>' +
      '<h2 class="dash-modal__title" id="simx-mini-title"></h2>' +
      '<p class="simx-modal-sub" id="simx-mini-sub" hidden></p>' +
      '<div class="simx-modal-scroll" id="simx-mini-scroll" hidden></div>' +
      '<p class="dash-modal__text" id="simx-mini-text" style="white-space:pre-line"></p>' +
      '<div class="dash-modal__actions"><button type="button" class="btn-primary" data-close-mini>Закрыть</button></div>' +
      '</div>';
    document.body.appendChild(root);
    root.addEventListener('click', function (e) {
      if (e.target && e.target.hasAttribute('data-close-mini')) {
        root.hidden = true;
        root.removeAttribute('data-simx-kind');
        setModalLayout(root, 'simple');
      }
    });
    return root;
  }

  function showMiniModal(title, text) {
    var root = ensureMiniModal();
    root.removeAttribute('data-simx-kind');
    setModalLayout(root, 'simple');
    q('simx-mini-title').textContent = title;
    q('simx-mini-text').textContent = text;
    root.hidden = false;
  }

  function showScenariosModal(list, snapCtx) {
    scenariosModalData = { list: list, snapCtx: snapCtx || null };
    var root = ensureMiniModal();
    root.setAttribute('data-simx-kind', 'scenarios');
    bindScrollSnapOnce();
    setModalLayout(root, 'rich');
    var libCount = Lib && Lib.templateCount ? Lib.templateCount : 12;
    q('simx-mini-title').textContent = 'Сценарии и логика';
    var sub = q('simx-mini-sub');
    if (sub) {
      sub.textContent =
        'Показано ' +
        list.length +
        ' релевантных вариантов из ' +
        libCount +
        ' в библиотеке. Суммы ориентировочные; актуальные тарифы сверяйте на сайте провайдера. Снимок цены с сайта можно сохранить в блоке ниже.';
    }
    var scroll = q('simx-mini-scroll');
    var maxM = 1;
    list.forEach(function (s) {
      if (s.monthly > maxM) maxM = s.monthly;
    });
    var barHtml = buildScenariosSnapBarHtml(snapCtx);
    var barBlock = barHtml
      ? '<div id="simx-scenarios-snap-bar" class="simx-scenarios-snap-bar">' + barHtml + '</div>'
      : '';
    scroll.innerHTML =
      barBlock +
      list
        .map(function (sc, i) {
          var pct = maxM > 0 ? Math.round((sc.monthly / maxM) * 100) : 0;
          var linkHtml = sc.pricingUrl
            ? '<a class="simx-scen-card__link" href="' +
              escapeHtml(sc.pricingUrl) +
              '" target="_blank" rel="noopener noreferrer"><span class="simx-scen-card__link-ico" aria-hidden="true">↗</span> Тарифы и цена на сайте' +
              (sc.pricingTitle ? ' · ' + escapeHtml(sc.pricingTitle) : '') +
              '</a>'
            : '';
          return (
            '<article class="simx-scen-card">' +
            '<div class="simx-scen-card__head"><span class="simx-scen-card__tag">' +
            escapeHtml(sc.tag) +
            '</span><span class="simx-scen-card__num">#' +
            (i + 1) +
            '</span></div>' +
            '<h3 class="simx-scen-card__title">' +
            escapeHtml(sc.title) +
            '</h3>' +
            '<div class="simx-scen-card__kpis"><strong>' +
            D.formatRub(sc.monthly) +
            '</strong><span>/ мес</span><em>' +
            D.formatRub(sc.yearly) +
            ' / год</em></div>' +
            '<div class="simx-scen-card__bar" aria-hidden="true"><i style="width:' +
            pct +
            '%"></i></div>' +
            '<p class="simx-scen-card__why">' +
            escapeHtml(sc.why) +
            '</p>' +
            linkHtml +
            '</article>'
          );
        })
        .join('');
    root.hidden = false;
  }

  function bindHeader() {
    if (headerBound) return;
    headerBound = true;
    var add = q('simx-header-add');
    if (add) {
      add.addEventListener('click', function () {
        window.location.href = 'payments.html';
      });
    }
  }

  function bindHelpSim() {
    if (helpBound) return;
    var btn = q('simx-help-btn');
    if (!btn) return;
    helpBound = true;
    btn.addEventListener('click', function () {
      showMiniModal(
        'Как работает симулятор',
        'Симулятор находит похожие активные подписки по категории и показывает ориентировочную экономию. Выберите основной сервис в списке, при необходимости откройте «Сравнить» или «Оставить лучший». «Добавить в очередь» переводит остальные сервисы группы в паузу — их можно увидеть ниже на этой странице и в «Платежах».\n\nНичего не отменяется автоматически: финальные действия вы делаете в редакторе платежа.\n\nБлок «Источник активности» задаёт, откуда берутся часы использования (демо, телефон или вручную). Кнопка «Синхронизировать активность» заполняет демо-данные по активным платежам — в режиме «Ручной ввод» сначала нажмите «Применить» под полями.'
      );
    });
  }

  function renderNotifSimx() {
    var box = q('notif-list-simx');
    if (!box || !D.getNotifications) return;
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

  function bindSimxNotif() {
    if (notifBound) return;
    var bell = q('btn-simx-notif');
    var pop = q('notif-pop-simx');
    if (!bell || !pop) return;
    notifBound = true;
    bell.addEventListener('click', function (e) {
      e.stopPropagation();
      pop.hidden = !pop.hidden;
      if (!pop.hidden) renderNotifSimx();
    });
    document.addEventListener('mousedown', function (e) {
      var p = q('notif-pop-simx');
      var b = q('btn-simx-notif');
      if (!p || p.hidden) return;
      if (p.contains(e.target) || (b && b.contains(e.target))) return;
      p.hidden = true;
    });
  }

  function bindUsageSync() {
    if (usageBound) return;
    usageBound = true;
    var btnTop = q('simx-sync-usage-btn');
    var btnInline = q('simx-sync-usage-btn-inline');
    var btnReset = q('simx-reset-usage-btn');
    var syncHandler = function () {
      var source = getUsageSource();
      if (source === 'manual') {
        showMiniModal(
          'Ручной ввод активности',
          'В режиме «Ручной ввод» синхронизация не нужна: заполните часы по сервисам в блоке ниже и нажмите «Применить». Чтобы снова использовать демо-подстановку, переключите источник на «Демо» или «Телефон».'
        );
        return;
      }
      var list = D.getState().payments.filter(function (p) {
        return D.resolvePayStatus(p) === 'active';
      });
      if (!list.length) {
        showMiniModal(
          'Нет активных подписок',
          'Добавьте хотя бы один активный платёж в разделе «Платежи» (кнопка «+ Добавить»), затем вернитесь сюда — синхронизация подставит демо-активность по названиям сервисов.'
        );
        return;
      }
      var usage = {};
      list.forEach(function (p) {
        var name = String(p.name || '').toLowerCase();
        var base = 0;
        if (source === 'phone') {
          base = 18; // имитация источника «телефон»: более ровные значения
          if (name.indexOf('music') >= 0 || name.indexOf('музык') >= 0) base = 74;
          else if (name.indexOf('video') >= 0 || name.indexOf('видео') >= 0) base = 33;
          else if (name.indexOf('cloud') >= 0 || name.indexOf('облак') >= 0) base = 14;
        } else {
          if (name.indexOf('music') >= 0 || name.indexOf('музык') >= 0) base = 60;
          else if (name.indexOf('video') >= 0 || name.indexOf('видео') >= 0) base = 22;
          else if (name.indexOf('cloud') >= 0 || name.indexOf('облак') >= 0) base = 8;
          else if (name.indexOf('fit') >= 0 || name.indexOf('фитнес') >= 0) base = 12;
          else base = 5;
        }
        usage[p.id] = Math.max(0, Math.round(base + (Math.random() * 24 - 8)));
      });
      try {
        localStorage.setItem('subcuro_usage_demo_v1', JSON.stringify(usage));
        localStorage.removeItem('subcuro_ai_advisor_cache_v1');
      } catch (e) {}
      if (btnTop) btnTop.textContent = 'Активность синхронизирована';
      if (btnInline) btnInline.textContent = 'Активность синхронизирована';
      setTimeout(function () {
        if (btnTop) btnTop.textContent = 'Синхронизировать активность';
        if (btnInline) btnInline.textContent = 'Синхронизировать активность';
      }, 1700);
      run();
    };
    if (btnTop) btnTop.addEventListener('click', syncHandler);
    if (btnInline) btnInline.addEventListener('click', syncHandler);
    if (btnReset) {
      btnReset.addEventListener('click', function () {
        try {
          localStorage.removeItem('subcuro_usage_demo_v1');
          localStorage.removeItem('subcuro_ai_advisor_cache_v1');
        } catch (e) {}
        run();
      });
    }
  }

  function renderManualInputs() {
    var host = q('simx-manual-list');
    if (!host) return;
    var list = D.getState().payments.filter(function (p) {
      return D.resolvePayStatus(p) === 'active';
    });
    var usage = {};
    try {
      var raw = localStorage.getItem('subcuro_usage_demo_v1');
      usage = raw ? JSON.parse(raw) : {};
    } catch (e) {
      usage = {};
    }
    host.innerHTML = list
      .map(function (p) {
        return '<div class="simx-manual__row"><label for="simx-u-' + escapeHtml(p.id) + '">' +
          escapeHtml(p.name) +
          '</label><input id="simx-u-' + escapeHtml(p.id) + '" data-usage-id="' + escapeHtml(p.id) + '" type="number" min="0" step="1" value="' + Math.round(Number(usage[p.id] || 0)) + '"></div>';
      })
      .join('');
  }

  function bindSourceSwitch() {
    if (sourceBound) return;
    sourceBound = true;
    var sel = q('simx-usage-source');
    if (!sel) return;
    sel.value = getUsageSource();
    sel.addEventListener('change', function () {
      setUsageSource(sel.value);
      localStorage.removeItem('subcuro_ai_advisor_cache_v1');
      if (sel.value === 'manual') {
        renderManualInputs();
      } else {
        var wrap = q('simx-manual-wrap');
        if (wrap) wrap.hidden = true;
      }
      run();
    });
  }

  function bindManualApply() {
    if (manualBound) return;
    manualBound = true;
    var btn = q('simx-manual-apply');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var map = {};
      document.querySelectorAll('[data-usage-id]').forEach(function (inp) {
        var id = inp.getAttribute('data-usage-id');
        map[id] = Math.max(0, Number(inp.value) || 0);
      });
      try {
        localStorage.setItem('subcuro_usage_demo_v1', JSON.stringify(map));
        localStorage.removeItem('subcuro_ai_advisor_cache_v1');
      } catch (e) {}
      run();
    });
  }

  function renderUsageStatus() {
    var el = q('simx-usage-status');
    if (!el) return;
    var data = {};
    try {
      var raw = localStorage.getItem('subcuro_usage_demo_v1');
      data = raw ? JSON.parse(raw) : {};
    } catch (e) {
      data = {};
    }
    var keys = Object.keys(data).filter(function (k) {
      return Number(data[k]) > 0;
    });
    var source = getUsageSource();
    var sourceLabel = source === 'phone' ? 'Телефон' : source === 'manual' ? 'Ручной ввод' : 'Демо';
    var wrap = q('simx-manual-wrap');
    if (wrap) wrap.hidden = source !== 'manual';
    if (source === 'manual') renderManualInputs();

    if (!keys.length) {
      el.textContent = 'Источник активности: ' + sourceLabel + ' · нет данных (используется базовый AI-анализ)';
      return;
    }
    var sum = keys.reduce(function (s, k) { return s + Number(data[k] || 0); }, 0);
    el.textContent = 'Источник активности: ' + sourceLabel + ' · ' + keys.length + ' сервис(ов), ' + Math.round(sum) + ' ч / 30 дн';
  }

  function run() {
    var built = buildRows();
    rows = built.rows;
    activeCluster = built.clusterObj;
    clusterTitle = built.cluster || '—';
    recommendedId = (activeCluster && activeCluster.keepId) || (rows[0] && rows[0].p.id) || null;
    pickedId = recommendedId;
    if (q('simx-category-label')) q('simx-category-label').textContent = clusterTitle;
    renderList();
    bindSimActions();
    bindScenariosLink();
    bindDetailLink();
    bindHeader();
    bindHelpSim();
    bindSimxNotif();
    bindUsageSync();
    bindSourceSwitch();
    bindManualApply();
    bindPriceSnapUi();
    renderUsageStatus();
    renderReasons(built.insights);
    syncNumbers();
    var hasRows = rows.length >= 2;
    ['simx-btn-compare', 'simx-btn-best', 'simx-btn-queue', 'simx-btn-queue-main'].forEach(function (id) {
      var el = q(id);
      if (!el) return;
      el.classList.toggle('simx-ai-btn--muted', !hasRows);
      el.style.opacity = hasRows ? '1' : '0.55';
    });
    if (!hasRows) hideComparePanel();
    renderPausedQueue();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
