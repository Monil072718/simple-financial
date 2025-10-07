-- Migration to allow 'review' status in tasks table
-- This updates the database to accept 'review' as a valid status value

-- First, let's check if we need to update any existing constraints
-- PostgreSQL doesn't have CHECK constraints on the status column by default,
-- but we should ensure the column can accept 'review' status

-- Update any existing tasks that might have invalid status values
UPDATE tasks SET status = 'todo' WHERE status NOT IN ('todo', 'in_progress', 'review', 'done');

-- The status column is already TEXT, so it should accept 'review' without schema changes
-- This migration is mainly for documentation and to ensure data consistency

-- Verify the migration
SELECT DISTINCT status FROM tasks;
