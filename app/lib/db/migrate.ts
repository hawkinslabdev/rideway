// app/lib/db/migrate.ts
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./db";
import { users, motorcycles } from "./schema";
import { eq, or, isNull } from "drizzle-orm";
import Database from "better-sqlite3";

// This will run migrations on the database, creating tables if they don't exist
// and adding data
console.log("Running migrations...");

// Run the schema migrations first
migrate(db, { migrationsFolder: "./drizzle" });

// Ensure the motorcycles table has the required columns
async function ensureColumns() {
  console.log("Ensuring required columns exist in motorcycles table...");

  try {
    // Check if the required columns exist using the SQLite client directly
    const columnsQuery = db.$client.prepare("PRAGMA table_info(motorcycles)").all();
    const columnNames = columnsQuery.map((col: any) => col.name);

    // Check and add isOwned column if needed
    if (!columnNames.includes("isOwned")) {
      db.$client.prepare("ALTER TABLE motorcycles ADD COLUMN isOwned INTEGER DEFAULT 0").run();
      console.log("Added 'isOwned' column to motorcycles table");
    }

    // Check and add isDefault column if needed
    if (!columnNames.includes("isDefault")) {
      db.$client.prepare("ALTER TABLE motorcycles ADD COLUMN isDefault INTEGER DEFAULT 0").run();
      console.log("Added 'isDefault' column to motorcycles table");
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
        where: eq(motorcycles.userId, user.id)
      });

      if (userMotorcycles.length === 0) {
        console.log(`No motorcycles found for user ${user.id}`);
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
  } catch (error) {
    console.error("Error setting up existing data:", error);
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