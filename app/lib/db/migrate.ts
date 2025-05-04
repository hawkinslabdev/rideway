import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./db";

// This will run migrations on the database, creating tables if they don't exist
// and adding data
console.log("Running migrations...");

migrate(db, { migrationsFolder: "./drizzle" });

console.log("Migrations completed!");