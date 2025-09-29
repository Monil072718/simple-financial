import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let _db: Database.Database | null = null;

export function db() {
  if (_db) return _db;

  // place DB file under /db
  const dbDir = path.join(process.cwd(), "db");
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const dbPath = path.join(dbDir, "nexusflow.sqlite");
  _db = new Database(dbPath);

  // Run DDL if database.sql exists (idempotent)
  const ddlPath = path.join(process.cwd(), "database.sql");
  if (fs.existsSync(ddlPath)) {
    const sql = fs.readFileSync(ddlPath, "utf8");
    // execute multiple statements safely
    _db.exec(sql);
  }

  // Pragmas for integrity
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

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
  tags?: string[]; // JSON array
  status?: "open" | "done" | "archived";
  position?: number;
  projectId?: number | null;
};

export function nowISO() {
  return new Date().toISOString();
}
