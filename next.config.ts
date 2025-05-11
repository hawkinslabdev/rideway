// File: next.config.ts

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

  // Enhanced image handling with cache directives
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
    // Enable image caching - added this configuration
    minimumCacheTTL: 60, // cache for at least 60 seconds
    formats: ['image/webp'], // prefer WebP for better compression
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048], // responsive image sizes
    imageSizes: [16, 32, 64, 96, 128, 256], // icon sizes
  },

  // Add HTTP cache headers for static assets
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=31536000',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;