(function () {
  var page = document.body.getAttribute('data-page') || 'today';
  var items = [
    { id: 'today', href: 'today.html', label: 'Сегодня', icon: 'calendar' },
    { id: 'payments', href: 'payments.html', label: 'Платежи', icon: 'wallet', badge: '6', badgeClass: 'green' },
    { id: 'actions', href: 'actions.html', label: 'Действия', icon: 'zap', badge: '4', badgeClass: 'red' },
    { id: 'analytics', href: 'analytics.html', label: 'Аналитика', icon: 'chart' },
    { id: '_div', divider: true },
    { id: 'profile', href: 'profile.html', label: 'Профиль', icon: 'user' },
    { id: 'settings', href: 'settings.html', label: 'Настройки', icon: 'gear' },
  ];

  function iconSvg(name) {
    var s =
      'stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round"';
    switch (name) {
      case 'calendar':
        return '<svg class="nav-icon" width="22" height="22" viewBox="0 0 24 24" ' + s + '><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
      case 'wallet':
        return (
          '<svg class="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/>' +
          '<path d="M16 12h5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-5V12z"/>' +
          '<circle cx="17.5" cy="14" r="1" fill="currentColor" stroke="none"/>' +
          '</svg>'
        );
      case 'zap':
        return '<svg class="nav-icon" width="22" height="22" viewBox="0 0 24 24" ' + s + '><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>';
      case 'chart':
        return '<svg class="nav-icon" width="22" height="22" viewBox="0 0 24 24" ' + s + '><path d="M4 20V10M12 20V4M20 20v-6"/></svg>';
      case 'user':
        return '<svg class="nav-icon" width="22" height="22" viewBox="0 0 24 24" ' + s + '><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>';
      case 'gear':
        return '<img class="nav-icon" src="/Users/daniil/Downloads/settingscogwheel_102669.svg" alt="" style="width:22px;height:22px;display:block;filter:invert(1) brightness(1.6) contrast(1.1);">';
      default:
        return '';
    }
  }

  var root = document.getElementById('sidebar-root');
  if (!root) return;

  var navHtml = items
    .map(function (it) {
      if (it.divider) return '<div class="sidebar-divider" role="presentation"></div>';
      var active = it.id === page ? ' active' : '';
      var badge =
        it.badge != null
          ? '<span class="nav-badge ' + (it.badgeClass || '') + '">' + it.badge + '</span>'
          : '';
      return (
        '<a class="nav-item' +
        active +
        '" href="' +
        it.href +
        '">' +
        iconSvg(it.icon) +
        '<span class="nav-label">' +
        it.label +
        '</span>' +
        badge +
        '</a>'
      );
    })
    .join('');

  root.innerHTML =
    '<aside class="sidebar">' +
    '<div class="sidebar-brand">' +
    '<img src="assets/logo-app.png" width="36" height="36" alt="SubCuro" class="sidebar-brand-logo">' +
    '<span>SubCuro</span></div>' +
    '<nav class="sidebar-nav" aria-label="Основное меню">' +
    navHtml +
    '</nav>' +
    '<div class="sidebar-user">' +
    '<div class="user-card">' +
    '<div class="user-avatar">А</div>' +
    '<div class="user-meta"><div class="name">Алексей</div><div class="email">demo@subcuro.app</div></div>' +
    '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>' +
    '</div></div></aside>';

  function patchBadges() {
    if (window.SubCuroData && typeof window.SubCuroData.patchSidebarBadges === 'function') {
      window.SubCuroData.patchSidebarBadges();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', patchBadges);
  else patchBadges();
})();
