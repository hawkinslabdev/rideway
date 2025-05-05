// app/lib/utils/unitsConverter.ts

import { UnitsType } from "../config";
import { DistanceUtil } from "./distance";

/**
 * A utility module for handling unit conversions in API requests and responses
 */

/**
 * Converts mileage values in a maintenance task from storage units (km) to display units
 * @param task The maintenance task object from database
 * @param displayUnits The user's preferred unit system
 */
export function convertTaskToDisplayUnits(task: any, displayUnits: UnitsType): any {
  if (!task) return task;

  // Create a copy to avoid mutating the original
  const convertedTask = { ...task };

  // Convert each mileage-related field (if present)
  if ('dueMileage' in task && task.dueMileage !== null) {
    convertedTask.dueMileage = DistanceUtil.toDisplayUnits(task.dueMileage, displayUnits);
  }

  if ('currentMileage' in task && task.currentMileage !== null) {
    convertedTask.currentMileage = DistanceUtil.toDisplayUnits(task.currentMileage, displayUnits);
  }

  if ('intervalMiles' in task && task.intervalMiles !== null) {
    convertedTask.intervalMiles = DistanceUtil.toDisplayUnits(task.intervalMiles, displayUnits);
  }

  if ('lastCompletedMileage' in task && task.lastCompletedMileage !== null) {
    convertedTask.lastCompletedMileage = DistanceUtil.toDisplayUnits(task.lastCompletedMileage, displayUnits);
  }

  return convertedTask;
}

/**
 * Converts motorcycle data from storage units (km) to display units
 * @param motorcycle The motorcycle object from database
 * @param displayUnits The user's preferred unit system
 */
export function convertMotorcycleToDisplayUnits(motorcycle: any, displayUnits: UnitsType): any {
  if (!motorcycle) return motorcycle;

  // Create a copy to avoid mutating the original
  const convertedMotorcycle = { ...motorcycle };

  // Convert mileage field
  if ('currentMileage' in motorcycle && motorcycle.currentMileage !== null) {
    convertedMotorcycle.currentMileage = DistanceUtil.toDisplayUnits(motorcycle.currentMileage, displayUnits);
  }

  return convertedMotorcycle;
}

/**
 * Converts maintenance record data from storage units (km) to display units
 * @param record The maintenance record object from database
 * @param displayUnits The user's preferred unit system
 */
export function convertRecordToDisplayUnits(record: any, displayUnits: UnitsType): any {
  if (!record) return record;

  // Create a copy to avoid mutating the original
  const convertedRecord = { ...record };

  // Convert mileage field
  if ('mileage' in record && record.mileage !== null) {
    convertedRecord.mileage = DistanceUtil.toDisplayUnits(record.mileage, displayUnits);
  }

  return convertedRecord;
}

/**
 * Prepares task data from form submission for database storage by converting to storage units
 * @param formData The form data from client side
 * @param displayUnits The user's preferred unit system
 */
export function prepareTaskForStorage(formData: any, displayUnits: UnitsType): any {
  if (!formData) return formData;

  // Create a copy to avoid mutating the original
  const preparedData = { ...formData };

  // Convert intervalMiles if present
  if ('intervalMiles' in formData && formData.intervalMiles) {
    // Parse the input, as it might be a string
    const intervalMiles = typeof formData.intervalMiles === 'string' 
      ? DistanceUtil.parseInput(formData.intervalMiles)
      : formData.intervalMiles;
      
    preparedData.intervalMiles = DistanceUtil.toStorageUnits(intervalMiles, displayUnits);
  }

  return preparedData;
}

/**
 * Prepares motorcycle data from form submission for database storage by converting to storage units
 * @param formData The form data from client side
 * @param displayUnits The user's preferred unit system
 */
export function prepareMotorcycleForStorage(formData: any, displayUnits: UnitsType): any {
  if (!formData) return formData;

  // Create a copy to avoid mutating the original
  const preparedData = { ...formData };

  // Convert currentMileage if present
  if ('currentMileage' in formData && formData.currentMileage) {
    // Parse the input, as it might be a string
    const currentMileage = typeof formData.currentMileage === 'string' 
      ? DistanceUtil.parseInput(formData.currentMileage)
      : formData.currentMileage;
      
    preparedData.currentMileage = DistanceUtil.toStorageUnits(currentMileage, displayUnits);
  }

  return preparedData;
}

/**
 * Prepares maintenance record data from form submission for database storage by converting to storage units
 * @param formData The form data from client side
 * @param displayUnits The user's preferred unit system
 */
export function prepareRecordForStorage(formData: any, displayUnits: UnitsType): any {
  if (!formData) return formData;

  // Create a copy to avoid mutating the original
  const preparedData = { ...formData };

  // Convert mileage if present
  if ('mileage' in formData && formData.mileage) {
    // Parse the input, as it might be a string
    const mileage = typeof formData.mileage === 'string' 
      ? DistanceUtil.parseInput(formData.mileage)
      : formData.mileage;
      
    preparedData.mileage = DistanceUtil.toStorageUnits(mileage, displayUnits);
  }

  return preparedData;
}