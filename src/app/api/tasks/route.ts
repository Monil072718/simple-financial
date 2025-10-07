import { NextRequest, NextResponse } from "next/server";
import { createTask, listTasks } from "@/lib/tasks";
import { taskCreateSchema } from "@/lib/validations";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const sp = new URL(req.url).searchParams;
  const projectId  = sp.get("projectId")  ? Number(sp.get("projectId"))  : undefined;
  const assigneeId = sp.get("assigneeId") ? Number(sp.get("assigneeId")) : undefined;
  const status     = sp.get("status") ?? undefined;
  const page       = Number(sp.get("page") ?? 1);
  const limit      = Number(sp.get("limit") ?? 10);

  const tasks = await listTasks({ projectId, assigneeId, status, page, limit, userId: user.id });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const json = await req.json().catch(() => ({}));
  const parsed = taskCreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  
  // Verify the project belongs to the user
  const { query } = await import("@/lib/db");
  const project = await query("SELECT owner_id FROM projects WHERE id = $1", [parsed.data.projectId]);
  if (!project.rows.length || project.rows[0].owner_id !== user.id) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 403 });
  }
  
  const task = await createTask(parsed.data);
  return NextResponse.json(task, { status: 201 });
}
