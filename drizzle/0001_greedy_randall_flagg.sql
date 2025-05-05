PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_maintenance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`motorcycle_id` text NOT NULL,
	`task_id` text,
	`date` integer NOT NULL,
	`mileage` integer,
	`cost` real,
	`notes` text,
	`receipt_url` text,
	`is_scheduled` integer DEFAULT true,
	`resets_interval` integer DEFAULT true,
	`next_due_odometer` integer,
	`next_due_date` integer,
	`created_at` integer DEFAULT '"2025-05-05T12:07:58.173Z"' NOT NULL,
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `maintenance_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_maintenance_records`("id", "motorcycle_id", "task_id", "date", "mileage", "cost", "notes", "receipt_url", "is_scheduled", "resets_interval", "next_due_odometer", "next_due_date", "created_at") SELECT "id", "motorcycle_id", "task_id", "date", "mileage", "cost", "notes", "receipt_url", "is_scheduled", "resets_interval", "next_due_odometer", "next_due_date", "created_at" FROM `maintenance_records`;--> statement-breakpoint
DROP TABLE `maintenance_records`;--> statement-breakpoint
ALTER TABLE `__new_maintenance_records` RENAME TO `maintenance_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_maintenance_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`motorcycle_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`interval_miles` integer,
	`interval_days` integer,
	`base_odometer` integer,
	`next_due_odometer` integer,
	`base_date` integer,
	`next_due_date` integer,
	`priority` text DEFAULT 'medium',
	`is_recurring` integer DEFAULT true,
	`created_at` integer DEFAULT '"2025-05-05T12:07:58.173Z"' NOT NULL,
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_maintenance_tasks`("id", "motorcycle_id", "name", "description", "interval_miles", "interval_days", "base_odometer", "next_due_odometer", "base_date", "next_due_date", "priority", "is_recurring", "created_at") SELECT "id", "motorcycle_id", "name", "description", "interval_miles", "interval_days", "base_odometer", "next_due_odometer", "base_date", "next_due_date", "priority", "is_recurring", "created_at" FROM `maintenance_tasks`;--> statement-breakpoint
DROP TABLE `maintenance_tasks`;--> statement-breakpoint
ALTER TABLE `__new_maintenance_tasks` RENAME TO `maintenance_tasks`;--> statement-breakpoint
CREATE TABLE `__new_motorcycles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`year` integer NOT NULL,
	`purchase_date` integer,
	`current_mileage` integer,
	`vin` text,
	`color` text,
	`image_url` text,
	`notes` text,
	`created_at` integer DEFAULT '"2025-05-05T12:07:58.173Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2025-05-05T12:07:58.173Z"' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_motorcycles`("id", "user_id", "name", "make", "model", "year", "purchase_date", "current_mileage", "vin", "color", "image_url", "notes", "created_at", "updated_at") SELECT "id", "user_id", "name", "make", "model", "year", "purchase_date", "current_mileage", "vin", "color", "image_url", "notes", "created_at", "updated_at" FROM `motorcycles`;--> statement-breakpoint
DROP TABLE `motorcycles`;--> statement-breakpoint
ALTER TABLE `__new_motorcycles` RENAME TO `motorcycles`;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`created_at` integer DEFAULT '"2025-05-05T12:07:58.172Z"' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "name", "email", "password", "created_at") SELECT "id", "name", "email", "password", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);