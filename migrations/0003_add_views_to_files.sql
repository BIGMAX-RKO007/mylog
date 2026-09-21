-- Add views column to files table
ALTER TABLE files ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_files_views ON files(views);
