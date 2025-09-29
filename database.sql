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

-- Developer profiles (one per person; may or may not map to an auth user)
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NULL,
  full_name TEXT NOT NULL,
  title TEXT NULL,
  description TEXT NULL,
  email TEXT NULL,
  phone TEXT NULL,
  linkedin_url TEXT NULL,
  github_url TEXT NULL,
  languages TEXT[] DEFAULT '{}',
  admin_feedback TEXT NULL,
  resume_url TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_profiles_fullname ON profiles (full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);

-- To-Do Lists (idempotent creates)
CREATE TABLE IF NOT EXISTS todo_users (
  id TEXT PRIMARY KEY,                -- matches your auth user id / email / uuid
  email TEXT,
  name TEXT
);

CREATE TABLE IF NOT EXISTS todo_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ownerId TEXT NOT NULL,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (ownerId) REFERENCES todo_users(id)
);

CREATE TABLE IF NOT EXISTS todo_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listId INTEGER NOT NULL,
  ownerId TEXT NOT NULL,              -- denormalized for quick filtering
  content TEXT NOT NULL,
  description TEXT,
  link TEXT,
  considerations TEXT,
  priority TEXT CHECK(priority IN ('Low','Medium','High')) DEFAULT 'Medium',
  dueDate TEXT,                       -- ISO date string
  assigneeId TEXT,                    -- optional user id
  tags TEXT DEFAULT '[]',             -- JSON array of strings
  status TEXT CHECK(status IN ('open','done','archived')) DEFAULT 'open',
  position INTEGER DEFAULT 0,         -- for manual ordering
  projectId INTEGER,                  -- if "moved to project" (optional)
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (listId) REFERENCES todo_lists(id)
);
