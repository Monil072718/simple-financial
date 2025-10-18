import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

export const runtime = "nodejs";

export async function GET() {
  console.log("[/api/health] hit");
  await ensureSchema();
  // force a quick round-trip to the DB
  const r = await query("SELECT current_database() AS db, NOW() AS now");
  return NextResponse.json({ ok: true, db: (r.rows[0] as Record<string, unknown>).db, now: (r.rows[0] as Record<string, unknown>).now });
}
