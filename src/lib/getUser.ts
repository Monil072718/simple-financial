import { NextRequest } from "next/server";
import { db, nowISO } from "./todos.db";

export function getUserId(req: NextRequest): string {
  // Try to map onto your existing auth first:
  const headerUser = req.headers.get("x-user-id") || req.headers.get("x-user") || "";
  const cookieUser = req.cookies.get("uid")?.value || "";

  const id = headerUser || cookieUser || "demo"; // fallback for local dev
  // Ensure the user exists in todo_users
  const d = db();
  d.prepare("INSERT OR IGNORE INTO todo_users (id, email, name) VALUES (?, ?, ?)")
    .run(id, id.includes("@") ? id : `${id}@example.com`, id);
  return id;
}
