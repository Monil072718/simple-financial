// src/lib/db.ts
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
});

export type QueryResultSafe<T = unknown> = { rows: T[]; rowCount: number };

// Safe for SELECT/INSERT/UPDATE etc. (normalizes rows/rowCount)
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<QueryResultSafe<T>> {
  const res = await pool.query(text, params);

  const rows: T[] = Array.isArray(res?.rows) ? (res.rows as T[]) : [];
  const rowCount: number =
    typeof res?.rowCount === "number" ? res.rowCount : rows.length;

  return { rows, rowCount };
}

// Use this for DDL or when you don't need rows
export async function exec(text: string, params?: unknown[]): Promise<void> {
  await pool.query(text, params);
}

// Optional
export async function ping() {
  const r = await query<{ now: string }>("SELECT NOW() AS now");
  return r.rows[0]?.now;
}
