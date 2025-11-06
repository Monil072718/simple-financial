import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const taskId = Number(id);
    if (!taskId) return NextResponse.json({ error: "Invalid task id" }, { status: 400 });

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const projectId = body.projectId;
    if (!projectId) return NextResponse.json({ error: "Project ID required" }, { status: 400 });

    // Verify the task exists and belongs to user's project
    const { rows: taskRows } = await query(
      `SELECT t.*, p.owner_id 
       FROM tasks t 
       JOIN projects p ON t.project_id = p.id 
       WHERE t.id = $1 AND p.owner_id = $2`,
      [taskId, user.id]
    );

    if (!taskRows.length) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = taskRows[0];

    // Verify the target project exists and belongs to user
    const { rows: projectRows } = await query(
      "SELECT id FROM projects WHERE id = $1 AND owner_id = $2",
      [projectId, user.id]
    );

    if (!projectRows.length) {
      return NextResponse.json({ error: "Target project not found" }, { status: 404 });
    }

    // Check for duplicate task titles in the target project
    const { rows: existingTasks } = await query(
      "SELECT id FROM tasks WHERE project_id = $1 AND LOWER(title) = LOWER($2) AND id != $3",
      [projectId, task.title, taskId]
    );
    
    if (existingTasks.length > 0) {
      return NextResponse.json(
        { error: `A task with the title "${task.title}" already exists in the target project` },
        { status: 400 }
      );
    }

    // Move the task to the new project
    const { rows: updatedRows } = await query(
      "UPDATE tasks SET project_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [projectId, taskId]
    );

    return NextResponse.json({ task: updatedRows[0] }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to move task", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
