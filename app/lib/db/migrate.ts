// app/lib/db/migrate.ts
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users, motorcycles, maintenanceTasks, maintenanceRecords, mileageLogs, integrations, integrationEvents, integrationTemplates } from './schema';
import { encrypt } from '../utils/encryption';
import { eq, or, isNull, and, not, sql } from "drizzle-orm";

// This will run migrations on the database, creating tables if they don't exist
// and adding data
console.log("Running migrations...");

// Run the schema migrations first
migrate(db, { migrationsFolder: "./drizzle" });

// Add this helper function at the top of the file
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

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

    if (!taskColumnNames.includes("interval_base")) {
      db.$client.prepare("ALTER TABLE maintenance_tasks ADD COLUMN interval_base TEXT DEFAULT 'current'").run();
      console.log("Added 'intervalBase' column to maintenance_tasks table");
    }

    // Check if mileage_logs table exists
    let mileageLogsTableExists = false;
    try {
      db.$client.prepare("SELECT * FROM mileage_logs LIMIT 1").all();
      mileageLogsTableExists = true;
      console.log("mileage_logs table exists");
    } catch (error) {
      // Table doesn't exist, this is expected
    }

    // If table doesn't exist, create it
    if (!mileageLogsTableExists) {
      db.$client.prepare(`
        CREATE TABLE mileage_logs (
          id TEXT PRIMARY KEY,
          motorcycle_id TEXT NOT NULL REFERENCES motorcycles(id) ON DELETE CASCADE,
          previous_mileage INTEGER,
          new_mileage INTEGER NOT NULL,
          date INTEGER NOT NULL,
          notes TEXT,
          created_at INTEGER NOT NULL
        )
      `).run();
      console.log("Created mileage_logs table");
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

    // Get all maintenance records for reference
    const allRecords = await db.query.maintenanceRecords.findMany({
      orderBy: (records, { desc }) => [desc(records.date)]
    });
    
    // Current date for due date calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process each task to add new fields
    let updatedCount = 0;
    for (const task of allTasks) {
      console.log(`Processing task: ${task.id} - ${task.name}`);

      // Find the associated motorcycle
      const motorcycle = allMotorcycles.find(m => m.id === task.motorcycleId);
      if (!motorcycle) {
        console.log(`  - Motorcycle not found for task ${task.id}, skipping`);
        continue;
      }

      // Set interval base if not set
      const intervalBase = task.intervalBase || 'current';
      
      // Find the last maintenance record for this task
      const taskRecords = allRecords
        .filter(r => r.taskId === task.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
      const lastRecord = taskRecords.length > 0 ? taskRecords[0] : null;
      
      // Calculate next due values
      let nextDueOdometer = null;
      let nextDueDate = null;
      
      if (lastRecord) {
        // If we have a last record, calculate based on that
        
        // If task has a mileage interval and last record has mileage, calculate from last record
        if (task.intervalMiles && lastRecord.mileage) {
          nextDueOdometer = lastRecord.mileage + task.intervalMiles;
        } 
        // If no last record mileage but there is current mileage, use current
        else if (task.intervalMiles && motorcycle.currentMileage !== null) {
          if (intervalBase === 'current') {
            nextDueOdometer = motorcycle.currentMileage + task.intervalMiles;
          } else {
            // Zero-based: find next interval from zero
            const intervalsPassed = Math.floor(motorcycle.currentMileage / task.intervalMiles);
            nextDueOdometer = (intervalsPassed + 1) * task.intervalMiles;
          }
        }
        
        // If task has day interval, calculate next due date
        if (task.intervalDays) {
          nextDueDate = new Date(lastRecord.date);
          nextDueDate.setDate(nextDueDate.getDate() + task.intervalDays);
        }
      } else {
        // First time maintenance - calculate from current values
        
        // For mileage interval, use current motorcycle mileage
        if (task.intervalMiles && motorcycle.currentMileage !== null) {
          if (intervalBase === 'current') {
            nextDueOdometer = motorcycle.currentMileage + task.intervalMiles;
          } else {
            // Zero-based: find next interval from zero
            const intervalsPassed = Math.floor(motorcycle.currentMileage / task.intervalMiles);
            nextDueOdometer = (intervalsPassed + 1) * task.intervalMiles;
          }
        }
        
        // For day interval, use current date or purchase date
        if (task.intervalDays) {
          // For first maintenance with day interval, use motorcycle purchase date if available
          const startDate = motorcycle.purchaseDate || new Date();
          nextDueDate = new Date(startDate);
          nextDueDate.setDate(nextDueDate.getDate() + task.intervalDays);
        }
      }
      
      // Update the task with new fields
      await db.update(maintenanceTasks)
        .set({
          baseOdometer: motorcycle.currentMileage || 0,
          baseDate: new Date(),
          nextDueOdometer: nextDueOdometer,
          nextDueDate: nextDueDate,
          intervalBase: intervalBase,
          archived: task.archived || false
        })
        .where(eq(maintenanceTasks.id, task.id));
      
      updatedCount++;
      console.log(`  - Task updated successfully with interval base: ${intervalBase}`);
      console.log(`  - Next due: ${nextDueDate ? nextDueDate.toISOString() : 'None'}, ${nextDueOdometer || 'None'}`);
    }

    console.log(`Updated ${updatedCount} maintenance tasks with tracking fields`);
  } catch (error) {
    console.error("Error updating maintenance tasks:", error);
    throw error;
  }
}

