// src/lib/todos.db.ts
import path from "path";
import fs from "fs";

/**
 * Minimal shape we need from better-sqlite3's Database.
 * (Avoids depending on @types/better-sqlite3 for builds.)
 */
type SqliteDB = {
  exec(sql: string): unknown;
  pragma(setting: string): unknown;
};

// Hold a single process-wide instance
let _db: SqliteDB | null = null;

function ensureTodoSchema(d: SqliteDB) {
  // Only SQLite-safe DDL for the To-Do module
  d.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS todo_users (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS todo_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ownerId TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (ownerId) REFERENCES todo_users(id)
    );

    CREATE TABLE IF NOT EXISTS todo_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listId INTEGER NOT NULL,
      ownerId TEXT NOT NULL,
      content TEXT NOT NULL,
      description TEXT,
      link TEXT,
      considerations TEXT,
      priority TEXT CHECK(priority IN ('Low','Medium','High')) DEFAULT 'Medium',
      dueDate TEXT,
      assigneeId TEXT,
      tags TEXT DEFAULT '[]',
      status TEXT CHECK(status IN ('open','done','archived')) DEFAULT 'open',
      position INTEGER DEFAULT 0,
      projectId INTEGER,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (listId) REFERENCES todo_lists(id)
    );
  `);
}

export function db(): SqliteDB {
  if (_db) return _db;

  // Use require() so TS treats the module as any (no type defs needed)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const BetterSqlite3 = require("better-sqlite3") as any;

  // On serverless platforms (e.g., Vercel), writable disk is not guaranteed.
  // Fallback to in-memory DB to avoid runtime crashes.
  const isServerless = !!process.env.VERCEL || process.env.NEXT_RUNTIME === "edge";

  let dbPath: string;
  if (isServerless) {
    dbPath = ":memory:";
  } else {
    const dbDir = path.join(process.cwd(), "db");
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    dbPath = path.join(dbDir, "nexusflow.sqlite");
  }

  const instance: SqliteDB = new BetterSqlite3(dbPath);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");

  // Create ONLY the To-Do schema (avoid any CREATE EXTENSION etc.)
  ensureTodoSchema(instance);

  _db = instance;
  return _db;
}

export type TodoItemPayload = {
  content: string;
  description?: string;
  link?: string;
  considerations?: string;
  priority?: "Low" | "Medium" | "High";
  dueDate?: string | null;
  assigneeId?: string | null;
  tags?: string[];
  status?: "open" | "done" | "archived";
  position?: number;
  projectId?: number | null;
};

export function nowISO() {
  return new Date().toISOString();
}
