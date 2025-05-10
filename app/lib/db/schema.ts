// app/lib/db/schema.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
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
  isOwned: integer("isOwned", { mode: "boolean" }).default(true),
  isDefault: integer("isDefault", { mode: "boolean" }).default(false),
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
  intervalBase: text("interval_base").default("current").notNull(), // "current" or "zero"
  baseOdometer: integer("base_odometer"),
  nextDueOdometer: integer("next_due_odometer"),
  baseDate: integer("base_date", { mode: "timestamp" }),
  nextDueDate: integer("next_due_date", { mode: "timestamp" }),
  priority: text("priority").default("medium"),
  isRecurring: integer("is_recurring", { mode: "boolean" }).default(true),
  archived: integer("archived", { mode: "boolean" }).default(false),
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
  isScheduled: integer("is_scheduled", { mode: "boolean" }).default(true),
  resetsInterval: integer("resets_interval", { mode: "boolean" }).default(true),
  nextDueOdometer: integer("next_due_odometer"),
  nextDueDate: integer("next_due_date", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
});

export const mileageLogs = sqliteTable("mileage_logs", {
  id: text("id").primaryKey(),
  motorcycleId: text("motorcycle_id").notNull().references(() => motorcycles.id, { onDelete: "cascade" }),
  previousMileage: integer("previous_mileage"),
  newMileage: integer("new_mileage").notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  used: integer("used", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
});

// Integrations table
export const integrations = sqliteTable("integrations", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // "webhook", "homeassistant", "ntfy", etc.
  active: integer("active", { mode: "boolean" }).default(true),
  config: text("config").notNull(), // Encrypted JSON string of configuration
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

// Integration events table
export const integrationEvents = sqliteTable("integration_events", {
  id: text("id").primaryKey(),
  integrationId: text("integrationId").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  eventType: text("eventType").notNull(), // "maintenance_due", "mileage_updated", etc.
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  templateData: text("templateData"), // Optional JSON for event-specific template data
  payloadTemplate: text("payloadTemplate"), // Optional template for custom payload formatting
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

// Integration templates (for quick setup)
export const integrationTemplates = sqliteTable("integration_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // "webhook", "homeassistant", "ntfy", etc.
  defaultConfig: text("defaultConfig").notNull(), // JSON template for configuration
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

// Integration event log 
export const integrationEventLogs = sqliteTable("integration_event_logs", {
  id: text("id").primaryKey(),
  integrationId: text("integrationId").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  eventType: text("eventType").notNull(),
  status: text("status").notNull(), // "success", "failed"
  statusMessage: text("statusMessage"),
  requestData: text("requestData"), // What was sent (sanitized)
  responseData: text("responseData"), // What was received
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
});

// Add this to the schema
export const serviceRecords = sqliteTable("service_records", {
  id: text("id").primaryKey().notNull(),
  motorcycleId: text("motorcycle_id").notNull().references(() => motorcycles.id),
  date: integer("date", { mode: "timestamp" }).notNull(),
  mileage: integer("mileage"),
  task: text("task").notNull(),
  cost: real("cost"),
  location: text("location"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
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
  records: many(maintenanceRecords),
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

export const mileageLogsRelations = relations(mileageLogs, ({ one }) => ({
  motorcycle: one(motorcycles, {
    fields: [mileageLogs.motorcycleId],
    references: [motorcycles.id],
  }),
}));

export const integrationsRelations = relations(integrations, ({ many }) => ({
  events: many(integrationEvents),
  logs: many(integrationEventLogs),
}));

export const integrationEventsRelations = relations(integrationEvents, ({ one }) => ({
  integration: one(integrations, {
    fields: [integrationEvents.integrationId],
    references: [integrations.id],
  }),
}));

export const integrationEventLogsRelations = relations(integrationEventLogs, ({ one }) => ({
  integration: one(integrations, {
    fields: [integrationEventLogs.integrationId],
    references: [integrations.id],
  }),
}));

export const motorcycleRelations = relations(motorcycles, ({ many }) => ({
  serviceRecords: many(serviceRecords),
}));

export const serviceRecordRelations = relations(serviceRecords, ({ one }) => ({
  motorcycle: one(motorcycles, {
    fields: [serviceRecords.motorcycleId],
    references: [motorcycles.id],
  }),
}));

export const maintenanceRecordRelations = relations(maintenanceRecords, ({ one }) => ({
  motorcycle: one(motorcycles, {
    fields: [maintenanceRecords.motorcycleId],
    references: [motorcycles.id],
  }),
  task: one(maintenanceTasks, {
    fields: [maintenanceRecords.taskId],
    references: [maintenanceTasks.id],
  }),
}));