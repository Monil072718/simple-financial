import { NextRequest, NextResponse } from "next/server";
import { createTask, listTasks } from "@/lib/tasks";
import { taskCreateSchema } from "@/lib/validations";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const sp = new URL(req.url).searchParams;
  const projectId  = sp.get("projectId")  ? Number(sp.get("projectId"))  : undefined;
  const assigneeId = sp.get("assigneeId") ? Number(sp.get("assigneeId")) : undefined;
  const status     = sp.get("status") ?? undefined;
  const page       = Number(sp.get("page") ?? 1);
  const limit      = Number(sp.get("limit") ?? 10);

  const tasks = await listTasks({ projectId, assigneeId, status, page, limit, userId: user.id });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const json = await req.json().catch(() => ({}));
  
  // Normalize status values to match database constraint (todo, in_progress, done)
  const coerceStatus = (s: any) => {
    if (s == null) return s;
    const v = String(s).toLowerCase();
    // Map frontend statuses to database statuses
    if (v === "pending" || v === "assigned") return "todo";
    if (v === "review") return "in_progress";
    // Allow valid database statuses
    if (v === "todo" || v === "in_progress" || v === "done") return v;
    // Default to todo for unknown statuses
    return "todo";
  };
  if ("status" in json) json.status = coerceStatus(json.status);
  
  const parsed = taskCreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  
  // Verify the project belongs to the user
  const { query } = await import("@/lib/db");
  const project = await query("SELECT owner_id FROM projects WHERE id = $1", [parsed.data.projectId]);
  if (!project.rows.length || project.rows[0].owner_id !== user.id) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 403 });
  }
  
  const task = await createTask(parsed.data);
  
  // Send Telegram notification if task is assigned
  if (parsed.data.assigneeId) {
    try {
      const { sendTaskAssignedMsg } = await import("@/lib/telegram");
      const { getProfile } = await import("@/lib/profiles");
      const { query } = await import("@/lib/db");
      
      const profile = await getProfile(parsed.data.assigneeId);
      if (profile && (profile as any).telegram_chat_id) {
        const projectResult = await query("SELECT name FROM projects WHERE id = $1", [parsed.data.projectId]);
        const projectName = projectResult.rows[0]?.name || "Unknown Project";
        
        const taskMsg = {
          id: task.id,
          title: task.title,
          description: task.description,
          projectName,
          priority: task.priority,
          endDate: task.due_date,
          aiComm: {
            active: false,
            frequency: "daily",
            days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            prompt: ""
          }
        };
        
        const profileLite = {
          id: profile.id,
          name: profile.full_name,
          telegram_chat_id: (profile as any).telegram_chat_id,
          email: profile.email
        };
        
        await sendTaskAssignedMsg(profileLite, taskMsg, user.email || "admin@example.com");
      }
    } catch (error) {
      console.error("Failed to send Telegram notification:", error);
      // Don't fail the task creation if Telegram fails
    }
  }
  
  return NextResponse.json(task, { status: 201 });
}
