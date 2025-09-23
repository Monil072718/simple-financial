import { NextRequest, NextResponse } from "next/server";
import { createTask, listTasks } from "@/lib/tasks";
import { taskCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const tasks = await listTasks({ projectId: Number(params.id) });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const parsed = taskCreateSchema.safeParse({ ...body, projectId: Number(params.id) });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const task = await createTask(parsed.data);
  return NextResponse.json(task, { status: 201 });
}
