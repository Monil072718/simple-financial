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
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  // Read raw body
  const raw = await req.json().catch(() => ({} as any));

  // Normalize status values to match database constraint (todo, in_progress, done)
  const coerceStatus = (s: any) => {
    if (s == null) return s;
    const v = String(s).toLowerCase();
    // Map frontend statuses to database statuses
    if (v === "pending" || v === "assigned") return "todo";
    if (v === "review") return "in_progress";
    // Allow valid database statuses
    if (v === "todo" || v === "in_progress" || v === "done") return v;
    // Default to todo for unknown statuses
    return "todo";
  };
  if ("status" in raw) raw.status = coerceStatus(raw.status);

  // Validate after coercion
  const parsed = taskUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
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
