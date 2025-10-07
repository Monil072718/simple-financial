import { query } from "@/lib/db";

export async function ensureCommSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS comm_schedules (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      active BOOLEAN NOT NULL DEFAULT false,
      frequency TEXT NOT NULL DEFAULT 'daily',
      days TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      prompt TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    -- Ensure task_id is unique so we can upsert per-task schedule
    CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_schedules_task ON comm_schedules(task_id);
    CREATE INDEX IF NOT EXISTS idx_comm_schedules_user ON comm_schedules(user_id);
    CREATE INDEX IF NOT EXISTS idx_comm_schedules_task ON comm_schedules(task_id);

    CREATE TABLE IF NOT EXISTS comm_logs (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      recipient TEXT,
      summary TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_comm_logs_user ON comm_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_comm_logs_task ON comm_logs(task_id);
  `);
}

export async function upsertSchedule(input: {
  userId: number;
  taskId: number;
  active?: boolean;
  frequency?: string;
  days?: string[];
  prompt?: string;
}) {
  const { rows } = await query(
    `INSERT INTO comm_schedules (user_id, task_id, active, frequency, days, prompt)
     VALUES ($1,$2,COALESCE($3,false),COALESCE($4,'daily'),COALESCE($5,ARRAY[]::TEXT[]),$6)
     ON CONFLICT (task_id) DO UPDATE SET
       active=EXCLUDED.active,
       frequency=EXCLUDED.frequency,
       days=EXCLUDED.days,
       prompt=EXCLUDED.prompt,
       updated_at=NOW()
     RETURNING id, user_id, task_id, active, frequency, days, prompt, created_at, updated_at`,
    [input.userId, input.taskId, input.active ?? false, input.frequency ?? 'daily', (input.days ?? []) as any[], input.prompt ?? null]
  );
  return rows[0];
}

export async function listSchedules(opts: { userId: number; projectId?: number }) {
  const params: any[] = [opts.userId];
  let where = `WHERE cs.user_id = $1`;
  if (opts.projectId) {
    params.push(opts.projectId);
    where += ` AND t.project_id = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT cs.id, cs.task_id, cs.active, cs.frequency, cs.days, cs.prompt,
            t.title, t.assignee_id
       FROM comm_schedules cs
       JOIN tasks t ON t.id = cs.task_id
      ${where}
      ORDER BY cs.updated_at DESC`,
    params
  );
  return rows;
}

export async function listLogs(opts: { userId: number; projectId?: number; limit?: number }) {
  const params: any[] = [opts.userId];
  let where = `WHERE cl.user_id = $1`;
  if (opts.projectId) {
    params.push(opts.projectId);
    where += ` AND t.project_id = $${params.length}`;
  }
  const limit = Math.max(1, Math.min(200, opts.limit ?? 50));
  const { rows } = await query(
    `SELECT cl.id, cl.task_id, cl.recipient, cl.summary, cl.timestamp
       FROM comm_logs cl
       JOIN tasks t ON t.id = cl.task_id
      ${where}
      ORDER BY cl.timestamp DESC
      LIMIT ${limit}`,
    params
  );
  return rows;
}


