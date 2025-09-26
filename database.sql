-- 0) Case-insensitive email support
CREATE EXTENSION IF NOT EXISTS citext;

-- 1) USERS (fresh create path)
CREATE TABLE IF NOT EXISTS public.users (
  id            SERIAL PRIMARY KEY,
  name          TEXT   NOT NULL,
  email         CITEXT UNIQUE NOT NULL,
  password_hash TEXT   NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 1b) USERS (migration path for existing DBs)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();

-- 1c) Convert legacy email TEXT -> CITEXT (only if needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users'
      AND column_name='email' AND udt_name='text'
  ) THEN
    ALTER TABLE public.users
      ALTER COLUMN email TYPE CITEXT USING email::citext;
  END IF;
END$$;

-- 1d) Backfill missing hashes with a valid bcrypt (hash of 'Temp12345!')
UPDATE public.users
SET password_hash = COALESCE(
  password_hash,
  '$2b$12$jkkoSXV38nOz9n7j5UdEWuyo3ZCAnEXxeSzgohhunmTsITMsEKjNu'
)
WHERE password_hash IS NULL;

-- 1e) Enforce NOT NULL if it was nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users'
      AND column_name='password_hash' AND is_nullable='YES'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN password_hash SET NOT NULL;
  END IF;
END$$;

-- 2) PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  owner_id     INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  start_date   DATE,
  due_date     DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3) TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id           SERIAL PRIMARY KEY,
  project_id   INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  assignee_id  INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'todo',
  priority     TEXT NOT NULL DEFAULT 'medium',
  due_date     DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4) CHECK constraints (add only if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tasks_status') THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT chk_tasks_status CHECK (status IN ('todo','in_progress','done'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tasks_priority') THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT chk_tasks_priority CHECK (priority IN ('low','medium','high'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_projects_status') THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT chk_projects_status CHECK (status IN ('active','on_hold','archived'));
  END IF;
END$$;

-- 5) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner  ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project   ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee  ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status    ON public.tasks(status);

-- 6) Trigger function (CREATE THIS BEFORE TRIGGERS)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- 7) Recreate triggers in correct order (drop if they exist, then create)
DROP TRIGGER IF EXISTS trg_users_set_updated_at    ON public.users;
DROP TRIGGER IF EXISTS trg_projects_set_updated_at ON public.projects;
DROP TRIGGER IF EXISTS trg_tasks_set_updated_at    ON public.tasks;

CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_projects_set_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tasks_set_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
