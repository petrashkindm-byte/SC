# Письмо «Сброс пароля» (Supabase)

## Логотип не отображается

В шаблоне письма в Supabase картинка должна быть **полным URL**, не `/logo.png`.

**Authentication → Email Templates → Reset password**

В HTML найдите `<img ...>` и замените `src` на:

```html
<img
  src="https://subcuro.app/subcuro_ribbon_s_transparent.png"
  alt="SubCuro"
  width="120"
  height="auto"
  style="display:block;margin:0 auto 16px"
/>
```

Сохраните шаблон.

## Site URL (важно для ошибок в письме)

**Authentication → URL Configuration → Site URL:**

```
https://subcuro.app/auth
```

(не просто `https://subcuro.app` — иначе ошибки «ссылка устарела» попадают на главную)

## Redirect URLs

**Authentication → URL Configuration → Redirect URLs** — добавьте:

```
https://subcuro.app/auth/callback?flow=recovery
https://subcuro.app/auth?reset=1
```
