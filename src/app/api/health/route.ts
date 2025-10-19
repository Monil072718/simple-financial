import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";

export const runtime = "nodejs";

export async function GET() {
  console.log("[/api/health] hit");
  
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      console.warn("DATABASE_URL not configured - skipping database health check");
      return NextResponse.json({ 
        ok: true, 
        message: "Health check passed (no database configured)",
        database: "not_configured"
      });
    }

    await ensureSchema();
    console.log("Schema ensured successfully");
    
    // force a quick round-trip to the DB
    const r = await query("SELECT current_database() AS db, NOW() AS now");
    console.log("Database query successful:", r.rows[0]);
    
    return NextResponse.json({ 
      ok: true, 
      db: (r.rows[0] as Record<string, unknown>).db, 
      now: (r.rows[0] as Record<string, unknown>).now,
      database: "connected"
    });
  } catch (error) {
    console.error("Health check failed:", error);
    
    // Check if it's a connection error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isConnectionError = errorMessage.includes('ECONNREFUSED') || 
                             errorMessage.includes('ENOTFOUND') ||
                             errorMessage.includes('connect');
    
    if (isConnectionError) {
      return NextResponse.json({ 
        ok: false, 
        error: "Database connection failed",
        message: "Database server is not running or not accessible",
        database: "connection_failed",
        details: errorMessage
      }, { status: 503 }); // Service Unavailable
    }
    
    return NextResponse.json({ 
      ok: false, 
      error: errorMessage,
      database: "error",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
