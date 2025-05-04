import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Users table
export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password"), // Add this line
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
  });
// Motorcycles table
export const motorcycles = sqliteTable("motorcycles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  purchaseDate: integer("purchase_date", { mode: "timestamp" }),
  currentMileage: integer("current_mileage"),
  vin: text("vin"),
  color: text("color"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(new Date()),
});

// Maintenance tasks table
export const maintenanceTasks = sqliteTable("maintenance_tasks", {
  id: text("id").primaryKey(),
  motorcycleId: text("motorcycle_id").notNull().references(() => motorcycles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  intervalMiles: integer("interval_miles"),
  intervalDays: integer("interval_days"),
  priority: text("priority").default("medium"), // low, medium, high
  isRecurring: integer("is_recurring", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
});

// Maintenance records table
export const maintenanceRecords = sqliteTable("maintenance_records", {
  id: text("id").primaryKey(),
  motorcycleId: text("motorcycle_id").notNull().references(() => motorcycles.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => maintenanceTasks.id),
  date: integer("date", { mode: "timestamp" }).notNull(),
  mileage: integer("mileage"),
  cost: real("cost"),
  notes: text("notes"),
  receiptUrl: text("receipt_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
});

// Define relationships
export const motorcyclesRelations = relations(motorcycles, ({ one, many }) => ({
  user: one(users, {
    fields: [motorcycles.userId],
    references: [users.id],
  }),
  maintenanceTasks: many(maintenanceTasks),
  maintenanceRecords: many(maintenanceRecords),
}));

export const maintenanceTasksRelations = relations(maintenanceTasks, ({ one, many }) => ({
  motorcycle: one(motorcycles, {
    fields: [maintenanceTasks.motorcycleId],
    references: [motorcycles.id],
  }),
  records: many(maintenanceRecords, {
    fields: [maintenanceTasks.id],
    references: [maintenanceRecords.taskId],
  }),
}));

export const maintenanceRecordsRelations = relations(maintenanceRecords, ({ one }) => ({
  motorcycle: one(motorcycles, {
    fields: [maintenanceRecords.motorcycleId],
    references: [motorcycles.id],
  }),
  task: one(maintenanceTasks, {
    fields: [maintenanceRecords.taskId],
    references: [maintenanceTasks.id],
  }),
}));