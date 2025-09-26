// src/lib/db.ts
import { Pool, QueryResult } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // or build from PGHOST/PGUSER/PGPASSWORD/PGPORT/PGDATABASE
  ssl:
    process.env.PGSSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
});

// Generic query helper: allows query<User>(...) style
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const res: QueryResult = await pool.query(text, params);
  return {
    rows: res.rows as T[],
    rowCount: res.rowCount ?? res.rows.length,
  };
}

// Optional: simple health check
export async function ping() {
  const r = await query<{ now: string }>("SELECT NOW() as now");
  return r.rows[0].now;
}
