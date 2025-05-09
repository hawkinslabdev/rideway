// next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DEFAULT_UNITS: process.env.DEFAULT_UNITS || 'metric',
    DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE || 'en',
    DEFAULT_THEME: process.env.DEFAULT_THEME || 'light',
    DEFAULT_EMAIL_NOTIFICATIONS: process.env.DEFAULT_EMAIL_NOTIFICATIONS !== 'false' ? 'true' : 'false',
    DEFAULT_MAINTENANCE_REMINDERS: process.env.DEFAULT_MAINTENANCE_REMINDERS !== 'false' ? 'true' : 'false',
  },

  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Use standalone output for Docker/container builds
  output: 'standalone',

  // Optimize image handling
  images: {
    unoptimized: process.env.NODE_ENV !== 'production',
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/uploads/**',
      }
    ],
  },

  // Remove experimental features for now to fix the build
  /*
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['react', 'react-dom', 'date-fns'],
  }
  */
};

export default nextConfig;
