-- Add new columns to maintenance_tasks table
ALTER TABLE maintenance_tasks ADD COLUMN base_odometer INTEGER;
ALTER TABLE maintenance_tasks ADD COLUMN next_due_odometer INTEGER;
ALTER TABLE maintenance_tasks ADD COLUMN base_date INTEGER;
ALTER TABLE maintenance_tasks ADD COLUMN next_due_date INTEGER;

-- Add new columns to maintenance_records table
ALTER TABLE maintenance_records ADD COLUMN is_scheduled INTEGER DEFAULT 1;
ALTER TABLE maintenance_records ADD COLUMN resets_interval INTEGER DEFAULT 1;
ALTER TABLE maintenance_records ADD COLUMN next_due_odometer INTEGER;
ALTER TABLE maintenance_records ADD COLUMN next_due_date INTEGER;