import { query } from "@/lib/db";

export async function listProjects({ q, page=1, limit=10, userId }:{ q?:string; page?:number; limit?:number; userId?:number }) {
  const offset = (page-1)*limit;
  const params:any[] = [];
  const conditions = [];
  
  // Filter by user if provided
  if (userId) {
    params.push(userId);
    conditions.push(`owner_id = $${params.length}`);
  }
  
  // Add search condition if provided
  if (q) {
    params.push(`%${q}%`);
    conditions.push(`name ILIKE $${params.length}`);
  }
  
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : "";
  const { rows } = await query(
    `SELECT id,name,description,owner_id,status,start_date,due_date,created_at
     FROM projects ${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`, params);
  return rows;
}

export async function getProjectWithTasks(id:number) {
  const p = await query(
    "SELECT id,name,description,owner_id,status,start_date,due_date,created_at FROM projects WHERE id=$1",[id]
  ).then(r => r.rows[0]);
  if (!p) return null;
  const tasks = await query(
    "SELECT id,project_id,title,description,assignee_id,status,priority,due_date,created_at FROM tasks WHERE project_id=$1 ORDER BY id DESC",[id]
  ).then(r => r.rows);
  return { ...p, tasks };
}

export async function createProject(data:any) {
  const { rows } = await query(
    `INSERT INTO projects(name,description,owner_id,status,start_date,due_date)
     VALUES($1,$2,$3,COALESCE($4,'active'),$5,$6)
     RETURNING id,name,description,owner_id,status,start_date,due_date,created_at`,
    [data.name, data.description ?? null, data.ownerId ?? null, data.status ?? null, data.startDate ?? null, data.dueDate ?? null]
  );
  return rows[0];
}

export async function updateProject(id:number, data:any) {
  const { rows } = await query(
    `UPDATE projects SET
      name=COALESCE($1,name),
      description=COALESCE($2,description),
      owner_id=COALESCE($3,owner_id),
      status=COALESCE($4,status),
      start_date=COALESCE($5,start_date),
      due_date=COALESCE($6,due_date),
      updated_at=NOW()
     WHERE id=$7
     RETURNING id,name,description,owner_id,status,start_date,due_date,created_at`,
    [data.name ?? null, data.description ?? null, data.ownerId ?? null, data.status ?? null, data.startDate ?? null, data.dueDate ?? null, id]
  );
  return rows[0] ?? null;
}

export async function deleteProject(id:number) {
  await query("DELETE FROM projects WHERE id=$1",[id]);
  return true;
}
