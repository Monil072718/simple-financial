// src/app/api/todos/[id]/move/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, nowISO } from "@/lib/todos.db";
import { getUserId } from "@/lib/getUser";
import { createTask } from "@/lib/tasks";

export const runtime = "nodejs";

type TodoRow = {
  id: number;
  ownerId: number;
  listId: number | null;
  projectId: number | null;
  position: number;
  status: string;
  content: string;
  description: string | null;
  assigneeId: number | null;
  priority: "Low" | "Medium" | "High" | null;
  dueDate: string | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
};

type PosRow = { pos: number };

const BodySchema = z
  .object({
    listId: z.union([z.string(), z.number()]).optional(),
    projectId: z.union([z.string(), z.number()]).optional(),
  })
  .refine((v) => Boolean(v.listId || v.projectId), {
    message: "Provide listId or projectId",
    path: ["listId"],
  });

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return /^\d+$/.test(s) ? Number(s) : null;
};
const strOrNull = (v: unknown): string | null => {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const listIdNum =
    parsed.data.listId != null ? Number(parsed.data.listId) : undefined;
  const projectIdNum =
    parsed.data.projectId != null ? Number(parsed.data.projectId) : undefined;

  if (listIdNum !== undefined && (!Number.isFinite(listIdNum) || listIdNum <= 0)) {
    return NextResponse.json({ error: "Invalid listId" }, { status: 400 });
  }
  if (projectIdNum !== undefined && (!Number.isFinite(projectIdNum) || projectIdNum <= 0)) {
    return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
  }

  const ownerId = getUserId(req);
  const d = db();

  // 1) verify ownership
  const existing = d
    .prepare<[number, string], TodoRow>(
      "SELECT * FROM todo_items WHERE id = ? AND ownerId = ?"
    )
    .get(itemId, ownerId) as TodoRow | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ts = nowISO();

  // 2) move inside todos (to a list)
  if (listIdNum !== undefined) {
    const posRow = d
      .prepare<[number], PosRow>(
        "SELECT IFNULL(MAX(position),0)+1 AS pos FROM todo_items WHERE listId = ?"
      )
      .get(listIdNum) as PosRow;

    const nextPos = Number(posRow.pos) || 1;

    d.prepare(
      "UPDATE todo_items SET listId = ?, projectId = NULL, position = ?, updatedAt = ? WHERE id = ? AND ownerId = ?"
    ).run(listIdNum, nextPos, ts, itemId, ownerId);

    const row = d
      .prepare<[number], TodoRow>("SELECT * FROM todo_items WHERE id = ?")
      .get(itemId) as TodoRow;

    const tags: unknown = row.tags ? JSON.parse(row.tags) : [];
    return NextResponse.json({ todo: { ...row, tags } });
  }

  // 3) move to a project backlog → create task in PG
  const priorityMap: Record<string, "low" | "medium" | "high"> = {
    Low: "low",
    Medium: "medium",
    High: "high",
  };

  const taskPayload = {
    projectId: projectIdNum!, // validated above
    title: existing.content,
    description: strOrNull(existing.description),
    assigneeId: numOrNull(existing.assigneeId),
    status: "todo" as const,
    priority: priorityMap[existing.priority ?? "Medium"] ?? ("medium" as const),
    dueDate: strOrNull(existing.dueDate),
    _isFromTodo: true as const,
  };

  const createdTask = await createTask(taskPayload);

  // 4) archive local todo
  d.prepare(
    "UPDATE todo_items SET projectId = ?, status = 'archived', updatedAt = ? WHERE id = ? AND ownerId = ?"
  ).run(projectIdNum!, ts, itemId, ownerId);

  const updated = d
    .prepare<[number], TodoRow>("SELECT * FROM todo_items WHERE id = ?")
    .get(itemId) as TodoRow;

  const updatedTags: unknown = updated.tags ? JSON.parse(updated.tags) : [];
  return NextResponse.json(
    { todo: { ...updated, tags: updatedTags }, task: createdTask },
    { status: 201 }
  );
}
