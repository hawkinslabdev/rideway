// File: app/lib/config.ts

/**
 * Application configuration
 * 
 * This module provides configuration defaults and loads overrides
 * from environment variables when available.
 */

/**
 * Units of measurement configuration
 * - 'metric': kilometers, liters
 * - 'imperial': miles, gallons
 */
export type UnitsType = 'metric' | 'imperial';

/**
 * Application theme configuration
 * - 'light': Light theme
 * - 'dark': Dark theme
 * - 'system': Follow system preference
 */
export type ThemeType = 'light' | 'dark' | 'system';

/**
 * Application configuration
 */
export const config = {
  /**
   * Default units of measurement
   * Can be overridden with DEFAULT_UNITS environment variable
   */
  defaultUnits: (process.env.DEFAULT_UNITS as UnitsType) || 'metric',
  
  /**
   * Default language/locale
   * Can be overridden with DEFAULT_LANGUAGE environment variable
   */
  defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
  
  /**
   * Default locale for number formatting
   * Can be overridden with DEFAULT_LOCALE environment variable
   */
  defaultLocale: process.env.DEFAULT_LOCALE || 'en-US',
  
  /**
   * Default currency code (ISO 4217)
   * Can be overridden with DEFAULT_CURRENCY environment variable
   */
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'EUR',
  
  /**
   * Default theme
   * Can be overridden with DEFAULT_THEME environment variable
   */
  defaultTheme: (process.env.DEFAULT_THEME as ThemeType) || 'light',
  
  /**
   * Whether to enable email notifications by default
   * Can be overridden with DEFAULT_EMAIL_NOTIFICATIONS environment variable
   */
  defaultEmailNotifications: process.env.DEFAULT_EMAIL_NOTIFICATIONS !== 'false',
  
  /**
   * Whether to enable maintenance reminders by default
   * Can be overridden with DEFAULT_MAINTENANCE_REMINDERS environment variable
   */
  defaultMaintenanceReminders: process.env.DEFAULT_MAINTENANCE_REMINDERS !== 'false',
};

/**
 * Get the units label based on the current units setting
 */
export function getUnitsLabel(units: UnitsType): { distance: string, volume: string } {
  return units === 'metric' 
    ? { distance: 'km', volume: 'L' }
    : { distance: 'mi', volume: 'gal' };
}

/**
 * Format a currency value according to the locale and currency settings
 * @param value The value to format
 * @param currency The currency code (optional, defaults to config setting)
 * @param locale The locale (optional, defaults to config setting)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | null, 
  currency = config.defaultCurrency, 
  locale = config.defaultLocale
): string {
  if (value === null) return '';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Convert a distance value between metric and imperial
 * @param value The value to convert
 * @param from The source unit type
 * @param to The target unit type
 * @returns The converted value
 */
export function convertDistance(value: number, from: UnitsType, to: UnitsType): number {
  if (from === to) return value;
  
  // Convert from source to target
  if (from === 'imperial' && to === 'metric') {
    // Miles to Kilometers (1 mile = 1.60934 km)
    return value * 1.60934;
  } else {
    // Kilometers to Miles (1 km = 0.621371 miles)
    return value * 0.621371;
  }
}

/**
 * Format a distance value according to the units setting
 * @param value The distance value in the current units
 * @param units The units setting ('metric' or 'imperial')
 * @param decimals The number of decimal places (default: 0)
 * @returns Formatted distance with unit
 */
export function formatDistance(value: number, units: UnitsType, decimals = 0): string {
  const unitLabel = getUnitsLabel(units).distance;
  return `${value.toFixed(decimals)} ${unitLabel}`;
}