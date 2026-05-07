import type { ReactNode } from 'react'

export type SettingsModalKey =
  | 'faq'
  | 'report'
  | '2fa'
  | 'privacy'
  | 'terms'
  | 'license'
  | 'whats-new'

export type SettingsModalContent = { title: string; body: ReactNode }

const SETTINGS_MODAL_CONTENT: Record<SettingsModalKey, SettingsModalContent> = {
  faq: {
    title: 'Частые вопросы',
    body: (
      <div className="space-y-3 text-sm leading-relaxed text-[#303047]">
        <p>
          <strong>Как добавить платёж?</strong>
          <br />
          Нажмите кнопку «+ Добавить» в правом верхнем углу.
        </p>
        <p>
          <strong>Почему суммы отличаются?</strong>
          <br />
          Для USD/EUR отображается пересчёт в рубли по внутреннему курсу.
        </p>
        <p>
          <strong>Можно ли экспортировать данные?</strong>
          <br />
          Да, в разделе «Профиль» доступны экспорт CSV/HTML и отчёт.
        </p>
      </div>
    ),
  },
  report: {
    title: 'Сообщить о проблеме',
    body: (
      <div className="space-y-3 text-sm leading-relaxed text-[#303047]">
        <p>Опишите проблему и приложите скриншот. Мы разберёмся как можно быстрее.</p>
        <p>
          <strong>Почта поддержки:</strong> hello@subcuro.app
        </p>
        <p>
          <strong>Рекомендуемый формат:</strong> страница, шаги воспроизведения, ожидаемый и фактический результат.
        </p>
      </div>
    ),
  },
  '2fa': {
    title: 'Двухфакторная аутентификация',
    body: (
      <p className="text-sm leading-relaxed text-[#303047]">
        Функция находится в разработке. Поддержка кодов подтверждения появится в следующем обновлении.
      </p>
    ),
  },
  privacy: {
    title: 'Политика конфиденциальности',
    body: (
      <div className="space-y-3 text-sm leading-relaxed text-[#303047]">
        <p>SubCuro обрабатывает только данные, необходимые для работы подписок, аналитики и напоминаний.</p>
        <ul className="m-0 list-disc pl-5">
          <li>Мы не передаём данные третьим лицам без вашего согласия.</li>
          <li>Вы можете удалить данные в любой момент в разделе «Профиль».</li>
        </ul>
      </div>
    ),
  },
  terms: {
    title: 'Условия использования',
    body: (
      <p className="text-sm leading-relaxed text-[#303047]">
        Используя SubCuro, вы принимаете правила использования сервиса и соглашаетесь с обработкой данных в рамках
        функциональности приложения.
      </p>
    ),
  },
  license: {
    title: 'Лицензионное соглашение',
    body: (
      <p className="text-sm leading-relaxed text-[#303047]">
        Текущая сборка является демонстрационной версией интерфейса и предоставляется «как есть» для тестирования
        возможностей продукта.
      </p>
    ),
  },
  'whats-new': {
    title: 'Что нового',
    body: (
      <ul className="m-0 list-disc pl-5 text-sm leading-relaxed text-[#303047]">
        <li>Улучшены карточки коллекций и взаимодействие с разделами.</li>
        <li>Синхронизированы счётчики в боковом меню.</li>
        <li>Настройки объединены в один экран и стали полностью интерактивными.</li>
      </ul>
    ),
  },
}

export function getSettingsModalContent(key: SettingsModalKey): SettingsModalContent {
  return SETTINGS_MODAL_CONTENT[key]
}
