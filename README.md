This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Вход через Яндекс / VK

Вместо Google и Apple Sign In используются Яндекс ID и VK ID — через кастомный
Authorization Code + PKCE флоу (Supabase не поддерживает их как встроенные провайдеры).
Маршруты `/auth/oauth/yandex` и `/auth/oauth/vk` сами и инициируют вход, и принимают callback.

### Яндекс

1. Зарегистрировать приложение на https://oauth.yandex.ru
2. Платформа — веб-сервисы, Callback URL:
   `https://subcuro.app/auth/oauth/yandex`
3. Запросить доступ к данным: `login:email`, `login:info`
4. Добавить в `.env`:
   ```
   YANDEX_CLIENT_ID=
   YANDEX_CLIENT_SECRET=
   ```

### VK ID

1. Зарегистрировать приложение на https://id.vk.com/about/business/go (тип Web)
2. Callback URL: `https://subcuro.app/auth/oauth/vk`
3. Добавить в `.env`:
   ```
   VK_CLIENT_ID=
   VK_CLIENT_SECRET=
   ```

Эндпоинты VK ID берутся динамически через OIDC discovery
(`https://id.vk.com/.well-known/openid-configuration`) — если VK поменяет API,
проверьте `app/auth/oauth/vk/route.ts` (особенно маппинг полей `userinfo` и
обработку `device_id`).

### Supabase

Для обоих провайдеров нужен `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API)
— по нему создаётся/находится пользователь (`admin.generateLink`) после успешного
OAuth, без хранения паролей соцсетей.

В Supabase Dashboard → Authentication → Providers отключите Google и Apple, если
они были включены — в коде они больше не используются.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