async function cleanupDuplicateMileageLogs() {
  console.log("Cleaning up duplicate mileage logs...");
  
  try {
    // Get all mileage logs
    const allLogs = await db.query.mileageLogs.findMany({
      orderBy: (logs, { asc }) => [asc(logs.motorcycleId), asc(logs.date)]
    });
    
    console.log(`Found ${allLogs.length} total mileage logs`);
    
    // Group logs by motorcycle and timestamp proximity
    const motorcycleGroups: Record<string, any[]> = {};
    
    // Group logs by motorcycle ID
    allLogs.forEach(log => {
      if (!motorcycleGroups[log.motorcycleId]) {
        motorcycleGroups[log.motorcycleId] = [];
      }
      motorcycleGroups[log.motorcycleId].push(log);
    });
    
    let duplicatesRemoved = 0;
    
    // Process each motorcycle's logs
    for (const motorcycleId in motorcycleGroups) {
      const logs = motorcycleGroups[motorcycleId];
      const logsToKeep: string[] = [];
      
      // Sort logs by date
      logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      for (let i = 0; i < logs.length; i++) {
        const currentLog = logs[i];
        
        // Always keep the first log
        if (i === 0) {
          logsToKeep.push(currentLog.id);
          continue;
        }
        
        const previousLog = logs[i - 1];
        
        // Check if this is potentially a duplicate
        const isDuplicate = 
          // Same mileage values
          (currentLog.previousMileage === previousLog.previousMileage && 
           currentLog.newMileage === previousLog.newMileage) ||
          // Log recorded within 5 seconds of previous log
          (Math.abs(new Date(currentLog.date).getTime() - 
                   new Date(previousLog.date).getTime()) < 5000);
        
        if (!isDuplicate) {
          logsToKeep.push(currentLog.id);
        } else {
          duplicatesRemoved++;
        }
      }
      
      // Delete logs that aren't in the keep list
      const logsToDelete = logs.filter(log => !logsToKeep.includes(log.id)).map(log => log.id);
      
      if (logsToDelete.length > 0) {
        for (const logId of logsToDelete) {
          await db.delete(mileageLogs).where(eq(mileageLogs.id, logId));
        }
        console.log(`Removed ${logsToDelete.length} duplicate logs for motorcycle ${motorcycleId}`);
      }
    }
    
    console.log(`Cleaned up ${duplicatesRemoved} duplicate mileage logs`);
  } catch (error) {
    console.error("Error cleaning up duplicate mileage logs:", error);
    throw error;
  }
}

