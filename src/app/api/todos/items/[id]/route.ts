// src/app/api/todos/items/[id]/route.ts  (adjust path if different)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, nowISO } from "@/lib/todos.db";
import { getUserId } from "@/lib/getUser";

export const runtime = "nodejs";

/** Minimal shape of a row in todo_items */
type TodoRow = {
  id: number;
  ownerId: number;
  listId: number | null;
  projectId: number | null;
  position: number | null;
  status: string;
  content: string;
  description: string | null;
  link: string | null;
  considerations: string | null;
  priority: "Low" | "Medium" | "High" | null;
  dueDate: string | null;
  assigneeId: number | null;
  tags: string | null; // JSON string in DB
  createdAt: string;
  updatedAt: string;
};

type RunResult = { changes: number };

/** PATCH body validation (coerces numbers from strings) */
const UpdateSchema = z
  .object({
    content: z.string().optional(),
    description: z.string().nullable().optional(),
    link: z.string().optional(),
    considerations: z.string().nullable().optional(),
    priority: z.enum(["Low", "Medium", "High"]).optional(),
    dueDate: z.string().nullable().optional(),
    assigneeId: z.coerce.number().int().positive().nullable().optional(),
    tags: z.array(z.string()).optional(),
    status: z.string().optional(),
    position: z.coerce.number().int().nullable().optional(),
    projectId: z.coerce.number().int().positive().nullable().optional(),
    listId: z.coerce.number().int().positive().nullable().optional(),
  })
  .strict();

const ALLOW_KEYS = new Set([
  "content",
  "description",
  "link",
  "considerations",
  "priority",
  "dueDate",
  "assigneeId",
  "tags",
  "status",
  "position",
  "projectId",
  "listId",
] as const);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ownerId = getUserId(req);

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  // Build SET clause safely
  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  for (const key of Object.keys(body)) {
    if (!ALLOW_KEYS.has(key as keyof typeof body)) continue;

    if (key === "tags" && Array.isArray(body.tags)) {
      fields.push("tags = ?");
      values.push(JSON.stringify(body.tags));
    } else {
      fields.push(`${key} = ?`);
      // @ts-expect-error — key is guaranteed by ALLOW_KEYS, values handled by schema
      values.push(body[key] as string | number | null);
    }
  }

  if (fields.length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const ts = nowISO();

  const upd = db()
    .prepare<RunResult, []>(
      `UPDATE todo_items SET ${fields.join(", ")}, updatedAt = ? WHERE id = ? AND ownerId = ?`
    )
    .run(...values, ts, id, ownerId) as RunResult;

  if (upd.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = db()
    .prepare<TodoRow, [number]>("SELECT * FROM todo_items WHERE id = ?")
    .get(id) as TodoRow;

  const tags = row.tags ? JSON.parse(row.tags) : [];
  return NextResponse.json({ ...row, tags });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ownerId = getUserId(req);

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const res = db()
    .prepare<RunResult, [number, number]>(
      "DELETE FROM todo_items WHERE id = ? AND ownerId = ?"
    )
    .run(id, ownerId) as RunResult;

  if (res.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
