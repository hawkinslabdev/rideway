// app/lib/utils/distance.ts

import { UnitsType } from '../config';

/**
 * A comprehensive utility class for handling distance conversions and formatting
 * throughout the application. Uses kilometers as the base unit for storage in the database.
 */
export class DistanceUtil {
  // Conversion constants
  private static readonly KM_TO_MILES = 0.621371;
  private static readonly MILES_TO_KM = 1.60934;

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
      const miles = valueInKm * this.KM_TO_MILES;
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
      const kilometers = displayValue * this.MILES_TO_KM;
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
   * Format a distance difference with sign (+ or -)
   * @param value The distance value (in the units specified by the unitsType parameter)
   * @param unitsType The unit system to use for formatting
   * @param decimals Number of decimal places (default: 0)
   * @returns Formatted string with value and units label including sign
   */
  static formatDifference(value: number | null | undefined, unitsType: UnitsType, decimals = 0): string {
    if (value == null) return 'N/A';
    
    const sign = value > 0 ? '+' : '';
    const unitLabel = unitsType === 'metric' ? 'km' : 'mi';
    return `${sign}${value.toFixed(decimals)} ${unitLabel}`;
  }

  /**
   * Format a distance value without the units label
   * @param value The distance value (in the units specified by the unitsType parameter)
   * @param decimals Number of decimal places (default: 0)
   * @returns Formatted string with value only (no units)
   */
  static formatValueOnly(value: number | null | undefined, decimals = 0): string {
    if (value == null) return 'N/A';
    return value.toFixed(decimals);
  }

  /**
   * Get just the unit label for the specified unit system
   * @param unitsType The unit system
   * @returns Units label string
   */
  static getUnitLabel(unitsType: UnitsType): string {
    return unitsType === 'metric' ? 'km' : 'mi';
  }

  /**
   * Helper to safely parse a string input to a number
   * @param input String input from a form field
   * @returns Parsed number or null if invalid
   */
  static parseInput(input: string): number | null {
    if (!input || input.trim() === '') return null;
    
    // Remove any non-numeric characters except decimal point
    const sanitized = input.replace(/[^\d.]/g, '');
    const parsed = parseFloat(sanitized);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Convert between metric and imperial units (general purpose)
   * @param value The value to convert
   * @param fromUnits The source unit system
   * @param toUnits The target unit system
   * @param decimals Number of decimal places for rounding (default: 0)
   * @returns The converted value
   */
  static convert(value: number | null | undefined, fromUnits: UnitsType, toUnits: UnitsType, decimals = 0): number | null {
    if (value == null) return null;
    if (fromUnits === toUnits) return Number(value.toFixed(decimals));

    let result;
    if (fromUnits === 'metric' && toUnits === 'imperial') {
      // Convert kilometers to miles
      result = value * this.KM_TO_MILES;
    } else {
      // Convert miles to kilometers
      result = value * this.MILES_TO_KM;
    }

    return Number(result.toFixed(decimals));
  }

  /**
   * Safely display a mileage difference with proper formatting
   * @param current Current mileage
   * @param previous Previous mileage
   * @param unitsType The unit system to use for formatting
   * @param includeParentheses Whether to include parentheses around the difference (default: true)
   * @returns Formatted string with difference (if both values are provided)
   */
  static formatMileageDifference(
    current: number | null | undefined, 
    previous: number | null | undefined, 
    unitsType: UnitsType,
    includeParentheses = true
  ): string | null {
    if (current == null || previous == null) return null;
    
    const difference = current - previous;
    if (difference <= 0) return null;
    
    const formattedDiff = this.formatDifference(difference, unitsType);
    return includeParentheses ? `(${formattedDiff})` : formattedDiff;
  }

  /**
   * Calculate the approximate time to reach a target mileage based on average daily miles
   * @param currentMileage Current odometer reading
   * @param targetMileage Target odometer reading
   * @param milesPerDay Average miles driven per day
   * @returns Approximate days until target is reached
   */
  static daysUntilMileage(currentMileage: number | null, targetMileage: number | null, milesPerDay: number): number | null {
    if (currentMileage == null || targetMileage == null || milesPerDay <= 0) return null;
    
    const difference = targetMileage - currentMileage;
    if (difference <= 0) return 0; // Already reached
    
    return Math.ceil(difference / milesPerDay);
  }

  /**
   * Format a mileage value for display in an input field (without unit label)
   * @param value The mileage value
   * @returns Formatted string suitable for input fields
   */
  static formatForInput(value: number | null | undefined): string {
    if (value == null) return '';
    return value.toString();
  }

  /**
   * Format a range of distances (e.g., "100-200 mi")
   * @param minValue The minimum distance value
   * @param maxValue The maximum distance value
   * @param unitsType The unit system to use
   * @param decimals Number of decimal places (default: 0)
   * @returns Formatted distance range with unit
   */
  static formatRange(
    minValue: number | null | undefined, 
    maxValue: number | null | undefined, 
    unitsType: UnitsType, 
    decimals = 0
  ): string {
    if (minValue == null && maxValue == null) return 'N/A';
    
    const unitLabel = unitsType === 'metric' ? 'km' : 'mi';
    
    if (minValue == null) {
      return `< ${maxValue?.toFixed(decimals)} ${unitLabel}`;
    }
    
    if (maxValue == null) {
      return `> ${minValue.toFixed(decimals)} ${unitLabel}`;
    }
    
    return `${minValue.toFixed(decimals)}-${maxValue.toFixed(decimals)} ${unitLabel}`;
  }

  /**
   * Determine if a number is within a certain percentage of another number
   * Used for checking if maintenance is coming up soon
   * @param currentMileage Current odometer reading
   * @param targetMileage Target odometer reading
   * @param percentage Percentage threshold (e.g., 10 for within 10%)
   * @returns Boolean indicating if current is within the percentage of target
   */
  static isWithinPercentage(currentMileage: number | null, targetMileage: number | null, percentage: number): boolean {
    if (currentMileage == null || targetMileage == null || percentage <= 0) return false;
    if (currentMileage >= targetMileage) return true;
    
    const difference = targetMileage - currentMileage;
    const threshold = targetMileage * (percentage / 100);
    
    return difference <= threshold;
  }
}