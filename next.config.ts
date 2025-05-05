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
};

export default nextConfig;

