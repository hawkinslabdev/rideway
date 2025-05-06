-- Add isDefault and isOwned columns to motorcycles table
ALTER TABLE motorcycles
ADD COLUMN is_default INTEGER DEFAULT 0;

ALTER TABLE motorcycles
ADD COLUMN is_owned INTEGER DEFAULT 1;