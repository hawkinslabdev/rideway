// app/lib/db/db.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import * as fs from "fs";
import * as path from "path";

// Ensure the database directory exists
const dbPath = path.join(process.cwd(), "moto_maintain.db");
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create a database connection with error handling
let sqlite;
try {
  sqlite = new Database(dbPath);
  console.log("Database connected successfully");
} catch (error) {
  console.error("Failed to connect to database:", error);
  // Create a new database file if it doesn't exist
  sqlite = new Database(dbPath);
}

export const db = drizzle(sqlite, { schema });

// Initialize the database schema
try {
  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS motorcycles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      purchase_date INTEGER,
      current_mileage INTEGER,
      vin TEXT,
      color TEXT,
      image_url TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS maintenance_tasks (
      id TEXT PRIMARY KEY,
      motorcycle_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      interval_miles INTEGER,
      interval_days INTEGER,
      priority TEXT DEFAULT 'medium',
      is_recurring INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (motorcycle_id) REFERENCES motorcycles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS maintenance_records (
      id TEXT PRIMARY KEY,
      motorcycle_id TEXT NOT NULL,
      task_id TEXT,
      date INTEGER NOT NULL,
      mileage INTEGER,
      cost REAL,
      notes TEXT,
      receipt_url TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (motorcycle_id) REFERENCES motorcycles(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES maintenance_tasks(id)
    );
  `);
  console.log("Database schema initialized");
} catch (error) {
  console.error("Failed to initialize database schema:", error);
}