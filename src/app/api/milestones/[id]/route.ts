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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idParam } = await params;
  const id = Number(idParam);
  const json = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

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
  if (ms.owner_email !== user.email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Build dynamic SET list
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  const push = (sql: string, v: unknown) => { sets.push(`${sql} = $${++idx}`); vals.push(v); };

  if (parsed.data.title !== undefined) push("title", parsed.data.title);
  if (parsed.data.description !== undefined) push("description", parsed.data.description);
  if (parsed.data.dueDate !== undefined) push("due_date", parsed.data.dueDate);
  if (parsed.data.priority !== undefined) push("priority", parsed.data.priority);
  if (parsed.data.difficulty !== undefined) push("difficulty", parsed.data.difficulty);

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
     FROM milestones WHERE id = $1`,
    [id]
  );

  return NextResponse.json(rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idParam } = await params;
  const id = Number(idParam);

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
  if (ms.owner_email !== user.email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await query("DELETE FROM milestones WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
