import { NextRequest, NextResponse } from "next/server";
import { listProfiles } from "@/lib/profiles";
import { suggestAssignees } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title: string = String(body.title || "").trim();
  const description: string | null = body.description ?? null;
  const topK: number = Number(body.topK ?? 3);

  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const profiles = await listProfiles({ page: 1, limit: 100 });
  const suggestions = await suggestAssignees({ title, description }, profiles, topK);

  return NextResponse.json({ suggestions });
}


