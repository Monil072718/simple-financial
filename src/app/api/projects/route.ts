import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/projects";
import { projectCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 10);
  const projects = await listProjects({ q, page, limit });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = projectCreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const project = await createProject(parsed.data);
  return NextResponse.json(project, { status: 201 });
}
