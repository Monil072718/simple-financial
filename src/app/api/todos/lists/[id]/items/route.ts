// src/app/api/todos/lists/[id]/items/route.ts  (adjust path if different)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, nowISO, type TodoItemPayload } from "@/lib/todos.db";
import { getUserId } from "@/lib/getUser";

export const runtime = "nodejs";

/** Row shape used by SELECT for list items */
type TodoListItemRow = {
  id: number;
  listId: number | null;
  content: string;
  description: string | null;
  link: string | null;
  considerations: string | null;
  priority: "Low" | "Medium" | "High" | "Urgent" | null;
  dueDate: string | null;
  assigneeId: number | null;
  tags: string | null; // JSON string in DB
  status: string;
  position: number | null;
  projectId: number | null;
  createdAt: string;
  updatedAt: string;
};

type InsertResult = { lastInsertRowid: number; changes: number };
type PosRow = { pos: number };

/** Helper to read and validate the dynamic :id */
async function readListId(paramsPromise: Promise<{ id: string }>) {
  const { id } = await paramsPromise;
  const listId = Number(id);
  if (!Number.isFinite(listId) || listId <= 0) {
    throw new Error("Invalid list id");
  }
  return listId;
}

/** POST body schema (coerces numbers; allows partial payload) */
const CreateItemSchema = z.object({
  content: z.string().min(1),
  description: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  considerations: z.string().nullable().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.coerce.number().int().positive().nullable().optional(),
  tags: z.array(z.string()).optional(),
  status: z.string().optional(),
  position: z.coerce.number().int().nullable().optional(),
  projectId: z.coerce.number().int().positive().nullable().optional(),
});

/* ========================= GET /api/todos/lists/:id/items ========================= */
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
      .all(ownerId, listId) as TodoListItemRow[];

    const items = rows.map((r) => ({
      ...r,
      tags: r.tags ? JSON.parse(r.tags) : [],
    }));

    return NextResponse.json(items);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch items";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/* ========================= POST /api/todos/lists/:id/items ========================= */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const raw = (await req.json().catch(() => ({}))) as unknown;
    const parsed = CreateItemSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // If you still need TodoItemPayload for other places, this keeps compatibility
    const body: TodoItemPayload = parsed.data as unknown as TodoItemPayload;

    const ownerId = getUserId(req);
    const d = db();
    const ts = nowISO();
    const listId = await readListId(ctx.params);

    const priority =
      (body.priority ?? "Medium") as "Low" | "Medium" | "High" | "Urgent";
    const tagsJson = JSON.stringify(body.tags ?? []);

    // Compute position
    const posRow = d
      .prepare(
        `SELECT IFNULL(MAX(position),0)+1 AS pos FROM todo_items WHERE listId = ?`
      )
      .get(listId) as PosRow;
    const nextPos =
      typeof body.position === "number" && Number.isFinite(body.position)
        ? body.position
        : Number(posRow.pos) || 1;

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
        body.description ?? null,
        body.link ?? null,
        body.considerations ?? null,
        priority,
        body.dueDate ?? null,
        body.assigneeId ?? null,
        tagsJson,
        body.status ?? "open",
        nextPos,
        body.projectId ?? null,
        ts,
        ts
      ) as InsertResult;

    const row = d
      .prepare(`SELECT * FROM todo_items WHERE id = ?`)
      .get(info.lastInsertRowid) as TodoListItemRow;

    const response = { ...row, tags: row.tags ? JSON.parse(row.tags) : [] };
    return NextResponse.json(response, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
