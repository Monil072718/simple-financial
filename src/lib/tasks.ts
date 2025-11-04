import { query } from "@/lib/db";
import { getProfileLiteById } from '@/lib/profiles';
import { sendTaskAssignedMsg } from '@/lib/telegram';

export async function listTasks({
  projectId,
  assigneeId,
  status,
  page = 1,
  limit = 10,
  userId,
}: {
  projectId?: number;
  assigneeId?: number;
  status?: string;
  page?: number;
  limit?: number;
  userId?: number;
}) {
  const offset = (page - 1) * limit;
  const wh: string[] = [];
  const params: any[] = [];
  
  // Filter by user's projects
  if (userId) {
    params.push(userId);
    wh.push(`project_id IN (SELECT id FROM projects WHERE owner_id = $${params.length})`);
  }
  
  if (projectId) {
    params.push(projectId);
    wh.push(`project_id=$${params.length}`);
  }
  if (assigneeId) {
    params.push(assigneeId);
    wh.push(`assignee_id=$${params.length}`);
  }
  if (status) {
    params.push(status);
    wh.push(`status=$${params.length}`);
  }
  const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT id,project_id,title,description,assignee_id,status,priority,due_date,created_at
     FROM tasks ${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return rows;
}

export async function createTask(data: any) {
  // Check for duplicate task titles in the same project (only if not moving from todo)
  if (!data._isFromTodo) {
    const { rows: existingTasks } = await query(
      "SELECT id FROM tasks WHERE project_id = $1 AND LOWER(title) = LOWER($2)",
      [data.projectId, data.title]
    );
    
    if (existingTasks.length > 0) {
      throw new Error(`A task with the title "${data.title}" already exists in this project`);
    }
  }

  // NOTE: assignee_id is resolved via subselect to avoid FK errors.
  const { rows } = await query(
    `INSERT INTO tasks(
        project_id, title, description, assignee_id, status, priority, due_date
     )
     VALUES(
        $1, $2, $3,
        CASE
          WHEN $4::int IS NULL THEN NULL::int
          ELSE (SELECT id FROM profiles WHERE id = $4::int)
        END,
        COALESCE($5,'todo'),
        COALESCE($6,'medium'),
        $7
     )
     RETURNING id,project_id,title,description,assignee_id,status,priority,due_date,created_at`,
    [
      data.projectId,
      data.title,
      data.description ?? null,
      data.assigneeId ?? null, // may be unknown; subselect makes it NULL safely
      data.status ?? null,
      data.priority ?? null,
      data.dueDate ?? null,
    ]
  );
  return rows[0];
}

export async function getTask(id: number) {
  const { rows } = await query(
    "SELECT id,project_id,title,description,assignee_id,status,priority,due_date,created_at FROM tasks WHERE id=$1",
    [id]
  );
  return rows[0] ?? null;
}

export async function updateTask(id: number, data: any) {
  const assigneeProvided =
    Object.prototype.hasOwnProperty.call(data, "assigneeId");

  // normalize: never send undefined to PG
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

  const params = [
    data.title ?? null,
    data.description ?? null,
    assigneeValue,             // $3 (will be number or null)
    data.status ?? null,
    data.priority ?? null,
    data.dueDate ?? null,
    id,                        // $7
    assigneeProvided,          // $8 (boolean)
  ];

  // Temporarily log to double-check the types:
  // console.log("params:", params.map(v => [v, typeof v]));

  const { rows } = await query(sql, params);
  return rows[0] ?? null;
}



export async function deleteTask(id: number) {
  await query("DELETE FROM tasks WHERE id=$1", [id]);
  return true;
}
async function afterAssignNotify(assigneeId: number, task: any, project: any) {
  const profileRaw = await getProfileLiteById(assigneeId);
  if (!profileRaw) return;

  // Convert null name to undefined to match ProfileLite type
  const profile = {
    ...profileRaw,
    name: profileRaw.name ?? undefined,
  };

  await sendTaskAssignedMsg(
    profile,
    {
      id: task.id,
      title: task.title,
      description: task.description,
      startDate: task.start_date,
      endDate: task.end_date,
      projectName: project?.name,
    },
    'patelmonil1807@gmail.com',
    `${process.env.PUBLIC_URL}/ai?taskId=${task.id}` // your AI page
  );
}