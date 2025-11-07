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

// ---- Types for Telegram notification payloads ----
type TelegramProfileLite = {
  id: number;
  name: string;
  telegram_chat_id: string | number;
  email: string;
};

// ---- Helpers (no `any`, no `instanceof` on `unknown`) ----
type TaskLike = {
  id: number | string;
  title: string;
  description?: string | null;
  priority?: string | null;
  due_date?: unknown;
};

function isDateObject(v: unknown): v is Date {
  // Avoids TS “instanceof on unknown” problem
  return Object.prototype.toString.call(v) === "[object Date]";
}

function normalizeDateYMD(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") {
    // If already ISO-like, trim to YYYY-MM-DD; else try to parse
    const iso = /^\d{4}-\d{2}-\d{2}/.test(v) ? v : new Date(v).toISOString();
    return iso.slice(0, 10);
  }
  if (typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (isDateObject(v)) {
    return v.toISOString().slice(0, 10);
  }
  // Try last-ditch parse for objects like { toDate: fn } etc.
  try {
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

// Narrowing helper for Telegram profile
function isProfileWithTelegram(
  p: unknown
): p is { id: number; full_name: string; email: string; telegram_chat_id: string | number } {
  if (!p || typeof p !== "object") return false;
  const obj = p as Record<string, unknown>;
  return (
    typeof obj.id === "number" &&
    typeof obj.full_name === "string" &&
    typeof obj.email === "string" &&
    (typeof obj.telegram_chat_id === "string" || typeof obj.telegram_chat_id === "number")
  );
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json: unknown = await req.json().catch(() => ({} as unknown));
  const parsed = taskCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

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

      if (isProfileWithTelegram(profile)) {
        const projectResult = await query("SELECT name FROM projects WHERE id = $1", [parsed.data.projectId]);
        const projectName: string = projectResult.rows[0]?.name ?? "Unknown Project";

        // Safely read and normalize due_date without `instanceof` on a mis-typed property
        const due = (task as TaskLike | undefined)?.due_date;
        const endDate = normalizeDateYMD(due);

        const taskMsg = {
          id: Number((task as TaskLike).id),
          title: String((task as TaskLike).title),
          description: (task as TaskLike).description ?? undefined,
          projectName,
          priority: String((task as TaskLike).priority ?? ""),
          endDate: endDate ?? undefined,
          aiComm: {
            active: false,
            frequency: "daily",
            days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            prompt: "",
          },
        };

        const profileLite: TelegramProfileLite = {
          id: Number(profile.id),
          name: profile.full_name,
          telegram_chat_id: profile.telegram_chat_id,
          email: profile.email,
        };

        await sendTaskAssignedMsg(profileLite, taskMsg, user.email || "admin@example.com");
      }
    } catch (error) {
      console.error("Failed to send Telegram notification:", error);
      // Do not fail task creation if Telegram fails
    }
  }

  return NextResponse.json(task, { status: 201 });
}
