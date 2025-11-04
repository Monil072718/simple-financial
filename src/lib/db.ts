// src/lib/db.ts
import { Pool, type QueryResult, type QueryResultRow } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
});

export type QueryResultSafe<T extends QueryResultRow = QueryResultRow> = { rows: T[]; rowCount: number };

// Safe for SELECT/INSERT/UPDATE etc. (normalizes rows/rowCount)
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResultSafe<T>> {
  const res: QueryResult<T> = await pool.query<T>(text, params);

  const rows: T[] = Array.isArray(res?.rows) ? (res.rows as T[]) : [];
  const rowCount: number =
    typeof res?.rowCount === "number" ? res.rowCount : rows.length;

  return { rows, rowCount };
}

// Use this for DDL or when you don't need rows
export async function exec(text: string, params?: unknown[]): Promise<void> {
  await pool.query(text, params);
}

export { pool };

// Optional
export async function ping() {
  const r = await query<{ now: string }>("SELECT NOW() AS now");
  return r.rows[0]?.now;
}
