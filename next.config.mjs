import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
let nextConfig = {
  turbopack: {
    root: __dirname,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  devIndicators: {
    buildActivity: false,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    unoptimized: true,
  },

  serverExternalPackages: ['pg', 'nodemailer'],

  transpilePackages: ['@xyflow/react'],

  async headers() {
    return [];
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