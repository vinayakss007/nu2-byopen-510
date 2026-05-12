import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
let nextConfig = {
  // Standalone output for production Docker builds
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Turbopack for faster dev
  turbopack: {
    root: __dirname,
  },

  // TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },

  // Build indicators
  devIndicators: {
    buildActivity: false,
  },

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression
  compress: true,

  // Production optimizations
  productionBrowserSourceMaps: false,

  // Server external packages
  serverExternalPackages: ['pg', 'nodemailer'],

  // Transpile packages
  transpilePackages: ['@xyflow/react'],

  // Experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-*', '@dnd-kit/core', '@dnd-kit/sortable'],
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=300' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

// Add Sentry if configured
if (process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN) {
  try {
    const { withSentryConfig } = await import('@sentry/nextjs');
    const sentryWebpackPluginOptions = {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      widenClientFileUpload: true,
      hideSourceMaps: true,
    };
    nextConfig = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
    console.log('[next.config] Sentry enabled');
  } catch (e) {
    console.log('[next.config] Sentry not available');
  }
}

export default nextConfig;