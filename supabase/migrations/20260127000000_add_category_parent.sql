
-- Migration: Add parent_id to categories for hierarchy
ALTER TABLE IF EXISTS categories
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Explicitly allow nulls (root categories)
ALTER TABLE categories ALTER COLUMN parent_id DROP NOT NULL;
