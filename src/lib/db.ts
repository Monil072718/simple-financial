// src/lib/db.ts
import { Pool, type QueryResult, type QueryResultRow } from "pg";

/**
 * Use a pooled connection string with SSL, e.g. (Supabase Pooler):
 * postgresql://postgres:<PASSWORD>@db.<ref>.supabase.co:6543/postgres?sslmode=require
 */

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

declare global {
  // eslint-disable-next-line no-var
  var __pgPool__: Pool | undefined;
}

export const pool: Pool =
  global.__pgPool__ ??
  new Pool({
    connectionString: url,
    // Always enable SSL in serverless. Managed DBs are fine with rejectUnauthorized=false.
    ssl: { rejectUnauthorized: false },
    // Keep this conservative for serverless environments
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  global.__pgPool__ = pool;
}

export type QueryResultSafe<T extends QueryResultRow = QueryResultRow> = {
  rows: T[];
  rowCount: number;
};

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResultSafe<T>> {
  const res = await pool.query<T>(text, params as any[]);
  const rows = Array.isArray(res.rows) ? (res.rows as T[]) : [];
  const rowCount = typeof res.rowCount === "number" ? res.rowCount : rows.length;
  return { rows, rowCount };
}

export async function exec(text: string, params?: unknown[]): Promise<void> {
  await pool.query(text, params as any[]);
}

export async function ping() {
  const r = await query<{ now: string }>("SELECT NOW() AS now");
  return r.rows[0]?.now;
}
