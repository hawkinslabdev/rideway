// app/lib/db/db.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import * as fs from "fs";
import * as path from "path";

// Get database path from environment variable or use default
const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), "moto_maintain.db");
const dbDir = path.dirname(dbPath);

// Ensure the database directory exists
if (!fs.existsSync(dbDir)) {
  console.log(`Creating database directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create a database connection with error handling
let sqlite;
try {
  console.log(`Connecting to database at: ${dbPath}`);
  sqlite = new Database(dbPath);
  console.log("Database connected successfully");
} catch (error) {
  console.error("Failed to connect to database:", error);
  throw error; // Throw the error instead of reinitializing
}

// Set pragma for foreign keys
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });