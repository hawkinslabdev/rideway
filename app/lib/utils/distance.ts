// app/lib/utils/distance.ts

import { UnitsType } from '../config';

/**
 * A utility class for handling distance conversions throughout the application
 * Uses kilometers as the base unit for storage in the database
 */
export class DistanceUtil {
  /**
   * Convert a distance value from storage units (kilometers) to display units
   * @param valueInKm The value in kilometers from the database
   * @param displayUnits The user's preferred unit system
   * @param decimals Number of decimal places for rounding (default: 0)
   * @returns The converted value for display
   */
  static toDisplayUnits(valueInKm: number | null | undefined, displayUnits: UnitsType, decimals = 0): number | null {
    if (valueInKm == null) return null;
    
    if (displayUnits === 'imperial') {
      // Convert kilometers to miles
      const miles = valueInKm * 0.621371;
      return Number(miles.toFixed(decimals));
    }
    
    // Already in kilometers
    return Number(valueInKm.toFixed(decimals));
  }

  /**
   * Convert a distance value from display units to storage units (kilometers)
   * @param displayValue The value in the user's preferred units
   * @param displayUnits The user's preferred unit system
   * @param decimals Number of decimal places for rounding (default: 0)
   * @returns The converted value for database storage
   */
  static toStorageUnits(displayValue: number | null | undefined, displayUnits: UnitsType, decimals = 0): number | null {
    if (displayValue == null) return null;
    
    if (displayUnits === 'imperial') {
      // Convert miles to kilometers
      const kilometers = displayValue * 1.60934;
      return Number(kilometers.toFixed(decimals));
    }
    
    // Already in kilometers
    return Number(displayValue.toFixed(decimals));
  }

  /**
   * Format a distance value with appropriate units label
   * @param value The distance value (in the units specified by the unitsType parameter)
   * @param unitsType The unit system to use for formatting
   * @param decimals Number of decimal places (default: 0)
   * @returns Formatted string with value and units label
   */
  static format(value: number | null | undefined, unitsType: UnitsType, decimals = 0): string {
    if (value == null) return 'N/A';
    
    const unitLabel = unitsType === 'metric' ? 'km' : 'mi';
    return `${value.toFixed(decimals)} ${unitLabel}`;
  }

  /**
   * Helper to safely parse a string input to a number
   * @param input String input from a form field
   * @returns Parsed number or null if invalid
   */
  static parseInput(input: string): number | null {
    if (!input || input.trim() === '') return null;
    
    const parsed = parseFloat(input);
    return isNaN(parsed) ? null : parsed;
  }
}