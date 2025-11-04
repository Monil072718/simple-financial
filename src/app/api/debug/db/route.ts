import { NextResponse } from "next/server";
import { query } from "@/lib/db";
export const runtime = "nodejs";

export async function GET() {
  const conn = await query(
    "SELECT current_database() as db, current_user as user, current_schema() as schema"
  );
  const tables = await query(
    "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );

  return NextResponse.json({
    connection: conn.rows[0],                 // { db, user, schema }
    publicTables: tables.rows.map(t => `${t.table_schema}.${t.table_name}`),
  });
}
