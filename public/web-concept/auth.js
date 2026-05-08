(function () {
  var loginPanel = document.getElementById('auth-panel-login');
  var registerPanel = document.getElementById('auth-panel-register');
  var tabs = document.querySelectorAll('[data-auth-tab]');

  function setMode(mode) {
    var isLogin = mode === 'login';
    if (loginPanel) loginPanel.hidden = !isLogin;
    if (registerPanel) registerPanel.hidden = isLogin;
    tabs.forEach(function (btn) {
      var t = btn.getAttribute('data-auth-tab');
      var active = (isLogin && t === 'login') || (!isLogin && t === 'register');
      btn.classList.toggle('auth-tab--active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (history.replaceState) {
      history.replaceState(null, '', isLogin ? 'auth.html' : 'auth.html#register');
    }
    document.title = isLogin ? 'Войти — SubCuro' : 'Регистрация — SubCuro';
  }

  function initMode() {
    var hash = (location.hash || '').toLowerCase();
    var params = new URLSearchParams(location.search);
    if (hash === '#register' || params.get('register') === '1') {
      setMode('register');
    } else {
      setMode('login');
    }
  }

  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setMode(btn.getAttribute('data-auth-tab'));
    });
  });

  document.querySelectorAll('[data-toggle-password]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('aria-controls');
      var input = id ? document.getElementById(id) : null;
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      btn.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
    });
  });

  window.addEventListener('hashchange', initMode);
  initMode();
})();
