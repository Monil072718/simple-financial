import { NextRequest, NextResponse } from "next/server";
import { db, nowISO } from "@/lib/todos.db";
import { getUserId } from "@/lib/getUser";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerId = getUserId(req);
  const row = db()
    .prepare(
      `SELECT l.id, l.name, l.createdAt, l.updatedAt,
              (SELECT COUNT(*) FROM todo_items i WHERE i.listId = l.id AND i.status='open') as openCount,
              (SELECT COUNT(*) FROM todo_items i WHERE i.listId = l.id AND i.status='done') as doneCount
       FROM todo_lists l
       WHERE l.ownerId = ? AND l.id = ?`
    )
    .get(ownerId, Number(id));

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json().catch(() => ({}));
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const ownerId = getUserId(req);
  const d = db();
  const ts = nowISO();
  const res = d
    .prepare(`UPDATE todo_lists SET name = ?, updatedAt = ? WHERE id = ? AND ownerId = ?`)
    .run(name.trim(), ts, Number(id), ownerId);

  if (res.changes === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = d
    .prepare(`SELECT id, name, createdAt, updatedAt FROM todo_lists WHERE id = ?`)
    .get(Number(id));
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerId = getUserId(req);
  const d = db();
  const listId = Number(id);

  const exists = d
    .prepare(`SELECT id FROM todo_lists WHERE id = ? AND ownerId = ?`)
    .get(listId, ownerId);
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tx = d.transaction(() => {
    d.prepare(`DELETE FROM todo_items WHERE listId = ?`).run(listId);
    d.prepare(`DELETE FROM todo_lists WHERE id = ?`).run(listId);
  });
  tx();

  return NextResponse.json({ ok: true });
}
