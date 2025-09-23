import { NextRequest, NextResponse } from "next/server";
import { createTask, listTasks } from "@/lib/tasks";
import { taskCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const projectId  = sp.get("projectId")  ? Number(sp.get("projectId"))  : undefined;
  const assigneeId = sp.get("assigneeId") ? Number(sp.get("assigneeId")) : undefined;
  const status     = sp.get("status") ?? undefined;
  const page       = Number(sp.get("page") ?? 1);
  const limit      = Number(sp.get("limit") ?? 10);

  const tasks = await listTasks({ projectId, assigneeId, status, page, limit });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = taskCreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const task = await createTask(parsed.data);
  return NextResponse.json(task, { status: 201 });
}
