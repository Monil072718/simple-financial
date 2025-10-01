import { NextRequest } from "next/server";
import { db } from "./todos.db";
import { getAuthUser } from "./auth";

export function getUserId(req: NextRequest): string {
  // Prefer JWT Authorization in production; allow dev fallback for local testing
  const authUser = getAuthUser(req);
  const isDev = process.env.NODE_ENV !== "production";

  let id: string | null = null;
  if (authUser) {
    id = String(authUser.id);
  } else if (isDev) {
    // In development only, allow a stable demo user
    id = "demo";
  }

  if (!id) {
    throw new Error("Unauthorized");
  }

  // Ensure the user exists in todo_users
  const d = db();
  d.prepare("INSERT OR IGNORE INTO todo_users (id, email, name) VALUES (?, ?, ?)")
    .run(id, id.includes("@") ? id : `${id}@example.com`, id);
  return id;
}
