import { NextRequest, NextResponse } from "next/server";
import { db, nowISO } from "@/lib/todos.db";
import { getUserId } from "@/lib/getUser";

// POST /api/todos/items/:id/move  { listId?, projectId? }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const itemId = Number(params.id);
  if (!itemId) {
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  }

  const { listId, projectId } = await req.json().catch(() => ({} as any));
  if (!listId && !projectId) {
    return NextResponse.json(
      { error: "Provide listId or projectId" },
      { status: 400 }
    );
  }

  const ownerId = getUserId(req);
  const d = db();

  // Make sure the item exists and belongs to this user
  const existing = d
    .prepare("SELECT id, listId FROM todo_items WHERE id = ? AND ownerId = ?")
    .get(itemId, ownerId) as { id: number; listId: number } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ts = nowISO();

  if (listId) {
    // Verify target list belongs to same user
    const target = d
      .prepare("SELECT id FROM todo_lists WHERE id = ? AND ownerId = ?")
      .get(Number(listId), ownerId);
    if (!target) {
      return NextResponse.json({ error: "Target list not found" }, { status: 404 });
    }
    // put it at the end of the target list
    const pos = (
      d
        .prepare(
          "SELECT IFNULL(MAX(position),0)+1 AS pos FROM todo_items WHERE listId = ?"
        )
        .get(Number(listId)) as any
    ).pos;
    d.prepare(
      "UPDATE todo_items SET listId = ?, projectId = NULL, position = ?, updatedAt = ? WHERE id = ? AND ownerId = ?"
    ).run(Number(listId), pos, ts, itemId, ownerId);
  } else {
    d.prepare(
      "UPDATE todo_items SET projectId = ?, updatedAt = ? WHERE id = ? AND ownerId = ?"
    ).run(Number(projectId), ts, itemId, ownerId);
  }

  const row = d.prepare("SELECT * FROM todo_items WHERE id = ?").get(itemId) as any;
  row.tags = JSON.parse(row.tags || "[]");
  return NextResponse.json(row);
}
