import { query } from "@/lib/db";

export type ProjectRow = {
  id: number;
  name: string;
  description: string | null;
  owner_id: number | null;
  status: string;
  start_date: string | null; // ISO date
  due_date: string | null;   // ISO date
  created_at: string;        // ISO timestamp
};

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

export type ListProjectsParams = {
  q?: string;
  page?: number;
  limit?: number;
  userId?: number;
};

export type CreateProjectInput = {
  name: string;
  description?: string | null;
  ownerId?: number | null;
  status?: string | null;        // defaults to 'active' in SQL
  startDate?: string | null;     // 'YYYY-MM-DD'
  dueDate?: string | null;       // 'YYYY-MM-DD'
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

/**
 * List projects with optional search + owner filter + pagination.
 */
export async function listProjects({
  q,
  page = 1,
  limit = 10,
  userId,
}: ListProjectsParams): Promise<ProjectRow[]> {
  const offset = (page - 1) * limit;

  const params: unknown[] = [];
  const conditions: string[] = [];

  if (typeof userId === "number") {
    params.push(userId);
    conditions.push(`owner_id = $${params.length}`);
  }

  if (q && q.trim() !== "") {
    params.push(`%${q}%`);
    conditions.push(`name ILIKE $${params.length}`);
  }

  // push limit/offset as parameters to avoid interpolation
  params.push(limit);
  const pLimit = params.length;
  params.push(offset);
  const pOffset = params.length;

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await query<ProjectRow>(
    `SELECT id, name, description, owner_id, status, start_date, due_date, created_at
       FROM projects
       ${where}
       ORDER BY id DESC
       LIMIT $${pLimit} OFFSET $${pOffset}`,
    params
  );

  return rows;
}

/**
 * Get one project with its tasks.
 */
export async function getProjectWithTasks(
  id: number
): Promise<(ProjectRow & { tasks: TaskRow[] }) | null> {
  const pRes = await query<ProjectRow>(
    `SELECT id, name, description, owner_id, status, start_date, due_date, created_at
       FROM projects
      WHERE id = $1`,
    [id]
  );
  const project = pRes.rows[0];
  if (!project) return null;

  const tRes = await query<TaskRow>(
    `SELECT id, project_id, title, description, assignee_id, status, priority, due_date, created_at
       FROM tasks
      WHERE project_id = $1
      ORDER BY id DESC`,
    [id]
  );

  return { ...project, tasks: tRes.rows };
}

/**
 * Create a project.
 */
export async function createProject(
  data: CreateProjectInput
): Promise<ProjectRow> {
  const { rows } = await query<ProjectRow>(
    `INSERT INTO projects (name, description, owner_id, status, start_date, due_date)
     VALUES ($1, $2, $3, COALESCE($4, 'active'), $5, $6)
     RETURNING id, name, description, owner_id, status, start_date, due_date, created_at`,
    [
      data.name,
      data.description ?? null,
      data.ownerId ?? null,
      data.status ?? null,
      data.startDate ?? null,
      data.dueDate ?? null,
    ]
  );
  return rows[0];
}

/**
 * Update a project (partial).
 */
export async function updateProject(
  id: number,
  data: UpdateProjectInput
): Promise<ProjectRow | null> {
  const { rows } = await query<ProjectRow>(
    `UPDATE projects SET
        name        = COALESCE($1, name),
        description = COALESCE($2, description),
        owner_id    = COALESCE($3, owner_id),
        status      = COALESCE($4, status),
        start_date  = COALESCE($5, start_date),
        due_date    = COALESCE($6, due_date),
        updated_at  = NOW()
      WHERE id = $7
      RETURNING id, name, description, owner_id, status, start_date, due_date, created_at`,
    [
      data.name ?? null,
      data.description ?? null,
      data.ownerId ?? null,
      data.status ?? null,
      data.startDate ?? null,
      data.dueDate ?? null,
      id,
    ]
  );
  return rows[0] ?? null;
}

/**
 * Delete a project.
 */
export async function deleteProject(id: number): Promise<true> {
  await query("DELETE FROM projects WHERE id = $1", [id]);
  return true;
}
