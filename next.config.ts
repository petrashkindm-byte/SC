import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin app root so Turbopack does not pick a parent folder that has extra lockfiles.
  turbopack: {
    root: path.join(__dirname),
  },
  // Exclude public/ from file watcher — prevents webpack from watching 7MB of static assets
  watchOptions: {
    ignored: ['**/public/**', '**/.git/**'],
  },
  async redirects() {
    return []
  },
  // Статика лендинга: не кэшировать в dev, иначе кажется что «ничего не меняется».
  async headers() {
    return [
      {
        source: '/web-concept/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
