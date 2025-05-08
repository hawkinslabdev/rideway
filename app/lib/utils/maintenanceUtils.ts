// File: app/lib/utils/maintenanceUtils.ts

import { triggerEvent } from "../services/integrationService";
import { db } from "../db/db";
import { maintenanceTasks, motorcycles, users } from "../db/schema";
import { eq, and, lte, gt, isNull, ne, not } from "drizzle-orm";

/**
 * Checks for maintenance tasks that became due after a mileage update
 * and triggers the maintenance_due event for them
 * @returns Number of notifications triggered
 */
export async function checkForNewlyDueTasks(
  userId: string,
  motorcycleId: string, 
  oldMileage: number | null,
  newMileage: number
): Promise<number> {
  try {
    console.log(`Checking for newly due tasks: motorcycleId=${motorcycleId}, oldMileage=${oldMileage}, newMileage=${newMileage}`);
    
    // First, get the motorcycle details
    const motorcycle = await db.query.motorcycles.findFirst({
      where: eq(motorcycles.id, motorcycleId),
    });
    
    if (!motorcycle) {
      console.error(`Motorcycle not found: ${motorcycleId}`);
      return 0;
    }
    
    // Get all non-archived tasks for this motorcycle
    const tasks = await db.query.maintenanceTasks.findMany({
      where: and(
        eq(maintenanceTasks.motorcycleId, motorcycleId),
        eq(maintenanceTasks.archived, false)
      ),
    });
    
    console.log(`Found ${tasks.length} maintenance tasks for motorcycle ${motorcycleId}`);
    
    // Find tasks that became due with this mileage update
    const newlyDueTasks = tasks.filter(task => {
      // Check if the task has a mileage threshold and it's now due
      const isDue = task.nextDueOdometer !== null && 
             task.nextDueOdometer <= newMileage &&
             (oldMileage === null || task.nextDueOdometer > oldMileage);
             
      console.log(`Task ${task.id} (${task.name}): nextDueOdometer=${task.nextDueOdometer}, isDue=${isDue}`);
      return isDue;
    });
    
    console.log(`Found ${newlyDueTasks.length} newly due tasks`);
    
    // Trigger maintenance_due event for each task that just became due
    for (const task of newlyDueTasks) {
      console.log(`Triggering maintenance_due event for task: ${task.name} (${task.id})`);
      
      await triggerEvent(userId, "maintenance_due", {
        motorcycle: {
          id: motorcycle.id,
          name: motorcycle.name,
          make: motorcycle.make,
          model: motorcycle.model,
          year: motorcycle.year
        },
        task: {
          id: task.id,
          name: task.name
        }
      });
      
      console.log(`Successfully triggered maintenance_due event for task: ${task.name}`);
    }
    
    return newlyDueTasks.length;
  } catch (error) {
    console.error("Error checking for newly due tasks:", error);
    return 0;
  }
}

/**
 * Checks for maintenance tasks that are due today based on their date intervals
 * and triggers the maintenance_due event for them
 * @returns Number of notifications triggered
 */
export async function checkForDueTimeBasedTasks(userId: string): Promise<number> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let notificationsTriggered = 0;
    
    // Get all motorcycles for this user
    const userMotorcycles = await db.query.motorcycles.findMany({
      where: eq(motorcycles.userId, userId),
    });
    
    for (const motorcycle of userMotorcycles) {
      // Find tasks that are newly due today (and were not due yesterday)
      // This prevents sending multiple notifications for already due tasks
      const dueTasks = await db.query.maintenanceTasks.findMany({
        where: and(
          eq(maintenanceTasks.motorcycleId, motorcycle.id),
          eq(maintenanceTasks.archived, false),
          not(isNull(maintenanceTasks.nextDueDate)),
          lte(maintenanceTasks.nextDueDate, today),
          // Only get tasks that weren't already due yesterday
          gt(maintenanceTasks.nextDueDate, new Date(today.getTime() - 86400000))
        ),
      });
      
      // Trigger maintenance_due event for each task
      for (const task of dueTasks) {
        await triggerEvent(userId, "maintenance_due", {
          motorcycle: {
            id: motorcycle.id,
            name: motorcycle.name,
            make: motorcycle.make,
            model: motorcycle.model,
            year: motorcycle.year
          },
          task: {
            id: task.id,
            name: task.name
          }
        });
        notificationsTriggered++;
        console.log(`Triggered maintenance_due event for time-based task: ${task.name}`);
      }
    }
    
    return notificationsTriggered;
  } catch (error) {
    console.error("Error checking for time-based due tasks:", error);
    return 0;
  }
}

/**
 * Checks for maintenance tasks that became due after a mileage update
 * Returns the list of newly due tasks WITHOUT triggering any events
 */
