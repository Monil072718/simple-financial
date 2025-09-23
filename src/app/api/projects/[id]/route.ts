import { NextResponse } from "next/server";
import { deleteProject, getProjectWithTasks, updateProject } from "@/lib/projects";
import { projectUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const data = await getProjectWithTasks(Number(params.id));
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = await updateProject(Number(params.id), parsed.data);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await deleteProject(Number(params.id));
  return NextResponse.json({ ok: true });
}
