import { NextRequest, NextResponse } from "next/server";
import { db, nowISO } from "@/lib/todos.db";
import { getUserId } from "@/lib/getUser";

export const runtime = "nodejs";

// GET /api/todos/lists  -> all lists for current user
export async function GET(req: NextRequest) {
  const ownerId = getUserId(req);
  const rows = db()
    .prepare(
      `SELECT l.id, l.name, l.createdAt, l.updatedAt,
              (SELECT COUNT(*) FROM todo_items i WHERE i.listId = l.id AND i.status='open') as openCount,
              (SELECT COUNT(*) FROM todo_items i WHERE i.listId = l.id AND i.status='done') as doneCount
       FROM todo_lists l
       WHERE l.ownerId = ?
       ORDER BY l.id ASC`
    )
    .all(ownerId);

  return NextResponse.json(rows);
}

// POST /api/todos/lists { name }
export async function POST(req: NextRequest) {
  const { name } = await req.json().catch(() => ({}));
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const ownerId = getUserId(req);
  const d = db();
  const ts = nowISO();
  const info = d
    .prepare(`INSERT INTO todo_lists (ownerId, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)`)
    .run(ownerId, name.trim(), ts, ts);

  const row = d
    .prepare(`SELECT id, name, createdAt, updatedAt FROM todo_lists WHERE id = ?`)
    .get(info.lastInsertRowid as number);

  return NextResponse.json(row, { status: 201 });
}