export async function findNewlyDueTasks(
    motorcycleId: string, 
    oldMileage: number | null,
    newMileage: number
  ): Promise<Array<{task: any, motorcycle: any}>> {
    try {
      // First, get the motorcycle details
      const motorcycle = await db.query.motorcycles.findFirst({
        where: eq(motorcycles.id, motorcycleId),
      });
      
      if (!motorcycle) {
        console.error(`Motorcycle not found: ${motorcycleId}`);
        return [];
      }
      
      // Get all non-archived tasks for this motorcycle
      const tasks = await db.query.maintenanceTasks.findMany({
        where: and(
          eq(maintenanceTasks.motorcycleId, motorcycleId),
          eq(maintenanceTasks.archived, false)
        ),
      });
      
      // Find tasks that became due with this mileage update
      const newlyDueTasks = tasks.filter(task => {
        // Check if the task has a mileage threshold and it's now due
        return task.nextDueOdometer !== null && 
               task.nextDueOdometer <= newMileage &&
               (oldMileage === null || task.nextDueOdometer > oldMileage);
      });
      
      // Return the newly due tasks with their motorcycle info
      return newlyDueTasks.map(task => ({
        task,
        motorcycle
      }));
    } catch (error) {
      console.error("Error finding newly due tasks:", error);
      return [];
    }
  }
  
  /**
   * Similar function for time-based tasks, returning the list rather than triggering events
   */
  export async function findDueTimeBasedTasks(userId: string): Promise<Array<{task: any, motorcycle: any}>> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const results = [];
      
      // Get all motorcycles for this user
      const userMotorcycles = await db.query.motorcycles.findMany({
        where: eq(motorcycles.userId, userId),
      });
      
      for (const motorcycle of userMotorcycles) {
        // Find tasks that are newly due today (and were not due yesterday)
        const dueTasks = await db.query.maintenanceTasks.findMany({
          where: and(
            eq(maintenanceTasks.motorcycleId, motorcycle.id),
            eq(maintenanceTasks.archived, false),
            not(isNull(maintenanceTasks.nextDueDate)),
            lte(maintenanceTasks.nextDueDate, today),
            // Only get tasks that weren't already due yesterday
            gt(maintenanceTasks.nextDueDate, new Date(today.getTime() - 86400000))
          ),
        });
        
        // Add each task with its motorcycle to the results
        for (const task of dueTasks) {
          results.push({ task, motorcycle });
        }
      }
      
      return results;
    } catch (error) {
      console.error("Error finding time-based due tasks:", error);
      return [];
    }
  }

/**
 * Check all users for maintenance tasks that are due
 * This is intended to be run by a scheduled job
 */
export async function checkAllUsersForDueTasks() {
  try {
    const allUsers = await db.query.users.findMany();
    let totalNotifications = 0;
    
    for (const user of allUsers) {
      const notificationCount = await checkForDueTimeBasedTasks(user.id);
      totalNotifications += notificationCount;
    }
    
    return { 
      success: true,
      message: "Maintenance check completed", 
      notificationsSent: totalNotifications 
    };
  } catch (error) {
    console.error("Error checking maintenance for all users:", error);
    return { 
      success: false, 
      error: "Failed to check maintenance",
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Updates maintenance tasks' due dates when a motorcycle gets a mileage update
 * This is used by the motorcycle update endpoint to recalculate due dates
 */
export async function updateMaintenanceTasksAfterMileageChange(
  motorcycleId: string, 
  oldMileage: number | null, 
  newMileage: number
) {
  // Skip if no previous mileage or mileage decreased
  if (oldMileage === null || newMileage <= oldMileage) {
    return 0;
  }

  // Get all maintenance tasks for this motorcycle
  const tasks = await db.query.maintenanceTasks.findMany({
    where: and(
      eq(maintenanceTasks.motorcycleId, motorcycleId),
      eq(maintenanceTasks.archived, false)
    ),
  });

  let updatedCount = 0;
  
  // Process each task
  for (const task of tasks) {
    if (!task.intervalMiles) continue;

    if (task.intervalBase === 'zero') {
      // For zero-based intervals: recalculate based on current mileage milestones
      const intervalsPassed = Math.floor(newMileage / task.intervalMiles);
      const nextDueOdometer = (intervalsPassed + 1) * task.intervalMiles;
      
      await db.update(maintenanceTasks)
        .set({
          nextDueOdometer: nextDueOdometer,
          baseOdometer: newMileage, // Update base odometer to current value
        })
        .where(eq(maintenanceTasks.id, task.id));
        
      updatedCount++;
    } 
    // For current-based intervals, we intentionally don't update the next due mileage
    // This keeps the maintenance schedule consistent and prevents it from being pushed forward
  }
  
  return updatedCount;
}