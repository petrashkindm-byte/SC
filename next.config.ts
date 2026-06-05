import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Allow Server Actions from subcuro.app when the proxy sends Host: subcuro.vercel.app.
  // Without this Next.js aborts actions because x-forwarded-host !== origin.
  experimental: {
    serverActions: {
      allowedOrigins: ['subcuro.app', 'www.subcuro.app'],
    },
  },
  // Pin app root so Turbopack does not pick a parent folder that has extra lockfiles.
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return []
  },
  // Proxy Supabase through subcuro.app — browser never touches supabase.co directly.
  // Fixes access for Russian users without VPN.
  // Only auth and REST paths are proxied; realtime and storage are not used.
  async rewrites() {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL!
    return [
      {
        source: '/api/sb/auth/v1/:path*',
        destination: `${supabaseUrl}/auth/v1/:path*`,
      },
      {
        source: '/api/sb/rest/v1/:path*',
        destination: `${supabaseUrl}/rest/v1/:path*`,
      },
    ]
  },
  // Статика лендинга: не кэшировать в dev, иначе кажется что «ничего не меняется».
  async headers() {
    return [
      {
        // Security headers для всего приложения
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          // Allow GIS popup to postMessage back after OAuth — required for renderButton flow
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Google Identity Services (GIS) for popup OAuth — required for Russia (no VPN)
              "script-src 'self' 'unsafe-inline' https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://oauth2.googleapis.com",
              "font-src 'self' data:",
              "worker-src 'self'",
              // GIS One Tap renders in an iframe from accounts.google.com
              "frame-src https://accounts.google.com https://content.googleapis.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/web-concept/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
