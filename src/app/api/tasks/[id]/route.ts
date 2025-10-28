import { NextRequest, NextResponse } from "next/server";
import { deleteTask, getTask, updateTask } from "@/lib/tasks";
import { taskUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";

// GET /api/tasks/:id
export async function GET(
  _: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const task = await getTask(Number(id));
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

// PATCH /api/tasks/:id
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const raw = await req.json().catch(() => ({} as Record<string, unknown>));

  // ✅ Map legacy/external statuses to ones your DB accepts
  const coerceStatus = (s: unknown) => {
    if (s == null) return s;
    const v = String(s).toLowerCase();
    if (v === "pending" || v === "assigned") return "todo";
    return v;
  };
  if ("status" in raw) (raw as any).status = coerceStatus((raw as any).status);

  const parsed = taskUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const task = await updateTask(Number(id), parsed.data);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

// DELETE /api/tasks/:id
export async function DELETE(
  _: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  await deleteTask(Number(id));
  return NextResponse.json({ ok: true });
}
