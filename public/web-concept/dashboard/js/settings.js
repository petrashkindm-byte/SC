(function () {
  var LS_KEY = 'subcuro_settings_v1';

  function readState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return { push: true, email: true, trial: true };
      var s = JSON.parse(raw);
      return {
        push: s.push !== false,
        email: s.email !== false,
        trial: s.trial !== false,
      };
    } catch (e) {
      return { push: true, email: true, trial: true };
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function toast(text) {
    var id = 'settings-toast';
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.cssText =
        'position:fixed;right:20px;bottom:20px;z-index:1100;background:#1a1a2e;color:#fff;padding:10px 14px;border-radius:12px;font-size:13px;box-shadow:0 10px 24px rgba(26,26,46,.25)';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.hidden = true;
    }, 1800);
  }

  function syncToggle(btn, on) {
    btn.classList.toggle('is-on', !!on);
    btn.classList.toggle('is-off', !on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function bindToggles() {
    var state = readState();
    document.querySelectorAll('[data-setting-toggle]').forEach(function (btn) {
      var key = btn.getAttribute('data-setting-toggle');
      syncToggle(btn, state[key] !== false);
      btn.addEventListener('click', function () {
        state[key] = !(state[key] !== false);
        syncToggle(btn, state[key]);
        saveState(state);
        toast(state[key] ? 'Включено' : 'Выключено');
      });
    });
  }

  function bindActions() {
    var modal = document.getElementById('settings-modal');
    var modalTitle = document.getElementById('settings-modal-title');
    var modalBody = document.getElementById('settings-modal-body');

    function openModal(title, bodyHtml) {
      if (!modal || !modalTitle || !modalBody) return;
      modalTitle.textContent = title;
      modalBody.innerHTML = bodyHtml;
      modal.hidden = false;
    }

    function closeModal() {
      if (!modal) return;
      modal.hidden = true;
    }

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target && e.target.hasAttribute('data-settings-modal-close')) closeModal();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
      });
    }

    document.querySelectorAll('[data-action]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var action = el.getAttribute('data-action');
        if (action === 'support-email') {
          window.location.href = 'mailto:hello@subcuro.app?subject=SubCuro%20Support';
          return;
        }
        if (action === 'faq') {
          return openModal(
            'Частые вопросы',
            '<p><strong>Как добавить платёж?</strong><br>Нажмите кнопку «+ Добавить» в правом верхнем углу.</p>' +
              '<p><strong>Почему суммы отличаются?</strong><br>Для USD/EUR отображается пересчёт в рубли по внутреннему курсу.</p>' +
              '<p><strong>Можно ли экспортировать данные?</strong><br>Да, в разделе «Профиль» доступны экспорт CSV/HTML/XLSX и отчёт.</p>'
          );
        }
        if (action === 'report-problem') {
          return openModal(
            'Сообщить о проблеме',
            '<p>Опишите проблему и приложите скриншот. Мы разберёмся как можно быстрее.</p>' +
              '<p><strong>Почта поддержки:</strong> hello@subcuro.app</p>' +
              '<p><strong>Рекомендуемый формат:</strong> страница, шаги воспроизведения, ожидаемый и фактический результат.</p>'
          );
        }
        if (action === 'change-password') {
          return openModal(
            'Изменить пароль',
            '<p>В демонстрационной версии смена пароля недоступна, но в релизе здесь будет безопасная форма обновления.</p>'
          );
        }
        if (action === '2fa') {
          return openModal(
            'Двухфакторная аутентификация',
            '<p>Функция находится в разработке. Поддержка кодов подтверждения появится в следующем обновлении.</p>'
          );
        }
        if (action === 'privacy') {
          return openModal(
            'Политика конфиденциальности',
            '<p>SubCuro обрабатывает только данные, необходимые для работы подписок, аналитики и напоминаний.</p>' +
              '<ul><li>Мы не передаём данные третьим лицам без вашего согласия.</li><li>Вы можете удалить данные в любой момент в разделе «Профиль».</li></ul>'
          );
        }
        if (action === 'terms') {
          return openModal(
            'Условия использования',
            '<p>Используя SubCuro, вы принимаете правила использования сервиса и соглашаетесь с обработкой данных в рамках функциональности приложения.</p>'
          );
        }
        if (action === 'license') {
          return openModal(
            'Лицензионное соглашение',
            '<p>Текущая сборка является демонстрационной версией интерфейса и предоставляется «как есть» для тестирования возможностей продукта.</p>'
          );
        }
        if (action === 'whats-new') {
          return openModal(
            'Что нового',
            '<ul><li>Улучшены карточки коллекций и взаимодействие с разделами.</li><li>Синхронизированы счётчики в боковом меню.</li><li>Настройки объединены в один экран и стали полностью интерактивными.</li></ul>'
          );
        }
        if (action === 'rate-app') return toast('Спасибо! Оценка будет доступна в релизной версии.');
      });
    });
  }

  function bindHeader() {
    var add = document.querySelector('.header-actions .btn-primary');
    if (add) {
      add.addEventListener('click', function () {
        window.location.href = 'payments.html';
      });
    }
  }

  function run() {
    bindToggles();
    bindActions();
    bindHeader();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
