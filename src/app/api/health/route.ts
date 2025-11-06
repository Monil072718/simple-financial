import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

export const runtime = "nodejs";

export async function GET() {
  console.log("[/api/health] hit");
  await ensureSchema();
  const r = await query("SELECT current_database() AS db, NOW() AS now");
  return NextResponse.json({ ok: true, db: r.rows[0].db, now: r.rows[0].now });
}
