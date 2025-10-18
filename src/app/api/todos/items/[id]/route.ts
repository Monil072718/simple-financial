import { NextRequest, NextResponse } from "next/server";
import { db, nowISO } from "@/lib/todos.db";
import { getUserId } from "@/lib/getUser";

export const runtime = "nodejs";

// PATCH /api/todos/items/:id
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = getUserId(req);
  const { id: idParam } = await params;
  const id = Number(idParam);
  const body = await req.json().catch(() => ({}));

  const fields: string[] = [];
  const values: unknown[] = [];
  const allow = [
    "content","description","link","considerations","priority",
    "dueDate","assigneeId","tags","status","position","projectId","listId"
  ];

  for (const k of allow) {
    if (k in body) {
      if (k === "tags" && Array.isArray(body[k])) {
        fields.push(`tags = ?`);
        values.push(JSON.stringify(body[k]));
      } else {
        fields.push(`${k} = ?`);
        values.push(body[k]);
      }
    }
  }
  if (!fields.length) return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });

  const ts = nowISO();
  const res = db().prepare(`UPDATE todo_items SET ${fields.join(", ")}, updatedAt = ? WHERE id = ? AND ownerId = ?`)
    .run(...values, ts, id, ownerId);

  if (res.changes === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = db().prepare(`SELECT * FROM todo_items WHERE id = ?`).get(id) as Record<string, unknown>;
  row.tags = JSON.parse((row.tags as string) || "[]");
  return NextResponse.json(row);
}

// DELETE /api/todos/items/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = getUserId(req);
  const { id: idParam } = await params;
  const id = Number(idParam);
  const res = db().prepare(`DELETE FROM todo_items WHERE id = ? AND ownerId = ?`).run(id, ownerId);
  if (res.changes === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
