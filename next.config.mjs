import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
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

export default nextConfig;