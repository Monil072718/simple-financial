import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

// Narrower shape we’ll cast to (not used in the signature)
type CtxParams = { params?: Record<string, string | string[]> };

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
});
type UpdatePayload = z.infer<typeof updateSchema>;

// Safe getter for id that may be string | string[]
function getId(context: unknown): string | undefined {
  const params = (context as CtxParams | undefined)?.params;
  const raw = params?.id;
  return Array.isArray(raw) ? raw[0] : raw;
}

export async function PATCH(req: NextRequest, context: unknown) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const idStr = getId(context);
  const id = Number(idStr);
  if (!idStr || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const json = (await req.json().catch(() => ({}))) as unknown;
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { rows: msRows } = await query(
    `SELECT m.*, p.owner_email
     FROM milestones m
     JOIN projects p ON p.id = m.project_id
     WHERE m.id = $1`,
    [id]
  );
  const ms = msRows[0];
  if (!ms) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ms.owner_email !== user.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sets: string[] = [];
  const vals: (string | null)[] = [];
  let idx = 1;
  const push = (column: string, value: string | null) => {
    sets.push(`${column} = $${++idx}`);
    vals.push(value);
  };

  const data: UpdatePayload = parsed.data;
  if (data.title !== undefined) push("title", data.title);
  if (data.description !== undefined) push("description", data.description);
  if (data.dueDate !== undefined) push("due_date", data.dueDate);
  if (data.priority !== undefined) push("priority", data.priority);
  if (data.difficulty !== undefined) push("difficulty", data.difficulty);

  if (!sets.length) {
    return NextResponse.json({
      id: ms.id,
      project_id: ms.project_id,
      title: ms.title,
      description: ms.description,
      due_date: ms.due_date,
      priority: ms.priority,
      difficulty: ms.difficulty,
      created_at: ms.created_at,
    });
  }

  await query(`UPDATE milestones SET ${sets.join(", ")} WHERE id = $1`, [id, ...vals]);

  const { rows } = await query(
    `SELECT id, project_id, title, description, due_date, priority, difficulty, created_at
     FROM milestones
     WHERE id = $1`,
    [id]
  );

  return NextResponse.json(rows[0]);
}

export async function DELETE(req: NextRequest, context: unknown) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const idStr = getId(context);
  const id = Number(idStr);
  if (!idStr || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { rows: msRows } = await query(
    `SELECT m.id, p.owner_email
     FROM milestones m
     JOIN projects p ON p.id = m.project_id
     WHERE m.id = $1`,
    [id]
  );
  const ms = msRows[0];
  if (!ms) return NextResponse.json({ ok: true });
  if (ms.owner_email !== user.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await query("DELETE FROM milestones WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
