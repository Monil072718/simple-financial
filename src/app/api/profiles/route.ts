import { NextRequest, NextResponse } from "next/server";
import { listProfiles, createProfile } from "@/lib/profiles";
import { profileCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const q     = sp.get("q") ?? undefined;
  const page  = Number(sp.get("page") ?? 1);
  const limit = Number(sp.get("limit") ?? 20);

  const rows = await listProfiles({ q, page, limit });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = profileCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const row = await createProfile(parsed.data);
  return NextResponse.json(row, { status: 201 });
}
