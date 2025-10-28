// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { deleteTask, getTask, updateTask } from "@/lib/tasks";
import { taskUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";

// --- helpers ---
function normalizeStatus(input: unknown): string | undefined {
  if (input == null) return undefined;
  const v = String(input).toLowerCase();
  if (v === "pending" || v === "assigned") return "todo";
  return v;
}

// GET /api/tasks/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const idNum = Number(params.id);
  const task = await getTask(idNum);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

// PATCH /api/tasks/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const idNum = Number(params.id);

  // parse body as unknown -> narrow to a mutable record
  const rawUnknown: unknown = await req.json().catch(() => ({}));
  const raw =
    typeof rawUnknown === "object" && rawUnknown !== null
      ? (rawUnknown as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  // Coerce legacy/external statuses before validation
  if ("status" in raw) {
    const normalized = normalizeStatus(raw.status);
    if (normalized !== undefined) raw.status = normalized;
  }

  const parsed = taskUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const task = await updateTask(idNum, parsed.data);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

// DELETE /api/tasks/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const idNum = Number(params.id);
  await deleteTask(idNum);
  return NextResponse.json({ ok: true });
}
