// scripts/migrate-maintenance-data.ts
import { db } from "../app/lib/db/db";
import {
  maintenanceTasks,
  maintenanceRecords,
  motorcycles,
} from "../app/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Migration script to update existing database with new maintenance tracking fields
 * This adds the necessary fields for our hybrid tracking approach and computes
 * initial values based on existing task and motorcycle data.
 */
async function migrateMaintenanceData() {
  console.log("Starting maintenance data migration...");

  try {
    // Get all motorcycles
    const allMotorcycles = await db.query.motorcycles.findMany();
    console.log(`Found ${allMotorcycles.length} motorcycles`);

    // Get all maintenance tasks
    const allTasks = await db.query.maintenanceTasks.findMany();
    console.log(`Found ${allTasks.length} maintenance tasks`);

    // Get all maintenance records
    const allRecords = await db.query.maintenanceRecords.findMany();
    console.log(`Found ${allRecords.length} maintenance records`);

    // Process each task to add new fields
    for (const task of allTasks) {
      console.log(`Processing task: ${task.id} - ${task.name}`);

      // Find the associated motorcycle
      const motorcycle = allMotorcycles.find(m => m.id === task.motorcycleId);
      if (!motorcycle) {
        console.log(`  - Motorcycle not found for task ${task.id}, skipping`);
        continue;
      }

      // Find the most recent maintenance record for this task
      const taskRecords = allRecords
        .filter(r => r.taskId === task.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const lastRecord = taskRecords.length > 0 ? taskRecords[0] : null;
      
      // Set base values for calculations
      const currentDate = new Date();
      const baseDate = lastRecord ? new Date(lastRecord.date) : currentDate;
      const baseOdometer = lastRecord ? lastRecord.mileage : motorcycle.currentMileage || 0;
      
      // Calculate next due values
      let nextDueOdometer = null;
      if (task.intervalMiles && baseOdometer !== null) {
        nextDueOdometer = baseOdometer + task.intervalMiles;
      }
      
      let nextDueDate = null;
      if (task.intervalDays) {
        nextDueDate = new Date(baseDate);
        nextDueDate.setDate(nextDueDate.getDate() + task.intervalDays);
      }
      
      // Update the task with new fields
      console.log(`  - Updating task with next due values:
        baseOdometer: ${baseOdometer}
        baseDate: ${baseDate.toISOString()}
        nextDueOdometer: ${nextDueOdometer}
        nextDueDate: ${nextDueDate?.toISOString() || 'null'}`);
      
      await db.update(maintenanceTasks)
        .set({
          baseOdometer: baseOdometer,
          baseDate: baseDate,
          nextDueOdometer: nextDueOdometer,
          nextDueDate: nextDueDate,
        })
        .where(eq(maintenanceTasks.id, task.id));
      
      console.log(`  - Task updated successfully`);
      
      // Update the last record with next due values if it exists
      if (lastRecord) {
        console.log(`  - Updating last record with next due values`);
        
        await db.update(maintenanceRecords)
          .set({
            isScheduled: true,
            resetsInterval: true,
            nextDueOdometer: nextDueOdometer,
            nextDueDate: nextDueDate,
          })
          .where(eq(maintenanceRecords.id, lastRecord.id));
        
        console.log(`  - Record updated successfully`);
      }
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run the migration if executed directly
if (require.main === module) {
  migrateMaintenanceData()
    .then(() => {
      console.log("Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}

export default migrateMaintenanceData;