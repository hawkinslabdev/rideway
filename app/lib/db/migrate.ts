// app/lib/db/migrate.ts
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./db";
import { users, motorcycles, maintenanceTasks, maintenanceRecords } from "./schema";
import { eq, or, isNull, and } from "drizzle-orm";
import Database from "better-sqlite3";

// This will run migrations on the database, creating tables if they don't exist
// and adding data
console.log("Running migrations...");

// Run the schema migrations first
migrate(db, { migrationsFolder: "./drizzle" });

// Ensure the required columns exist in the tables
async function ensureColumns() {
  console.log("Ensuring required columns exist in tables...");

  try {
    // Check columns in motorcycles table
    const motorcyclesColumns = db.$client.prepare("PRAGMA table_info(motorcycles)").all();
    const motorcycleColumnNames = motorcyclesColumns.map((col: any) => col.name);

    // Check and add isOwned column if needed
    if (!motorcycleColumnNames.includes("isOwned")) {
      db.$client.prepare("ALTER TABLE motorcycles ADD COLUMN isOwned INTEGER DEFAULT 1").run();
      console.log("Added 'isOwned' column to motorcycles table");
    }

    // Check and add isDefault column if needed
    if (!motorcycleColumnNames.includes("isDefault")) {
      db.$client.prepare("ALTER TABLE motorcycles ADD COLUMN isDefault INTEGER DEFAULT 0").run();
      console.log("Added 'isDefault' column to motorcycles table");
    }

    // Check columns in maintenance_tasks table
    const tasksColumns = db.$client.prepare("PRAGMA table_info(maintenance_tasks)").all();
    const taskColumnNames = tasksColumns.map((col: any) => col.name);

    // Check and add baseOdometer column if needed
    if (!taskColumnNames.includes("baseOdometer")) {
      db.$client.prepare("ALTER TABLE maintenance_tasks ADD COLUMN baseOdometer INTEGER").run();
      console.log("Added 'baseOdometer' column to maintenance_tasks table");
    }

    // Check and add nextDueOdometer column if needed
    if (!taskColumnNames.includes("nextDueOdometer")) {
      db.$client.prepare("ALTER TABLE maintenance_tasks ADD COLUMN nextDueOdometer INTEGER").run();
      console.log("Added 'nextDueOdometer' column to maintenance_tasks table");
    }

    // Check and add baseDate column if needed
    if (!taskColumnNames.includes("baseDate")) {
      db.$client.prepare("ALTER TABLE maintenance_tasks ADD COLUMN baseDate INTEGER").run();
      console.log("Added 'baseDate' column to maintenance_tasks table");
    }

    // Check and add nextDueDate column if needed
    if (!taskColumnNames.includes("nextDueDate")) {
      db.$client.prepare("ALTER TABLE maintenance_tasks ADD COLUMN nextDueDate INTEGER").run();
      console.log("Added 'nextDueDate' column to maintenance_tasks table");
    }

    // Check and add archived column if needed
    if (!taskColumnNames.includes("archived")) {
      db.$client.prepare("ALTER TABLE maintenance_tasks ADD COLUMN archived INTEGER DEFAULT 0").run();
      console.log("Added 'archived' column to maintenance_tasks table");
    }

    // Check columns in maintenance_records table
    const recordsColumns = db.$client.prepare("PRAGMA table_info(maintenance_records)").all();
    const recordColumnNames = recordsColumns.map((col: any) => col.name);

    // Check and add isScheduled column if needed
    if (!recordColumnNames.includes("isScheduled")) {
      db.$client.prepare("ALTER TABLE maintenance_records ADD COLUMN isScheduled INTEGER DEFAULT 1").run();
      console.log("Added 'isScheduled' column to maintenance_records table");
    }

    // Check and add resetsInterval column if needed
    if (!recordColumnNames.includes("resetsInterval")) {
      db.$client.prepare("ALTER TABLE maintenance_records ADD COLUMN resetsInterval INTEGER DEFAULT 1").run();
      console.log("Added 'resetsInterval' column to maintenance_records table");
    }

    // Check and add nextDueOdometer column if needed
    if (!recordColumnNames.includes("nextDueOdometer")) {
      db.$client.prepare("ALTER TABLE maintenance_records ADD COLUMN nextDueOdometer INTEGER").run();
      console.log("Added 'nextDueOdometer' column to maintenance_records table");
    }

    // Check and add nextDueDate column if needed
    if (!recordColumnNames.includes("nextDueDate")) {
      db.$client.prepare("ALTER TABLE maintenance_records ADD COLUMN nextDueDate INTEGER").run();
      console.log("Added 'nextDueDate' column to maintenance_records table");
    }

    console.log("Required columns ensured successfully");
  } catch (error) {
    console.error("Error ensuring columns:", error);
    throw error;
  }
}

