import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ensureCommSchema, listSchedules, upsertSchedule, listLogs } from "@/lib/communications";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureCommSchema();
  const sp = new URL(req.url).searchParams;
  const projectId = sp.get("projectId") ? Number(sp.get("projectId")) : undefined;
  const schedules = await listSchedules({ userId: user.id, projectId });
  const logs = await listLogs({ userId: user.id, projectId, limit: 50 });
  return NextResponse.json({ schedules, logs });
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureCommSchema();
  const json = await req.json().catch(() => ({}));
  // Expect: { taskId, active, frequency, days: string[], prompt }
  if (!json?.taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });
  const days: string[] = Array.isArray(json.days) ? json.days.map(String) : [];
  const saved = await upsertSchedule({ userId: user.id, taskId: Number(json.taskId), active: !!json.active, frequency: String(json.frequency || 'daily'), days, prompt: json.prompt ?? null });
  return NextResponse.json(saved, { status: 201 });
}


