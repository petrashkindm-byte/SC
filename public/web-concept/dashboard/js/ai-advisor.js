(function () {
  var Catalog = window.SubCuroServiceCatalog || [];
  var Families = window.SubCuroServiceFamilies || {};
  var CACHE_KEY = 'subcuro_ai_advisor_cache_v1';

  function normalize(s) {
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
    for (var i = 0; i <= m; i++) dp[i] = [i];
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
    return Math.max(0, 1 - dist / Math.max(a.length, b.length, 1));
  }

  function monthlyRub(D, p) {
    var amt = Number(p.amount) || 0;
    var cur = D.normalizeCurrency(p.currency);
    var monthly = p.cycle === 'yearly' ? amt / 12 : amt;
    return cur === 'RUB' ? monthly : D.convertToRub(monthly, cur);
  }

  function detectByCatalog(nameNorm) {
    var best = null;
    Catalog.forEach(function (item) {
      var all = [item.title].concat(item.aliases || []);
      all.forEach(function (alias) {
        var s = similarity(nameNorm, normalize(alias));
        if (!best || s > best.score) best = { item: item, score: s };
      });
    });
    if (!best || best.score < 0.62) return null;
    var famId = best.item.family || 'other';
    return {
      canonicalId: best.item.id,
      family: famId,
      familyTitle: (Families[famId] && Families[famId].title) || famId,
      confidence: best.score,
      catalog: best.item,
      reason: 'Сопоставлено с каталогом подписок',
    };
  }

  function detectByKeywords(nameNorm, categoryNorm) {
    var bestId = 'other';
    var bestScore = 0;
    Object.keys(Families).forEach(function (id) {
      (Families[id].keywords || []).forEach(function (kw) {
        var k = normalize(kw);
        var s = Math.max(similarity(nameNorm, k), similarity(categoryNorm, k));
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
      confidence: Math.max(0.35, bestScore),
      reason: 'Эвристика по ключевым словам',
    };
  }

  function analyzeService(D, p) {
    var n = normalize(p.name);
    var c = normalize(D.normalizeCategory ? D.normalizeCategory(p.category) : p.category);
    return detectByCatalog(n) || detectByKeywords(n, c);
  }

  function usageMap() {
    try {
      if (window.SubCuroMobileSync && typeof window.SubCuroMobileSync.getUsageMap === 'function') {
        return window.SubCuroMobileSync.getUsageMap() || {};
      }
      var raw = localStorage.getItem('subcuro_usage_demo_v1');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function signature(payments) {
    return payments
      .map(function (p) {
        return [p.id, p.name, p.amount, p.currency, p.cycle, p.nextDue, p.payStatus].join('|');
      })
      .join('::');
  }

  function fromCache(sig) {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed.sig !== sig) return null;
      return parsed.data || null;
    } catch (e) {
      return null;
    }
  }

  function toCache(sig, data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ sig: sig, data: data, at: Date.now() }));
    } catch (e) {}
  }

  function buildInsights(D) {
    var active = D.getState().payments.filter(function (p) {
      return D.resolvePayStatus(p) === 'active';
    });
    var sig = signature(active);
    var cached = fromCache(sig);
    if (cached) return cached;

    var families = {};
    var usage = usageMap();
    active.forEach(function (p) {
      var meta = analyzeService(D, p);
      var key = meta.family || 'other';
      if (!families[key]) families[key] = { id: key, title: meta.familyTitle || 'Прочие сервисы', items: [] };
      var h = Number(usage[p.id] || 0);
      families[key].items.push({ p: p, monthly: monthlyRub(D, p), usageHours30d: h, meta: meta });
    });

    var clusters = Object.keys(families).map(function (k) {
      var f = families[k];
      f.items.sort(function (a, b) {
        return a.monthly - b.monthly;
      });
      var total = f.items.reduce(function (s, x) { return s + x.monthly; }, 0);
      var keep = null;
      f.items.forEach(function (x) {
        var usageScore = Math.min(120, Number(x.usageHours30d || 0));
        var valueScore = usageScore * 5 - x.monthly; // простой приоритет «больше пользуюсь, меньше плачу»
        x.valueScore = valueScore;
      });
      f.items.sort(function (a, b) {
        if (b.valueScore !== a.valueScore) return b.valueScore - a.valueScore;
        return a.monthly - b.monthly;
      });
      keep = f.items[0] || null;
      var potential = Math.max(0, total - (keep ? keep.monthly : 0));
      var conf = f.items.reduce(function (s, x) { return s + (x.meta.confidence || 0); }, 0) / Math.max(1, f.items.length);
      f.potential = potential;
      f.keepId = keep ? keep.p.id : null;
      f.avgConfidence = conf;
      f.score = f.items.length * 10 + potential / 100 + conf * 5;
      return f;
    });

    clusters.sort(function (a, b) { return b.score - a.score; });
    var top = clusters[0] || null;

    var reasons = [];
    if (top) {
      reasons.push({
        title: 'Дублирование функций',
        text: 'Найдены сервисы с похожим назначением в группе «' + top.title + '».',
      });
      reasons.push({
        title: 'Потенциал экономии',
        text: 'При сохранении одного основного сервиса экономия составляет до ' + D.formatRub(Math.round(top.potential)) + ' в месяц.',
      });
      reasons.push({
        title: 'Уверенность анализа',
        text: 'Средняя точность сопоставления: ' + Math.round((top.avgConfidence || 0) * 100) + '%.',
      });
      if ((top.items || []).some(function (x) { return (x.usageHours30d || 0) > 0; })) {
        reasons.push({
          title: 'Учитывается активность',
          text: 'Рекомендация учитывает часы использования сервисов за последние 30 дней (при наличии синхронизации).',
        });
      }
    }

    var result = {
      topCluster: top,
      clusters: clusters,
      reasons: reasons,
    };
    toCache(sig, result);
    return result;
  }

  window.SubCuroAIAdvisor = {
    buildInsights: buildInsights,
  };
})();
