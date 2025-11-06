import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
});

type UpdatePayload = z.infer<typeof updateSchema>;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const json = (await req.json().catch(() => ({}))) as unknown;
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Load milestone + project ownership
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

  // Build dynamic SET list
  const sets: string[] = [];
  // All updatable values are strings or null (enums are strings)
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
    // Nothing to update, just return current
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

  // First param is id; we already used $1, so vals start after it
  await query(`UPDATE milestones SET ${sets.join(", ")} WHERE id = $1`, [id, ...vals]);

  const { rows } = await query(
    `SELECT id, project_id, title, description, due_date, priority, difficulty, created_at
     FROM milestones
     WHERE id = $1`,
    [id]
  );

  return NextResponse.json(rows[0]);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);

  // Ownership check
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
