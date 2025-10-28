// src/lib/db.ts
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function makePool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not defined");
  return new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
  });
}

export const pool = global.__pgPool ?? makePool();
if (process.env.NODE_ENV !== "production") global.__pgPool = pool;

export async function query<T = any>(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return { rows: res.rows as T[], rowCount: res.rowCount };
}

export async function exec(text: string, params?: any[]) {
  await pool.query(text, params);
}

export async function ping() {
  const { rows } = await pool.query<{ now: string }>("SELECT NOW() AS now");
  return rows[0]?.now;
}
