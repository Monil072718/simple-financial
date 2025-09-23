import { NextRequest, NextResponse } from "next/server";
import { deleteTask, getTask, updateTask } from "@/lib/tasks";
import { taskUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const task = await getTask(Number(params.id));
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const json = await req.json().catch(() => ({}));
  const parsed = taskUpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const task = await updateTask(Number(params.id), parsed.data);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await deleteTask(Number(params.id));
  return NextResponse.json({ ok: true });
}