// Set up defaults and ownership for existing data
async function setupExistingData() {
  console.log("Setting up defaults and ownership for existing data...");

  try {
    // 1. Mark all existing motorcycles as owned
    await db.update(motorcycles)
      .set({ isOwned: true })
      .where(or(
        eq(motorcycles.isOwned, false),
        isNull(motorcycles.isOwned)
      ));

    console.log("Set ownership status for all existing motorcycles");

    // 2. Set default motorcycles for users who don't have one
    const allUsers = await db.query.users.findMany();
    console.log(`Found ${allUsers.length} users to process`);

    let updatedCount = 0;

    for (const user of allUsers) {
      // Get all motorcycles for this user, owned ones first
      const userMotorcycles = await db.query.motorcycles.findMany({
        where: and(
          eq(motorcycles.userId, user.id),
          eq(motorcycles.isOwned, true)
        )
      });

      if (userMotorcycles.length === 0) {
        console.log(`No owned motorcycles found for user ${user.id}`);
        continue;
      }

      // Check if any motorcycle is already set as default
      const hasDefault = userMotorcycles.some(moto => moto.isDefault);

      if (hasDefault) {
        console.log(`User ${user.id} already has a default motorcycle`);
        continue;
      }

      // Set the first motorcycle as default (oldest one in the list)
      const defaultMotorcycle = userMotorcycles.sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })[0];
      
      await db.update(motorcycles)
        .set({ isDefault: true })
        .where(eq(motorcycles.id, defaultMotorcycle.id));

      updatedCount++;
      console.log(`Set motorcycle ${defaultMotorcycle.id} as default for user ${user.id}`);
    }

    console.log(`Set default motorcycles for ${updatedCount} users`);

    // 3. Update maintenance tasks with missing hybrid tracking fields
    await updateMaintenanceTasks();
  } catch (error) {
    console.error("Error setting up existing data:", error);
    throw error;
  }
}

// Update maintenance tasks with calculated fields for hybrid tracking
async function updateMaintenanceTasks() {
  console.log("Updating maintenance tasks with hybrid tracking fields...");

  try {
    // Get all motorcycles to have access to their current mileage
    const allMotorcycles = await db.query.motorcycles.findMany();
    console.log(`Found ${allMotorcycles.length} motorcycles`);

    // Get all maintenance tasks
    const allTasks = await db.query.maintenanceTasks.findMany();
    console.log(`Found ${allTasks.length} maintenance tasks`);

    // Get all maintenance records
    const allRecords = await db.query.maintenanceRecords.findMany();
    console.log(`Found ${allRecords.length} maintenance records`);

    // Process each task to add new fields
    let updatedCount = 0;
    for (const task of allTasks) {
      console.log(`Processing task: ${task.id} - ${task.name}`);

      // Skip tasks that already have values
      if (task.baseOdometer !== null && task.baseDate !== null && 
          task.nextDueOdometer !== null && task.nextDueDate !== null) {
        console.log(`  - Task ${task.id} already has tracking fields, skipping`);
        continue;
      }

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
      console.log(`  - Updating task with calculated values:
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
          archived: task.archived || false
        })
        .where(eq(maintenanceTasks.id, task.id));
      
      updatedCount++;
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

    console.log(`Updated ${updatedCount} maintenance tasks with tracking fields`);
  } catch (error) {
    console.error("Error updating maintenance tasks:", error);
    throw error;
  }
}

// Execute all migration steps in sequence
async function runMigrations() {
  try {
    console.log("Starting migration process...");
    await ensureColumns();
    await setupExistingData();
    console.log("All migrations completed successfully!");
  } catch (error) {
    console.error("Migration process failed:", error);
    process.exit(1);
  }
}

// Run migrations when this file is executed directly
runMigrations();