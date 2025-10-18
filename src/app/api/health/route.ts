import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

export const runtime = "nodejs";

export async function GET() {
  console.log("[/api/health] hit");
  
  try {
    await ensureSchema();
    console.log("Schema ensured successfully");
    
    // force a quick round-trip to the DB
    const r = await query("SELECT current_database() AS db, NOW() AS now");
    console.log("Database query successful:", r.rows[0]);
    
    return NextResponse.json({ 
      ok: true, 
      db: (r.rows[0] as Record<string, unknown>).db, 
      now: (r.rows[0] as Record<string, unknown>).now 
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
