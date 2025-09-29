import { NextRequest, NextResponse } from "next/server";
import { db, nowISO } from "@/lib/todos.db";
import { getUserId } from "@/lib/getUser";

export const runtime = "nodejs";

// POST /api/todos/items/:id/move { listId?, projectId? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ownerId = getUserId(req);
  const id = Number(params.id);
  const { listId, projectId } = await req.json().catch(() => ({}));

  if (!listId && !projectId) {
    return NextResponse.json({ error: "Provide listId or projectId" }, { status: 400 });
  }

  const d = db();
  const ts = nowISO();

  if (listId) {
    // place at end of new list
    const pos = (d.prepare(`SELECT IFNULL(MAX(position),0)+1 AS pos FROM todo_items WHERE listId = ?`).get(listId) as any).pos;
    const res = d
      .prepare(`UPDATE todo_items SET listId = ?, projectId = NULL, position = ?, updatedAt = ? WHERE id = ? AND ownerId = ?`)
      .run(Number(listId), pos, ts, id, ownerId);
    if (res.changes === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  } else {
    d.prepare(`UPDATE todo_items SET projectId = ?, updatedAt = ? WHERE id = ? AND ownerId = ?`)
      .run(Number(projectId), ts, id, ownerId);
  }

  const row = d.prepare(`SELECT * FROM todo_items WHERE id = ?`).get(id);
  row.tags = JSON.parse(row.tags || "[]");
  return NextResponse.json(row);
}
