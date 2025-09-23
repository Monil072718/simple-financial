import { Pool } from "pg";

declare global { var __pgPool__: Pool | undefined; }

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

export const pool = global.__pgPool__ ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") global.__pgPool__ = pool;

export const query = (text: string, params?: any[]) => pool.query(text, params);
