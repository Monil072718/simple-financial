import { NextRequest, NextResponse } from "next/server";
import { deleteUser, getUser, updateUser } from "@/lib/users";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const user = await getUser(id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const user = await updateUser(id, parsed.data.name, parsed.data.email);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  await deleteUser(id);
  return NextResponse.json({ ok: true });
}
