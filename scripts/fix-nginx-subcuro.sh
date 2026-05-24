#!/bin/bash
# Run ON THE VPS as root (after: ssh -p 2222 root@138.16.225.236)
set -euo pipefail

CONF=/etc/nginx/sites-available/subcuro
cp -a "$CONF" "${CONF}.bak.$(date +%Y%m%d%H%M%S)"

cat > "$CONF" <<'NGINX'
server {
    server_name subcuro.app www.subcuro.app;

    large_client_header_buffers 4 32k;

    location / {
        proxy_pass https://subcuro.vercel.app;
        proxy_ssl_server_name on;
        proxy_set_header Host subcuro.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/subcuro.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/subcuro.app/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.subcuro.app) {
        return 301 https://$host$request_uri;
    }

    if ($host = subcuro.app) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name subcuro.app www.subcuro.app;
    return 404;
}
NGINX

nginx -t && systemctl reload nginx
echo "OK: nginx reloaded. Backup: ${CONF}.bak.*"
