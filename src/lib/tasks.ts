import { query } from "@/lib/db";

export async function listTasks({ projectId, assigneeId, status, page=1, limit=10 }:
  { projectId?:number; assigneeId?:number; status?:string; page?:number; limit?:number }) {
  const offset = (page-1)*limit;
  const wh:string[] = []; const params:any[] = [];
  if (projectId) { params.push(projectId); wh.push(`project_id=$${params.length}`); }
  if (assigneeId){ params.push(assigneeId); wh.push(`assignee_id=$${params.length}`); }
  if (status)    { params.push(status);     wh.push(`status=$${params.length}`); }
  const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT id,project_id,title,description,assignee_id,status,priority,due_date,created_at
     FROM tasks ${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`, params);
  return rows;
}

export async function createTask(data:any) {
  const { rows } = await query(
    `INSERT INTO tasks(project_id,title,description,assignee_id,status,priority,due_date)
     VALUES($1,$2,$3,$4,COALESCE($5,'todo'),COALESCE($6,'medium'),$7)
     RETURNING id,project_id,title,description,assignee_id,status,priority,due_date,created_at`,
    [data.projectId, data.title, data.description ?? null, data.assigneeId ?? null, data.status ?? null, data.priority ?? null, data.dueDate ?? null]
  );
  return rows[0];
}

export async function getTask(id:number) {
  const { rows } = await query("SELECT id,project_id,title,description,assignee_id,status,priority,due_date,created_at FROM tasks WHERE id=$1",[id]);
  return rows[0] ?? null;
}

export async function updateTask(id:number, data:any) {
  const { rows } = await query(
    `UPDATE tasks SET
      title=COALESCE($1,title),
      description=COALESCE($2,description),
      assignee_id=COALESCE($3,assignee_id),
      status=COALESCE($4,status),
      priority=COALESCE($5,priority),
      due_date=COALESCE($6,due_date),
      updated_at=NOW()
     WHERE id=$7
     RETURNING id,project_id,title,description,assignee_id,status,priority,due_date,created_at`,
    [data.title ?? null, data.description ?? null, data.assigneeId ?? null, data.status ?? null, data.priority ?? null, data.dueDate ?? null, id]
  );
  return rows[0] ?? null;
}

export async function deleteTask(id:number) {
  await query("DELETE FROM tasks WHERE id=$1",[id]);
  return true;
}
