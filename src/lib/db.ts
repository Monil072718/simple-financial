import { Pool } from "pg";

declare global {
  // allow global pool reuse in dev
  var __pgPool__: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("❌ DATABASE_URL is not set in .env");
}

export const pool =
  global.__pgPool__ ??
  new Pool({
    connectionString,
  });

// Log successful connection
pool
  .connect()
  .then((client) => {
    console.log("✅ Connected to PostgreSQL:", {
      database: client.database,
      user: client.user,
      host: client.host,
      port: client.port,
    });
    client.release();
  })
  .catch((err) => {
    console.error("❌ PostgreSQL connection error:", err.message);
  });

if (process.env.NODE_ENV !== "production") global.__pgPool__ = pool;

export const query = (text: string, params?: any[]) => {
  console.log("📥 Executing SQL:", text, params || []);
  return pool.query(text, params);
};
