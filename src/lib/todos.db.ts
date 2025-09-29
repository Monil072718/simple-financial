import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let _db: Database.Database | null = null;

function ensureTodoSchema(d: Database.Database) {
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

export function db() {
  if (_db) return _db;

  const dbDir = path.join(process.cwd(), "db");
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const dbPath = path.join(dbDir, "nexusflow.sqlite");
  _db = new Database(dbPath);

  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  // Create ONLY the To-Do schema (ignore global database.sql to avoid CREATE EXTENSION errors)
  ensureTodoSchema(_db);

  return _db!;
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
