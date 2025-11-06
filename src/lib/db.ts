// src/lib/db.ts
import { Pool, type QueryResult, type QueryResultRow } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
});

export type QueryResultSafe<T extends QueryResultRow = QueryResultRow> = {
  rows: T[];
  rowCount: number;
};

/**
 * Safe query helper for SELECT/INSERT/UPDATE/DELETE.
 * - T is the row shape you expect back.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: ReadonlyArray<unknown>
): Promise<QueryResultSafe<T>> {
  const res: QueryResult<T> = await pool.query<T>(text, params ? [...params] : undefined);

  const rows: T[] = Array.isArray(res.rows) ? res.rows : [];
  const rowCount: number = typeof res.rowCount === "number" ? res.rowCount : rows.length;

  return { rows, rowCount };
}

/**
 * Execute statements where you don't need returned rows (e.g., DDL).
 */
export async function exec(
  text: string,
  params?: ReadonlyArray<unknown>
): Promise<void> {
  await pool.query(text, params ? [...params] : undefined);
}

/**
 * Optional connectivity probe.
 */
export async function ping(): Promise<string | undefined> {
  const r = await query<{ now: string }>("SELECT NOW() AS now");
  return r.rows[0]?.now;
}
