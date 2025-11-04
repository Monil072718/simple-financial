import { NextRequest, NextResponse } from "next/server";
import { db, nowISO } from "@/lib/todos.db";
import { getUserId } from "@/lib/getUser";
import { createTask } from "@/lib/tasks";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const itemId = Number(id);
  if (!itemId)
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const { listId, projectId } = body;
  if (!listId && !projectId) {
    return NextResponse.json(
      { error: "Provide listId or projectId" },
      { status: 400 }
    );
  }

  const ownerId = getUserId(req);
  const d = db();

  // 1) Ensure todo exists and belongs to user
  const existing = d
    .prepare("SELECT * FROM todo_items WHERE id = ? AND ownerId = ?")
    .get(itemId, ownerId) as Record<string, unknown> | undefined;

  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ts = nowISO();

  // 2) If moving to another list (inside todos)
  if (listId) {
    const pos = (
      d
        .prepare(
          "SELECT IFNULL(MAX(position),0)+1 AS pos FROM todo_items WHERE listId = ?"
        )
        .get(Number(listId)) as { pos: number }
    ).pos;

    d.prepare(
      "UPDATE todo_items SET listId = ?, projectId = NULL, position = ?, updatedAt = ? WHERE id = ? AND ownerId = ?"
    ).run(Number(listId), pos, ts, itemId, ownerId);

    const row = d
      .prepare("SELECT * FROM todo_items WHERE id = ?")
      .get(itemId) as Record<string, unknown>;
    row.tags = JSON.parse((row.tags as string) || "[]");
    return NextResponse.json({ todo: row });
  }

  // 3) If moving to a PROJECT backlog -> CREATE a real Postgres task
  // map priority from SQLite ('Low'|'Medium'|'High') -> tasks ('low'|'medium'|'high')
  const priorityMap: Record<string, string> = {
    Low: "low",
    Medium: "medium",
    High: "high",
  };

  // helpers to sanitize values coming from SQLite
  const numOrNull = (v: unknown) => {
    if (v === null || v === undefined) return null;
    // accept number-like strings only
    const s = String(v).trim();
    return /^\d+$/.test(s) ? Number(s) : null;
  };
  const strOrNull = (v: unknown) => {
    const s = (v ?? "").toString().trim();
    return s.length ? s : null;
  };

  const taskPayload = {
    projectId: Number(projectId), // already validated earlier
    title: existing.content,
    description: strOrNull(existing.description),
    assigneeId: numOrNull(existing.assigneeId), // <- avoid NaN
    status: "todo",
    priority: priorityMap[existing.priority || "Medium"] || "medium",
    dueDate: strOrNull(existing.dueDate), // '' -> null
    _isFromTodo: true, // Flag to indicate this is from todo item
  };

  const createdTask = await createTask(taskPayload);

  // 4) Mark the todo item as archived (or delete it if you prefer)
  d.prepare(
    "UPDATE todo_items SET projectId = ?, status = 'archived', updatedAt = ? WHERE id = ? AND ownerId = ?"
  ).run(Number(projectId), ts, itemId, ownerId);

  const updatedTodo = d
    .prepare("SELECT * FROM todo_items WHERE id = ?")
    .get(itemId) as Record<string, unknown>;
  updatedTodo.tags = JSON.parse((updatedTodo.tags as string) || "[]");

  return NextResponse.json(
    { todo: updatedTodo, task: createdTask },
    { status: 201 }
  );
}
