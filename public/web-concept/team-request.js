(function () {
  var form = document.getElementById('team-request-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    alert(
      'Спасибо. Заявка пока не отправляется на сервер — укажите URL в action формы или подключите обработчик.',
    );
  });
})();
