import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin app root so Turbopack does not pick a parent folder that has extra lockfiles.
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return []
  },
  // Proxy Supabase through subcuro.app — browser never touches supabase.co directly.
  // Fixes access for Russian users without VPN.
  async rewrites() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    return [
      {
        source: '/api/sb/:path*',
        destination: `${supabaseUrl}/:path*`,
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
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
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
