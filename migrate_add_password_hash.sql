-- Migration to add password_hash column to users table
-- This fixes the 500 error when creating/authenticating users

-- Add password_hash column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Update existing users to have a placeholder password hash
-- Note: These users will need to reset their passwords
UPDATE users 
SET password_hash = '$2a$12$placeholder.hash.for.existing.users' 
WHERE password_hash IS NULL;

-- Make password_hash NOT NULL after updating existing records
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

-- Add index for better performance on email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
