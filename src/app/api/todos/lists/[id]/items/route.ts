import { NextRequest, NextResponse } from "next/server";
import { db, nowISO, TodoItemPayload } from "@/lib/todos.db";
import { getUserId } from "@/lib/getUser";

export const runtime = "nodejs";

// GET /api/todos/lists/:id/items
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ownerId = getUserId(req);
  const rows = db()
    .prepare(
      `SELECT id, listId, content, description, link, considerations, priority, dueDate,
              assigneeId, tags, status, position, projectId, createdAt, updatedAt
       FROM todo_items
       WHERE ownerId = ? AND listId = ?
       ORDER BY position ASC, id ASC`
    )
    .all(ownerId, Number(params.id));

  // parse tags JSON
  const items = rows.map((r: any) => ({ ...r, tags: JSON.parse(r.tags || "[]") }));
  return NextResponse.json(items);
}

// POST /api/todos/lists/:id/items
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body: TodoItemPayload = await req.json().catch(() => ({} as any));

  if (!body?.content || typeof body.content !== "string") {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const ownerId = getUserId(req);
  const d = db();
  const ts = nowISO();
  const listId = Number(params.id);

  // default values
  const priority = (body.priority || "Medium") as "Low" | "Medium" | "High" | "Urgent";
  const tags = JSON.stringify(body.tags || []);
  const position =
    typeof body.position === "number"
      ? body.position
      : (d.prepare(`SELECT IFNULL(MAX(position),0)+1 AS pos FROM todo_items WHERE listId = ?`).get(listId) as any).pos;

  const info = d
    .prepare(
      `INSERT INTO todo_items
       (listId, ownerId, content, description, link, considerations, priority, dueDate,
        assigneeId, tags, status, position, projectId, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      listId,
      ownerId,
      body.content.trim(),
      body.description || null,
      body.link || null,
      body.considerations || null,
      priority,
      body.dueDate || null,
      body.assigneeId || null,
      tags,
      body.status || "open",
      position,
      body.projectId ?? null,
      ts,
      ts
    );

  const row = d
    .prepare(`SELECT * FROM todo_items WHERE id = ?`)
    .get(info.lastInsertRowid as number);
  row.tags = JSON.parse(row.tags || "[]");

  return NextResponse.json(row, { status: 201 });
}
