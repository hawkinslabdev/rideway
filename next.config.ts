// File: next.config.js
import type { NextConfig } from "next";

/**
 * Define environment variables that should be available to the client-side code
 * This is necessary to access these variables in browser context
 */

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    DEFAULT_UNITS: process.env.DEFAULT_UNITS || 'metric',
    DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE || 'en',
    DEFAULT_THEME: process.env.DEFAULT_THEME || 'light',
    DEFAULT_EMAIL_NOTIFICATIONS: process.env.DEFAULT_EMAIL_NOTIFICATIONS !== 'false' ? 'true' : 'false',
    DEFAULT_MAINTENANCE_REMINDERS: process.env.DEFAULT_MAINTENANCE_REMINDERS !== 'false' ? 'true' : 'false',
  },
  
  // Add this section to disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Add this for Docker deployment with standalone output
  output: 'standalone',
  
  // Add these for better-sqlite3 support
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'better-sqlite3'];
    }
    return config;
  },
  
  // Add this to fix missing uploads directory issue
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/public/uploads/:path*',
      },
    ];
  },
  
  // Image optimization configuration with safer implementation
  images: {
    domains: ['localhost'],
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
    unoptimized: process.env.NODE_ENV !== 'production',
  },
};

export default nextConfig;