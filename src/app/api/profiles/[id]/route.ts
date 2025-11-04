import { NextRequest, NextResponse } from "next/server";
import { getProfile, updateProfile, deleteProfile } from "@/lib/profiles";
import { profileUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const row = await getProfile(Number(params.id));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const json = await req.json().catch(() => ({}));
  const parsed = profileUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const row = await updateProfile(Number(params.id), parsed.data);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await deleteProfile(Number(params.id));
  return NextResponse.json({ ok: true });
}
