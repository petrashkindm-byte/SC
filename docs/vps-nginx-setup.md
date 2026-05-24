# VPS proxy for subcuro.app (Russia)

Architecture:

- `subcuro.app` → nginx on VPS → Vercel (Next.js)
- `sb.subcuro.app` → nginx on VPS → `gjmfqrpnqsdpngwfuyfz.supabase.co` (Auth + API for OAuth)

Without `sb.subcuro.app`, Google redirects the phone browser to `*.supabase.co`, which is often blocked or times out in Russia. That looks like “page cannot be opened” or a long wait, then **502** on return to the site.

## 1. DNS

In your domain panel add:

| Type | Name | Value |
|------|------|--------|
| A | `@` or `subcuro` | `138.16.225.236` |
| A | `sb` | `138.16.225.236` |

## 2. nginx on VPS

Replace `YOUR_VERCEL_HOST` with the hostname from Vercel → Project → Domains (e.g. `sc-xxx.vercel.app`).

```nginx
# /etc/nginx/sites-available/subcuro.app

# --- Supabase (OAuth callback for Google must NOT hit supabase.co from the phone) ---
server {
    listen 443 ssl http2;
    server_name sb.subcuro.app;

    # certbot certificates
    ssl_certificate     /etc/letsencrypt/live/sb.subcuro.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sb.subcuro.app/privkey.pem;

    location / {
        proxy_pass https://gjmfqrpnqsdpngwfuyfz.supabase.co;
        proxy_ssl_server_name on;
        proxy_set_header Host gjmfqrpnqsdpngwfuyfz.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
    }
}

# --- Next.js on Vercel ---
server {
    listen 443 ssl http2;
    server_name subcuro.app www.subcuro.app;

    ssl_certificate     /etc/letsencrypt/live/subcuro.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/subcuro.app/privkey.pem;

    # OAuth sets large Cookie headers — defaults can cause nginx 502 on /auth/callback
    large_client_header_buffers 4 32k;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;

    location / {
        proxy_pass https://YOUR_VERCEL_HOST;
        proxy_ssl_server_name on;
        proxy_set_header Host subcuro.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

Enable and reload:

```bash
sudo ln -sf /etc/nginx/sites-available/subcuro.app /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

SSL:

```bash
sudo certbot --nginx -d subcuro.app -d www.subcuro.app
sudo certbot --nginx -d sb.subcuro.app
```

**Important:** Do not `proxy_pass http://127.0.0.1:3000` unless Next.js really runs on the VPS via pm2. For Vercel-only deploy, proxy must go to `*.vercel.app`.

## 3. Vercel environment

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://sb.subcuro.app` |
| `NEXT_PUBLIC_APP_URL` | *(empty / removed)* |

Redeploy after saving.

## 4. Supabase Dashboard

**Authentication → URL configuration**

- Site URL: `https://subcuro.app`
- Redirect URLs: `https://subcuro.app/auth/callback`

**Project Settings → Custom Domains** (if available on your plan): add `sb.subcuro.app`.

## 5. Google Cloud Console

**APIs & Services → Credentials → OAuth client**

Authorized redirect URIs — add:

```
https://sb.subcuro.app/auth/v1/callback
```

Keep the old `https://gjmfqrpnqsdpngwfuyfz.supabase.co/auth/v1/callback` until the new flow is verified.

## 6. Verify

```bash
curl -sI https://sb.subcuro.app/auth/v1/health | head -5
curl -sI https://subcuro.app/auth/callback | head -5
```

On the phone (no VPN): https://subcuro.app/auth → Google.
