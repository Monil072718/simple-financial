import { NextRequest, NextResponse } from "next/server";
import { deleteTask, getTask, updateTask } from "@/lib/tasks";
import { taskUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// GET /api/tasks/:id
export async function GET(
  _: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const task = await getTask(Number(id));
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(task);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch task", detail: errorMessage(err) },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/:id
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    // Read raw body without `any`
    const raw: unknown = await req.json().catch(() => ({} as unknown));

    // If you ever re-enable coercion, keep types `unknown` and narrow before use.
    // // const coerceStatus = (s: unknown) => {
    // //   if (s == null) return s as null | undefined;
    // //   const v = String(s).toLowerCase();
    // //   if (v === "pending" || v === "assigned") return "todo";
    // //   return v;
    // // };
    // // if (typeof raw === "object" && raw !== null && "status" in raw) {
    // //   (raw as Record<string, unknown>).status = coerceStatus(
    // //     (raw as Record<string, unknown>).status
    // //   );
    // // }

    // Validate after (potential) coercion
    const parsed = taskUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const task = await updateTask(Number(id), parsed.data);
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(task);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to update task", detail: errorMessage(err) },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/:id
export async function DELETE(
  _: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    await deleteTask(Number(id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to delete task", detail: errorMessage(err) },
      { status: 500 }
    );
  }
}
