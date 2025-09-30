import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs"; // ensure Node runtime

const createSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(), // ISO (UI sends yyyy-mm-dd)
  priority: z.enum(["Low", "Medium", "High"]).default("Medium"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
});

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = Number(searchParams.get("projectId") || 0);
  if (!projectId) return NextResponse.json([], { status: 200 });

  // Verify the project belongs to the logged-in user
  const { rowCount: owns } = await query(
    "SELECT 1 FROM projects WHERE id = $1 AND owner_email = $2",
    [projectId, user.email]
  );
  if (!owns) return NextResponse.json([], { status: 200 });

  const { rows } = await query(
    `SELECT id, project_id, title, description, due_date, priority, difficulty, created_at
     FROM milestones
     WHERE project_id = $1
     ORDER BY id DESC`,
    [projectId]
  );

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, title, description, dueDate, priority, difficulty } = parsed.data;

  // Ownership check
  const { rowCount: owns } = await query(
    "SELECT 1 FROM projects WHERE id = $1 AND owner_email = $2",
    [projectId, user.email]
  );
  if (!owns) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { rows } = await query(
    `INSERT INTO milestones (project_id, title, description, due_date, priority, difficulty)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, project_id, title, description, due_date, priority, difficulty, created_at`,
    [projectId, title, description ?? null, dueDate ?? null, priority, difficulty]
  );

  return NextResponse.json(rows[0], { status: 201 });
}