// Update the backfillMileageLogs function to only create logs if needed
async function backfillMileageLogs() {
  console.log("Backfilling mileage logs for motorcycles with existing mileage...");
  
  try {
    // Get all motorcycles with mileage data
    const motorcyclesWithMileage = await db.query.motorcycles.findMany({
      where: (motorcycles, { not, isNull }) => not(isNull(motorcycles.currentMileage))
    });
    
    console.log(`Found ${motorcyclesWithMileage.length} motorcycles with mileage data`);
    
    let createdLogsCount = 0;
    
    for (const motorcycle of motorcyclesWithMileage) {
      // Check if this motorcycle already has any mileage logs
      const existingLogs = await db.query.mileageLogs.findMany({
        where: eq(mileageLogs.motorcycleId, motorcycle.id)
      });
      
      if (existingLogs.length === 0 && motorcycle.currentMileage) {
        // Create an initial log for the current mileage
        await db.insert(mileageLogs).values({
          id: randomUUID(),
          motorcycleId: motorcycle.id,
          previousMileage: null, // No previous mileage for initial entry
          newMileage: motorcycle.currentMileage,
          date: motorcycle.updatedAt || new Date(),
          notes: "Initial mileage record",
          createdAt: new Date()
        });
        
        createdLogsCount++;
        console.log(`Created initial mileage log for motorcycle ${motorcycle.id}`);
      }
    }
    
    console.log(`Created ${createdLogsCount} initial mileage logs`);
  } catch (error) {
    console.error("Error backfilling mileage logs:", error);
    throw error;
  }
}

/**
 * Ensure maintenance records are properly logged for activity tracking
 */
async function ensureMaintenanceActivity() {
  console.log("Ensuring maintenance records have proper activity entries...");
  
  try {
    // Get all maintenance records
    const records = await db.query.maintenanceRecords.findMany({
      orderBy: (records, { asc }) => [asc(records.date)]
    });
    
    console.log(`Found ${records.length} maintenance records to process`);
    
    // Process each record to create mileage logs if needed
    let createdLogsCount = 0;
    
    for (const record of records) {
      // If the record has mileage, create a mileage log if one doesn't exist for this record
      if (record.mileage !== null) {
        // Check if there's a mileage log within 5 minutes of this maintenance record
        const recordTime = new Date(record.date).getTime();
        const timeWindow = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        // Find logs for this specific motorcycle
        const existingLogs = await db.query.mileageLogs.findMany({
          where: eq(mileageLogs.motorcycleId, record.motorcycleId)
        });
        
        // Filter logs that are within the time window and have matching mileage
        const logsInTimeWindow = existingLogs.filter(log => {
          const logTime = new Date(log.date).getTime();
          return Math.abs(logTime - recordTime) < timeWindow && 
                 (record.mileage === log.newMileage);
        });
        
        if (logsInTimeWindow.length === 0) {
          // Find the motorcycle to get previous mileage if possible
          const motorcycle = await db.query.motorcycles.findFirst({
            where: eq(motorcycles.id, record.motorcycleId)
          });
          
          if (motorcycle) {
            // Convert the record date to ISO string for proper comparison in SQLite
            const recordDateIso = new Date(record.date).toISOString();
            
            // Find any earlier maintenance records for this motorcycle to determine previous mileage
            const earlierRecords = await db.query.maintenanceRecords.findMany({
              where: and(
                eq(maintenanceRecords.motorcycleId, record.motorcycleId),
                // Use a simpler comparison approach that's compatible with SQLite
                sql`strftime('%s', ${maintenanceRecords.date}) < strftime('%s', ${recordDateIso})`
              ),
              orderBy: (records, { desc }) => [desc(records.date)]
            });
            
            // Use the most recent earlier record's mileage as the previous mileage
            const previousMileage = earlierRecords.length > 0 && earlierRecords[0].mileage !== null
              ? earlierRecords[0].mileage
              : null;
            
            // Get task name if available (safely handle async call)
            let taskName = "Maintenance";
            if (record.taskId) {
              try {
                const task = await db.query.maintenanceTasks.findFirst({
                  where: eq(maintenanceTasks.id, record.taskId)
                });
                if (task) taskName = task.name;
              } catch (e) {
                console.log(`Could not fetch task name for ${record.taskId}`);
              }
            }
            
            // Ensure we have proper date objects
            const recordDate = record.date instanceof Date ? record.date : new Date(record.date);
            const createdAtDate = record.createdAt instanceof Date ? record.createdAt : new Date(record.createdAt || record.date);
            
            // Create a mileage log for this maintenance record
            await db.insert(mileageLogs).values({
              id: randomUUID(),
              motorcycleId: record.motorcycleId,
              previousMileage: previousMileage,
              newMileage: record.mileage,
              date: recordDate,
              notes: `Mileage updated during maintenance: ${taskName}`,
              createdAt: createdAtDate
            });
            
            createdLogsCount++;
            console.log(`Created mileage log for maintenance record ${record.id}`);
          }
        }
      }
    }
    
    console.log(`Created ${createdLogsCount} mileage logs from maintenance records`);
  } catch (error) {
    console.error("Error ensuring maintenance activity:", error);
    throw error;
  }
}

