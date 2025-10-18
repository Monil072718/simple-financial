import { NextRequest, NextResponse } from "next/server";
import { db, nowISO, TodoItemPayload } from "@/lib/todos.db";
import { getUserId } from "@/lib/getUser";

export const runtime = "nodejs";

// Helper to read and validate the dynamic :id
async function readListId(paramsPromise: Promise<{ id: string }>) {
  const { id } = await paramsPromise;
  const listId = Number(id);
  if (!Number.isFinite(listId) || listId <= 0) {
    throw new Error("Invalid list id");
  }
  return listId;
}

// GET /api/todos/lists/:id/items
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const ownerId = getUserId(req);
    const listId = await readListId(ctx.params);

    const rows = db()
      .prepare(
        `SELECT id, listId, content, description, link, considerations, priority, dueDate,
                assigneeId, tags, status, position, projectId, createdAt, updatedAt
         FROM todo_items
         WHERE ownerId = ? AND listId = ?
         ORDER BY position ASC, id ASC`
      )
      .all(ownerId, listId);

    const items = (rows as Record<string, unknown>[]).map(r => ({
      ...r,
      tags: JSON.parse((r.tags as string) || "[]"),
    }));

    return NextResponse.json(items);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch items" },
      { status: 400 }
    );
  }
}

// POST /api/todos/lists/:id/items
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const body: TodoItemPayload = await req.json().catch(() => ({} as Record<string, unknown>));
    if (!body?.content || typeof body.content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const ownerId = getUserId(req);
    const d = db();
    const ts = nowISO();
    const listId = await readListId(ctx.params);

    const priority = (body.priority || "Medium") as
      | "Low"
      | "Medium"
      | "High"
      | "Urgent";
    const tags = JSON.stringify(body.tags || []);

    const position =
      typeof body.position === "number"
        ? body.position
        : (d
            .prepare(
              `SELECT IFNULL(MAX(position),0)+1 AS pos FROM todo_items WHERE listId = ?`
            )
            .get(listId) as Record<string, unknown>).pos;

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
      .get(info.lastInsertRowid as number) as Record<string, unknown>;
    row.tags = JSON.parse((row.tags as string) || "[]");

    return NextResponse.json(row, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create item" },
      { status: 400 }
    );
  }
}
