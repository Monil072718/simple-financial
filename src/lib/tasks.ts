import { query } from "@/lib/db";

export type TaskRow = {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  assignee_id: number | null;
  status: string;
  priority: string | null;
  due_date: string | null;   // ISO date
  created_at: string;        // ISO timestamp
};

export type ListTasksParams = {
  projectId?: number;
  assigneeId?: number;
  status?: string;
  page?: number;
  limit?: number;
  userId?: number;
};

export type CreateTaskInput = {
  projectId: number;
  title: string;
  description?: string | null;
  assigneeId?: number | null;
  status?: string | null;     // defaults to 'todo' in SQL
  priority?: string | null;   // defaults to 'medium' in SQL
  dueDate?: string | null;    // 'YYYY-MM-DD'
  _isFromTodo?: boolean;      // internal flag used by caller
};

export type UpdateTaskInput = {
  title?: string | null;
  description?: string | null;
  assigneeId?: number | null;
  status?: string | null;
  priority?: string | null;
  dueDate?: string | null;
};

/**
 * List tasks with optional filters + pagination.
 */
export async function listTasks({
  projectId,
  assigneeId,
  status,
  page = 1,
  limit = 10,
  userId,
}: ListTasksParams): Promise<TaskRow[]> {
  const offset = (page - 1) * limit;

  const whereParts: string[] = [];
  const params: unknown[] = [];

  if (typeof userId === "number") {
    params.push(userId);
    whereParts.push(
      `project_id IN (SELECT id FROM projects WHERE owner_id = $${params.length})`
    );
  }

  if (typeof projectId === "number") {
    params.push(projectId);
    whereParts.push(`project_id = $${params.length}`);
  }

  if (typeof assigneeId === "number") {
    params.push(assigneeId);
    whereParts.push(`assignee_id = $${params.length}`);
  }

  if (typeof status === "string" && status.trim() !== "") {
    params.push(status);
    whereParts.push(`status = $${params.length}`);
  }

  const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  // Parameterize limit/offset as well
  params.push(limit);
  const pLimit = params.length;
  params.push(offset);
  const pOffset = params.length;

  const { rows } = await query<TaskRow>(
    `SELECT id, project_id, title, description, assignee_id, status, priority, due_date, created_at
       FROM tasks
       ${where}
       ORDER BY id DESC
       LIMIT $${pLimit} OFFSET $${pOffset}`,
    params
  );

  return rows;
}

/**
 * Create a task (with duplicate title check per project).
 */
export async function createTask(data: CreateTaskInput): Promise<TaskRow> {
  // Check duplicate titles in the same project unless explicitly skipped
  if (!data._isFromTodo) {
    const { rows: existing } = await query<{ id: number }>(
      `SELECT id
         FROM tasks
        WHERE project_id = $1 AND LOWER(title) = LOWER($2)
        LIMIT 1`,
      [data.projectId, data.title]
    );
    if (existing.length > 0) {
      throw new Error(
        `A task with the title "${data.title}" already exists in this project`
      );
    }
  }

  // Insert; assignee resolved via subselect to avoid FK errors
  const { rows } = await query<TaskRow>(
    `INSERT INTO tasks (
        project_id, title, description, assignee_id, status, priority, due_date
     )
     VALUES (
        $1, $2, $3,
        CASE
          WHEN $4::int IS NULL THEN NULL::int
          ELSE (SELECT id FROM profiles WHERE id = $4::int)
        END,
        COALESCE($5,'todo'),
        COALESCE($6,'medium'),
        $7
     )
     RETURNING id, project_id, title, description, assignee_id, status, priority, due_date, created_at`,
    [
      data.projectId,
      data.title,
      data.description ?? null,
      data.assigneeId ?? null,
      data.status ?? null,
      data.priority ?? null,
      data.dueDate ?? null,
    ]
  );

  return rows[0];
}

/**
 * Get a single task by id.
 */
export async function getTask(id: number): Promise<TaskRow | null> {
  const { rows } = await query<TaskRow>(
    `SELECT id, project_id, title, description, assignee_id, status, priority, due_date, created_at
       FROM tasks
      WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

/**
 * Update a task (partial).
 */
export async function updateTask(
  id: number,
  data: UpdateTaskInput
): Promise<TaskRow | null> {
  const assigneeProvided = Object.prototype.hasOwnProperty.call(
    data,
    "assigneeId"
  );

  // Normalize: never send undefined to PG
  let assigneeValue: number | null = null;
  if (assigneeProvided) {
    const n = Number(data.assigneeId);
    assigneeValue = Number.isFinite(n) ? n : null;
  }

  const sql = `
    UPDATE tasks t SET
      title        = COALESCE($1, t.title),
      description  = COALESCE($2, t.description),
      assignee_id  = CASE
                       WHEN $8::boolean = false THEN t.assignee_id
                       WHEN $3::int IS NULL       THEN NULL::int
                       WHEN EXISTS (SELECT 1 FROM profiles u WHERE u.id = $3::int)
                                              THEN $3::int
                       ELSE t.assignee_id
                     END,
      status       = COALESCE($4, t.status),
      priority     = COALESCE($5, t.priority),
      due_date     = COALESCE($6, t.due_date),
      updated_at   = NOW()
    WHERE t.id = $7
    RETURNING id, project_id, title, description, assignee_id, status, priority, due_date, created_at
  `;

  const params: ReadonlyArray<
    string | number | boolean | null
  > = [
    data.title ?? null,          // $1
    data.description ?? null,    // $2
    assigneeValue,               // $3
    data.status ?? null,         // $4
    data.priority ?? null,       // $5
    data.dueDate ?? null,        // $6
    id,                          // $7
    assigneeProvided,            // $8 (boolean)
  ];

  const { rows } = await query<TaskRow>(sql, params);
  return rows[0] ?? null;
}

/**
 * Delete a task.
 */
export async function deleteTask(id: number): Promise<true> {
  await query("DELETE FROM tasks WHERE id = $1", [id]);
  return true;
}