// Ensure the password_reset_tokens table exists
async function ensurePasswordResetTable() {
  console.log("Ensuring password_reset_tokens table exists...");
  
  try {
    // Check if the table exists
    const tableExists = db.$client.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='password_reset_tokens'"
    ).all().length > 0;
    
    if (!tableExists) {
      // Create the table if it doesn't exist
      db.$client.prepare(`
        CREATE TABLE password_reset_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          used INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      console.log("Created password_reset_tokens table");
    }
  } catch (error) {
    console.error("Error ensuring password_reset_tokens table:", error);
    throw error;
  }
}

// Ensure the integrations table is created
async function ensureIntegrationsTable() {
  console.log("Ensuring integrations table exists...");
  
  try {
    // Check if the table exists
    const tableExists = db.$client.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='integrations'"
    ).all().length > 0;
    
    if (!tableExists) {
      // Create the table if it doesn't exist
      db.$client.prepare(`
        CREATE TABLE integrations (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          active INTEGER DEFAULT 1,
          config TEXT NOT NULL,
          createdAt INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      console.log("Created integrations table");
    }
  } catch (error) {
    console.error("Error ensuring integrations table:", error);
    throw error;
  }
}

// Ensure the integration_events table is created
async function ensureIntegrationEventsTable() {
  console.log("Ensuring integration_events table exists...");
  
  try {
    // Check if the table exists
    const tableExists = db.$client.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='integration_events'"
    ).all().length > 0;
    
    if (!tableExists) {
      // Create the table if it doesn't exist
      db.$client.prepare(`
        CREATE TABLE integration_events (
          id TEXT PRIMARY KEY,
          integrationId TEXT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
          eventType TEXT NOT NULL,
          enabled INTEGER DEFAULT 1,
          templateData TEXT,
          createdAt INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      console.log("Created integration_events table");
    }
  } catch (error) {
    console.error("Error ensuring integration_events table:", error);
    throw error;
  }
}

// Ensure the integration_event_logs table is created
async function ensureIntegrationEventLogsTable() {
  console.log("Ensuring integration_event_logs table exists...");
  
  try {
    // Check if the table exists
    const tableExists = db.$client.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='integration_event_logs'"
    ).all().length > 0;
    
    if (!tableExists) {
      // Create the table if it doesn't exist
      db.$client.prepare(`
        CREATE TABLE integration_event_logs (
          id TEXT PRIMARY KEY,
          integrationId TEXT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
          eventType TEXT NOT NULL,
          status TEXT NOT NULL,
          createdAt INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      console.log("Created integration_event_logs table");
    }
  } catch (error) {
    console.error("Error ensuring integration_event_logs table:", error);
    throw error;
  }
}

// Ensure the integration_templates table is created
async function ensureIntegrationTemplatesTable() {
  console.log("Ensuring integration_templates table exists...");
  
  try {
    // Check if the table exists
    const tableExists = db.$client.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='integration_templates'"
    ).all().length > 0;
    
    if (!tableExists) {
      // Create the table if it doesn't exist
      db.$client.prepare(`
        CREATE TABLE integration_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL,
          defaultConfig TEXT NOT NULL,
          createdAt INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      console.log("Created integration_templates table");
    }
  } catch (error) {
    console.error("Error ensuring integration_templates table:", error);
    throw error;
  }
}

// Execute all migration steps in sequence
async function runMigrations() {
  await db.run(sql`
    PRAGMA foreign_keys = ON;
  `);

  try {
    console.log("Starting migration process...");
    await ensureColumns();
    await setupExistingData();
    await backfillMileageLogs();
    await ensureMaintenanceActivity();
    await cleanupDuplicateMileageLogs();
    await ensurePasswordResetTable();
    await ensureIntegrationsTable();
    await ensureIntegrationEventsTable();
    await ensureIntegrationEventLogsTable();
    await ensureIntegrationTemplatesTable();
    
    console.log("All migrations completed successfully!");
  } catch (error) {
    console.error("Migration process failed:", error);
    process.exit(1);
  }
}

// Run migrations when this file is executed directly
runMigrations();