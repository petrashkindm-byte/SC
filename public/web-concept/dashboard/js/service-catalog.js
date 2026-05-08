(function () {
  /**
   * pricingPageUrl — публичная страница тарифов для сверки цены и отслеживания изменений.
   * Условия и суммы на стороне провайдера; приложение подсказывает сценарии и напоминает о проверке.
   */
  window.SubCuroServiceCatalog = [
    { id: 'yandex_music', family: 'music_streaming', title: 'Яндекс Музыка', aliases: ['яндекс музыка', 'yandex music', 'music yandex'], familyPlanHint: 'Семейный план', annualMonthsCost: 10, pricingPageUrl: 'https://music.yandex.ru/pay/' },
    { id: 'spotify', family: 'music_streaming', title: 'Spotify', aliases: ['spotify', 'spoti'], familyPlanHint: 'Duo/Family', annualMonthsCost: 10, pricingPageUrl: 'https://www.spotify.com/ru-ru/premium/' },
    { id: 'apple_music', family: 'music_streaming', title: 'Apple Music', aliases: ['apple music', 'itunes music'], familyPlanHint: 'Семейный план', annualMonthsCost: 10, pricingPageUrl: 'https://www.apple.com/ru/apple-music/' },
    { id: 'youtube_music', family: 'music_streaming', title: 'YouTube Music', aliases: ['youtube music', 'yt music', 'ютуб музыка'], familyPlanHint: 'Family plan', annualMonthsCost: 10, pricingPageUrl: 'https://music.youtube.com/music_premium' },
    { id: 'deezer', family: 'music_streaming', title: 'Deezer', aliases: ['deezer'], annualMonthsCost: 10, pricingPageUrl: 'https://www.deezer.com/ru/offers' },

    { id: 'youtube_premium', family: 'video_streaming', title: 'YouTube Premium', aliases: ['youtube premium', 'yt premium', 'ютуб премиум'], familyPlanHint: 'Family plan', annualMonthsCost: 10, pricingPageUrl: 'https://www.youtube.com/premium' },
    { id: 'netflix', family: 'video_streaming', title: 'Netflix', aliases: ['netflix', 'нетфликс'], annualMonthsCost: 11, pricingPageUrl: 'https://www.netflix.com/signup/planform' },
    { id: 'ivi', family: 'video_streaming', title: 'IVI', aliases: ['ivi', 'иви'], annualMonthsCost: 10, pricingPageUrl: 'https://www.ivi.ru/subscribe' },
    { id: 'kinopoisk', family: 'video_streaming', title: 'Кинопоиск', aliases: ['кинопоиск', 'kinopoisk', 'кинопоиск hd'], familyPlanHint: 'Семейный доступ', annualMonthsCost: 10, pricingPageUrl: 'https://hd.kinopoisk.ru/payment/' },
    { id: 'okko', family: 'video_streaming', title: 'Okko', aliases: ['okko', 'окко'], annualMonthsCost: 10, pricingPageUrl: 'https://okko.tv/' },
    { id: 'premier', family: 'video_streaming', title: 'Premier', aliases: ['premier', 'премьер'], annualMonthsCost: 10, pricingPageUrl: 'https://premier.one/' },
    { id: 'wink', family: 'video_streaming', title: 'Wink', aliases: ['wink'], annualMonthsCost: 10, pricingPageUrl: 'https://wink.ru/' },

    { id: 'google_one', family: 'cloud_storage', title: 'Google One', aliases: ['google one', 'google drive', 'гугл диск'], pricingPageUrl: 'https://one.google.com/about' },
    { id: 'icloud', family: 'cloud_storage', title: 'iCloud+', aliases: ['icloud', 'icloud+', 'айклауд'], familyPlanHint: 'Семейный доступ', pricingPageUrl: 'https://www.apple.com/icloud/' },
    { id: 'dropbox', family: 'cloud_storage', title: 'Dropbox', aliases: ['dropbox', 'дропбокс'], pricingPageUrl: 'https://www.dropbox.com/plans' },
    { id: 'onedrive', family: 'cloud_storage', title: 'OneDrive', aliases: ['onedrive', 'one drive'], pricingPageUrl: 'https://www.microsoft.com/ru-ru/microsoft-365/onedrive/compare-onedrive-plans' },

    { id: 'fitness_plus', family: 'fitness_health', title: 'Fitness+', aliases: ['fitness', 'фитнес', 'fit'], pricingPageUrl: 'https://www.apple.com/apple-fitness-plus/' },
    { id: 'calm', family: 'fitness_health', title: 'Calm', aliases: ['calm'], pricingPageUrl: 'https://www.calm.com/subscribe' },
    { id: 'headspace', family: 'fitness_health', title: 'Headspace', aliases: ['headspace'], pricingPageUrl: 'https://www.headspace.com/subscriptions' },

    { id: 'chatgpt', family: 'productivity_ai', title: 'ChatGPT Plus', aliases: ['chatgpt', 'openai'], pricingPageUrl: 'https://chatgpt.com/pricing' },
    { id: 'notion', family: 'productivity_ai', title: 'Notion', aliases: ['notion'], pricingPageUrl: 'https://www.notion.so/pricing' },
    { id: 'todoist', family: 'productivity_ai', title: 'Todoist', aliases: ['todoist'], pricingPageUrl: 'https://todoist.com/ru/pricing' }
  ];

  window.SubCuroServiceFamilies = {
    music_streaming: { title: 'Музыкальные сервисы', keywords: ['музы', 'music', 'spotify', 'yandex music', 'apple music', 'deezer', 'tidal'] },
    video_streaming: { title: 'Видеосервисы', keywords: ['видео', 'video', 'netflix', 'youtube', 'ivi', 'okko', 'kinopoisk', 'premier'] },
    cloud_storage: { title: 'Облачные сервисы', keywords: ['облак', 'cloud', 'drive', 'dropbox', 'onedrive', 'icloud'] },
    fitness_health: { title: 'Фитнес и здоровье', keywords: ['фитнес', 'fitness', 'health', 'yoga', 'medit', 'calm', 'headspace'] },
    productivity_ai: { title: 'Продуктивность и ИИ', keywords: ['notion', 'todo', 'chatgpt', 'ai', 'образован', 'работ'] },
    other: { title: 'Прочие сервисы', keywords: [] }
  };
})();
