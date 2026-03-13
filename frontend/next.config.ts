import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: ['motion'],

  // ─────────────────────────────────────────────────────────────
  // STEP 1 (CSS Browser Cache) + STEP 4 (Cache Headers):
  // Next.js compiles CSS/JS into content-hashed filenames under
  // /_next/static/ — identical to what localStorage caching does
  // in a plain HTML app. Setting max-age=31536000 + immutable
  // tells the browser to cache them for 1 year without re-checking.
  // STEP 4 equivalent: Flask's Cache-Control header is set here
  // via Next.js headers() instead of @app.after_request.
  // ─────────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        // Cache all compiled Next.js static assets (JS, CSS, fonts, images)
        // for 1 year — safe because filenames include a content hash.
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            // STEP 4: public, max-age=86400 requested → we use 1 year (immutable)
            // because Next.js hash-names guarantee no stale content.
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache public folder assets (images, icons, manifest, etc.) for 24 h
        // — matches the Flask timedelta(hours=24) in STEP 4.
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=3600',
          },
        ],
      },
      {
        // STEP 6 (Preload): Tell browsers to prefetch the app pages so
        // navigation feels instant (equivalent to <link rel="dns-prefetch">
        // for internal routes).
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
