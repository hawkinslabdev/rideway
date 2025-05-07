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
  throw error; // Throw the error instead of reinitializing
}

export const db = drizzle(sqlite, { schema });